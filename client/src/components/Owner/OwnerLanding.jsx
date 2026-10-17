import { Link } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  HeartOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { DashboardIcon } from "../Shared/Dashboard";
import { formatDate, formatTime } from "../../api";

export default function OwnerLanding({ user, pets, upcoming }) {
  const visit = upcoming.find(({ status }) => status === "Approved");
  const featured = pets.find(({ _id }) => _id === visit?.pet?._id) || pets[0];
  return (
    <>
      <section className="owner-landing-hero">
        <div className="owner-landing-copy">
          <span className="portal-kicker">
            <span /> YOUR PET’S HEALTH, CONNECTED
          </span>
          <p className="owner-welcome">
            Welcome back, {user.name.split(" ")[0]}.
          </p>
          <h1>
            Good care.
            <br />
            <em>Happy little paws.</em>
          </h1>
          <p className="owner-hero-description">
            From the next checkup to every little milestone, keep your pet’s
            care in one familiar place.
          </p>
          <div className="owner-hero-actions">
            <Link className="button primary" to="/owner/U4">
              <CalendarOutlined aria-hidden="true" /> Book an appointment{" "}
              <ArrowRightOutlined aria-hidden="true" />
            </Link>
            <Link className="button" to="/owner/U3">
              Meet my pets <HeartOutlined aria-hidden="true" />
            </Link>
          </div>
          <div className="owner-trust">
            <FileProtectOutlined aria-hidden="true" />
            <span>Your pets’ medical history, safely in your account.</span>
          </div>
        </div>
        <div className="owner-featured-pet">
          <div className="owner-pet-art">
            {featured?.picture ? (
              <img src={featured.picture} alt={featured.name} />
            ) : (
              <DashboardIcon name="pet" />
            )}
            <span className="owner-pet-badge">
              <HeartOutlined aria-hidden="true" /> A little love. A lifetime of
              care.
            </span>
          </div>
          <div className="owner-visit-preview">
            <span className="dashboard-icon">
              <CalendarOutlined aria-hidden="true" />
            </span>
            <div>
              <span className="portal-kicker">
                {visit
                  ? "YOUR NEXT APPROVED VISIT"
                  : "LET’S PLAN THEIR NEXT VISIT"}
              </span>
              <strong>
                {visit
                  ? `${visit.pet?.name} · ${visit.service?.name}`
                  : featured
                    ? `${featured.name} deserves the best care`
                    : "Your pet’s care starts here"}
              </strong>
              <p>
                {visit
                  ? `${formatDate(visit.date)} · ${formatTime(visit.time)}`
                  : "Choose a service and a time that works for you."}
              </p>
            </div>
            <Link
              to={visit ? "/owner/U9" : "/owner/U4"}
              aria-label={
                visit ? "View upcoming appointments" : "Start booking"
              }
            >
              <ArrowRightOutlined aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className="owner-care-path" aria-label="Your pet care shortcuts">
        {[
          {
            number: "01",
            icon: <HeartOutlined aria-hidden="true" />,
            title: "Their story, all together",
            text: "View your pets and their health information.",
            to: "/owner/U3",
          },
          {
            number: "02",
            icon: <CalendarOutlined aria-hidden="true" />,
            title: "Make time for good health",
            text: "Book a visit or check appointment updates.",
            to: "/owner/U4",
          },
          {
            number: "03",
            icon: <FileProtectOutlined aria-hidden="true" />,
            title: "Every visit, remembered",
            text: "Read consultation notes and vaccine history.",
            to: "/owner/U3?view=records",
          },
        ].map(({ number, icon, title, text, to }) => (
          <Link className="owner-care-step" key={number} to={to}>
            <span className="care-step-number">{number}</span>
            <span className="dashboard-icon">{icon}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
            <ArrowRightOutlined aria-hidden="true" />
          </Link>
        ))}
      </section>
    </>
  );
}
