import PetGenderField from "../Shared/PetGenderField";
import ClinicDateTime from "../Shared/ClinicDateTime";
import { appointmentId, appointmentServiceLabel, formatDateTime } from "../../api";
import { screenFromPath } from "../../routes";
import PictureUpload from "../Shared/PictureUpload";
import PhoneVerification from "../Auth/PhoneVerification";
import OwnerLanding from "./OwnerLanding";
import { NotificationFeed } from "../Shared/NotificationCenter";
import {
  ArrowLeftOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  LockOutlined,
} from "@ant-design/icons";
import {
  DashboardCard,
  ReminderTiles,
  DashboardNotice,
  DashboardIcon,
} from "../Shared/Dashboard";
import { useEffect, useState } from "react";
import { Alert, App, Button, Form, Input, Modal, Pagination, Tabs } from "antd";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  api,
  dayKey,
  errorMessage,
  formatDate,
  formatPetWeight,
  formatPetAge,
  formatPetGender,
  formatSpecies,
  formatTime,
  shortId,
} from "../../api";
import { useAuth } from "../Auth/AuthContext";
import {
  DataTable,
  Field,
  Details,
  Note,
  Panel,
  RequestState,
  Status,
  useResource,
} from "../Shared/UI";
const pageDescriptions = {
  U2: "Your details, contact information, and account security.",
  settings:
    "Your profile, contact information, password, and account settings.",
  U3: "A familiar place for your pets and their health stories.",
  U3a: "Register your pet to begin their clinic care journey.",
  U3b: "Your pet’s profile and current health information.",
  U3c: "Consultation notes, follow-up plans, and vaccination history.",
  U4: "Let’s plan your pet’s next visit, one step at a time.",
  U5: "Tell us about the pet you’re bringing to the clinic.",
  U6: "Choose a service and an available clinic appointment.",
  U7: "Check your pet and visit details before submitting.",
  U8: "Your visit request and the next steps from the clinic.",
  U9: "Stay close to every visit, from request to completed care.",
  U10: "Booking decisions, medical updates, and care reminders.",
  A2: "Review booking requests and the pet details that need approval.",
  A3: "Organize upcoming visits and manage appointment updates.",
  A4: "Review approved appointments for the selected queue date.",
  A5: "Consultations, clinical findings, and follow-up checkups.",
  A6: "Owner contact details, pet profiles, and medical information.",
  A7: "Track vaccinations, administered doses, and next due dates.",
  A8: "Manage medicine stock, expiry dates, and inventory levels.",
  A9: "Maintain the clinic services available for owner bookings.",
  A10: "Set clinic hours, slot capacity, and blocked dates.",
  A11: "Review consultation bills and record collected payments.",
  A12: "A clear view of clinic activity, revenue, and expenses.",
  A13: "Keep clinic operating costs organized and up to date.",
  A14: "Review the full history of messages sent to pet owners.",
  A15: "A traceable record of approvals and changes in the clinic.",
};
export function PageHeading({ title, backTo, backLabel = "Back", onBack }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const screen = screenFromPath(user.role === "ADMIN" ? "admin" : "owner", pathname);
  const description =
    pageDescriptions[screen] ||
    (user.role === "ADMIN"
      ? "Manage clinic information and patient care."
      : "Everything you need for your pet’s care, together.");
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <span className="portal-kicker">
          {user.role === "ADMIN"
            ? "FURPAWS / CLINIC MANAGEMENT"
            : "FURPAWS / MY PET CARE"}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-heading-actions">
        {backTo &&
          (onBack ? (
            <Button
              className="page-back"
              onClick={onBack}
              icon={<ArrowLeftOutlined />}
            >
              {backLabel}
            </Button>
          ) : (
            <Link className="button page-back" to={backTo}>
              <ArrowLeftOutlined aria-hidden="true" /> {backLabel}
            </Link>
          ))}
        <ClinicDateTime />
      </div>
    </div>
  );
}
export function OwnerDashboard() {
  const appointments = useResource("/appointments");
  const notifications = useResource("/notifications");
  const pets = useResource("/pets");
  const { refresh: refreshNotifications } = notifications;
  useEffect(() => {
    const refresh = () => refreshNotifications();
    window.addEventListener("furpaws:notifications", refresh);
    return () => window.removeEventListener("furpaws:notifications", refresh);
  }, [refreshNotifications]);
  const { user } = useAuth();
  const upcoming = appointments.data.filter(
    ({ date, status }) =>
      date >= dayKey() && ["Approved", "Pending"].includes(status),
  );
  const approved = upcoming.find(({ status }) => status === "Approved");
  const pending = appointments.data.filter(
    ({ status }) => status === "Pending",
  );
  const reminders = notifications.data.filter(({ title }) =>
    /reminder/i.test(title),
  );
  const unread = notifications.data.filter(({ read }) => !read);
  return (
    <div className="dashboard-page owner-home">
      <DashboardNotice resources={[appointments, notifications, pets]} />
      <OwnerLanding user={user} />
      <div className="dashboard-content-grid">
        <DashboardCard
          eyebrow="Schedule"
          title="Upcoming Appointments"
          action={{ to: "/owner/my-appointments" }}
        >
          {approved ? (
            <div className="dashboard-next-visit">
              <div className="row spread">
                <span className="dashboard-icon">
                  <DashboardIcon name="pet" />
                </span>
                <Status value={approved.status} />
              </div>
              <h3>
                {appointmentId(approved)} · {approved.pet?.name} · {appointmentServiceLabel(approved)}
              </h3>
              <p>
                {formatDate(approved.date)} · {formatTime(approved.time)}
              </p>
              <small>With {approved.admin?.name || "the clinic Admin"}</small>
            </div>
          ) : (
            <div className="dashboard-empty">
              <span className="dashboard-icon">
                <DashboardIcon name="calendar" />
              </span>
              <p>No approved upcoming appointments.</p>
            </div>
          )}
          {upcoming
            .filter(({ _id }) => _id !== approved?._id)
            .slice(0, 2)
            .map(({ _id, pet, date, time, status }) => (
              <div className="dashboard-visit" key={_id}>
                <div>
                  <strong>{pet?.name}</strong>
                  <p>
                    {formatDate(date)} · {formatTime(time)}
                  </p>
                </div>
                <Status value={status} />
              </div>
            ))}
          <p className="owner-visit-guidance">
            Bring current medicines and arrive 10 minutes before your visit.
          </p>
          <Link className="button dashboard-wide-button" to="/owner/my-appointments">
            View My Appointments
          </Link>
        </DashboardCard>
        <DashboardCard
          eyebrow="Actions"
          title="Care Reminders"
        >
          <ReminderTiles
            items={[
              {
                title: "Check appointment updates",
                text: `${pending.length} requests awaiting clinic review`,
                icon: "calendar",
                to: "/owner/my-appointments",
                action: "View",
              },
              {
                title: "Read care reminders",
                text: `${unread.length} unread notifications`,
                icon: "bell",
                to: "/owner/notifications",
                action: "Read",
              },
              {
                title: "Review medical records",
                text: "Your pets’ consultation and vaccine history",
                icon: "record",
                to: "/owner/my-pets?view=records",
                action: "Open",
              },
            ]}
          />
          <div className="dashboard-reminder-messages">
            {reminders.slice(0, 2).map(({ _id, title, message }) => (
              <div key={_id}>
                <strong>{title}</strong>
                <p>{message}</p>
              </div>
            ))}
            {!reminders.length && (
              <p className="muted">
                Your clinic’s care reminders will appear here.
              </p>
            )}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
export function OwnerProfile({ embedded = false }) {
  const { user, setUser } = useAuth();
  const configuration = useResource("/auth/config");
  const [phoneTicket, setPhoneTicket] = useState("");
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const profilePhone = Form.useWatch("phone", form);
  const submit = async (values) => {
    setBusy(true);
    setError("");
    try {
      if (mode === "password") await api.post("/users/me/password", values);
      else {
        const { data } = await api.patch("/users/me", {
          ...values,
          ...(phoneTicket ? { phoneVerificationTicket: phoneTicket } : {}),
        });
        setUser(data);
      }
      setMode(null);
      message.success("Changes saved.");
    } catch (failure) {
      setError(errorMessage(failure));
      const errors = failure.response?.data?.errors;
      if (errors)
        form.setFields(
          Object.entries(errors).map(([name, value]) => ({
            name,
            errors: [value],
          })),
        );
    } finally {
      setBusy(false);
    }
  };
  const open = (value) => {
    setMode(value);
    setError("");
    form.resetFields();
    if (value === "profile") form.setFieldsValue(user);
  };
  return (
    <>
      {!embedded && (
        <PageHeading
          title={user.role === "ADMIN" ? "My Profile" : "Owner Profile"}
        />
      )}
      <div className="account-overview">
        <div className="account-cover">
          <span className="account-avatar">
            {user.profilePicture ? <img src={user.profilePicture} alt={user.name} /> : user.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </span>
          <div>
            <span className="account-role">
              <SafetyCertificateOutlined aria-hidden="true" />{" "}
              {user.role === "ADMIN" ? "Clinic administrator" : "Pet owner"}
            </span>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="account-details-card">
          <div className="account-section-heading">
            <h3>Personal information</h3>
            <p>Keep your contact details up to date.</p>
          </div>
          <dl className="account-details">
            {[
              { label: "Full name", value: user.name, Icon: UserOutlined },
              { label: "Email address", value: user.email, Icon: MailOutlined },
              {
                label: "Mobile number",
                value: user.phone,
                Icon: PhoneOutlined,
              },
              {
                label: "Address",
                value: user.address || "No address added",
                Icon: EnvironmentOutlined,
              },
            ].map(({ label, value, Icon }) => (
              <div key={label}>
                <Icon aria-hidden="true" />
                <div>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <Button
            type="primary"
            icon={<EditOutlined aria-hidden="true" />}
            onClick={() => open("profile")}
          >
            Edit Profile
          </Button>
        </div>
        <div className="account-security">
          <span className="account-feature-icon">
            <LockOutlined aria-hidden="true" />
          </span>
          <div>
            <h3>Password & security</h3>
            <p>Manage the password you use to sign in.</p>
          </div>
          <Button onClick={() => open("password")}>Change Password</Button>
        </div>
      </div>
      <Modal
        title={mode === "password" ? "Change Password" : "Edit Profile"}
        open={!!mode}
        onCancel={() => setMode(null)}
        footer={null}
        destroyOnHidden
      >
        {error && <Alert type="error" message={error} />}
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          onValuesChange={(changed) => {
            if (changed.phone) setPhoneTicket("");
          }}
        >
          {mode === "password" ? (
            <>
              <Form.Item
                label="Current password"
                name="currentPassword"
                rules={[{ required: true }]}
              >
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Form.Item
                label="New password"
                name="password"
                rules={[
                  {
                    required: true,
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/,
                    message:
                      "Use 8–72 characters, uppercase, lowercase, and a number.",
                  },
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="profilePicture">
                <PictureUpload label="Profile photo" maxDimension={480} disabled={busy} />
              </Form.Item>
              <Button type="text" onClick={() => form.setFieldValue("profilePicture", "")}>Remove profile photo</Button>
              <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true, min: 2, max: 80 }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Contact number"
                name="phone"
                rules={[
                  {
                    required: true,
                    pattern: /^(09\d{9}|\+639\d{9})$/,
                    message: "Use a valid PH mobile number.",
                  },
                ]}
              >
                <Input />
              </Form.Item>
              {configuration.data.phoneOtpEnabled &&
                profilePhone &&
                (!user.phoneVerified ||
                  profilePhone.replace(/^0/, "+63") !==
                    user.phone.replace(/^0/, "+63")) && (
                  <PhoneVerification
                    phone={profilePhone}
                    onVerified={setPhoneTicket}
                  />
                )}
              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, type: "email" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Address" name="address" rules={[{ max: 300 }]}>
                <Input />
              </Form.Item>
            </>
          )}
          <Button type="primary" htmlType="submit" loading={busy}>
            Save Changes
          </Button>
        </Form>
      </Modal>
    </>
  );
}
export function PetCards({ pets, admin = false, select, selected }) {
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(pets.length / pageSize)),
  );
  const visiblePets = pets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  return (
    <div className="pet-collection">
      <div className="two-columns pet-cards-grid">
        {visiblePets.map(
          ({
            _id,
            name,
            species,
            otherSpecies,
            breed,
            status,
            weight,
            estimatedWeight,
            picture,
            birthDate,
            gender,
          }) => (
            <Panel key={_id} className={`pet-profile-card${selected === _id ? " is-selected" : ""}`}>
              <div className="pet-card">
                <div className="pet-picture">
                  {picture ? (
                    <img src={picture} alt={name} />
                  ) : (
                    <span>{species}</span>
                  )}
                </div>
                <div className="pet-card-info">
                  <h2>{name}</h2>
                  <p>
                    {formatSpecies({ species, otherSpecies })} · {breed} · {formatPetGender({ gender })}
                  </p>
                  <Status value={status} />
                  <p>
                    {formatPetAge({ birthDate })} ·{" "}
                    {formatPetWeight({ weight, estimatedWeight })}
                  </p>
                  {select ? (
                    <Button
                      type={selected === _id ? "primary" : "default"}
                      onClick={() => select(_id)}
                    >
                      {selected === _id ? "Selected pet" : "Select pet"}
                    </Button>
                  ) : (
                    <Link
                      className="button"
                      to={`/${admin ? "admin/pets" : "owner/pets"}/${_id}`}
                    >
                      View pet profile
                    </Link>
                  )}
                </div>
              </div>
            </Panel>
          ),
        )}
      </div>
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={pets.length}
        onChange={setPage}
        hideOnSinglePage
        showSizeChanger={false}
        responsive
      />
    </div>
  );
}
export function MyPets() {
  const pets = useResource("/pets");
  return (
    <>
      <PageHeading title="My Pets" />
      <RequestState {...pets} retry={pets.refresh}>
        {pets.data.length ? (
          <>
            <div className="pets-collection-heading"><div><h2>Your companions</h2><p>{pets.data.length} {pets.data.length === 1 ? "pet" : "pets"} · Health stories, care and happy moments.</p></div><Link className="button primary" to="/owner/book-appointment">Book a visit</Link></div>
            <PetCards pets={pets.data} />
          </>
        ) : (
          <Panel className="empty-pets">
            <img src="/assets/imgClipboardList.svg" alt="" />
            <h2>No pets yet</h2>
            <p>
              Approved pets will appear here. Register a new pet through a No
              record appointment; the pet stays hidden until approved or after
              the completed checkup.
            </p>
            <Link className="button primary" to="/owner/book-appointment">
              Book an appointment
            </Link>
          </Panel>
        )}
      </RequestState>
    </>
  );
}
export function PetDetail({ admin = false }) {
  const { id } = useParams();
  const pet = useResource(`/pets/${id}`);
  const [editing, setEditing] = useState(false);
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const save = async (values) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/pets/${id}`, values);
      setEditing(false);
      await pet.refresh();
      message.success("Pet information saved.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  const data = pet.data;
  return (
    <>
      <PageHeading
        title={admin ? "Pet Detail & Validation" : "Pet General Information"}
        backTo={
          admin
            ? data.owner?._id
              ? `/admin/owners/${data.owner._id}`
              : "/admin/pets-and-owners"
            : "/owner/my-pets"
        }
        backLabel={admin ? "Back to Pets & Owners" : "Back to My Pets"}
      />
      <RequestState {...pet} retry={pet.refresh}>
        <Panel
          title={admin ? "Pet identity" : "Pet picture"}
          action={<Status value={data.status} />}
        >
          <div className="pet-identity">
            <div>
              <PictureUpload
                value={data.picture}
                disabled={busy}
                onChange={(picture) => save({ picture })}
              />
            </div>
            <div className="grow">
              <h2>General information</h2>
              <Details
                entries={[
                  ["Name", data.name],
                  ["Species", formatSpecies(data)],
                  ["Breed", data.breed],
                  ["Gender", formatPetGender(data)],
                  ["Current / estimated weight", formatPetWeight(data)],
                  ["Age", formatPetAge(data)],
                  ["Date of birth", formatDate(data.birthDate)],
                  ...(admin
                    ? [
                        ["Owner", data.owner?.name],
                        ["Validation status", data.status],
                      ]
                    : []),
                ]}
              />
            </div>
          </div>
          <div className="row">
            <Link
              className="button"
              to={`/${admin ? "admin/medical-records" : "owner/medical-records"}/${id}`}
            >
              Medical Records
            </Link>
            {admin && data.status === "Pending" && (
              <>
                <Button type="primary" onClick={() => setDecision("Approved")}>
                  Approve Pet
                </Button>
                <Button danger onClick={() => setDecision("Declined")}>
                  Decline Pet
                </Button>
              </>
            )}
            {admin && (
              <Button
                onClick={() => {
                  form.setFieldsValue({
                    ...data,
                    gender: data.gender || "Unknown",
                    birthDate: data.birthDate?.slice(0, 10),
                  });
                  setEditing(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
        </Panel>
        <Note>
          {admin
            ? "Verify pet identity and health information before editing. Clinical updates are restricted to an Admin."
            : `You may update ${data.name}’s picture only. General and clinical information is maintained by the clinic.`}
        </Note>
      </RequestState>
      <Modal
        open={!!decision}
        title={decision === "Approved" ? "Approve pet?" : "Decline pet"}
        onCancel={() => setDecision(null)}
        confirmLoading={busy}
        onOk={async () => {
          if (decision === "Declined" && !reason.trim()) {
            message.error("Decline reason is required.");
            return;
          }
          setBusy(true);
          try {
            await api.post(`/pets/${id}/decision`, {
              status: decision,
              reason,
            });
            setDecision(null);
            await pet.refresh();
            message.success("Pet decision saved.");
          } catch (failure) {
            message.error(errorMessage(failure));
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>{data.name}</p>
        {decision === "Declined" && (
          <Input.TextArea
            aria-label="Pet decline reason"
            value={reason}
            maxLength={500}
            onChange={({ target: { value } }) => setReason(value)}
          />
        )}
      </Modal>
      <Modal
        open={editing}
        title="Edit pet information"
        onCancel={() => setEditing(false)}
        footer={null}
      >
        {error && <Alert type="error" message={error} />}
        <Form form={form} layout="vertical" onFinish={save}>
          {["name", "breed"].map((name) => (
            <Form.Item
              key={name}
              name={name}
              label={name === "name" ? "Pet name" : "Breed"}
              rules={[{ required: true, max: 80 }]}
            >
              <Input />
            </Form.Item>
          ))}
          <PetGenderField />
          <Form.Item
            label={data.emergencyRegistration?"Birth date (if known)":"Birth date"}
            name="birthDate"
            rules={[{ required: !data.emergencyRegistration }]}
          >
            <Input type="date" max={dayKey()} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy}>
            Save Changes
          </Button>
        </Form>
      </Modal>
    </>
  );
}
export function MedicalRecords({ admin = false }) {
  const { id } = useParams();
  const records = useResource(`/pets/${id}/records`);
  const [tab, setTab] = useState("Diagnoses");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();
  const data = records.data;
  const { message } = App.useApp();
  const consultations = data.consultations || [];
  const followUps = consultations
    .filter((record) => record.followUp?.enabled)
    .map((record) => ({ ...record, ...record.followUp, bookedAppointment: record.followUp.appointment }));
  const save = async (values) => {
    setBusy(true);
    try {
      await api.patch(`/consultations/${edit._id}`, values);
      setEdit(null);
      await records.refresh();
      message.success("Medical record updated.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  let columns = [
    { title: "Appointment", render: (_, record) => appointmentId(record.appointment) },
    { title: "Visit date", render: (_, record) => formatDate(record.visitDate || record.appointment?.date || record.createdAt) },
    { title: "Created", dataIndex: "createdAt", render: formatDateTime },
    { title: "Symptoms", dataIndex: "symptoms" },
    { title: "Diagnosis", dataIndex: "diagnosis" },
    {
      title: "Prescription",
      render: (_, record) => record.prescription || record.treatment,
    },
    { title: "Procedure", dataIndex: "procedure" },
    { title: "Admin", render: (_, { admin: clinician }) => clinician?.name },
  ];
  let rows = consultations;
  if (tab === "Follow-up Plans") {
    rows = followUps;
    columns = [
      { title: "Follow-up date", dataIndex: "date", render: formatDate },
      { title: "Time", dataIndex: "time", render: formatTime },
      { title: "Booking", render: (_, record) => record.bookedAppointment ? "Booked" : "Suggested" },
      { title: "Purpose", dataIndex: "purpose" },
      { title: "Care instructions", dataIndex: "instructions" },
      { title: "Admin", render: (_, record) => record.admin?.name },
    ];
  }
  if (tab === "Vaccinations") {
    rows = data.vaccinations || [];
    columns = [
      { title: "Vaccine", dataIndex: "vaccine" },
      { title: "Date given", dataIndex: "dateGiven", render: formatDate },
      { title: "Next date given", dataIndex: "nextDueDate", render: formatDate },
    ];
  }
  if (tab === "Weight History") {
    rows = data.pet?.weightHistory || [];
    columns = [
      { title: "Date", dataIndex: "date", render: formatDate },
      { title: "Weight (kg)", dataIndex: "weight" },
    ];
  }
  if (tab === "Previous Appointments") {
    rows = data.appointments || [];
    columns = [
      { title: "Appointment", render: (_, record) => appointmentId(record) },
      { title: "Created", dataIndex: "createdAt", render: formatDateTime },
      { title: "Date", dataIndex: "date", render: formatDate },
      { title: "Time", dataIndex: "time", render: formatTime },
      { title: "Service", render: (_, record) => appointmentServiceLabel(record) },
      {
        title: "Status",
        dataIndex: "status",
        render: (value) => <Status value={value} />,
      },
    ];
  }
  return (
    <>
      <PageHeading
        title={`Pet Medical Records${admin ? "" : " · View Only"}`}
        backTo={`/${admin ? "admin/pets" : "owner/pets"}/${id}`}
        backLabel="Back to Pet Profile"
      />
      <RequestState {...records} retry={records.refresh}>
        <Panel
          title={`${data.pet?.name} · Medical records`}
          action={<Status value={admin ? "Admin access" : "View only"} />}
        >
          <p>
            {data.pet?.breed} · {formatPetGender(data.pet)} · Pet record {shortId(id, "PET-")}
          </p>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              "Diagnoses",
              "Treatment History",
              "Follow-up Plans",
              "Vaccinations",
              "Weight History",
              "Previous Appointments",
            ].map((label) => ({ key: label, label }))}
          />
          <DataTable key={tab} columns={columns} data={rows} />
          {admin && consultations.length > 0 && (
            <Button
              onClick={() => {
                setEdit(consultations[0]);
                form.setFieldsValue(consultations[0]);
                setError("");
              }}
            >
              Edit latest record
            </Button>
          )}
        </Panel>
        <div className="two-columns">
          <Panel title="Latest follow-up plan">
            {followUps[0] ? (
              <Details
                entries={[
                  ["Follow-up date", formatDate(followUps[0].date)],
                  ["Time", formatTime(followUps[0].time)],
                  ["Booking", followUps[0].bookedAppointment ? "Booked" : "Suggested"],
                  ["Purpose", followUps[0].purpose],
                  [
                    "Care instructions",
                    followUps[0].instructions ||
                      "Follow the clinic’s instructions.",
                  ],
                ]}
              />
            ) : (
              <p>No follow-up checkup recommended.</p>
            )}
            <p className="muted">
              Follow-ups marked Booked are already reserved. Older suggested plans
              require an available appointment to be booked.
            </p>
          </Panel>
          <Panel title="Vaccinations and weight">
            <Details
              entries={[
                [
                  "Current / estimated weight",
                  data.pet ? formatPetWeight(data.pet) : "—",
                ],
                [
                  "Latest vaccine",
                  data.vaccinations?.at(-1)?.vaccine || "None",
                ],
                [
                  "Next date given",
                  formatDate(data.vaccinations?.at(-1)?.nextDueDate),
                ],
              ]}
            />
          </Panel>
        </div>
        <Panel title="Admin Notes">
          <p>{consultations[0]?.notes || "No clinical notes yet."}</p>
        </Panel>
        <Note>
          Medical records are read only for owners. Only an Admin can create or
          edit them.
        </Note>
      </RequestState>
      <Modal
        open={!!edit}
        title="Correct medical record"
        onCancel={() => setEdit(null)}
        footer={null}
      >
        {error && <Alert message={error} type="error" />}
        <Form form={form} layout="vertical" onFinish={save}>
          {["symptoms", "diagnosis", "prescription", "notes"].map((name) => (
            <Form.Item
              key={name}
              name={name}
              label={name}
              rules={[{ max: 2000 }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          ))}
          <Note>
            Billing and weight history remain attached to the original completed
            visit.
          </Note>
          <Button type="primary" htmlType="submit" loading={busy}>
            Save Changes
          </Button>
        </Form>
      </Modal>
    </>
  );
}
export function OwnerAppointments() {
  const resource = useResource("/appointments");
  const [tab, setTab] = useState("Upcoming");
  const [cancel, setCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [busy, setBusy] = useState(false);
  const { message } = App.useApp();
  const handleCancel = async () => {
    if (cancellationReason.trim().length < 5) {
      setCancelError("Enter a cancellation reason (5–500 characters).");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/appointments/${cancel._id}`, {
        status: "Cancelled",
        cancellationReason: cancellationReason.trim(),
      });
      setCancel(null);
      await resource.refresh();
      message.success("Appointment cancelled.");
    } catch (failure) {
      message.error(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  const rows = resource.data.filter(({ status }) =>
    tab === "Upcoming"
      ? ["Pending", "Approved"].includes(status)
      : !["Pending", "Approved"].includes(status),
  );
  return (
    <>
      <PageHeading title="My Appointments" />
      <Tabs
        className="compact-appointment-tabs"
        activeKey={tab}
        onChange={setTab}
        items={["Upcoming", "Previous"].map((label) => ({ key: label, label }))}
      />
      <RequestState {...resource} retry={resource.refresh}>
        <DataTable
          compact
          data={rows}
          columns={[
            { title: "Appointment", width: 100, render: (_, record) => appointmentId(record) },
            { title: "Created", width: 145, dataIndex: "createdAt", render: formatDateTime },
            { title: "Pet", width: 90, render: (_, { pet }) => pet?.name },
            { title: "Service", width: 140, render: (_, { service }) => service?.name },
            {
              title: "Date and time",
              width: 145,
              render: (_, { date, time }) =>
                `${formatDate(date)} · ${formatTime(time)}`,
            },
            {
              title: "Status",
              width: 100,
              dataIndex: "status",
              render: (value) => <Status value={value} />,
            },
            {
              title: "Owner’s explanation / symptoms",
              dataIndex: "reasonForVisit",
              render: (value) => (
                <p className="visit-explanation appointment-explanation">
                  {value || "—"}
                </p>
              ),
            },
            {
              title: tab === "Upcoming" ? "Action" : "Details",
              width: 110,
              render: (_, record) =>
                ["Pending", "Approved"].includes(record.status) ? (
                  <Button
                    onClick={() => {
                      setCancel(record);
                      setCancellationReason("");
                      setCancelError("");
                    }}
                  >
                    Cancel
                  </Button>
                ) : (
                  record.declineReason ||
                  (record.status === "Completed" ? (
                    <Link to={`/owner/medical-records/${record.pet?._id}`}>
                      Medical records
                    </Link>
                  ) : (
                    record.cancellationReason ||
                    "Cancellation reason not recorded for this older booking."
                  ))
                ),
            },
          ]}
        />
      </RequestState>
      <Modal
        open={!!cancel}
        title="Cancel appointment?"
        onCancel={() => setCancel(null)}
        confirmLoading={busy}
        onOk={handleCancel}
        okText="Cancel appointment"
      >
        <p>
          {cancel?.pet?.name} · {formatDate(cancel?.date)} ·{" "}
          {formatTime(cancel?.time)}
        </p>
        <Field
          label="Cancellation reason"
          name="cancellationReason"
          required
          errors={{ cancellationReason: cancelError }}
        >
          <Input.TextArea
            id="cancellationReason"
            value={cancellationReason}
            minLength={5}
            maxLength={500}
            rows={3}
            placeholder="Explain why you need to cancel this appointment."
            onChange={({ target: { value } }) => {
              setCancellationReason(value);
              setCancelError("");
            }}
          />
        </Field>
        <p>
          This will release the booked slot. The clinic will receive your
          reason.
        </p>
      </Modal>
    </>
  );
}
export function Notifications({ admin = false }) {
  const [scope, setScope] = useState("inbox");
  const inbox = admin && scope === "inbox";
  const resource = useResource(
    inbox ? "/notifications?scope=inbox" : "/notifications",
  );
  return (
    <>
      <PageHeading title={admin ? "Clinic notifications" : "Notifications"} />
      {admin && (
        <Tabs
          activeKey={scope}
          onChange={setScope}
          items={[
            { key: "inbox", label: "Clinic inbox" },
            { key: "sent", label: "Owner notification log" },
          ]}
        />
      )}
      <NotificationFeed
        key={scope}
        resource={resource}
        admin={admin}
        inbox={inbox}
      />
    </>
  );
}
