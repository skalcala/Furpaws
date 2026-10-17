# FurPaws Pet Clinic Management System

A working local React + Express + Mongoose application based on the supplied FurPaws Figma file and S1–S4. The backend owns authorization, owner filtering, availability, approvals, clinical completion, inventory, billing, reminders, and audit logging.

## Project folders

```text
website/
  client/       React app, original src/public files, client package.json
  server/       Express API, models/controllers/routes, .env, server package.json
  scripts/      Local MongoDB helper
  tests/        API/Postman/browser verification
  docs/         Implementation notes and screenshots
  finals/       Your pre-existing folder; left untouched
  package.json  Starts both applications with npm start
```

The application code and design were copied from the working FurPaws project. Only package/startup configuration, the server path to `client/build`, and test `.env` locations were adapted for the requested folder structure. The frontend has since received the requested portal, landing-page, registration and workflow updates.

## Run

Requires Node.js 22.x and MongoDB Community Server, or MongoDB Atlas. MongoDB must support transactions (replica set); standalone MongoDB is deliberately not used as a fallback.

```sh
npm install
cp server/.env.example server/.env
# Replace JWT_SECRET in server/.env with a long random secret.
npm run db:start
npm run seed
npm start
```

Open http://127.0.0.1:3000. API: http://127.0.0.1:4000/api. `db:start` starts a local replica set on port 27018, stores data under `.local/mongo`, and preserves an existing running database. Use your Atlas connection string in `server/.env` instead if preferred. Seeding is idempotent and preserves existing records.

| Account | Email | Password |
|---|---|---|
| Owner | ava@furpaws.test | FurPaws123 |
| Admin | admin@furpaws.test | FurPaws123 |
| Second owner, isolation checks | noah@furpaws.test | FurPaws123 |

These are local classroom demonstration accounts. Public registration always creates an OWNER; an API caller cannot register as ADMIN.

To serve a production build locally: `npm run build`, then `npm run start:production`, then open http://127.0.0.1:4000. The Express server serves both the API and compiled React application. The normal `npm start` command launches Create React App on port 3000 and the Express API on port 4000 together.

For the transferred project already installed on this Mac:

```sh
cd /Users/alcala/Downloads/website
npm start
```

If installing a fresh copy, run `npm install` in `website` first. This one command installs the root, client and server packages. The command is `npm`, not `nom`. Missing `concurrently` means these dependencies have not been installed.

## This revision

- One `npm start` command launches React (`react-scripts`, Create React App) and Express/nodemon. The Vite dependencies, configuration and entry point have been removed.
- The app shell fills the browser; content areas use responsive spacing and centered width limits to keep cards and tables readable.
- Selecting **Consultation** requires an owner explanation of 20–2,000 characters. **Follow-up checkup** notes are optional; follow-up requires an existing pet record. Consultation guidance asks about symptoms, onset, appetite/behavior changes and prior medicine. Optional follow-up notes can describe progress or questions for the next checkup. Routine checkups can state the reason for the checkup.
- The explanation is saved as `appointments.reasonForVisit`; it appears in Review, Confirmation, My Appointments, Admin approval and the consultation screen. It stays separate from Admin diagnosis/treatment. Vaccination bookings do not require it. Older existing bookings display an explanatory message instead of fabricated history.
- The supplied ZIP contains lesson presentations and an activity PDF. The React bootstrap and per-resource model/controller/route examples have been adapted to this clinic system; the unrelated payroll activity remains reference material.

## Tests

With MongoDB, API, and frontend running:

```sh
npm test
npm run test:postman
npm run test:browser
npm run test:revision
```

Import `tests/FurPaws.postman_collection.json` into Postman to inspect/run it manually. Newman executes this same collection. It includes live mutations and creates a demonstration completed pet visit and payment. The Node integration test covers transaction rollback and concurrency, and removes its own fixtures. The current isolated browser workflow exercises photo upload, numeric inputs, follow-up eligibility, guest emergency intake, clinical completion, service billing and follow-up history. On macOS it uses installed Google Chrome; elsewhere run `npx playwright install chromium`, or set `CHROME_PATH`. Browser screenshots go to `.local/browser-results/`.

The local database must contain the demo accounts. Tests intentionally run against the local clinic database, so use a separate database URI for external/staging deployments.

## Structure

- `client/src/AppController.jsx`: BrowserRouter-compatible Routes/Route role guards and screen names.
- `client/src/components/Auth`: login, owner account registration, JWT session context.
- `client/src/components/Owner`: U1–U3c, U9–U10 and shared pet/record views.
- `client/src/components/Booking`: U4–U8 and U6a full-slot modal.
- `client/src/components/Admin`: A1–A15 and related modals/subviews.
- `client/src/components/Shared`: layout, navigation, loading/error/empty states, panels and tables.
- `client/src/theme.js`: extracted colors, typography, geometry and spacing tokens. Responsive breakpoints remain in CSS.
- `client/public/assets`: downloaded Figma logo, pet pictures and SVG icons; no temporary asset URLs.
- `server/models/User.js`, `Pet.js`, `Appointment.js`, etc.: separate Mongoose schemas and CommonJS model exports with explicit plural collection names, following the teacher’s examples.
- `server/controllers`: resource and workflow controllers using `getX/createX/updateX/deleteX` and CommonJS exports. Shared CRUD code is reused by per-resource medicine/service/schedule/expense controllers.
- `server/routes`: protected REST routes and per-resource CRUD routes.
- `server/middleware/auth.js`: JWT verification and backend role guards.
- `server/utils`: transaction, audit, notification and reminder helpers.

