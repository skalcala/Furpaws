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
  formatPetWeight,
  formatSpecies,
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
  const schedules = useResource("/schedules");
  const [queueDate, setQueueDate] = useState(dayKey());
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelErrors, setCancelErrors] = useState({});
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
        ? value === "Approved" && date === queueDate
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
      if (id) navigate("/admin/approvals");
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
    setError("");
    setErrors({});
    setBusy(true);
    try {
      await api.patch(`/appointments/${reschedule._id}`, {
        date: slot.date,
        time: slot.time,
        service: slot.service,
        reasonForVisit: slot.reasonForVisit,
      });
      setReschedule(null);
      await resource.refresh();
      message.success("Appointment rescheduled.");
    } catch (failure) {
      setError(errorMessage(failure));
      setErrors(failure.response?.data?.errors || {});
    } finally {
      setBusy(false);
    }
  };
  const cancelBooking = async () => {
    if (cancellationReason.trim().length < 5) { setCancelErrors({ cancellationReason: "Enter a reason using 5–500 characters." }); return; }
    setBusy(true);
    try {
      await api.patch(`/appointments/${cancel._id}`, { status: "Cancelled", cancellationReason: cancellationReason.trim() });
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
            to={`/admin/consultations/${record._id}?from=queue`}
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
                  time: record.time,
                  service: record.service?._id,
                  reasonForVisit: record.reasonForVisit || "",
                });
                setError("");
              }}
            >
              Reschedule
            </Button>
            <Button onClick={() => { setCancel(record); setCancellationReason(""); setCancelErrors({}); }}>Cancel</Button>
          </div>
        ) : (
          record.cancellationReason || record.declineReason || "—"
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
              ["Species", current.pet ? formatSpecies(current.pet) : "—"],
              ["Breed", current.pet?.breed],
              ["Date of birth", formatDate(current.pet?.birthDate)],
              ["Current / estimated weight", current.pet ? formatPetWeight(current.pet) : "—"],
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
        backTo={id ? "/admin/approvals" : undefined}
        backLabel="Back to Approvals"
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
              <Panel title={queueDate === dayKey() ? "Today’s approved queue" : "Selected-date queue · Preview"}>
                <div className="row spread">
                  <label>Queue date <Input aria-label="Queue date" type="date" value={queueDate} onChange={({ target: { value } }) => value && setQueueDate(value)} /></label>
                  <Button onClick={() => setQueueDate(dayKey())}>Today</Button>
                  <Link className="button" to="/admin/schedule-settings">Schedule Settings</Link>
                </div>
                {(() => {
                  const schedule = schedules.data[0];
                  const hours = schedule?.hours.find(({ day }) => day === new Date(`${queueDate}T12:00:00+08:00`).getUTCDay());
                  const closed = schedule && ([...schedule.blockedDates, ...schedule.holidays, ...schedule.leaveDates].includes(queueDate) || hours?.closed);
                  return <Note>{closed ? "This date is closed or blocked in Schedule Settings. Existing approved bookings remain visible. For a real visit, an Admin must update the schedule; booking rules are never bypassed." : "Only Approved bookings for the selected date appear here. For testing, preview a date with an approved booking, or use the isolated test workflow described in the project guide."}</Note>;
                })()}
                {!rows.length && <p>No approved appointments for {formatDate(queueDate)}. Review Approvals or select another queue date.</p>}
              </Panel>
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
              <DataTable key={status} data={rows} columns={columns} />
            )}
          </>
        )}
      </RequestState>
      <Note>
        {approval
          ? "Only Admin may approve or decline a booking. New pets remain Pending and hidden until approved or after a completed checkup."
          : queue
            ? "Auto-populated from today’s Approved appointments only. Start Consultation opens the linked approved appointment. Save and Complete marks the visit done."
            : "Scheduled appointments come from owners. Admins can record urgent visits through Emergency consultation."}
      </Note>
      <Modal
        open={!!selected}
        width={800}
        title={`Approval Detail · ${current?.bookingType}`}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => setSelected(null)}>Back to Approvals</Button>}
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
        <SchedulePicker value={slot} onChange={setSlot} errors={errors} collectVisitDetails allowFollowUp={reschedule?.bookingType==="With record"} excludeId={reschedule?._id} />
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
        <Field label="Cancellation reason" name="adminCancellationReason" required errors={{ adminCancellationReason: cancelErrors.cancellationReason }}>
          <Input.TextArea id="adminCancellationReason" value={cancellationReason} minLength={5} maxLength={500} rows={3} placeholder="Explain why the clinic is cancelling this appointment." onChange={({ target: { value } }) => { setCancellationReason(value); setCancelErrors({}); }} />
        </Field>
        <p>The owner will receive this reason in their notification.</p>
      </Modal>
    </>
  );
}
