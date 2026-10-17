import { useEffect, useState } from "react";
import { Alert, App, Button, Input, Select, Switch } from "antd";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  api,
  dayKey,
  errorMessage,
  formatDate,
  formatTime,
  money,
  shortId,
} from "../../api";
import {
  DataTable,
  Field,
  Note,
  Panel,
  RequestState,
  Status,
  useResource,
} from "../Shared/UI";
import NumericInput from "../Shared/NumericInput";
import VisitDetails from "../Shared/VisitDetails";
import { PageHeading } from "../Owner/OwnerPages";
import EmergencyConsultation from "./EmergencyConsultation";
export default function Consultation() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const appointments = useResource("/appointments");
  const history = useResource("/consultations");
  const [emergency, setEmergency] = useState(false);
  const [values, setValues] = useState({
    weight: null,
    diagnosis: "",
    treatment: "",
    notes: "",
    vaccine: "Rabies",
    dateGiven: dayKey(),
    nextDueDate: "",
    followUpEnabled: false,
    followUpDate: "",
    followUpPurpose: "",
    followUpInstructions: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const refreshAppointments = appointments.refresh;
  useEffect(() => {
    setValues({
      weight: null,
      diagnosis: "",
      treatment: "",
      notes: "",
      vaccine: "Rabies",
      dateGiven: dayKey(),
      nextDueDate: "",
      followUpEnabled: false,
      followUpDate: "",
      followUpPurpose: "",
      followUpInstructions: "",
    });
    setError("");
    setErrors({});
    if (id) refreshAppointments();
  }, [id, refreshAppointments]);
  const appointment = appointments.data.find((a) => a._id === id);
  const vaccination = appointment?.service?.type === "Vaccination";
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const leave = () => {
    const go = () =>
      navigate(params.get("from") === "queue" ? "/admin/A4" : "/admin/A5");
    if (
      values.weight ||
      values.diagnosis ||
      values.treatment ||
      values.notes ||
      values.nextDueDate ||
      values.followUpEnabled
    )
      modal.confirm({
        title: "Leave this consultation?",
        content:
          "Unsaved details will be discarded. The visit will stay Approved.",
        okText: "Leave without saving",
        onOk: go,
      });
    else go();
  };
  const complete = async () => {
    const next = {
      ...(!values.weight ? { weight: "Enter the measured weight." } : {}),
      ...(!vaccination && !values.diagnosis.trim()
        ? { diagnosis: "Diagnosis is required." }
        : {}),
      ...(!vaccination && !values.treatment.trim()
        ? { treatment: "Treatment is required." }
        : {}),
      ...(vaccination &&
      (!values.nextDueDate || values.nextDueDate <= values.dateGiven)
        ? { nextDueDate: "Choose a later next due date." }
        : {}),
      ...(values.followUpEnabled &&
      (!values.followUpDate || values.followUpDate < dayKey())
        ? { followUpDate: "Choose today or a later date." }
        : {}),
      ...(values.followUpEnabled && !values.followUpPurpose.trim()
        ? { followUpPurpose: "Enter the purpose of the follow-up." }
        : {}),
    };
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/consultations/complete", {
        appointment: id,
        weight: values.weight,
        diagnosis: vaccination ? "" : values.diagnosis,
        treatment: vaccination ? "" : values.treatment,
        notes: values.notes,
        followUp: {
          enabled: values.followUpEnabled,
          ...(values.followUpEnabled
            ? {
                date: values.followUpDate,
                purpose: values.followUpPurpose,
                instructions: values.followUpInstructions,
              }
            : {}),
        },
        ...(vaccination
          ? {
              vaccination: {
                vaccine: values.vaccine,
                dateGiven: values.dateGiven,
                nextDueDate: values.nextDueDate,
              },
            }
          : {}),
      });
      message.success(
        `Visit completed. Bill ${money(data.bill.total)} created.`,
      );
      navigate("/admin/A11");
    } catch (e) {
      setError(errorMessage(e));
      setErrors(e.response?.data?.errors || {});
    } finally {
      setBusy(false);
    }
  };
  const followRows = history.data
    .filter((r) => r.followUp?.enabled)
    .map((r) => ({ ...r, ...r.followUp }));
  const followTable = (
    <Panel title="Follow-up checkups">
      <DataTable
        data={followRows}
        columns={[
          { title: "Pet", render: (_, r) => r.pet?.name },
          { title: "Suggested date", dataIndex: "date", render: formatDate },
          { title: "Purpose", dataIndex: "purpose" },
          { title: "Care instructions", dataIndex: "instructions" },
          { title: "Admin", render: (_, r) => r.admin?.name },
          {
            title: "Record",
            render: (_, r) => (
              <Link className="button" to={`/admin/A6c/${r.pet?._id}`}>
                View medical record
              </Link>
            ),
          },
        ]}
      />
      <Note>
        A follow-up plan is a recommendation. The owner still books an available
        appointment; no slot is reserved by this form.
      </Note>
    </Panel>
  );
  if (!id)
    return (
      <>
        <PageHeading
          title={params.get("tab") ? "Follow-up Checkups" : "Consultations"}
        />
        <div className="row end">
          <Button type="primary" onClick={() => setEmergency(true)}>
            Emergency consultation
          </Button>
        </div>
        {!params.get("tab") && (
          <Panel title="Approved visits">
            <RequestState {...appointments} retry={appointments.refresh}>
              <DataTable
                data={appointments.data.filter((a) => a.status === "Approved")}
                columns={[
                  { title: "Pet", render: (_, r) => r.pet?.name },
                  { title: "Owner", render: (_, r) => r.owner?.name },
                  {
                    title: "Service",
                    render: (_, r) =>
                      r.source === "Emergency"
                        ? "Emergency consultation"
                        : r.service?.name,
                  },
                  { title: "Date", dataIndex: "date", render: formatDate },
                  {
                    title: "Action",
                    render: (_, r) => (
                      <Link className="button" to={`/admin/A5/${r._id}`}>
                        Start Consultation
                      </Link>
                    ),
                  },
                ]}
              />
            </RequestState>
          </Panel>
        )}
        {followTable}
        {emergency && (
          <EmergencyConsultation open onClose={() => setEmergency(false)} />
        )}
      </>
    );
  return (
    <>
      <PageHeading
        title={
          appointment?.source === "Emergency"
            ? "Emergency Consultation"
            : "Consultation"
        }
        backTo={params.get("from") === "queue" ? "/admin/A4" : "/admin/A5"}
        backLabel={
          params.get("from") === "queue"
            ? "Back to Queue"
            : "Back to Consultations"
        }
        onBack={leave}
      />
      <RequestState {...appointments} retry={appointments.refresh}>
        {!appointment || appointment.status !== "Approved" ? (
          <Alert type="error" message="Select an Approved visit." />
        ) : (
          <>
            <Panel>
              <h2>
                {shortId(id, "APT-")} · {appointment.pet?.name} ·{" "}
                {appointment.owner?.name} · {formatDate(appointment.date)},{" "}
                {formatTime(appointment.time)}
              </h2>
              <Status
                value={
                  appointment.source === "Emergency" ? "Emergency" : "Approved"
                }
              />
            </Panel>
            <VisitDetails appointment={appointment} />
            {error && <Alert type="error" message={error} />}
            <div className="two-columns">
              <Panel title="Clinical findings">
                <Field
                  label="Weight (kg)"
                  name="weight"
                  required
                  errors={errors}
                >
                  <NumericInput
                    id="weight"
                    placeholder="Measured at the clinic"
                    min={0.01}
                    max={500}
                    value={values.weight}
                    onChange={(v) => change("weight", v)}
                  />
                </Field>
                {!vaccination && (
                  <>
                    <Field
                      label="Diagnosis"
                      name="diagnosis"
                      required
                      errors={errors}
                    >
                      <Input.TextArea
                        id="diagnosis"
                        rows={3}
                        maxLength={2000}
                        value={values.diagnosis}
                        placeholder="Describe examination findings and the clinical assessment."
                        onChange={(e) => change("diagnosis", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Treatment"
                      name="treatment"
                      required
                      errors={errors}
                    >
                      <Input.TextArea
                        id="treatment"
                        rows={3}
                        maxLength={2000}
                        value={values.treatment}
                        placeholder="Record treatment provided, home care, and monitoring instructions."
                        onChange={(e) => change("treatment", e.target.value)}
                      />
                    </Field>
                  </>
                )}
                {vaccination && (
                  <>
                    <Field label="Vaccination given" name="vaccine" required>
                      <Select
                        id="vaccine"
                        value={values.vaccine}
                        onChange={(v) => change("vaccine", v)}
                        options={["Rabies", "DHPP", "FVRCP"].map((value) => ({
                          value,
                          label: value,
                        }))}
                      />
                    </Field>
                    <div className="two-columns">
                      <Field label="Date given" name="dateGiven" required>
                        <Input
                          id="dateGiven"
                          type="date"
                          max={dayKey()}
                          value={values.dateGiven}
                          onChange={(e) => change("dateGiven", e.target.value)}
                        />
                      </Field>
                      <Field
                        label="Next due date"
                        name="nextDueDate"
                        required
                        errors={errors}
                      >
                        <Input
                          id="nextDueDate"
                          type="date"
                          min={values.dateGiven}
                          value={values.nextDueDate}
                          onChange={(e) =>
                            change("nextDueDate", e.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </>
                )}
                <Field label="Admin notes" name="notes">
                  <Input.TextArea
                    id="notes"
                    rows={3}
                    maxLength={2000}
                    value={values.notes}
                    placeholder="Record observations, owner instructions, precautions, and when to return."
                    onChange={(e) => change("notes", e.target.value)}
                  />
                </Field>
              </Panel>
              <Panel title="Follow-up plan (optional)">
                <div className="row spread">
                  <label htmlFor="followUpEnabled">
                    Recommend a follow-up checkup
                  </label>
                  <Switch
                    id="followUpEnabled"
                    checked={values.followUpEnabled}
                    onChange={(v) => change("followUpEnabled", v)}
                  />
                </div>
                {values.followUpEnabled ? (
                  <>
                    <Field
                      label="Suggested checkup date"
                      name="followUpDate"
                      required
                      errors={errors}
                    >
                      <Input
                        id="followUpDate"
                        type="date"
                        min={dayKey()}
                        value={values.followUpDate}
                        onChange={(e) => change("followUpDate", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Follow-up purpose"
                      name="followUpPurpose"
                      required
                      errors={errors}
                    >
                      <Input.TextArea
                        id="followUpPurpose"
                        rows={3}
                        maxLength={2000}
                        placeholder="Example: reassess healing, appetite, or response to treatment."
                        value={values.followUpPurpose}
                        onChange={(e) =>
                          change("followUpPurpose", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Care instructions (optional)"
                      name="followUpInstructions"
                    >
                      <Input.TextArea
                        id="followUpInstructions"
                        rows={4}
                        maxLength={2000}
                        placeholder="What should the owner monitor or bring to the next checkup?"
                        value={values.followUpInstructions}
                        onChange={(e) =>
                          change("followUpInstructions", e.target.value)
                        }
                      />
                    </Field>
                    <Note>
                      Saving this plan does not create an appointment. The owner
                      must choose an available date and time.
                    </Note>
                  </>
                ) : (
                  <p className="muted">
                    Turn this on only when another checkup is recommended. This
                    visit can be completed without a follow-up plan.
                  </p>
                )}
              </Panel>
            </div>
            <div className="row">
              <Button disabled={busy} onClick={leave}>
                Back · Leave consultation
              </Button>
              <Button type="primary" loading={busy} onClick={complete}>
                Save and Complete
              </Button>
            </div>
            <Note>
              Completion saves the clinical record and measured weight, creates
              the service bill, and records any optional follow-up plan.
            </Note>
          </>
        )}
      </RequestState>
    </>
  );
}
