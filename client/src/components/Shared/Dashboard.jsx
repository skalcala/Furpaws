import { Alert, Button } from "antd";
import { Link } from "react-router-dom";

const iconPaths = {
  pet: [
    "M8 14c-2 0-4 2-4 4 0 3 4 1 8 1s8 2 8-1c0-2-2-4-4-4-1-1-2-3-4-3s-3 2-4 3Z",
    "M6 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  ],
  calendar: [
    "M5 5h14v15H5z",
    "M8 3v4M16 3v4M5 10h14",
    "M9 14h2M13 14h2M9 17h2",
  ],
  clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 7v5l3 2"],
  record: ["M7 4h10v17H4V7h3", "M8 3h8v4H8z", "M8 11h5M8 15h5M8 18h7"],
  pill: ["m5 10 5-5a5 5 0 0 1 7 7l-5 5a5 5 0 0 1-7-7Z", "m8 8 7 7"],
  report: ["M4 3v18h17", "M8 17v-4M12 17V9M16 17V5M20 17v-7"],
  bell: ["M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3Z", "M10 20h4M12 2v2"],
  check: ["m5 12 4 4L19 6"],
  wallet: ["M4 6h16v14H4z", "M4 6V4h13v2M15 11h5v5h-5z"],
  profile: ["M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M5 21v-2a7 7 0 0 1 14 0v2"],
  arrow: ["M5 12h14m-5-5 5 5-5 5"],
  sparkle: ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"],
};
export function DashboardIcon({ name = "record" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(iconPaths[name] || iconPaths.record).map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
export function DashboardHero({ name, owner = false, summary, action }) {
  const date = new Date().toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <section className="dashboard-hero" aria-label="Dashboard overview">
      <div className="hero-welcome">
        <p className="hero-date">{date}</p>
        <h1>
          Good day,
          <br />
          <span>{name}!</span>
        </h1>
        <p>
          {owner
            ? "A little care today. A healthier tomorrow for your pets."
            : "Here is what is happening in your clinic today."}
        </p>
        <div className="hero-meta">
          <span>
            <DashboardIcon name="clock" />
            {owner ? "Your pet care overview" : "Live clinic overview"}
          </span>
          <span>
            <DashboardIcon name="pet" />
            {owner ? "Every visit, in one place" : "Patient care dashboard"}
          </span>
        </div>
        <span className="clinic-hero-mark" aria-hidden="true">
          <DashboardIcon name="pet" />
        </span>
      </div>
      <div className="hero-assistant">
        <div className="row spread">
          <h2>
            <span className="dashboard-icon small">
              <DashboardIcon name="sparkle" />
            </span>
            {owner ? "Your pet care companion" : "Clinic quick access"}
          </h2>
          <span className="dashboard-badge">FURPAWS</span>
        </div>
        <p>
          {owner
            ? "Keep your pets’ next steps close at hand."
            : "Your shortcuts to the clinic’s daily work."}
        </p>
        <div className="assistant-summary">
          <strong>{summary.title}</strong>
          <p>{summary.text}</p>
        </div>
        <Link className="button primary" to={action.to}>
          {action.label}
          <DashboardIcon name="arrow" />
        </Link>
      </div>
    </section>
  );
}
export function MetricCard({ label, value, caption, icon, loading = false }) {
  return (
    <section className="metric-card">
      <span className="dashboard-icon">
        <DashboardIcon name={icon} />
      </span>
      <div>
        <p className="metric-label">{label}</p>
        <strong className="metric-value">{loading ? "—" : value}</strong>
        <p className="metric-caption">{caption}</p>
      </div>
    </section>
  );
}
export function DashboardCard({
  eyebrow,
  title,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`dashboard-card ${className}`}>
      <div className="dashboard-card-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action && (
          <Link className="text-action" to={action.to}>
            {action.label || "View all"}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
export function ShortcutGrid({ items }) {
  return (
    <div className="shortcut-grid">
      {items.map(({ label, to, icon }) => (
        <Link key={label} to={to} className="shortcut-tile">
          <span className="dashboard-icon">
            <DashboardIcon name={icon} />
          </span>
          <strong>{label}</strong>
        </Link>
      ))}
    </div>
  );
}
export function StatusRing({ items, title = "Total visits" }) {
  const total = items.reduce((sum, { count }) => sum + count, 0);
  let start = 0;
  const segments = items.map(({ count }, index) => {
    const end = start + (total ? (count / total) * 360 : 0);
    const segment = `var(--chart${index + 1}) ${start}deg ${end}deg`;
    start = end;
    return segment;
  });
  return (
    <div className="status-chart">
      <div
        className="status-ring"
        style={{
          background: total
            ? `conic-gradient(${segments.join(", ")})`
            : "var(--dashboardSoft)",
        }}
        role="img"
        aria-label={`${title}: ${total}. ${items.map(({ label, count }) => `${label}: ${count}`).join(". ")}`}
      >
        <div>
          <span>{title}</span>
          <strong>{total}</strong>
        </div>
      </div>
      <ul className="chart-legend">
        {items.map(({ label, count }, index) => (
          <li key={label}>
            <span
              className="legend-dot"
              style={{ background: `var(--chart${index + 1})` }}
            />
            <span>{label}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
export function SnapshotRows({ items }) {
  return (
    <div className="snapshot-list">
      {items.map(({ title, text, icon }) => (
        <div className="snapshot-row" key={title}>
          <span className="dashboard-icon small">
            <DashboardIcon name={icon} />
          </span>
          <div>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
export function ReminderTiles({ items }) {
  return (
    <div className="reminder-grid">
      {items.map(({ title, text, icon, to, action = "View" }) => (
        <Link className="reminder-tile" key={title} to={to}>
          <span className="dashboard-icon small">
            <DashboardIcon name={icon} />
          </span>
          <div>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
          <span className="text-action">
            {action}
            <DashboardIcon name="arrow" />
          </span>
        </Link>
      ))}
    </div>
  );
}
export function DashboardNotice({ resources }) {
  const failure = resources.find(({ error }) => error);
  if (!failure) return null;
  return (
    <Alert
      type="error"
      showIcon
      message={failure.error}
      action={
        <Button
          onClick={() => Promise.all(resources.map(({ refresh }) => refresh()))}
        >
          Try again
        </Button>
      }
    />
  );
}
