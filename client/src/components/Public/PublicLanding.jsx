import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  MenuOutlined,
  CloseOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import { Logo } from "../Shared/Layout";
import { DashboardIcon } from "../Shared/Dashboard";
import { useAuth } from "../Auth/AuthContext";

const services = [
  {
    Icon: SolutionOutlined,
    title: "Wellness consultations",
    text: "A visit for your pet’s symptoms and health concerns.",
  },
  {
    Icon: SafetyCertificateOutlined,
    title: "Vaccination visits",
    text: "Keep their protection and vaccination history together.",
  },
  {
    Icon: HeartOutlined,
    title: "Follow-up care",
    text: "Share their progress after an earlier consultation.",
  },
  {
    Icon: MedicineBoxOutlined,
    title: "Prescription guidance",
    text: "Revisit the treatment instructions from your veterinarian.",
  },
  {
    Icon: FileProtectOutlined,
    title: "Pet medical records",
    text: "Their consultation and vaccine history in your account.",
  },
  {
    Icon: BellOutlined,
    title: "Care reminders",
    text: "Clinic updates and reminders for the care ahead.",
  },
];
const links = [
  ["#home", "Home"],
  ["#services", "Our services"],
  ["#about", "About us"],
  ["#how-it-works", "How it works"],
];
export default function PublicLanding() {
  const [menu, setMenu] = useState(false);
  const { user } = useAuth();
  const portal = user?.role === "ADMIN" ? "/admin/A1" : "/owner/U1";
  useEffect(() => {
    const previous = document.title;
    document.title = "FurPaws | A healthier, happier life for your pets";
    return () => {
      document.title = previous;
    };
  }, []);
  return (
    <div className="public-site" id="home">
      <a className="public-skip" href="#public-main">
        Skip to content
      </a>
      <header className="public-header">
        <div className="public-container public-header-inner">
          <Link to="/" aria-label="FurPaws home">
            <Logo />
          </Link>
          <nav
            aria-label="Website navigation"
            className={menu ? "public-navigation is-open" : "public-navigation"}
          >
            {links.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
          <Link
            className="button primary public-header-cta"
            to={user ? portal : "/login"}
          >
            {user ? "My portal" : "Sign in"}
            <ArrowRightOutlined aria-hidden="true" />
          </Link>
          <button
            className="public-menu-button"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? (
              <CloseOutlined aria-hidden="true" />
            ) : (
              <MenuOutlined aria-hidden="true" />
            )}
          </button>
        </div>
      </header>
      <main id="public-main">
        <section className="public-hero">
          <div className="public-container public-hero-grid">
            <div className="public-hero-copy">
              <span className="public-pill">
                <DashboardIcon name="pet" /> Healthy pets. Happy lives.
              </span>
              <h1>
                Trusted care for
                <br />
                <span>a healthier,</span>
                <br />
                happier tomorrow.
              </h1>
              <p>
                They’re family. From their first checkup to every follow-up,
                make time for the care your best friend deserves.
              </p>
              <Link
                className="button public-hero-button"
                to="/login?mode=register"
              >
                <CalendarOutlined aria-hidden="true" /> Need an appointment?{" "}
                <strong>Sign up now</strong>
                <ArrowRightOutlined aria-hidden="true" />
              </Link>
              <span className="public-hero-caption">
                <CheckCircleOutlined aria-hidden="true" /> Book online. Get
                clinic approval. Come in for care.
              </span>
            </div>
            <div className="public-hero-art">
              <span className="public-art-circle" />
              <DashboardIcon name="pet" />
              <img
                src="/assets/stock/pets-magnific.jpg"
                alt="A long-haired dog resting beside a tabby cat"
                fetchPriority="high"
              />
              <div className="public-handwritten">
                Better care.
                <br />
                More happy tails.
                <HeartOutlined aria-hidden="true" />
              </div>
            </div>
          </div>
          <span className="public-hero-paw">
            <DashboardIcon name="pet" />
          </span>
        </section>
        <section className="public-section" id="services">
          <div className="public-container public-services-grid">
            <div className="public-section-copy">
              <span className="public-eyebrow">
                <DashboardIcon name="pet" /> OUR SERVICES
              </span>
              <h2>
                The best care for
                <br />
                <span>your beloved pets.</span>
              </h2>
              <p>
                From a routine checkup to the next chapter of their recovery,
                keep your pet’s care connected with FurPaws.
              </p>
              <div className="public-service-list">
                {services.map(({ Icon, title, text }) => (
                  <div className="public-service" key={title}>
                    <span className="public-feature-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a className="button public-outline" href="#how-it-works">
                Plan your first visit <ArrowRightOutlined aria-hidden="true" />
              </a>
            </div>
            <div className="public-care-collage">
              <div className="public-collage-backdrop" />
              <img
                className="public-vet-photo"
                src="/assets/stock/vet-magnific.jpg"
                alt="A veterinarian examining a dog in a clinic"
                loading="lazy"
              />
              <div className="public-care-promise">
                <DashboardIcon name="pet" />
                <span>
                  Care that stays
                  <br />
                  close to home.
                </span>
                <strong>
                  One account.
                  <br />
                  Every visit.
                </strong>
                <p>Your pets, records, and appointments, together.</p>
              </div>
              <img
                className="public-cat-photo"
                src="/assets/stock/pets-magnific.jpg"
                alt="A tabby cat resting next to a long-haired dog"
                loading="lazy"
              />
            </div>
          </div>
        </section>
        <section className="public-container">
          <div className="public-booking-banner">
            <div className="public-banner-sketch">
              <DashboardIcon name="pet" />
              <HeartOutlined aria-hidden="true" />
            </div>
            <div>
              <span className="public-eyebrow">
                <CalendarOutlined aria-hidden="true" /> BOOK AN APPOINTMENT
              </span>
              <h2>
                A little planning.
                <br />
                <span>A lot of peace of mind.</span>
              </h2>
              <p>
                Need an appointment? Create your owner account and choose a
                convenient visit for your pet.
              </p>
              <Link className="button primary" to="/login?mode=register">
                Sign up now <ArrowRightOutlined aria-hidden="true" />
              </Link>
            </div>
            <img src="/assets/stock/pets-magnific.jpg" alt="" loading="lazy" />
          </div>
        </section>
        <section className="public-section" id="about">
          <div className="public-container public-about-grid">
            <div className="public-about-image">
              <img
                src="/assets/stock/vet-magnific.jpg"
                alt="Gentle care for a dog during a veterinary consultation"
                loading="lazy"
              />
              <div className="public-photo-caption">
                <HeartOutlined aria-hidden="true" />
                <span>Little paws. Big love.</span>
              </div>
            </div>
            <div className="public-section-copy">
              <span className="public-eyebrow">
                <DashboardIcon name="pet" /> ABOUT FURPAWS
              </span>
              <h2>
                Compassionate care.
                <br />
                <span>Every pet. Every visit.</span>
              </h2>
              <p>
                FurPaws brings the clinic and your pet’s care journey closer
                together. Book a visit, share what’s worrying you, and keep your
                pets’ medical information within reach.
              </p>
              <div className="public-about-features">
                {[
                  [HeartOutlined, "Care with compassion"],
                  [FileProtectOutlined, "Your pet’s own records"],
                  [CalendarOutlined, "Simple online booking"],
                  [BellOutlined, "Helpful care reminders"],
                ].map(([Icon, text]) => (
                  <div key={text}>
                    <span className="public-feature-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{text}</strong>
                  </div>
                ))}
              </div>
              <a className="button public-outline" href="#how-it-works">
                See how it works <ArrowRightOutlined aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
        <section className="public-how-section" id="how-it-works">
          <div className="public-container">
            <div className="public-section-heading">
              <span className="public-eyebrow">
                <DashboardIcon name="pet" /> A SIMPLE START
              </span>
              <h2>
                Good care is just
                <br />
                <span>a few steps away.</span>
              </h2>
              <p>From your first request to your next clinic visit.</p>
            </div>
            <div className="public-steps">
              {[
                {
                  number: "01",
                  Icon: HeartOutlined,
                  title: "Create your account",
                  text: "Sign up as a pet owner. Choose an approved pet or register a new one when you book.",
                },
                {
                  number: "02",
                  Icon: CalendarOutlined,
                  title: "Choose your visit",
                  text: "Select a service, an available date and time, and share the reason for your visit.",
                },
                {
                  number: "03",
                  Icon: CheckCircleOutlined,
                  title: "Wait for clinic approval",
                  text: "Your request starts as Pending. Check your notifications for the clinic’s decision before your visit.",
                },
              ].map(({ number, Icon, title, text }) => (
                <article key={number}>
                  <span className="public-step-number">{number}</span>
                  <span className="public-feature-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="public-final-cta">
              <div>
                <h2>Ready for their next happy chapter?</h2>
                <p>
                  Need an appointment? Sign up now and start your pet’s care
                  journey.
                </p>
              </div>
              <Link className="button primary" to="/login?mode=register">
                Create an owner account{" "}
                <ArrowRightOutlined aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <div className="public-container">
          <div className="public-footer-top">
            <div>
              <Logo />
              <p>Your pets. Their health. One place.</p>
            </div>
            <nav aria-label="Footer navigation">
              {links.map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
              <Link to="/login">Owner & clinic sign in</Link>
            </nav>
            <div>
              <span className="public-eyebrow">
                LET’S PLAN THEIR NEXT VISIT
              </span>
              <Link to="/login?mode=register">
                Sign up for FurPaws <ArrowRightOutlined aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="public-photo-credits">
            Stock photography:{" "}
            <a
              href="https://www.magnific.com/free-photo/closeup-shot-cat-dog-isolated-white_11486566.htm"
              target="_blank"
              rel="noreferrer"
            >
              Pet photo by wirestock on Magnific
            </a>
            <span aria-hidden="true"> · </span>
            <a
              href="https://www.magnific.com/free-photo/female-veterinarian-examining-dog-table-clinic_3181074.htm"
              target="_blank"
              rel="noreferrer"
            >
              Veterinary photo by Magnific / Freepik
            </a>
          </div>
          <div className="public-footer-bottom">
            <span>
              © {new Date().getFullYear()} FurPaws Veterinary Clinic.
            </span>
            <span>
              <HeartOutlined aria-hidden="true" /> Made for the pets you love.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
