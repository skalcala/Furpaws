import { useEffect, useState } from "react";
import { Alert, AutoComplete, Button, Checkbox, Input, Select } from "antd";
import { Field, useResource } from "../Shared/UI";
import NumericInput from "../Shared/NumericInput";
const blank = { medicine: "", quantity: 1, dosage: "", frequency: "", duration: "", instructions: "" };
const choices = values => values.map(value => ({ value, label: value }));

export default function PrescriptionEditor({ pet, value, onChange, errors, onPendingChange }) {
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
    <p className="muted">Add each medicine once. Medication directions appear in the summary below; recovery advice belongs in Treatment & home care.</p>
    <div className="prescription-grid">
      <Field label="Patient" name="prescription-patient"><Input id="prescription-patient" value={pet?.name || ""} readOnly /></Field>
      <Field label="Medicine" name="prescription-medicine"><AutoComplete id="prescription-medicine" value={draft.medicine} options={choices(medicines.data.map(item => item.name))} filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())} onChange={v => change("medicine", v)} maxLength={100} placeholder="Choose or enter medicine" /></Field>
      <Field label="Quantity" name="prescription-quantity"><NumericInput id="prescription-quantity" min={1} max={1000} precision={0} value={draft.quantity} onChange={v => change("quantity", v)} /></Field>
      <Field label="Dosage" name="prescription-dosage"><Input id="prescription-dosage" value={draft.dosage} onChange={e => change("dosage", e.target.value)} maxLength={100} placeholder="Enter prescribed dose and unit" /></Field>
      <Field label="Frequency" name="prescription-frequency"><Select id="prescription-frequency" allowClear value={draft.frequency || undefined} onChange={v => change("frequency", v || "")} options={choices(["Once daily", "Twice daily", "Three times daily", "As directed"])} placeholder="Choose frequency" /></Field>
      <Field label="Duration" name="prescription-duration"><AutoComplete id="prescription-duration" value={draft.duration} options={choices(["3 days", "5 days", "7 days", "10 days", "14 days", "As directed"])} onChange={v => change("duration", v)} maxLength={100} placeholder="Choose or enter duration" /></Field>
      <Field label="Medication directions" name="prescription-instructions"><Input id="prescription-instructions" value={draft.instructions} onChange={e => change("instructions", e.target.value)} maxLength={500} placeholder="Directions specific to this medicine" /></Field>
    </div>
    {error && <Alert type="error" message={error} />}
    {medicines.error && <small className="muted">Medicine list unavailable. You can enter the medicine name.</small>}
    <div className="prescription-add-actions"><Button onClick={() => { setDraft(blank); setError(""); }}>Clear medicine fields</Button><Button type="primary" onClick={add}>Add to prescription</Button></div>
    <Checkbox checked={value.trim() === "N/A"} onChange={e => { onChange(e.target.checked ? "N/A" : ""); setDraft(blank); setError(""); }}>No medication prescribed</Checkbox>
    <div className="prescription-summary" aria-label="Prescription summary">
      <div className="row spread"><h3>Medication summary</h3>{value && value !== "N/A" && <Button size="small" onClick={() => onChange("")}>Clear prescription</Button>}</div>
      <p data-testid="prescription-summary-text">{value === "N/A" ? "No medication prescribed." : value || "No medicines added yet."}</p>
      {errors.prescription && <small className="error-text" role="alert">{errors.prescription}</small>}
    </div>
  </div>;
}
