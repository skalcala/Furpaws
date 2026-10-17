import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Steps,
} from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  api,
  dayKey,
  errorMessage,
  formatDate,
  formatTime,
  shortId,
} from "../../api";
import { Details, Field, Note, Panel, Status, useResource } from "../Shared/UI";
import { PageHeading, PetCards } from "../Owner/OwnerPages";
const blank = {
  bookingType: "With record",
  pet: "",
  registration: {
    name: "",
    species: "Dog",
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
}) {
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const year = month.getFullYear();
  const index = month.getMonth();
  const days = new Date(year, index + 1, 0).getDate();
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const dates = Array.from(
      { length: days },
      (_, i) =>
        `${year}-${String(index + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    );
    Promise.all(
      dates.map((date) =>
        api
          .get(`/appointments/slots?date=${date}`)
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
  }, [year, index, days]);
  useEffect(() => {
    if (!value.date) return;
    let active = true;
    api
      .get(`/appointments/slots?date=${value.date}`)
      .then(({ data }) => active && setSlots(data.slots))
      .catch((failure) => active && setError(errorMessage(failure)));
    return () => {
      active = false;
    };
  }, [value.date]);
  const chooseDate = (date) => onChange({ ...value, date, time: "" });
  return (
    <>
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
                      : values.length
                        ? "Blocked"
                        : "Loading";
              return (
                <button
                  key={date}
                  type="button"
                  className={`calendar-day ${date === value.date ? "selected" : ""} ${state.toLowerCase()}`}
                  disabled={state !== "Available" || loading}
                  onClick={() => chooseDate(date)}
                >
                  <strong>{i + 1}</strong>
                  <small>{date === value.date ? "Selected" : state}</small>
                </button>
              );
            })}
          </div>
          <small className="muted">
            Available · Full · Blocked · Past · Selected
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
                options={services.data.map(({ _id, name }) => ({
                  value: _id,
                  label: name,
                }))}
              />
            </Field>
          )}
          {collectVisitDetails && selectedService?.type === "Consultation" && (
            <Field
              label={
                isFollowUp
                  ? "Follow-up details and current symptoms"
                  : "Symptoms and reason for consultation"
              }
              name="reasonForVisit"
              errors={errors}
              required
            >
              <Input.TextArea
                id="reasonForVisit"
                rows={5}
                minLength={20}
                maxLength={2000}
                value={value.reasonForVisit || ""}
                status={errors.reasonForVisit ? "error" : undefined}
                onChange={({ target: { value: explanation } }) =>
                  onChange({ ...value, reasonForVisit: explanation })
                }
                placeholder={
                  isFollowUp
                    ? "Describe the previous visit or treatment, your pet’s progress, any current symptoms, and what you want checked during this follow-up."
                    : "Describe your pet’s symptoms, when they started, changes in appetite or behavior, and any medicine already given. For a routine checkup, explain what you want the clinic to check."
                }
              />
              <small className="character-count">
                {(value.reasonForVisit || "").length} / 2,000 characters
              </small>
              <small className="muted">
                {isFollowUp
                  ? "Include the previous visit or treatment and any improvement or worsening."
                  : "Include when the symptoms started, how often they happen, and any changes you have noticed."}{" "}
                Use 20–2,000 characters. The clinic will read this before the
                visit.
              </small>
            </Field>
          )}
          <h3>
            {value.date ? formatDate(value.date) : "Choose an available date"}
          </h3>
          <p>Available time slots</p>
          <div className="row wrap">
            {slots.map(({ time, status }) => (
              <Button
                key={time}
                disabled={status !== "Available"}
                type={value.time === time ? "primary" : "default"}
                onClick={() => onChange({ ...value, time })}
              >
                {formatTime(time)}
                {status !== "Available" ? ` · ${status}` : ""}
              </Button>
            ))}
          </div>
          {errors.time && <small className="error-text">{errors.time}</small>}
          <p className="muted">
            Full dates and times are disabled. Blocked and past dates cannot be
            selected.
          </p>
        </Panel>
      </div>
      {error && <Alert type="error" message={error} />}
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
  const step = pathname.split("/").at(-1);
  const [form] = Form.useForm();
  const { message } = App.useApp();
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
  const go = (screen) => navigate(`/owner/${screen}`);
  const updateSchedule = (nextDraft) => {
    setDraft(nextDraft);
    const length = (nextDraft.reasonForVisit || "").trim().length;
    if (
      (length >= 20 && length <= 2000) ||
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
    try {
      const { data } = await api.post("/appointments", draft);
      const saved = {
        ...data,
        petName: pet?.name || draft.registration.name,
        serviceName: service?.name,
      };
      setConfirmation(saved);
      sessionStorage.setItem("furpawsConfirmation", JSON.stringify(saved));
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
    }
  };
  const upload = ({ target }) => {
    const file = target.files[0];
    if (!file) return;
    if (
      file.size > 2000000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      message.error("Use a JPG, PNG, or WebP image up to 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setDraft((current) => ({
        ...current,
        registration: { ...current.registration, picture: reader.result },
      }));
    reader.readAsDataURL(file);
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
                  onClick={() => setDraft({ ...draft, bookingType })}
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
                  select={(pet) => setDraft({ ...draft, pet })}
                />
              ) : (
                <Note>No pets. Choose No record to register a new pet.</Note>
              )}
              {errors.pet && <p className="error-text">{errors.pet}</p>}
            </>
          )}
          <Button type="primary" onClick={next}>
            Continue
          </Button>
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
            onValuesChange={(_, values) =>
              setDraft((current) => ({
                ...current,
                registration: { ...current.registration, ...values },
              }))
            }
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
              <Form.Item
                label="Species"
                name="species"
                rules={[{ required: true }]}
              >
                <Select
                  options={["Dog", "Cat", "Other"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Form.Item>
              <Form.Item
                label="Breed"
                name="breed"
                rules={[{ required: true, max: 80 }]}
              >
                <Input />
              </Form.Item>
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
                label="Weight (kg)"
                name="weight"
                rules={[
                  { required: true, type: "number", min: 0.01, max: 500 },
                ]}
              >
                <InputNumber min={0.01} max={500} step={0.1} />
              </Form.Item>
              <div className="field">
                <label htmlFor="picture">Picture upload (up to 2 MB)</label>
                <input
                  id="picture"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={upload}
                />
                {draft.registration.picture && <small>Picture selected</small>}
              </div>
            </div>
            <div className="row">
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
          />
          {errors.date && <p className="error-text">{errors.date}</p>}
          <div className="row">
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
          <Panel title="Review your appointment">
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
            <div className="row">
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
          <Panel title="Appointment submitted">
            <p>Your request is with the clinic.</p>
            <Status value="Pending" />
            <h2>Waiting for Admin approval</h2>
            <Details
              entries={[
                ["Appointment", shortId(confirmation._id, "APT-")],
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
            <div className="row">
              <Link className="button primary" to="/owner/U9">
                View My Appointments
              </Link>
              <Link className="button" to="/owner/U1">
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
            <Link to="/owner/U4">Book an appointment</Link>
          </Panel>
        ))}
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
