import { appointmentId, formatDateTime } from "../../api";
import { screenPath, screenFromPath } from "../../routes";
import NumericInput from "../Shared/NumericInput";
import PictureUpload from "../Shared/PictureUpload";
import PetRegistrationFields from "../Shared/PetRegistrationFields";
import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, Steps } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  api,
  dayKey,
  errorMessage,
  formatDate,
  formatTime,
  isFollowUpService,
  serviceLabel,
} from "../../api";
import { Details, Field, Note, Panel, Status, useResource } from "../Shared/UI";
import { PageHeading, PetCards } from "../Owner/OwnerPages";
import { DashboardIcon } from "../Shared/Dashboard";
const blank = {
  bookingType: "With record",
  pet: "",
  registration: {
    name: "",
    species: "Dog",
    otherSpecies: "",
    breed: "",
    birthDate: "",
    weight: null,
    picture: "",
  },
  date: "",
  time: "",
  service: "",
  reasonForVisit: "",
};
export function SchedulePicker({
  value,
  onChange,
  errors = {},
  showService = true,
  collectVisitDetails = false,
  excludeId,
  allowFollowUp = true,
}) {
  const rescheduleQuery = excludeId
    ? `&excludeId=${encodeURIComponent(excludeId)}`
    : "";
  const petQuery = value.bookingType !== "No record" && value.pet ? `&pet=${encodeURIComponent(value.pet)}` : "";
  const services = useResource("/services");
  const selectedService = services.data.find(
    ({ _id }) => _id === value.service,
  );
  const isFollowUp = /follow[ -]?up/i.test(selectedService?.name || "");
  const [month, setMonth] = useState(
    () => new Date(`${value.date || dayKey()}T12:00:00`),
  );
  const [availability, setAvailability] = useState({});
  const [slots, setSlots] = useState([]);
  const [petDailyLimitReached, setPetDailyLimitReached] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const year = month.getFullYear();
  const index = month.getMonth();
  const days = new Date(year, index + 1, 0).getDate();
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setAvailability({});
    const dates = Array.from(
      { length: days },
      (_, i) =>
        `${year}-${String(index + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    );
    Promise.all(
      dates.map((date) =>
        api
          .get(`/appointments/slots?date=${date}${rescheduleQuery}`)
          .then(({ data }) => [date, data.slots]),
      ),
    )
      .then((results) => {
        if (active) setAvailability(Object.fromEntries(results));
      })
      .catch((failure) => active && setError(errorMessage(failure)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year, index, days, rescheduleQuery, retry]);
  useEffect(() => {
    if (!value.date) return;
    let active = true;
    setSlots([]);
    const refresh = () => api
      .get(`/appointments/slots?date=${value.date}${rescheduleQuery}${petQuery}`)
      .then(({ data }) => {
        if (!active) return;
        setSlots(data.slots);
        setPetDailyLimitReached(Boolean(data.petDailyLimitReached));
        setAvailability(current => ({ ...current, [value.date]: data.slots }));
      })
      .catch((failure) => active && setError(errorMessage(failure)));
    refresh();
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [value.date, rescheduleQuery, petQuery, retry]);
  const chooseDate = (date) => onChange({ ...value, date, time: "" });
  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          message="Appointment availability is unavailable"
          description={`${error} If the database was reset, ask the clinic administrator to configure Schedule Settings and Services before booking.`}
          action={<Button onClick={() => setRetry((count) => count + 1)}>Retry</Button>}
        />
      )}
      <div className="two-columns schedule-columns">
        <Panel
          title={month.toLocaleDateString("en-PH", {
            month: "long",
            year: "numeric",
          })}
          action={
            <div className="row">
              <Button
                aria-label="Previous month"
                onClick={() => setMonth(new Date(year, index - 1, 1))}
              >
                ‹
              </Button>
              <Button
                aria-label="Next month"
                onClick={() => setMonth(new Date(year, index + 1, 1))}
              >
                ›
              </Button>
            </div>
          }
        >
          <div className="calendar">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <strong key={day}>{day}</strong>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${year}-${String(index + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
              const values = availability[date] || [];
              const state =
                date < dayKey()
                  ? "Past"
                  : values.some(({ status }) => status === "Available")
                    ? "Available"
                    : values.some(({ status }) => status === "Full")
                      ? "Full"
                      : values.length &&
                          values.every(({ status }) => status === "Past")
                        ? "Past"
                        : values.length
                          ? "Blocked"
                          : loading
                            ? "Loading"
                            : "Unavailable";
              return (
                <button
                  key={date}
                  type="button"
                  className={`calendar-day ${date === value.date ? "selected" : ""} ${state === "Loading" ? "calendar-loading" : state.toLowerCase()}`}
                  disabled={
                    ["Full", "Blocked", "Past", "Loading", "Unavailable"].includes(state) || loading || !!error
                  }
                  onClick={() => chooseDate(date)}
                >
                  <strong>{i + 1}</strong>
                  <small>{date === value.date && state === "Available" ? "Selected" : state === "Full" ? "Fully booked" : state === "Blocked" ? "Closed" : state}</small>
                </button>
              );
            })}
          </div>
          <small className="muted">
            Available · Fully booked · Closed · Past · Selected
          </small>
        </Panel>
        <Panel title="Appointment details">
          {showService && (
            <Field
              label="Medical service"
              name="service"
              errors={errors}
              required
            >
              <Select
                id="service"
                value={value.service || undefined}
                placeholder="Choose a medical service"
                onChange={(service) =>
                  onChange({
                    ...value,
                    service,
                    reasonForVisit:
                      services.data.find(({ _id }) => _id === service)?.type ===
                      "Consultation"
                        ? value.reasonForVisit || ""
                        : "",
                  })
                }
                options={services.data.filter(service => service.type !== "Emergency").map(({ _id, name }) => ({
                  value: _id,
                  label: serviceLabel({ _id, name }),
                  disabled: !allowFollowUp && isFollowUpService({ name }),
                }))}
              />
            </Field>
          )}
          {collectVisitDetails && selectedService?.type === "Consultation" && (
            <Field
              label={
                isFollowUp
                  ? "Follow-up notes (optional)"
                  : "Symptoms and reason for consultation"
              }
              name="reasonForVisit"
              errors={errors}
              required={!isFollowUp}
            >
              <Input.TextArea
                id="reasonForVisit"
                rows={5}
                minLength={isFollowUp ? undefined : 20}
                maxLength={2000}
                value={value.reasonForVisit || ""}
                status={errors.reasonForVisit ? "error" : undefined}
                onChange={({ target: { value: explanation } }) =>
                  onChange({ ...value, reasonForVisit: explanation })
                }
                placeholder={
                  isFollowUp
                    ? "Optional: share an update or anything you would like the clinic to check."
                    : "Describe your pet’s symptoms, when they started, changes in appetite or behavior, and any medicine already given. For a routine checkup, explain what you want the clinic to check."
                }
              />
              <small className="character-count">
                {(value.reasonForVisit || "").length} / 2,000 characters
              </small>
              <small className="muted">
                {isFollowUp
                  ? "These notes are optional for a follow-up checkup."
                  : "Include when the symptoms started, how often they happen, and any changes you have noticed."}{" "}
                {isFollowUp
                  ? "Use up to 2,000 characters if you have an update."
                  : "Use 20–2,000 characters. The clinic will read this before the visit."}
              </small>
            </Field>
          )}
          <h3>
            {value.date ? formatDate(value.date) : "Choose an available date"}
          </h3>
          {petDailyLimitReached && <Alert type="info" message="This pet already has an appointment on this date. Choose another date or a different pet. Other pets can still book available times." />}
          <p>Available time slots</p>
          <div className="row wrap">
            {slots.map(({ time, status }) => (
              <Button
                key={time}
                disabled={petDailyLimitReached || status !== "Available"}
                type={value.time === time && status === "Available" ? "primary" : "default"}
                onClick={() => onChange({ ...value, time })}
              >
                {formatTime(time)}
                {status !== "Available" ? ` · ${status === "Full" ? "Fully booked" : status === "Blocked" ? "Closed" : status}` : ""}
              </Button>
            ))}
          </div>
          {errors.time && <small className="error-text">{errors.time}</small>}
          <p className="muted">
            Each visit reserves one 30-minute slot. Pending and approved bookings
            make that time unavailable. Each pet can have only one appointment per day.
          </p>
        </Panel>
      </div>
    </>
  );
}
export default function Booking() {
  const [draft, setDraft] = useState(() => {
    try {
      return {
        ...blank,
        ...(JSON.parse(sessionStorage.getItem("furpawsDraft")) || {}),
      };
    } catch {
      return blank;
    }
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(null); // null | "sending" | "success"
  const [error, setError] = useState("");
  const [full, setFull] = useState(false);
  const [confirmation, setConfirmation] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("furpawsConfirmation"));
    } catch {
      return null;
    }
  });
  const pets = useResource("/pets");
  const services = useResource("/services");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const step = screenFromPath("owner", pathname);
  const [form] = Form.useForm();
  useEffect(() => {
    sessionStorage.setItem("furpawsDraft", JSON.stringify(draft));
  }, [draft]);
  useEffect(() => {
    setError("");
    setErrors({});
  }, [step]);
  useEffect(() => {
    if (step === "U5") form.setFieldsValue(draft.registration);
  }, [step, form, draft.registration]);
  const pet = pets.data.find(({ _id }) => _id === draft.pet);
  const service = services.data.find(({ _id }) => _id === draft.service);
  const go = (screen) => navigate(`/owner/${screenPath("owner", screen)}`);
  const updateSchedule = (nextDraft) => {
    setDraft(nextDraft);
    const length = (nextDraft.reasonForVisit || "").trim().length;
    if (
      ((isFollowUpService(
        services.data.find((s) => s._id === nextDraft.service),
      ) ||
        length >= 20) &&
        length <= 2000) ||
      services.data.find(({ _id }) => _id === nextDraft.service)?.type !==
        "Consultation"
    ) {
      setErrors((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([field]) => field !== "reasonForVisit",
          ),
        ),
      );
    }
  };
  const next = () => {
    if (step === "U4") {
      if (draft.bookingType === "With record" && !draft.pet) {
        setErrors({ pet: "Select an approved pet." });
        return;
      }
      go(draft.bookingType === "With record" ? "U6" : "U5");
    } else if (step === "U6") {
      const nextErrors = {
        ...(!draft.date ? { date: "Choose a date." } : {}),
        ...(!draft.time ? { time: "Choose an available time." } : {}),
        ...(!draft.service ? { service: "Choose a medical service." } : {}),
        ...(service?.type === "Consultation" &&
        !isFollowUpService(service) &&
        ((draft.reasonForVisit || "").trim().length < 20 ||
          (draft.reasonForVisit || "").trim().length > 2000)
          ? {
              reasonForVisit:
                "Please give a detailed explanation using 20–2,000 characters.",
            }
          : {}),
      };
      setErrors(nextErrors);
      if (!Object.keys(nextErrors).length) go("U7");
    }
  };
  const submit = async () => {
    if (busy) return;
    if (
      service?.type === "Consultation" &&
      !isFollowUpService(service) &&
      ((draft.reasonForVisit || "").trim().length < 20 ||
        (draft.reasonForVisit || "").trim().length > 2000)
    ) {
      setErrors({
        reasonForVisit:
          "Please give a detailed explanation using 20–2,000 characters.",
      });
      go("U6");
      return;
    }
    setBusy(true);
    setError("");
    setPhase("sending");
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    try {
      // Hold the "sending" animation for a moment so it never just flashes.
      const [{ data }] = await Promise.all([
        api.post("/appointments", draft),
        pause(1400),
      ]);
      const saved = {
        ...data,
        petName: pet?.name || draft.registration.name,
        serviceName: service?.name,
      };
      setConfirmation(saved);
      sessionStorage.setItem("furpawsConfirmation", JSON.stringify(saved));
      window.localStorage.setItem("furpaws:refresh", String(Date.now()));
      setPhase("success");
      await pause(1500);
      sessionStorage.removeItem("furpawsDraft");
      setDraft(blank);
      go("U8");
    } catch (failure) {
      setError(errorMessage(failure));
      setErrors(failure.response?.data?.errors || {});
      if (
        failure.response?.status === 409 &&
        /slot/i.test(errorMessage(failure))
      )
        setFull(true);
    } finally {
      setBusy(false);
      setPhase(null);
    }
  };
  const titles = {
    U4: "Book Appointment · Step 1",
    U5: "Book Appointment · Step 2 · Pet Registration",
    U6: "Book Appointment · Step 3 · Schedule",
    U7: "Book Appointment · Step 4 · Review",
    U8: "Book Appointment · Confirmation",
  };
  return (
    <>
      <PageHeading title={titles[step] || titles.U4} />
      {step !== "U8" && (
        <Steps
          size="small"
          current={{ U4: 0, U5: 1, U6: 2, U7: 3 }[step]}
          items={["Pet record", "Pet registration", "Schedule", "Review"].map(
            (title) => ({ title }),
          )}
        />
      )}{" "}
      {error && <Alert type="error" showIcon message={error} />}
      {step === "U4" && (
        <>
          <Panel title="Does your pet have a clinic record?">
            <div className="two-columns">
              {["With record", "No record"].map((bookingType) => (
                <button
                  key={bookingType}
                  className={`choice ${draft.bookingType === bookingType ? "selected" : ""}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      bookingType,
                      ...(bookingType === "No record" &&
                      isFollowUpService(service)
                        ? { service: "", reasonForVisit: "" }
                        : {}),
                    })
                  }
                >
                  <h2>{bookingType}</h2>
                  <p>
                    {bookingType === "With record"
                      ? "Select one of your approved pets."
                      : "Register a new pet as part of your appointment request."}
                  </p>
                  {draft.bookingType === bookingType && (
                    <strong>● {bookingType} selected</strong>
                  )}
                </button>
              ))}
            </div>
          </Panel>
          {draft.bookingType === "With record" && (
            <>
              <h2>Select a pet</h2>
              {pets.data.length ? (
                <PetCards
                  pets={pets.data}
                  selected={draft.pet}
                  select={(pet) => setDraft({ ...draft, pet, time: "" })}
                />
              ) : (
                <Note>No pets. Choose No record to register a new pet.</Note>
              )}
              {errors.pet && <p className="error-text">{errors.pet}</p>}
            </>
          )}
          <div className="row booking-actions"><Button type="primary" onClick={next}>
            Continue
          </Button></div>
          <Note>
            With record skips Pet Registration and proceeds to Schedule. No
            record continues to the Pet Registration Form.
          </Note>
        </>
      )}
      {step === "U5" && (
        <Panel title="Pet Registration Form">
          <p>Booking type: No record</p>
          <Form
            form={form}
            onValuesChange={(changed, values) => {
              const reset = changed.species
                ? { breed: undefined, otherSpecies: "" }
                : {};
              if (changed.species) form.setFieldsValue(reset);
              setDraft((current) => ({
                ...current,
                registration: { ...current.registration, ...values, ...reset },
              }));
            }}
            layout="vertical"
            onFinish={(values) => {
              setDraft({
                ...draft,
                registration: { ...draft.registration, ...values },
              });
              go("U6");
            }}
          >
            <div className="two-columns">
              <Form.Item
                label="Pet name"
                name="name"
                rules={[{ required: true, min: 1, max: 80 }]}
              >
                <Input />
              </Form.Item>
              <PetRegistrationFields form={form} />
              <Form.Item
                label="Date of birth"
                name="birthDate"
                rules={[
                  { required: true },
                  {
                    validator: (_, value) =>
                      value > dayKey()
                        ? Promise.reject(
                            new Error("Birth date cannot be in the future."),
                          )
                        : Promise.resolve(),
                  },
                ]}
              >
                <Input type="date" max={dayKey()} />
              </Form.Item>
              <Form.Item
                label="Estimated weight (kg, optional)"
                name="weight"
                extra="Estimate only. The clinic will measure the actual weight during the visit."
                rules={[{ type: "number", min: 0.01, max: 500 }]}
              >
                <NumericInput
                  min={0.01}
                  max={500}
                  step={0.1}
                  placeholder="Leave blank if unsure"
                />
              </Form.Item>
              <PictureUpload
                value={draft.registration.picture}
                onChange={(picture) =>
                  setDraft((current) => ({
                    ...current,
                    registration: { ...current.registration, picture },
                  }))
                }
              />
            </div>
            <div className="row booking-actions">
              <Button onClick={() => go("U4")}>Back</Button>
              <Button htmlType="submit" type="primary">
                Continue
              </Button>
            </div>
          </Form>
          <Note>
            The pet stays hidden from My Pets until approved or after the
            completed checkup.
          </Note>
        </Panel>
      )}
      {step === "U6" && (
        <>
          <SchedulePicker
            value={draft}
            onChange={updateSchedule}
            errors={errors}
            collectVisitDetails
            allowFollowUp={draft.bookingType === "With record"}
          />
          {errors.date && <p className="error-text">{errors.date}</p>}
          <div className="row booking-actions">
            <Button
              onClick={() =>
                go(draft.bookingType === "No record" ? "U5" : "U4")
              }
            >
              Back
            </Button>
            <Button type="primary" onClick={next}>
              Continue
            </Button>
          </div>
          <Note>
            Availability is checked again by the backend at submission.
          </Note>
        </>
      )}
      {step === "U7" && (
        <>
          <Panel title="Review your appointment" className="booking-review-card">
            <div className="booking-review-banner"><DashboardIcon name="calendar" /><div><h3>One last look before their visit</h3><p>Check your pet, service and preferred time. The clinic will review your request.</p></div></div>
            <Details
              entries={[
                ["Booking type", draft.bookingType],
                ["Pet", pet?.name || draft.registration.name],
                ["Service", service?.name],
                ...(service?.type === "Consultation"
                  ? [["Owner’s explanation / symptoms", draft.reasonForVisit]]
                  : []),
                ["Date", formatDate(draft.date)],
                ["Time", formatTime(draft.time)],
              ]}
            />
            <Note>
              {draft.bookingType === "No record"
                ? "Your new pet will remain Pending until clinic approval."
                : "Please check the pet and schedule before submitting."}
            </Note>
            <div className="row booking-actions">
              <Button disabled={busy} onClick={() => go("U6")}>
                Back
              </Button>
              <Button
                type="primary"
                loading={busy}
                disabled={!draft.date || !draft.time || !draft.service}
                onClick={submit}
              >
                Submit Appointment
              </Button>
            </div>
          </Panel>
          <Note>
            The request will be Pending. The clinic will notify you of its
            decision.
          </Note>
        </>
      )}
      {step === "U8" &&
        (confirmation ? (
          <Panel title="Appointment submitted" className="booking-confirmed">
            <div className="booking-confirmation-banner"><span className="booking-success-icon"><DashboardIcon name="check" /></span><div><span className="portal-kicker">Request received</span><h2>You’re one step closer to their care.</h2><p>The clinic will review your request and notify you of its decision.</p><Status value="Pending" /></div><div className="booking-reference"><span>Appointment</span><strong>{appointmentId(confirmation)}</strong></div></div>
            <Details
              entries={[
                ["Appointment", appointmentId(confirmation)],
                ["Created", formatDateTime(confirmation.createdAt)],
                ["Booking type", confirmation.bookingType],
                ["Pet", confirmation.petName],
                ["Service", confirmation.serviceName],
                ...(confirmation.reasonForVisit
                  ? [
                      [
                        "Owner’s explanation / symptoms",
                        confirmation.reasonForVisit,
                      ],
                    ]
                  : []),
                ["Date", formatDate(confirmation.date)],
                ["Time", formatTime(confirmation.time)],
              ]}
            />
            <div className="row booking-actions">
              <Link className="button primary" to="/owner/my-appointments">
                View My Appointments
              </Link>
              <Link className="button" to="/owner/dashboard">
                Back to Dashboard
              </Link>
            </div>
            <Note>
              You will receive a notification when the clinic approves or
              declines this request.
            </Note>
          </Panel>
        ) : (
          <Panel>
            <p>No submitted appointment to display.</p>
            <Link to="/owner/book-appointment">Book an appointment</Link>
          </Panel>
        ))}
      {phase && (
        <div className="booking-overlay" role="status" aria-live="polite">
          <div
            className={`booking-overlay-card${phase === "success" ? " is-success" : ""}`}
          >
            <div className="booking-orb">
              <span className="booking-orb-ring" />
              <span className="booking-orb-paw">
                <DashboardIcon name="pet" />
              </span>
              <svg
                className="booking-check"
                viewBox="0 0 52 52"
                aria-hidden="true"
              >
                <circle cx="26" cy="26" r="23" />
                <path d="M15 27.5l8 8 15-17" />
              </svg>
            </div>
            <strong>
              {phase === "success" ? "Request sent!" : "Sending your request…"}
            </strong>
            <span>
              {phase === "success"
                ? "The clinic will review it shortly."
                : "Reserving your preferred time."}
            </span>
          </div>
        </div>
      )}
      <Modal
        open={full}
        title="This slot is full"
        onCancel={() => setFull(false)}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setFull(false);
              setDraft({ ...draft, time: "" });
              go("U6");
            }}
          >
            Choose another time
          </Button>
        }
      >
        <p>The selected time has reached the clinic booking limit.</p>
        <Note error>{error}</Note>
      </Modal>
    </>
  );
}
