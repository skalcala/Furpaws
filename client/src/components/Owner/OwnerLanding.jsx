import { Link } from "react-router-dom";
import { CalendarOutlined, FileProtectOutlined } from "@ant-design/icons";
import { DashboardIcon } from "../Shared/Dashboard";

export default function OwnerLanding({ user }) {
  const date = new Date().toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <section className="owner-home-banner" aria-label="Your pet care overview">
      <div className="owner-banner-copy">
        <span className="owner-banner-eyebrow">MY PET CARE</span>
        <h1>Hello, {user.name.split(" ")[0]}.</h1>
        <p>{date}</p>
        <div className="owner-banner-actions">
          <Link className="button owner-banner-primary" to="/owner/book-appointment">
            <CalendarOutlined aria-hidden="true" /> Book an appointment
          </Link>
          <Link
            className="button owner-banner-secondary"
            to="/owner/my-pets?view=records"
          >
            <FileProtectOutlined aria-hidden="true" /> Medical records
          </Link>
        </div>
      </div>
      <span className="owner-banner-paw" aria-hidden="true">
        <DashboardIcon name="pet" />
      </span>
    </section>
  );
}
