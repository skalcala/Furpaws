import { useEffect, useState } from "react";
import { Alert, AutoComplete, Button, Input, Select } from "antd";
import { useAuth } from "../Auth/AuthContext";
import { Field, useResource } from "../Shared/UI";
import NumericInput from "../Shared/NumericInput";
const blank = { medicine: "", quantity: 1, dosage: "", frequency: "", duration: "", instructions: "" };
const choices = values => values.map(value => ({ value, label: value }));

export default function PrescriptionEditor({ pet, value, onChange, errors, onPendingChange }) {
  const { user } = useAuth();
  const medicines = useResource("/medicines");
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState("");
  const pending = [draft.medicine, draft.dosage, draft.frequency, draft.duration, draft.instructions].some(text => text.trim()) || draft.quantity !== 1;
  useEffect(() => { onPendingChange(pending); }, [pending, onPendingChange]);
  const change = (key, next) => setDraft(current => ({ ...current, [key]: next }));
  const add = () => {
    if (!draft.medicine.trim() || !draft.dosage.trim() || !Number.isInteger(draft.quantity) || draft.quantity < 1) {
      setError("Enter a medicine, prescribed dosage and whole-number quantity.");
      return;
    }
    const line = `${draft.medicine.trim()} · Quantity: ${draft.quantity} · Dose: ${draft.dosage.trim()}${draft.frequency ? ` · ${draft.frequency}` : ""}${draft.duration ? ` · ${draft.duration}` : ""}${draft.instructions.trim() ? ` · Instructions: ${draft.instructions.trim()}` : ""}`;
    const next = [value.trim() === "N/A" ? "" : value.trim(), line].filter(Boolean).join("\n");
    if (next.length > 2000) { setError("Prescription must be at most 2,000 characters."); return; }
    onChange(next);
    setDraft(blank);
    setError("");
  };
  return <div className="prescription-editor">
    <p className="muted">Add medicines and instructions for this visit. Review the prescription before completing the consultation.</p>
    <div className="prescription-grid">
      <Field label="Patient" name="prescription-patient"><Input id="prescription-patient" value={pet?.name || ""} readOnly /></Field>
      <Field label="Prescribed by" name="prescription-admin"><Input id="prescription-admin" value={user.name} readOnly /></Field>
      <Field label="Medicine" name="prescription-medicine"><AutoComplete id="prescription-medicine" value={draft.medicine} options={choices(medicines.data.map(item => item.name))} filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())} onChange={v => change("medicine", v)} maxLength={100} placeholder="Choose or enter medicine" /></Field>
      <Field label="Quantity" name="prescription-quantity"><NumericInput id="prescription-quantity" min={1} max={1000} precision={0} value={draft.quantity} onChange={v => change("quantity", v)} /></Field>
      <Field label="Dosage" name="prescription-dosage"><Input id="prescription-dosage" value={draft.dosage} onChange={e => change("dosage", e.target.value)} maxLength={100} placeholder="Enter prescribed dose and unit" /></Field>
      <Field label="Frequency" name="prescription-frequency"><Select id="prescription-frequency" allowClear value={draft.frequency || undefined} onChange={v => change("frequency", v || "")} options={choices(["Once daily", "Twice daily", "Three times daily", "As directed"])} placeholder="Choose frequency" /></Field>
      <Field label="Duration" name="prescription-duration"><AutoComplete id="prescription-duration" value={draft.duration} options={choices(["3 days", "5 days", "7 days", "10 days", "14 days", "As directed"])} onChange={v => change("duration", v)} maxLength={100} placeholder="Choose or enter duration" /></Field>
      <Field label="Instructions" name="prescription-instructions"><Input id="prescription-instructions" value={draft.instructions} onChange={e => change("instructions", e.target.value)} maxLength={500} placeholder="Additional directions for the owner" /></Field>
    </div>
    {error && <Alert type="error" message={error} />}
    {medicines.error && <small className="muted">Medicine list unavailable. You can enter the medicine name.</small>}
    <div className="prescription-add-actions"><Button onClick={() => { setDraft(blank); setError(""); }}>Clear medicine fields</Button><Button type="primary" onClick={add}>Add to prescription</Button></div>
    <Field label="Prescription" name="prescription" required errors={errors}>
      <Input.TextArea id="prescription" rows={4} maxLength={2000} value={value} placeholder="Added medicines appear here. You can also enter instructions directly, or N/A when no prescription is needed." onChange={e => onChange(e.target.value)} />
    </Field>
  </div>;
}
