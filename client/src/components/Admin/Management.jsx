import NumericInput from "../Shared/NumericInput";
import ClinicCalendar from "../Shared/ClinicCalendar";
import { useEffect, useState } from "react";
import { Alert, App, Button, Form, Input, Modal, Select, Switch } from "antd";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
  Details,
  Note,
  Panel,
  RequestState,
  Status,
  useResource,
} from "../Shared/UI";
import { PageHeading, PetCards } from "../Owner/OwnerPages";
import { useAuth } from "../Auth/AuthContext";
import {
  DashboardIcon,
  DashboardHero,
  MetricCard,
  DashboardCard,
  ShortcutGrid,
  StatusRing,
  SnapshotRows,
  ReminderTiles,
  DashboardNotice,
} from "../Shared/Dashboard";
export function AdminDashboard() {
  const appointments = useResource("/appointments");
  const pets = useResource("/pets");
  const medicines = useResource("/medicines");
  const users = useResource("/users");
  const today = dayKey();
  const report = useResource(`/reports?start=${today}&end=${today}`);
  const { user } = useAuth();
  const visits = appointments.data.filter(
    ({ date, status }) =>
      date === today && !["Declined", "Cancelled"].includes(status),
  );
  const queue = visits.filter(({ status }) => status === "Approved");
  const completed = visits.filter(({ status }) => status === "Completed");
  const pending = appointments.data.filter(
    ({ status }) => status === "Pending",
  );
  const newPets = pets.data.filter(({ status }) => status === "Pending");
  const lowStock = medicines.data.filter(
    ({ quantity, lowStockThreshold }) => quantity <= lowStockThreshold,
  );
  const expiry = medicines.data.filter(
    ({ expiryDate }) =>
      new Date(expiryDate) < new Date(Date.now() + 30 * 86400000),
  );
  const resources = [appointments, pets, medicines, users, report];
  return (
    <div className="dashboard-page clinic-overview">
      <DashboardNotice resources={resources} />
      <p className="clinic-overview-title">Dashboard</p>
      <div className="clinic-overview-frame">
        <div className="clinic-overview-main">
          <DashboardHero
            name={user.name}
            summary={{
              title: "Patient summary",
              text: `${pets.data.length} pets in the clinic · ${pending.length} booking requests to review`,
            }}
            action={{ to: "/admin/A6", label: "View Pets & Owners" }}
          />
          <div className="dashboard-metrics">
            <MetricCard
              label="Total Pets"
              value={pets.data.length}
              caption="Registered clinic pets"
              icon="pet"
              loading={pets.loading}
            />
            <MetricCard
              label="Today’s Appointments"
              value={visits.length}
              caption="Scheduled today"
              icon="calendar"
              loading={appointments.loading}
            />
            <MetricCard
              label="Active Queue"
              value={queue.length}
              caption="Approved visits today"
              icon="clock"
              loading={appointments.loading}
            />
            <MetricCard
              label="Completed Visits"
              value={completed.length}
              caption="Completed today"
              icon="check"
              loading={appointments.loading}
            />
            <MetricCard
              label="Today’s Revenue"
              value={money(report.data.revenue)}
              caption="Collected payments"
              icon="wallet"
              loading={report.loading}
            />
          </div>
          <DashboardCard eyebrow="Shortcuts" title="Quick Links">
            <ShortcutGrid
              items={[
                { label: "Pets & Owners", to: "/admin/A6", icon: "pet" },
                { label: "Appointments", to: "/admin/A3", icon: "calendar" },
                { label: "Vaccinations", to: "/admin/A7", icon: "record" },
                { label: "Medicines", to: "/admin/A8", icon: "pill" },
                { label: "Consultations", to: "/admin/A5", icon: "check" },
                { label: "Reports", to: "/admin/A12", icon: "report" },
              ]}
            />
          </DashboardCard>
          <div className="clinic-overview-details">
            <DashboardCard
              eyebrow="Live"
              title="Patient Queue Status"
              action={{ to: "/admin/A4" }}
            >
              <StatusRing
                items={[
                  { label: "Approved queue", count: queue.length },
                  { label: "Completed", count: completed.length },
                  {
                    label: "Pending today",
                    count: visits.filter(({ status }) => status === "Pending")
                      .length,
                  },
                ]}
              />
              <div className="dashboard-financials">
                {[
                  ["Revenue", report.data.revenue],
                  ["Expenses", report.data.expenses],
                  ["Net", report.data.netIncome],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{report.loading ? "—" : money(value)}</strong>
                  </div>
                ))}
              </div>
            </DashboardCard>
            <DashboardCard eyebrow="Overview" title="Clinic Snapshot">
              <SnapshotRows
                items={[
                  {
                    title: `${users.data.length} owners`,
                    text: "In the clinic database",
                    icon: "profile",
                  },
                  {
                    title: `${pets.data.length} pets`,
                    text: "Registered with the clinic",
                    icon: "pet",
                  },
                  {
                    title: `${pending.length} pending bookings`,
                    text: `${newPets.length} pets awaiting approval`,
                    icon: "calendar",
                  },
                  {
                    title: `${appointments.data.length} total appointments`,
                    text: "Across all appointment records",
                    icon: "record",
                  },
                ]}
              />
            </DashboardCard>
          </div>
        </div>
        <div
          className="clinic-overview-rail"
          role="complementary"
          aria-label="Clinic activity"
        >
          <ClinicCalendar appointments={appointments.data} />
          <DashboardCard
            eyebrow="Schedule"
            title="Today’s Appointments"
            action={{ to: "/admin/A3" }}
          >
            {visits.length ? (
              <div className="dashboard-visit-list">
                {visits
                  .slice(0, 3)
                  .map(({ _id, pet, owner, service, time, status }) => (
                    <div className="dashboard-visit" key={_id}>
                      <span className="visit-time">{formatTime(time)}</span>
                      <div>
                        <strong>
                          {pet?.name} · {service?.name}
                        </strong>
                        <p>{owner?.name}</p>
                      </div>
                      <Status value={status} />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <span className="dashboard-icon">
                  <DashboardIcon name="calendar" />
                </span>
                <p>No appointments scheduled for today.</p>
              </div>
            )}
            <Link className="button dashboard-wide-button" to="/admin/A3">
              View Full Schedule
            </Link>
          </DashboardCard>
          <DashboardCard eyebrow="Actions" title="Smart Reminders">
            <ReminderTiles
              items={[
                {
                  title: "Review booking requests",
                  text: `${pending.length} requests awaiting a decision`,
                  icon: "calendar",
                  to: "/admin/A2",
                  action: "Review",
                },
                {
                  title: "Check medicine stock",
                  text: `${lowStock.length} medicines at or below stock threshold`,
                  icon: "pill",
                  to: "/admin/A8",
                  action: "View",
                },
                {
                  title: "Review medicine expiry",
                  text: `${expiry.length} medicines near expiry or expired`,
                  icon: "clock",
                  to: "/admin/A8",
                  action: "Open",
                },
              ]}
            />
            <div className="dashboard-note">
              <DashboardIcon name="bell" />
              <span>
                Keep approvals and inventory up to date before the next clinic
                visit.
              </span>
              <Link to="/admin/A14">Notification log →</Link>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

export function Owners() {
  const users = useResource("/users");
  const pets = useResource("/pets");
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  useEffect(() => setQuery(params.get("q") || ""), [params]);
  const { id } = useParams();
  const owner = users.data.find(({ _id }) => _id === id);
  const ownerPets = pets.data.filter(({ owner: value }) => value?._id === id);
  const rows = users.data.filter(({ _id, name, email, phone }) =>
    `${name} ${email} ${phone} ${pets.data
      .filter(({ owner: value }) => value?._id === _id)
      .map(({ name: petName }) => petName)
      .join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={id ? "Owner Profile & Pets" : "Pets & Owners · Owner List"}
        backTo={id ? "/admin/A6" : undefined}
        backLabel="Back to Owners"
      />
      <RequestState {...users} retry={users.refresh}>
        {id ? (
          owner ? (
            <>
              <Panel title="Owner information">
                <Details
                  entries={[
                    ["Name", owner.name],
                    ["Contact number", owner.phone],
                    ["Email", owner.email || "Not provided"],
                    ["Account",owner.accountType==="guest"?"Guest contact · no login account":"Registered owner"],
                    ["Address", owner.address],
                  ]}
                />
              </Panel>
              <h2>Pets associated with this owner</h2>
              <PetCards pets={ownerPets} admin />
            </>
          ) : (
            <Alert type="error" message="Owner not found." />
          )
        ) : (
          <>
            <Panel title="Search">
              <Input.Search
                aria-label="Search owners and pets"
                placeholder="Search by owner, pet, or contact information"
                value={query}
                onChange={({ target: { value } }) => setQuery(value)}
              />
            </Panel>
            <DataTable
              data={rows}
              columns={[
                { title: "Owner", dataIndex: "name" },
                {
                  title: "Contact details",
                  render: (_, { phone, email }) => [phone,email].filter(Boolean).join(" · ") || "No contact details provided",
                },
                {
                  title: "Their pets",
                  render: (_, { _id }) =>
                    pets.data
                      .filter(({ owner: value }) => value?._id === _id)
                      .map(
                        ({ name, status }) =>
                          `${name}${status === "Pending" ? " · Pending" : ""}`,
                      )
                      .join(", "),
                },
                {
                  title: "Action",
                  render: (_, { _id }) => (
                    <Link className="button" to={`/admin/A6a/${_id}`}>
                      View
                    </Link>
                  ),
                },
              ]}
            />
          </>
        )}
      </RequestState>
    </>
  );
}
const definitions = {
  medicines: {
    title: "Medicine Inventory",
    fields: [
      ["name", "Medicine name", "text", true],
      ["quantity", "Quantity", "number", true],
      ["unit", "Unit", "text", true],
      ["price", "Unit price (₱)", "number", true],
      ["expiryDate", "Expiry date", "date", true],
      ["lowStockThreshold", "Low-stock threshold", "number", true],
    ],
  },
  services: {
    title: "Medical Services",
    fields: [
      ["name", "Medical service", "text", true],
      ["description", "Description", "textarea", true],
      ["fee", "Service fee (₱)", "number", true],
      ["type", "Service type", "select", true],
      ["active", "Active", "switch", false],
    ],
  },
  expenses: {
    title: "Expenses",
    fields: [
      ["category", "Category", "text", true],
      ["amount", "Amount (₱)", "number", true],
      ["date", "Date", "date", true],
      ["notes", "Notes", "textarea", false],
    ],
  },
};
export function ResourceManager({ resource }) {
  const definition = definitions[resource];
  const records = useResource(`/${resource}`);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const open = (record) => {
    setEditing(record);
    setCreating(!record);
    setError("");
    form.resetFields();
    form.setFieldsValue(
      record
        ? {
            ...record,
            date: record.date?.slice(0, 10),
            expiryDate: record.expiryDate?.slice(0, 10),
          }
        : {
            active: true,
            type: "Consultation",
            quantity: 0,
            lowStockThreshold: 10,
            date: dayKey(),
          },
    );
  };
  const handleSave = async (values) => {
    setBusy(true);
    setError("");
    try {
      if (editing) await api.patch(`/${resource}/${editing._id}`, values);
      else await api.post(`/${resource}`, values);
      setEditing(null);
      setCreating(false);
      await records.refresh();
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
  const handleDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/${resource}/${deleting._id}`);
      setDeleting(null);
      await records.refresh();
      message.success("Record deleted.");
    } catch (failure) {
      message.error(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (record) => {
    try {
      await api.patch(`/services/${record._id}`, { active: !record.active });
      await records.refresh();
    } catch (failure) {
      message.error(errorMessage(failure));
    }
  };
  const columns =
    resource === "medicines"
      ? [
          { title: "Medicine", dataIndex: "name" },
          {
            title: "Quantity",
            render: (_, { quantity, unit }) => `${quantity} ${unit}`,
          },
          { title: "Unit price", dataIndex: "price", render: money },
          { title: "Expiry date", dataIndex: "expiryDate", render: formatDate },
          {
            title: "Status",
            render: (_, { quantity, lowStockThreshold, expiryDate }) => (
              <Status
                value={
                  expiryDate.slice(0, 10) < dayKey()
                    ? "Expired"
                    : quantity === 0
                      ? "Out of stock"
                      : quantity <= lowStockThreshold
                        ? "Low stock"
                        : "Available"
                }
              />
            ),
          },
        ]
      : resource === "services"
        ? [
            { title: "Medical service", dataIndex: "name" },
            { title: "Description", dataIndex: "description" },
            { title: "Service fee", dataIndex: "fee", render: money },
            {
              title: "Status",
              render: (_, { active }) => (
                <Status value={active ? "Active" : "Inactive"} />
              ),
            },
          ]
        : [
            { title: "Category", dataIndex: "category" },
            { title: "Amount", dataIndex: "amount", render: money },
            { title: "Date", dataIndex: "date", render: formatDate },
          ];
  columns.push({
    title: "Actions",
    render: (_, record) => (
      <div className="row">
        <Button onClick={() => open(record)}>Edit</Button>
        {resource === "services" ? (
          <Button onClick={() => toggle(record)}>
            {record.active ? "Deactivate" : "Activate"}
          </Button>
        ) : (
          <Button danger onClick={() => setDeleting(record)}>
            Delete
          </Button>
        )}
      </div>
    ),
  });
  return (
    <>
      <PageHeading title={definition.title} />
      <div className="row spread">
        <p>
          {resource === "medicines"
            ? "Medicine quantities, expiry dates, and stock availability."
            : resource === "services"
              ? "Medical services only."
              : "Record and review clinic operating costs."}
        </p>
        <Button type="primary" onClick={() => open(null)}>
          Add
        </Button>
      </div>
      <RequestState {...records} retry={records.refresh}>
        <DataTable data={records.data} columns={columns} />
      </RequestState>
      {resource === "expenses" && (
        <Panel title="Period total">
          <Details
            entries={[
              [
                "Total expenses",
                money(
                  records.data.reduce((sum, { amount }) => sum + amount, 0),
                ),
              ],
            ]}
          />
        </Panel>
      )}
      <Note>
        {resource === "medicines"
          ? "Expired and out-of-stock medicine cannot be prescribed. Stock changes are recorded in Audit Logs."
          : resource === "services"
            ? "Active medical services are available in the owner booking flow."
            : "Expense changes update total expenses and net income in Reports."}
      </Note>
      <Modal
        open={creating || !!editing}
        title={`${editing ? "Edit" : "Add"} ${resource === "medicines" ? "medicine" : resource === "services" ? "medical service" : "expense"}`}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
        footer={null}
      >
        {error && <Alert type="error" message={error} />}
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {definition.fields.map(([name, label, type, required]) => (
            <Form.Item
              key={name}
              name={name}
              label={label}
              valuePropName={type === "switch" ? "checked" : "value"}
              rules={[
                { required, message: `${label} is required.` },
                ...(type === "number"
                  ? [{ type: "number", min: 0, max: 10000000 }]
                  : type === "text" || type === "textarea"
                    ? [{ max: type === "textarea" ? 500 : 100 }]
                    : []),
                ...(resource === "services" && name === "name"
                  ? [
                      {
                        validator: (_, value) =>
                          /groom|board|accessor/i.test(value)
                            ? Promise.reject(
                                new Error(
                                  "Only medical services are supported.",
                                ),
                              )
                            : Promise.resolve(),
                      },
                    ]
                  : []),
              ]}
            >
              {type === "number" ? (
                <NumericInput
                  min={0}
                  max={10000000}
                  precision={
                    ["quantity", "lowStockThreshold"].includes(name) ? 0 : 2
                  }
                />
              ) : type === "select" ? (
                <Select
                  options={["Consultation", "Vaccination"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              ) : type === "switch" ? (
                <Switch />
              ) : type === "textarea" ? (
                <Input.TextArea rows={3} />
              ) : (
                <Input type={type === "date" ? "date" : "text"} />
              )}
            </Form.Item>
          ))}
          <Button type="primary" htmlType="submit" loading={busy}>
            Save Changes
          </Button>
        </Form>
      </Modal>
      <Modal
        open={!!deleting}
        title="Delete this record?"
        onCancel={() => setDeleting(null)}
        onOk={handleDelete}
        confirmLoading={busy}
        okButtonProps={{ danger: true }}
      >
        <p>{deleting?.name || deleting?.category}</p>
        <p>This change will be recorded in Audit Logs.</p>
      </Modal>
    </>
  );
}
export function ScheduleSettings() {
  const records = useResource("/schedules");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();
  const schedule = records.data[0];
  const { message } = App.useApp();
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const open = () => {
    form.setFieldsValue({
      ...schedule,
      times: schedule.times.join(", "),
      blockedDates: schedule.blockedDates.join(", "),
      holidays: schedule.holidays.join(", "),
      leaveDates: schedule.leaveDates.join(", "),
    });
    setEditing(true);
    setError("");
  };
  const save = async (values) => {
    setBusy(true);
    try {
      const data = {
        ...values,
        ...Object.fromEntries(
          ["times", "blockedDates", "holidays", "leaveDates"].map((key) => [
            key,
            String(values[key] || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          ]),
        ),
      };
      await api.patch(`/schedules/${schedule._id}`, data);
      setEditing(false);
      await records.refresh();
      message.success("Schedule saved.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading title="Schedule Settings" />
      <RequestState {...records} retry={records.refresh}>
        {schedule && (
          <>
            <div className="row end">
              <Button type="primary" onClick={open}>
                Edit Schedule
              </Button>
            </div>
            <div className="two-columns">
              <Panel title="Clinic hours">
                <DataTable
                  data={schedule.hours.map((record) => ({
                    ...record,
                    _id: record.day,
                  }))}
                  columns={[
                    {
                      title: "Day",
                      dataIndex: "day",
                      render: (day) => weekdays[day],
                    },
                    {
                      title: "Open",
                      render: (_, { closed, open }) =>
                        closed ? "Closed" : open,
                    },
                    {
                      title: "Close",
                      render: (_, { closed, close }) =>
                        closed ? "Closed" : close,
                    },
                  ]}
                />
              </Panel>
              <div className="stack">
                <Panel title="Booking capacity">
                  <Details
                    entries={[
                      ["Maximum bookings per slot", schedule.capacity],
                      ["Maximum bookings per day", schedule.dailyCapacity],
                      ["Time slots", schedule.times.join(" · ")],
                    ]}
                  />
                </Panel>
                <Panel title="Unavailable dates">
                  <Details
                    entries={[
                      [
                        "Blocked dates",
                        schedule.blockedDates.join(", ") || "None",
                      ],
                      ["Holidays", schedule.holidays.join(", ") || "None"],
                      ["Admin leave", schedule.leaveDates.join(", ") || "None"],
                    ]}
                  />
                </Panel>
              </div>
            </div>
          </>
        )}
      </RequestState>
      <Note>
        These settings control the owner calendar. Slots at capacity show Full
        and are disabled; blocked dates, holidays, leave, and past dates are
        unavailable.
      </Note>
      <Modal
        open={editing}
        width={760}
        title="Edit Schedule Settings"
        onCancel={() => setEditing(false)}
        footer={null}
      >
        {error && <Alert type="error" message={error} />}
        <Form form={form} layout="vertical" onFinish={save}>
          <div className="two-columns">
            {[
              ["capacity", "Maximum bookings per slot", 100],
              ["dailyCapacity", "Maximum bookings per day", 1000],
            ].map(([name, label, max]) => (
              <Form.Item
                key={name}
                name={name}
                label={label}
                rules={[{ required: true, type: "number", min: 1, max }]}
              >
                <NumericInput min={1} max={max} precision={0} />
              </Form.Item>
            ))}
          </div>
          {[
            ["times", "Time slots (HH:mm, comma separated)"],
            ["blockedDates", "Blocked dates (YYYY-MM-DD, comma separated)"],
            ["holidays", "Holidays (YYYY-MM-DD, comma separated)"],
            ["leaveDates", "Admin leave dates (YYYY-MM-DD, comma separated)"],
          ].map(([name, label]) => (
            <Form.Item
              key={name}
              name={name}
              label={label}
              rules={[{ required: name === "times" }]}
            >
              <Input />
            </Form.Item>
          ))}
          <h2>Clinic hours</h2>
          {(schedule?.hours || []).map(({ day }, index) => (
            <div className="hours-edit" key={day}>
              <strong>{weekdays[day]}</strong>
              <Form.Item name={["hours", index, "day"]} hidden>
                <NumericInput />
              </Form.Item>
              <Form.Item
                name={["hours", index, "open"]}
                label="Open"
                rules={[{ required: true }]}
              >
                <Input type="time" />
              </Form.Item>
              <Form.Item
                name={["hours", index, "close"]}
                label="Close"
                rules={[{ required: true }]}
              >
                <Input type="time" />
              </Form.Item>
              <Form.Item
                name={["hours", index, "closed"]}
                label="Closed"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>
          ))}
          <Button type="primary" htmlType="submit" loading={busy}>
            Save Schedule
          </Button>
        </Form>
      </Modal>
    </>
  );
}
export function Vaccinations() {
  const records = useResource("/vaccinations");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();
  const save = async (values) => {
    setBusy(true);
    try {
      await api.patch(`/vaccinations/${editing._id}`, values);
      setEditing(null);
      await records.refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  const columns = [
    { title: "Pet", render: (_, { pet }) => pet?.name },
    { title: "Owner", render: (_, { owner }) => owner?.name },
    { title: "Vaccine", dataIndex: "vaccine" },
    { title: "Date given", dataIndex: "dateGiven", render: formatDate },
    { title: "Next date given", dataIndex: "nextDueDate", render: formatDate },
    {
      title: "Action",
      render: (_, { pet }) => (
        <Link to={`/admin/A6c/${pet?._id}`}>Pet records</Link>
      ),
    },
    {
      title: "Edit",
      render: (_, record) => (
        <Button
          onClick={() => {
            form.setFieldsValue({
              ...record,
              dateGiven: record.dateGiven.slice(0, 10),
              nextDueDate: record.nextDueDate.slice(0, 10),
            });
            setEditing(record);
            setError("");
          }}
        >
          Edit
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeading title="Vaccinations" />
      <RequestState {...records} retry={records.refresh}>
        <Panel title="Upcoming due">
          <DataTable
            data={[...records.data].sort(
              (a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate),
            )}
            columns={columns}
          />
        </Panel>
      </RequestState>
      <Note>
        Completing a vaccination visit books the next due date for the owner and
        sends them a notification.
      </Note>
      <Modal
        open={!!editing}
        title="Edit vaccination record"
        onCancel={() => setEditing(null)}
        footer={null}
      >
        {error && <Alert type="error" message={error} />}
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item
            name="vaccine"
            label="Vaccine"
            rules={[{ required: true }]}
          >
            <Select
              options={["Rabies", "DHPP", "FVRCP"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="dateGiven"
            label="Date given"
            rules={[{ required: true }]}
          >
            <Input type="date" max={dayKey()} />
          </Form.Item>
          <Form.Item
            name="nextDueDate"
            label="Next date given"
            dependencies={["dateGiven"]}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value > getFieldValue("dateGiven")
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Next date given must follow date given."),
                      ),
              }),
            ]}
          >
            <Input type="date" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy}>
            Save Changes
          </Button>
        </Form>
      </Modal>
    </>
  );
}
export function Billing() {
  const records = useResource("/bills");
  const [selected, setSelected] = useState("");
  const [method, setMethod] = useState("Cash");
  const [busy, setBusy] = useState(false);
  const { message } = App.useApp();
  const bill =
    records.data.find(({ _id }) => _id === selected) || records.data[0];
  const pay = async () => {
    setBusy(true);
    try {
      await api.patch(`/bills/${bill._id}`, {
        status: "Paid",
        paymentMethod: method,
      });
      await records.refresh();
      message.success("Payment recorded.");
    } catch (failure) {
      message.error(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading title="Billing & Payments" />
      <RequestState {...records} retry={records.refresh}>
        {bill ? (
          <>
            <Select
              showSearch
              optionFilterProp="label"
              aria-label="Select bill"
              value={bill._id}
              onChange={setSelected}
              options={records.data.map(({ _id, pet, status }) => ({
                value: _id,
                label: `${shortId(_id, "BILL-")} · ${pet?.name} · ${status}`,
              }))}
            />
            <div className="print-area" id="selected-bill">
              <Panel
                title={`${bill.status === "Unpaid" ? "Process payment" : "Payment receipt"} · ${shortId(bill._id, "BILL-")}`}
                action={
                  <Button
                    className="no-print"
                    onClick={() =>
                      document.querySelector(".billing-records")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                  >
                    ← Back to Billing Records
                  </Button>
                }
              >
                <Details
                  entries={[
                    [
                      "Appointment",
                      `${shortId(bill.appointment?._id, "APT-")} · ${bill.appointment?.status}`,
                    ],
                    ["Pet / Owner", `${bill.pet?.name} / ${bill.owner?.name}`],
                    ["Date", formatDate(bill.createdAt)],
                  ]}
                />
                <DataTable
                  paginate={false}
                  data={bill.items}
                  columns={[
                    { title: "Bill item", dataIndex: "name" },
                    { title: "Quantity", dataIndex: "quantity" },
                    {
                      title: "Unit price",
                      dataIndex: "unitPrice",
                      render: money,
                    },
                    { title: "Amount", dataIndex: "amount", render: money },
                  ]}
                />
                <Details
                  entries={[
                    ["Total", money(bill.total)],
                    ["Payment status", bill.status],
                    ["Payment method", bill.paymentMethod || "Not recorded"],
                  ]}
                />
                {bill.status === "Unpaid" && (
                  <div className="row no-print">
                    <Select
                      aria-label="Payment method"
                      value={method}
                      onChange={setMethod}
                      options={["Cash", "GCash", "Card", "Bank transfer"].map(
                        (value) => ({ value, label: value }),
                      )}
                    />
                    <Button type="primary" loading={busy} onClick={pay}>
                      Record Payment
                    </Button>
                  </div>
                )}
                <Button
                  className="no-print"
                  onClick={() => window.print()}
                >
                  {bill.status === "Paid" ? "Print Receipt" : "Print Bill"}
                </Button>
              </Panel>
            </div>
            <Panel title="Billing records" className="no-print billing-records">
              <DataTable
                data={records.data}
                columns={[
                  {
                    title: "Bill",
                    render: (_, { _id }) => shortId(_id, "BILL-"),
                  },
                  { title: "Pet", render: (_, { pet }) => pet?.name },
                  { title: "Owner", render: (_, { owner }) => owner?.name },
                  {
                    title: "Created",
                    dataIndex: "createdAt",
                    render: formatDate,
                  },
                  { title: "Total", dataIndex: "total", render: money },
                  {
                    title: "Status",
                    render: (_, { status }) => <Status value={status} />,
                  },
                  {
                    title: "Action",
                    render: (_, { _id }) => (
                      <Button
                        onClick={() => {
                          setSelected(_id);
                          window.requestAnimationFrame(() => document
                            .getElementById("selected-bill")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }));
                        }}
                      >
                        View bill
                      </Button>
                    ),
                  },
                ]}
              />
            </Panel>
            <Note>
              This bill was created when the consultation was saved and
              completed. Confirm payment status and method before printing.
            </Note>
          </>
        ) : (
          <Panel>
            No bills yet. Completing a consultation automatically creates a
            bill.
          </Panel>
        )}
      </RequestState>
    </>
  );
}
export function Reports() {
  const [period, setPeriod] = useState({
    start: `${dayKey().slice(0, 7)}-01`,
    end: dayKey(),
  });
  const records = useResource(
    `/reports?start=${period.start}&end=${period.end}`,
  );
  const data = records.data;
  return (
    <>
      <PageHeading title="Reports" />
      <div className="row spread no-print">
        <div className="row">
          <label>
            From{" "}
            <Input
              type="date"
              value={period.start}
              max={period.end}
              onChange={({ target: { value } }) =>
                value && setPeriod({ ...period, start: value })
              }
            />
          </label>
          <label>
            To{" "}
            <Input
              type="date"
              value={period.end}
              min={period.start}
              onChange={({ target: { value } }) =>
                value && setPeriod({ ...period, end: value })
              }
            />
          </label>
        </div>
        <Button onClick={() => window.print()}>Print Report</Button>
      </div>
      <RequestState {...records} retry={records.refresh}>
        <div className="print-area report-layout">
          <p>
            Reporting period · {formatDate(period.start)} –{" "}
            {formatDate(period.end)}
          </p>
          <div className="stats-grid three">
            {[
              ["Revenue", data.revenue],
              ["Expenses", data.expenses],
              ["Net income", data.netIncome],
            ].map(([label, value]) => (
              <Panel key={label} title={label}>
                <strong className="stat-value">{money(value)}</strong>
              </Panel>
            ))}
          </div>
          <Panel title="Clinic activity">
            <Details
              entries={[
                ["Payments", `${data.payments || 0} paid bills`],
                [
                  "Consultations",
                  `${data.consultations || 0} completed consultations`,
                ],
                [
                  "Active services",
                  `${data.activeServices || 0} medical services`,
                ],
              ]}
            />
          </Panel>
          <Panel title="Appointment status distribution">
            <DataTable
              data={data.distribution || []}
              columns={[
                { title: "Status", dataIndex: "status" },
                { title: "Appointments", dataIndex: "count" },
                {
                  title: "Share",
                  render: (_, { count }) =>
                    `${data.total ? ((count / data.total) * 100).toFixed(2) : "0"}%`,
                },
              ]}
            />
          </Panel>
          <Note>
            {data.total || 0} appointments total. Net income ={" "}
            {money(data.revenue)} revenue − {money(data.expenses)} expenses.
          </Note>
        </div>
      </RequestState>
    </>
  );
}
export function AuditLogs() {
  const [detail, setDetail] = useState(null);
  const safeSnapshot = value => JSON.stringify(value, (key, item) => /password|token|secret|picture/i.test(key) ? "[hidden]" : item, 2);
  const records = useResource("/auditlogs");
  return (
    <>
      <PageHeading title="Audit Logs" />
      <RequestState {...records} retry={records.refresh}>
        <DataTable
          data={records.data}
          columns={[
            { title: "User", dataIndex: "actorName" },
            { title: "Action", dataIndex: "action" },
            { title: "Table", dataIndex: "resource" },
            {
              title: "Record",
              dataIndex: "record",
              render: (value) => shortId(value),
            },
            {
              title: "Date and time",
              dataIndex: "createdAt",
              render: (value) =>
                new Date(value).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                }),
            },
            { title: "Details", render: (_, record) => <Button onClick={() => setDetail(record)}>View changes</Button> },
          ]}
        />
      </RequestState>
      <Modal title="Audit change details" open={!!detail} width={900} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>Back to Audit Logs</Button>}>
        <p>{detail?.actorName} · {detail?.action} · {detail?.resource}</p>
        <div className="two-columns audit-snapshots">
          <Panel title="Before"><pre>{detail?.before ? safeSnapshot(detail.before) : "No previous snapshot: a new record or an older audit entry."}</pre></Panel>
          <Panel title="After"><pre>{detail?.after ? safeSnapshot(detail.after) : "No new snapshot: a deleted record or an older audit entry."}</pre></Panel>
        </div>
      </Modal>
      <Note>
        Approvals, declines, edits, deletes, and stock changes create audit
        entries. Audit logs are read only.
      </Note>
    </>
  );
}
