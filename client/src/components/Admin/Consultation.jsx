import VisitDetails from "../Shared/VisitDetails";
import { useEffect, useState } from "react";
import { Alert, App, Button, Input, InputNumber, Modal, Select } from "antd";
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
import { PageHeading } from "../Owner/OwnerPages";
export default function Consultation() {
  const { id } = useParams();
  const appointments = useResource("/appointments");
  const medicines = useResource("/medicines");
  const history = useResource("/consultations");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [values, setValues] = useState({
    weight: null,
    diagnosis: "",
    treatment: "",
    notes: "",
    vaccine: "Rabies",
    dateGiven: dayKey(),
    nextDueDate: "",
  });
  const [prescriptions, setPrescriptions] = useState([]);
  const [rx, setRx] = useState({
    medicine: "",
    quantity: 1,
    dosage: "",
    frequency: "",
    duration: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [medicineError, setMedicineError] = useState("");
  const [busy, setBusy] = useState(false);
  const appointment = appointments.data.find(({ _id }) => _id === id);
  const vaccination = appointment?.service?.type === "Vaccination";
  const available = appointments.data.filter(
    ({ status }) => status === "Approved",
  );
  useEffect(() => {
    if (appointment)
      setValues((current) => ({ ...current, weight: appointment.pet?.weight }));
  }, [appointment]);
  const change = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));
  const selectMedicine = (medicine) => {
    const record = medicines.data.find(({ _id }) => _id === medicine);
    if (record?.quantity === 0) {
      setMedicineError(
        `${record.name} has no quantity available and cannot be added to the prescription.`,
      );
      return;
    }
    if (record && record.expiryDate.slice(0, 10) < dayKey()) {
      setMedicineError(`${record.name} has expired and cannot be prescribed.`);
      return;
    }
    setRx({ ...rx, medicine });
  };
  const addRx = () => {
    const record = medicines.data.find(({ _id }) => _id === rx.medicine);
    const allocated = prescriptions
      .filter(({ medicine }) => medicine === rx.medicine)
      .reduce((sum, { quantity }) => sum + quantity, 0);
    if (
      !record ||
      !rx.dosage.trim() ||
      !rx.frequency.trim() ||
      !rx.duration.trim() ||
      !Number.isInteger(rx.quantity) ||
      rx.quantity < 1
    ) {
      setErrors({
        ...errors,
        medicine:
          "Complete medicine, quantity, dosage, frequency, and duration.",
      });
      return;
    }
    if (record.quantity < allocated + rx.quantity) {
      setMedicineError(
        "Medicine out of stock or insufficient quantity. Select another medicine.",
      );
      return;
    }
    setPrescriptions([
      ...prescriptions,
      { ...rx, name: record.name, price: record.price },
    ]);
    setRx({
      medicine: "",
      quantity: 1,
      dosage: "",
      frequency: "",
      duration: "",
    });
    setErrors({});
  };
  const complete = async () => {
    const nextErrors = {
      ...(!values.weight || values.weight > 500
        ? { weight: "Enter a weight greater than 0 and at most 500 kg." }
        : {}),
      ...(!vaccination && !values.diagnosis.trim()
        ? { diagnosis: "Diagnosis is required." }
        : {}),
      ...(!vaccination && !values.treatment.trim()
        ? { treatment: "Treatment is required." }
        : {}),
      ...(vaccination &&
      (!values.nextDueDate || values.nextDueDate <= values.dateGiven)
        ? { nextDueDate: "Next due date must be after date given." }
        : {}),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (rx.medicine) {
      setErrors({
        medicine:
          "Add this prescription before completing, or clear the medicine selection.",
      });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        appointment: id,
        weight: values.weight,
        diagnosis: vaccination ? "" : values.diagnosis,
        treatment: vaccination ? "" : values.treatment,
        notes: values.notes,
        prescriptions: vaccination
          ? []
          : prescriptions.map(({ name, price, ...record }) => record),
        ...(vaccination
          ? {
              vaccination: {
                vaccine: values.vaccine,
                dateGiven: values.dateGiven,
                nextDueDate: values.nextDueDate,
              },
            }
          : {}),
      };
      const { data } = await api.post("/consultations/complete", payload);
      message.success(
        `Visit completed. Bill ${money(data.bill.total)} created.`,
      );
      navigate("/admin/A11");
    } catch (failure) {
      setError(errorMessage(failure));
      setErrors(failure.response?.data?.errors || {});
      if (/medicine/i.test(errorMessage(failure)))
        setMedicineError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  const historyRows = history.data.flatMap(
    ({ _id, pet, admin, prescriptions: items }) =>
      items.map((item, index) => ({
        ...item,
        _id: `${_id}-${index}`,
        petName: pet?.name,
        adminName: admin?.name,
      })),
  );
  const historyTable = (
    <Panel title="Prescription history">
      <DataTable
        data={historyRows}
        columns={[
          { title: "Pet", dataIndex: "petName" },
          { title: "Admin", dataIndex: "adminName" },
          { title: "Medicine", dataIndex: "name" },
          { title: "Dosage", dataIndex: "dosage" },
          { title: "Frequency", dataIndex: "frequency" },
          { title: "Duration", dataIndex: "duration" },
        ]}
      />
    </Panel>
  );
  if (!id)
    return (
      <>
        <PageHeading
          title={
            params.get("tab") === "prescriptions"
              ? "Prescriptions"
              : "Consultation & Prescription"
          }
        />
        {params.get("tab") === "prescriptions" ? (
          historyTable
        ) : (
          <>
            <Panel title="Choose an approved appointment">
              <RequestState {...appointments} retry={appointments.refresh}>
                <DataTable
                  data={available}
                  columns={[
                    { title: "Pet", render: (_, { pet }) => pet?.name },
                    {
                      title: "Service",
                      render: (_, { service }) => service?.name,
                    },
                    { title: "Date", dataIndex: "date", render: formatDate },
                    {
                      title: "Actions",
                      render: (_, record) => (
                        <Link
                          className="button primary"
                          to={`/admin/${record.service?.type === "Vaccination" ? "A5a" : "A5"}/${record._id}`}
                        >
                          Start Consultation
                        </Link>
                      ),
                    },
                  ]}
                />
              </RequestState>
            </Panel>
            {historyTable}
          </>
        )}
      </>
    );
  return (
    <>
      <PageHeading title="Consultation & Prescription" />
      <RequestState {...appointments} retry={appointments.refresh}>
        {!appointment || appointment.status !== "Approved" ? (
          <Alert
            type="error"
            message="Only Approved appointments can open this form."
            action={<Link to="/admin/A4">Return to queue</Link>}
          />
        ) : (
          <>
            <div className="row spread">
              <h2>
                {shortId(id, "APT-")} · {appointment.pet?.name} ·{" "}
                {appointment.owner?.name} · {appointment.service?.name} ·{" "}
                {formatDate(appointment.date)}, {formatTime(appointment.time)}
              </h2>
              <Status value="Approved" />
            </div>
            <VisitDetails appointment={appointment} />
            {error && <Alert type="error" message={error} />}
            <div className="two-columns">
              <Panel title="Consultation">
                <div className="two-columns">
                  <Field
                    label="Weight (kg)"
                    name="weight"
                    errors={errors}
                    required
                  >
                    <InputNumber
                      id="weight"
                      min={0.01}
                      max={500}
                      value={values.weight}
                      onChange={(value) => change("weight", value)}
                    />
                  </Field>
                  <Field
                    label="Diagnosis"
                    name="diagnosis"
                    errors={errors}
                    required={!vaccination}
                  >
                    <Input
                      id="diagnosis"
                      disabled={vaccination}
                      value={
                        vaccination
                          ? "Not applicable for this service."
                          : values.diagnosis
                      }
                      maxLength={2000}
                      onChange={({ target: { value } }) =>
                        change("diagnosis", value)
                      }
                    />
                  </Field>
                </div>
                <Field
                  label="Treatment"
                  name="treatment"
                  errors={errors}
                  required={!vaccination}
                >
                  <Input.TextArea
                    id="treatment"
                    rows={3}
                    disabled={vaccination}
                    value={
                      vaccination
                        ? "Not applicable for this service."
                        : values.treatment
                    }
                    maxLength={2000}
                    onChange={({ target: { value } }) =>
                      change("treatment", value)
                    }
                  />
                </Field>
                {vaccination ? (
                  <>
                    <Field label="Vaccination given" name="vaccine" required>
                      <Select
                        id="vaccine"
                        value={values.vaccine}
                        onChange={(value) => change("vaccine", value)}
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
                          onChange={({ target: { value } }) =>
                            change("dateGiven", value)
                          }
                        />
                      </Field>
                      <Field
                        label="Next due date"
                        name="nextDueDate"
                        errors={errors}
                        required
                      >
                        <Input
                          id="nextDueDate"
                          type="date"
                          min={values.dateGiven}
                          value={values.nextDueDate}
                          onChange={({ target: { value } }) =>
                            change("nextDueDate", value)
                          }
                        />
                      </Field>
                    </div>
                  </>
                ) : (
                  <Note>Vaccination fields do not apply to this service.</Note>
                )}
                <Field label="Admin notes" name="notes">
                  <Input.TextArea
                    id="notes"
                    rows={3}
                    maxLength={2000}
                    value={values.notes}
                    onChange={({ target: { value } }) => change("notes", value)}
                  />
                </Field>
              </Panel>
              <Panel title="Prescription">
                {vaccination ? (
                  <Note>Not applicable for this service.</Note>
                ) : (
                  <>
                    <Field
                      label="Medicine Inventory"
                      name="medicine"
                      errors={errors}
                    >
                      <Select
                        id="medicine"
                        allowClear
                        value={rx.medicine || undefined}
                        onChange={(value) =>
                          value
                            ? selectMedicine(value)
                            : setRx({ ...rx, medicine: "" })
                        }
                        placeholder="Choose a medicine"
                        options={medicines.data.map(
                          ({ _id, name, quantity, unit, expiryDate }) => ({
                            value: _id,
                            label: `${name} · ${quantity} ${unit} · Expires ${formatDate(expiryDate)}`,
                          }),
                        )}
                      />
                    </Field>
                    <div className="two-columns">
                      {["dosage", "frequency", "duration"].map((key) => (
                        <Field
                          key={key}
                          label={key[0].toUpperCase() + key.slice(1)}
                          name={key}
                        >
                          <Input
                            id={key}
                            maxLength={100}
                            value={rx[key]}
                            onChange={({ target: { value } }) =>
                              setRx({ ...rx, [key]: value })
                            }
                          />
                        </Field>
                      ))}
                      <Field label="Quantity to dispense" name="quantity">
                        <InputNumber
                          id="quantity"
                          min={1}
                          precision={0}
                          value={rx.quantity}
                          onChange={(quantity) => setRx({ ...rx, quantity })}
                        />
                      </Field>
                    </div>
                    <Button onClick={addRx}>Add Prescription</Button>
                    {prescriptions.map(
                      (
                        { name, quantity, dosage, frequency, duration },
                        index,
                      ) => (
                        <div className="prescription-line" key={index}>
                          <strong>
                            {name} · {quantity}
                          </strong>
                          <p>
                            {dosage} · {frequency} · {duration}
                          </p>
                          <Button
                            size="small"
                            onClick={() =>
                              setPrescriptions(
                                prescriptions.filter((_, i) => i !== index),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ),
                    )}
                    <Note>
                      Stock decreases automatically when Save and Complete
                      succeeds.
                    </Note>
                  </>
                )}
              </Panel>
            </div>
            {historyTable}
            <Button type="primary" loading={busy} onClick={complete}>
              Save and Complete
            </Button>
            <Note>
              Completion marks the visit Completed, updates current weight and
              weight history, reduces medicine stock, creates the bill, and
              saves records and reminders for the owner.
            </Note>
          </>
        )}
      </RequestState>
      <Modal
        open={!!medicineError}
        title={
          /expired/i.test(medicineError)
            ? "Medicine Expired"
            : "Medicine Out of Stock"
        }
        onCancel={() => setMedicineError("")}
        footer={
          <Button type="primary" onClick={() => setMedicineError("")}>
            Select another medicine
          </Button>
        }
      >
        <p>{medicineError}</p>
      </Modal>
    </>
  );
}