## Design and implementation evidence

Read [docs/IMPLEMENTATION-CHECKLIST.md](docs/IMPLEMENTATION-CHECKLIST.md) for every screen, validation rule, flow step, per-screen deviations, assumptions, and remaining verification limits. [docs/figma-inventory.json](docs/figma-inventory.json) records the source frame IDs.

The Figma documentation border, frame labels, instructional footers and canvas navigation arrows are reference material; they are not application pages. S1–S4 and the legacy lookup are implemented as behavior, not navigation destinations.

### Public website and navigation

The root URL (`http://127.0.0.1:3000/`) now opens the public FurPaws advertising page. Its appointment/signup links open `/login?mode=register`; existing account holders can switch to sign in on the same page. Authentication and clinic booking rules are unchanged.

Account details, profile editing, password changes, and sign out are available in **Settings** (`/admin/settings` or `/owner/U2`). The header account button opens a compact menu with Settings and Logout. The bell opens a compact, searchable notification dropdown with a link to the full notification history.

Ant Design supplies numbered pagination for long tables (10 records), pet collections (6 cards), full notification feeds (10 messages), and compact notification previews (3 messages). Pagination appears only when there is more than one page. Generated marketing imagery and its prompts are documented in `client/public/assets/marketing/ASSETS.md`.

The login/register page uses a form-left/photo-right card layout. The original 2400 × 3103 pug photograph is stored locally; its source and photographer are documented in `client/public/assets/auth/ATTRIBUTION.md`. Billing includes a paginated bill ledger with a View bill action, while its payment and print controls remain available.

The authentication layout fills the viewport with no outer card frame, margins, decorative circles, or ribbon. Desktop uses a form-left/photo-right split; mobile stacks the photo above the form. The current hero is the user-supplied AVIF in `client/public/assets/auth/pug-portrait.avif`.

All public landing-page photographs now use real stock images downloaded from Magnific with AI assets excluded. Sources and attribution are in `client/public/assets/stock/ATTRIBUTION.md`; image credits are also displayed in the site footer. Earlier generated marketing files are retained for history and are no longer referenced by the page.

## Vercel production deployment

Run `npx vercel --prod` from the project root. `vercel.json` builds the React client and routes `/api/*` to the shared Express function in `api/index.js`. Browser routes, including `/login` and the protected portals, use the React router. Local development still starts with `npm start`.

Set these **Production** environment variables in Vercel before deploying:

- `MONGODB_URI`: an Atlas connection string with a dedicated `furpaws` database. The database must support transactions and accept connections from Vercel. The local `127.0.0.1` database cannot be used by a cloud deployment.
- `JWT_SECRET`: a long random secret, distinct from the local development secret.
- `CRON_SECRET`: a random secret protecting the scheduled reminders endpoint.
- `CLIENT_ORIGIN`: optional when the frontend and API share a domain; set it to the frontend URL if using a separate client deployment.

`server/database.js` reuses the database connection across warm function invocations. The Vercel entry point does not start a persistent HTTP listener or interval. Reminders refresh when authenticated users fetch notifications, and a daily Vercel cron runs the same idempotent generator. Existing local reminder behavior is unchanged.

The deployment excludes `.env` files, local MongoDB data, dependencies, tests, and the unrelated `finals/` project. Data is **not** automatically migrated or seeded in Atlas. After adding or changing environment variables, redeploy. Check `/api/health`: the API is ready only when it returns HTTP 200 with `database: "connected"`.

## Core workflow revision

See [the completion checklist](docs/CORE-FEATURES-CHECKLIST.md) for species-specific breeds, optional estimated registration weight, Admin booking alerts, cancellation reasons, service rescheduling, consultation guidance, billing order, audit snapshots and validation fixes.

Use `npm run test:workflow` for regression tests in a disposable local database. Use `npm run build` then `npm run demo` for an isolated classroom demonstration with an Approved visit in Today’s Queue. Demo mode uses `furpaws_demo`, port 4500, and never changes Atlas or the real local clinic database.

Production minute reminders require creating the external job described in [the free scheduler guide](docs/REMINDER-SCHEDULER-SETUP.md). The protected endpoint and dedicated Production key are configured; external scheduling remains a user setup step.

## Follow-up and emergency revision

The active prescription workflow has been replaced with optional follow-up plans. Admins can start an emergency consultation for an existing patient or record a guest patient without a login account. See [the revision checklist](docs/FOLLOWUP-EMERGENCY-REVISION.md).

Sign-in accepts email or PH mobile number with the account password. The Twilio Verify integration is ready for registration/phone changes; real SMS delivery remains pending the owner's provider account and secret credentials. See [phone OTP activation](docs/PHONE-OTP-SETUP.md). Local demo/tests do not send real SMS.

For the current isolated browser regression: `npm run build && npm run test:ui:workflow`. It seeds a temporary local database, sends no real SMS, and removes that test database afterward. The `test:browser` and `test:revision` aliases now run this current workflow; older script files are retained as historical references.
