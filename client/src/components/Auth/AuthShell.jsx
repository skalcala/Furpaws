import { Link } from "react-router-dom";
import { Logo } from "../Shared/Layout";
export default function AuthShell({ title, description, register = false, children }) {
  return <main className={`auth-page auth-reference${register ? " is-register" : ""}`}>
    <div className="auth-split-card">
      <section className="auth-form-side">
        <Link className="auth-back-link" to="/">← Back to FurPaws</Link>
        <div className="auth-card"><Logo /><h1>{title}</h1><p>{description}</p>{children}</div>
        <p className="auth-form-footnote">Your pets. Their health. One place.</p>
      </section>
      <figure className="auth-photo-side">
        <img src="/assets/auth/pug-portrait.avif" alt="Black pug wearing a striped shirt against a red background" fetchPriority="high" />
        <figcaption>Photo by <a href="https://unsplash.com/photos/black-pug-wearing-striped-apparel-DziZIYOGAHc" target="_blank" rel="noreferrer">charlesdeluvio / Unsplash</a></figcaption>
      </figure>
    </div>
  </main>;
}
