import VisitDetails from "../Shared/VisitDetails";
import { useState } from "react";
import { Alert, App, Button, Input, Modal, Tabs } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  api,
  dayKey,
  errorMessage,
  formatDate,
  formatTime,
  shortId,
} from "../../api";
import {
  DataTable,
  Details,
  Field,
  Note,
  Panel,
  RequestState,
  Status,
  useResource,
} from "../Shared/UI";
import { PageHeading } from "../Owner/OwnerPages";
import { SchedulePicker } from "../Booking/Booking";
export default function AdminAppointments({ mode = "appointments" }) {
  const resource = useResource("/appointments");
  const [status, setStatus] = useState("Approved");
  const [view, setView] = useState("Table");
  const [selected, setSelected] = useState(null);
  const [decline, setDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [reschedule, setReschedule] = useState(null);
  const [slot, setSlot] = useState({});
  const [cancel, setCancel] = useState(null);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const current = selected || resource.data.find(({ _id }) => _id === id);
  const approval = mode === "approvals";
  const queue = mode === "queue";
  const rows = resource.data.filter(({ status: value, date }) =>
    approval
      ? value === "Pending"
      : queue
        ? value === "Approved" && date === dayKey()
        : value === status,
  );
  const decision = async (value) => {
    if (value === "Declined" && !reason.trim()) {
      setErrors({ reason: "Decline reason is required." });
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/appointments/${current._id}/decision`, {
        status: value,
        reason,
      });
      setSelected(null);
      setDecline(false);
      setReason("");
      await resource.refresh();
      message.success(`Appointment ${value.toLowerCase()}.`);
      if (id) navigate("/admin/A2");
    } catch (failure) {
      setError(errorMessage(failure));
      setErrors(failure.response?.data?.errors || {});
    } finally {
      setBusy(false);
    }
  };
  const saveReschedule = async () => {
    if (!slot.date || !slot.time) {
      setError("Choose an available date and time.");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/appointments/${reschedule._id}`, {
        date: slot.date,
        time: slot.time,
      });
      setReschedule(null);
      await resource.refresh();
      message.success("Appointment rescheduled.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  const cancelBooking = async () => {
    setBusy(true);
    try {
      await api.patch(`/appointments/${cancel._id}`, { status: "Cancelled" });
      setCancel(null);
      await resource.refresh();
      message.success("Appointment cancelled.");
    } catch (failure) {
      message.error(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  const columns = [
    ...(queue
      ? [
          {
            title: "Queue number",
            render: (_, { time }, index) =>
              `${String(index + 1).padStart(3, "0")} · ${formatTime(time)}`,
          },
        ]
      : []),
    { title: "Pet", render: (_, { pet }) => pet?.name },
    { title: "Owner", render: (_, { owner }) => owner?.name },
    { title: "Service", render: (_, { service }) => service?.name },
    ...(!queue
      ? [
          {
            title: "Date and time",
            render: (_, { date, time }) =>
              `${formatDate(date)} · ${formatTime(time)}`,
          },
        ]
      : []),
    {
      title: approval ? "Booking type" : "Status",
      render: (_, record) =>
        approval ? record.bookingType : <Status value={record.status} />,
    },
    {
      title: "Actions",
      render: (_, record) =>
        approval ? (
          <Button
            onClick={() => {
              setSelected(record);
              setError("");
              setReason("");
              setErrors({});
            }}
          >
            Review
          </Button>
        ) : queue ? (
          <Link
            className="button primary"
            to={`/admin/${record.service?.type === "Vaccination" ? "A5a" : "A5"}/${record._id}`}
          >
            Start Consultation
          </Link>
        ) : ["Approved", "Pending"].includes(record.status) ? (
          <div className="row">
            <Button
              onClick={() => {
                setReschedule(record);
                setSlot({
                  date: record.date,
                  time: "",
                  service: record.service?._id,
                });
                setError("");
              }}
            >
              Reschedule
            </Button>
            <Button onClick={() => setCancel(record)}>Cancel</Button>
          </div>
        ) : (
          record.declineReason || "—"
        ),
    },
  ];
  const detail = current && (
    <>
      <Panel
        title="Appointment information"
        action={<Status value={current.status} />}
      >
        <Details
          entries={[
            ["Appointment", shortId(current._id, "APT-")],
            ["Owner", `${current.owner?.name} · ${current.owner?.phone}`],
            ["Booking type", current.bookingType],
            ["Service", current.service?.name],
            [
              "Date and time",
              `${formatDate(current.date)} · ${formatTime(current.time)}`,
            ],
          ]}
        />
      </Panel>
      <VisitDetails appointment={current} />
      {current.bookingType === "No record" && (
        <Panel title="Pet Registration Form">
          <Details
            entries={[
              ["Pet name", current.pet?.name],
              ["Species", current.pet?.species],
              ["Breed", current.pet?.breed],
              ["Date of birth", formatDate(current.pet?.birthDate)],
              ["Weight", `${current.pet?.weight} kg`],
            ]}
          />
          {current.pet?.picture && (
            <img
              className="detail-picture"
              src={current.pet.picture}
              alt={current.pet.name}
            />
          )}
        </Panel>
      )}
      {error && <Alert type="error" message={error} />}
      <div className="row">
        <Button
          type="primary"
          loading={busy}
          onClick={() => decision("Approved")}
        >
          Approve
        </Button>
        <Button
          danger
          disabled={busy}
          onClick={() => {
            setDecline(true);
            setErrors({});
          }}
        >
          Decline
        </Button>
      </div>
      <Note>
        {current.bookingType === "No record"
          ? `Approving this No record booking also approves ${current.pet?.name}. `
          : ""}
        The owner is notified of the decision.
      </Note>
    </>
  );
  return (
    <>
      <PageHeading
        title={
          approval
            ? id
              ? "Approval Detail · No Record"
              : "Approvals · Pending Bookings"
            : queue
              ? "Today’s Queue"
              : "Appointments · Table & Calendar"
        }
      />
      {!approval && !queue && (
        <div className="row spread">
          <Tabs
            activeKey={status}
            onChange={setStatus}
            items={[
              "Pending",
              "Approved",
              "Declined",
              "Completed",
              "Cancelled",
            ].map((label) => ({ key: label, label }))}
          />
          <div className="row">
            {["Table", "Calendar"].map((label) => (
              <Button
                key={label}
                type={view === label ? "primary" : "default"}
                onClick={() => setView(label)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <RequestState {...resource} retry={resource.refresh}>
        {id ? (
          detail
        ) : (
          <>
            {queue && (
              <div className="row">
                <h2>{formatDate(dayKey())}</h2>
                <Status value="Approved" />
              </div>
            )}
            {view === "Calendar" && !approval && !queue ? (
              <Panel title="Appointment calendar">
                <SchedulePicker
                  value={{ ...slot, date: slot.date || dayKey() }}
                  onChange={setSlot}
                  showService={false}
                />
                <DataTable
                  data={rows.filter(
                    ({ date }) => date === (slot.date || dayKey()),
                  )}
                  columns={columns}
                />
              </Panel>
            ) : (
              <DataTable data={rows} columns={columns} />
            )}
          </>
        )}
      </RequestState>
      <Note>
        {approval
          ? "Only Admin may approve or decline a booking. New pets remain Pending and hidden until approved or after a completed checkup."
          : queue
            ? "Auto-populated from today’s Approved appointments only. Start Consultation opens the linked approved appointment. Save and Complete marks the visit done."
            : "All appointments originate from the owner dashboard. No manual or walk-in appointment creation."}
      </Note>
      <Modal
        open={!!selected}
        width={800}
        title={`Approval Detail · ${current?.bookingType}`}
        onCancel={() => setSelected(null)}
        footer={null}
      >
        {detail}
      </Modal>
      <Modal
        title="Decline appointment"
        open={decline}
        onCancel={() => setDecline(false)}
        footer={
          <div className="row end">
            <Button onClick={() => setDecline(false)}>Cancel</Button>
            <Button
              type="primary"
              danger
              loading={busy}
              onClick={() => decision("Declined")}
            >
              Send Decline
            </Button>
          </div>
        }
      >
        <p>
          {current?.pet?.name} · {current?.owner?.name} ·{" "}
          {formatDate(current?.date)}, {formatTime(current?.time)}
        </p>
        <Field label="Decline reason" name="reason" errors={errors} required>
          <Input.TextArea
            id="reason"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={({ target: { value } }) => setReason(value)}
          />
        </Field>
        <small>A reason is required and will be sent to the owner.</small>
        {error && <Alert type="error" message={error} />}
      </Modal>
      <Modal
        open={!!reschedule}
        title="Reschedule appointment"
        width={1000}
        onCancel={() => setReschedule(null)}
        onOk={saveReschedule}
        confirmLoading={busy}
        okText="Save schedule"
      >
        <SchedulePicker value={slot} onChange={setSlot} />
        {error && <Alert type="error" message={error} />}
      </Modal>
      <Modal
        title="Cancel this appointment?"
        open={!!cancel}
        onCancel={() => setCancel(null)}
        onOk={cancelBooking}
        confirmLoading={busy}
      >
        <p>
          {cancel?.pet?.name} · {formatDate(cancel?.date)}
        </p>
      </Modal>
    </>
  );
}
