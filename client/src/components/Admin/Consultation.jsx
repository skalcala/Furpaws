import { useEffect, useState } from "react";
import { Alert, App, Button, Input, Select } from "antd";
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
  formatPetAge,
  formatTime,
  money,
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
import NumericInput from "../Shared/NumericInput";
import VisitDetails from "../Shared/VisitDetails";
import { PageHeading } from "../Owner/OwnerPages";
import EmergencyConsultation from "./EmergencyConsultation";
const PROCEDURES = [
  "N/A",
  "Physical examination",
  "Wound cleaning / dressing",
  "Injection / IV fluids",
  "Deworming",
  "Laboratory test",
  "X-ray / ultrasound",
  "Minor surgery",
  "Other",
];
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
    symptoms: "",
    diagnosis: "",
    prescription: "",
    procedure: "N/A",
    notes: "",
    vaccine: "Rabies",
    dateGiven: dayKey(),
    nextDueDate: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const refreshAppointments = appointments.refresh;
  useEffect(() => {
    setValues({
      weight: null,
      symptoms: "",
      diagnosis: "",
      prescription: "",
      procedure: "N/A",
      notes: "",
      vaccine: "Rabies",
      dateGiven: dayKey(),
      nextDueDate: "",
    });
    setError("");
    setErrors({});
    if (id) refreshAppointments();
  }, [id, refreshAppointments]);
  const appointment = appointments.data.find((a) => a._id === id);
  // Pet details come from the approved booking; the owner's explanation pre-fills symptoms.
  const bookedSymptoms = appointment?.reasonForVisit || "";
  useEffect(() => {
    if (bookedSymptoms)
      setValues((v) => (v.symptoms ? v : { ...v, symptoms: bookedSymptoms }));
  }, [bookedSymptoms]);
  const vaccination = appointment?.service?.type === "Vaccination";
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const leave = () => {
    const go = () =>
      navigate(params.get("from") === "queue" ? "/admin/todays-queue" : "/admin/consultations");
    if (
      values.weight ||
      values.diagnosis ||
      values.prescription ||
      values.procedure !== "N/A" ||
      values.notes ||
      values.nextDueDate
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
      ...(!vaccination && !values.symptoms.trim()
        ? { symptoms: "Symptoms are required." }
        : {}),
      ...(!vaccination && !values.diagnosis.trim()
        ? { diagnosis: "Diagnosis is required." }
        : {}),
      ...(!vaccination && !values.prescription.trim()
        ? { prescription: "Enter the prescription, or N/A if none." }
        : {}),
      ...(vaccination &&
      (!values.nextDueDate || values.nextDueDate <= values.dateGiven)
        ? { nextDueDate: "Choose a later next due date." }
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
        symptoms: vaccination ? "" : values.symptoms,
        diagnosis: vaccination ? "" : values.diagnosis,
        prescription: vaccination ? "" : values.prescription,
        procedure: values.procedure,
        notes: values.notes,
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
        data.nextAppointment
          ? `Visit completed. Bill ${money(data.bill.total)} created. Next vaccination booked for ${formatDate(data.nextAppointment.date)}, ${formatTime(data.nextAppointment.time)}; the owner was notified.`
          : `Visit completed. Bill ${money(data.bill.total)} created.`,
      );
      navigate("/admin/billing-and-payments");
    } catch (e) {
      setError(errorMessage(e));
      setErrors(e.response?.data?.errors || {});
    } finally {
      setBusy(false);
    }
  };
  const recordsTable = (
    <Panel title="Consultation records">
      <RequestState {...history} retry={history.refresh}>
        <DataTable
          data={history.data}
          columns={[
            { title: "Date", dataIndex: "createdAt", render: formatDate },
            { title: "Pet", render: (_, r) => r.pet?.name },
            { title: "Symptoms", dataIndex: "symptoms" },
            { title: "Diagnosis", dataIndex: "diagnosis" },
            {
              title: "Prescription",
              render: (_, r) => r.prescription || r.treatment,
            },
            { title: "Procedure", dataIndex: "procedure" },
            { title: "Admin", render: (_, r) => r.admin?.name },
            {
              title: "Record",
              render: (_, r) => (
                <Link className="button" to={`/admin/medical-records/${r.pet?._id}`}>
                  View medical record
                </Link>
              ),
            },
          ]}
        />
      </RequestState>
      <Note>
        Start a consultation from <Link to="/admin/todays-queue">Today’s Queue</Link>{" "}
        once the booking is approved.
      </Note>
    </Panel>
  );
  if (!id)
    return (
      <>
        <PageHeading title="Consultations" />
        <div className="row end">
          <Button type="primary" onClick={() => setEmergency(true)}>
            Emergency consultation
          </Button>
        </div>
        {recordsTable}
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
        backTo={params.get("from") === "queue" ? "/admin/todays-queue" : "/admin/consultations"}
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
            <Panel title="Pet information">
              <Details
                entries={[
                  ["Pet", appointment.pet?.name],
                  [
                    "Species / breed",
                    `${appointment.pet?.species === "Other" ? appointment.pet?.otherSpecies || "Other" : appointment.pet?.species} · ${appointment.pet?.breed}`,
                  ],
                  ["Age", formatPetAge(appointment.pet || {})],
                  [
                    "Last recorded weight",
                    appointment.pet?.weight
                      ? `${appointment.pet.weight} kg`
                      : "—",
                  ],
                  ["Owner", appointment.owner?.name],
                  ["Contact", appointment.owner?.phone || appointment.owner?.email],
                  ["Service", appointment.service?.name],
                ]}
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
                      label="Symptoms"
                      name="symptoms"
                      required
                      errors={errors}
                    >
                      <Input.TextArea
                        id="symptoms"
                        rows={3}
                        maxLength={2000}
                        value={values.symptoms}
                        placeholder="What the owner reported and what you observed."
                        onChange={(e) => change("symptoms", e.target.value)}
                      />
                    </Field>
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
                        label="Next date given"
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
                        <small className="muted">
                          The owner is notified and the next visit is booked
                          automatically.
                        </small>
                      </Field>
                    </div>
                  </>
                )}
              </Panel>
              <div className="consultation-side">
                {!vaccination && (
                  <Panel title="Prescription">
                    <Field
                      label="Prescription"
                      name="prescription"
                      required
                      errors={errors}
                    >
                      <Input.TextArea
                        id="prescription"
                        rows={4}
                        maxLength={2000}
                        value={values.prescription}
                        placeholder="Medicine, dose, frequency and duration. Enter N/A if none."
                        onChange={(e) => change("prescription", e.target.value)}
                      />
                    </Field>
                  </Panel>
                )}
                <Panel title="Other notes">
                  <Field label="Done to the pet" name="procedure">
                    <Select
                      id="procedure"
                      value={values.procedure}
                      onChange={(v) => change("procedure", v)}
                      options={PROCEDURES.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  </Field>
                  <Field label="Notes" name="notes">
                    <Input.TextArea
                      id="notes"
                      rows={3}
                      maxLength={2000}
                      value={values.notes}
                      placeholder="Additional details, owner instructions and precautions. Type N/A if none."
                      onChange={(e) => change("notes", e.target.value)}
                    />
                  </Field>
                </Panel>
              </div>
            </div>
            <div className="row form-actions">
              <Button disabled={busy} onClick={leave}>
                Back · Leave consultation
              </Button>
              <Button type="primary" loading={busy} onClick={complete}>
                Save and Complete
              </Button>
            </div>
            <Note>
              Completion saves the clinical record and measured weight and
              creates the service bill. For vaccinations it also books the next
              due date and notifies the owner.
            </Note>
          </>
        )}
      </RequestState>
    </>
  );
}
