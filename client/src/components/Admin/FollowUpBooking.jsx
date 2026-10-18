import { useEffect, useState } from "react";
import { Alert, Checkbox, Input, Select } from "antd";
import { api, errorMessage, formatTime } from "../../api";
import { Field, Panel } from "../Shared/UI";
export default function FollowUpBooking({ value, onChange, errors, minDate, pet }) {
  const [petBooked, setPetBooked] = useState(false);
  const [slots, setSlots] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (!value.enabled || !value.date) { setSlots([]); return; }
    let active = true;
    setLoading(true); setError(""); setSlots([]);
    api.get(`/appointments/slots?date=${value.date}&pet=${encodeURIComponent(pet)}`).then(({ data }) => { if (active) { setSlots(data.slots); setPetBooked(Boolean(data.petDailyLimitReached)); } })
      .catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [value.enabled, value.date, pet]);
  const change = (key, next) => onChange({ ...value, [key]: next });
  return <Panel title="Follow-up appointment">
    <Checkbox checked={value.enabled} onChange={e => change("enabled", e.target.checked)}>Book a follow-up visit</Checkbox>
    {value.enabled && <>
      <p className="muted">This follow-up will be booked as Approved when you save and complete the consultation.</p>
      <div className="prescription-grid">
        <Field label="Follow-up date" name="followUpDate" errors={errors} required><Input id="followUpDate" type="date" min={minDate} value={value.date} onChange={e => onChange({ ...value, date: e.target.value, time: "" })} /></Field>
        <Field label="Follow-up time" name="followUpTime" errors={errors} required><Select id="followUpTime" showSearch optionFilterProp="label" placeholder="Choose an available time" loading={loading} value={value.time || undefined} onChange={v => change("time", v)} options={slots.map(slot => ({ value: slot.time, label: `${formatTime(slot.time)}${slot.status === "Full" ? " · Fully booked" : slot.status !== "Available" ? " · Unavailable" : ""}`, disabled: petBooked || slot.status !== "Available" }))} /></Field>
        <Field label="Reason for follow-up" name="followUpPurpose" errors={errors} required><Input id="followUpPurpose" maxLength={2000} value={value.purpose} placeholder="What should be checked at the return visit?" onChange={e => change("purpose", e.target.value)} /></Field>
        <Field label="Preparation (optional)" name="followUpInstructions"><Input id="followUpInstructions" maxLength={2000} value={value.instructions} placeholder="What should the owner bring or prepare?" onChange={e => change("instructions", e.target.value)} /></Field>
      </div>
      {petBooked && <Alert type="info" message="This pet already has an appointment on this date. Choose another date for the follow-up." />}
      {error && <Alert type="error" message={error} />}
    </>}
  </Panel>;
}
