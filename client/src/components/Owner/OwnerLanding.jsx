import { Link } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  FileProtectOutlined,
  HeartOutlined,
} from "@ant-design/icons";
import { formatDate, formatTime, formatSpecies } from "../../api";

export default function OwnerLanding({ user, pets, upcoming }) {
  const visit = upcoming.find(({ status }) => status === "Approved");
  const featured = pets.find(({ _id }) => _id === visit?.pet?._id) || pets[0];
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
        <span className="owner-banner-eyebrow">MY PET CARE / OVERVIEW</span>
        <h1>Hello, {user.name.split(" ")[0]}.</h1>
        <p>{date} · Here’s your pets’ care overview.</p>
        <div className="owner-banner-actions">
          <Link className="button owner-banner-primary" to="/owner/U4">
            <CalendarOutlined aria-hidden="true" /> Book an appointment
          </Link>
          <Link className="button owner-banner-secondary" to="/owner/U3?view=records">
            <FileProtectOutlined aria-hidden="true" /> Medical records
          </Link>
        </div>
      </div>
      <div className="owner-banner-summary">
        <Link
          className="owner-current-pet"
          to={featured ? `/owner/U3b/${featured._id}` : "/owner/U3"}
        >
          <span className="owner-current-pet-picture">
            {featured?.picture ? (
              <img src={featured.picture} alt={featured.name} />
            ) : (
              <HeartOutlined aria-hidden="true" />
            )}
          </span>
          <span>
            <span className="owner-banner-eyebrow">{featured ? "YOUR PET" : "YOUR PET FAMILY"}</span>
            <strong>{featured?.name || "A healthier start, together"}</strong>
            <span>{featured ? `${formatSpecies(featured)} · ${featured.breed}` : "Approved pet profiles appear here."}</span>
          </span>
          <ArrowRightOutlined aria-hidden="true" />
        </Link>
        <Link className="owner-banner-visit" to={visit ? "/owner/U9" : "/owner/U4"}>
          <CalendarOutlined aria-hidden="true" />
          <span>
            <strong>{visit ? "Next approved visit" : "Plan your next visit"}</strong>
            <span>{visit ? `${visit.pet?.name} · ${formatDate(visit.date)} · ${formatTime(visit.time)}` : "Choose a service and an available time."}</span>
          </span>
          <ArrowRightOutlined aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
