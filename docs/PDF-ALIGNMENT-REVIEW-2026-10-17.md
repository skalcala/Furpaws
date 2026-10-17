# PDF and system alignment review

Reviewed October 17, 2026 (Asia/Manila). Source: `/Users/alcala/Downloads/FurPaws-Documentation.pdf`, 21 pages. Comparison: current project source plus production read checks at https://furpaws-khaki.vercel.app.

## Verdict

The system broadly implements the PDF's core clinic workflow, but it is **not an exact match**. Several deliberate later user requests supersede PDF requirements. The PDF needs revision, and production's unattended 60-second reminder cadence remains unconfirmed/not configured in the project setup instructions. Real phone OTP is disabled.

“Implemented” below means supported by current code and prior regression evidence; it does not mean every scenario was exercised against production in this review. Production clinical writes, payments and sample bookings were not performed.

## Core checklist

| PDF pages | Requirement | Status / current behavior |
| --- | --- | --- |
| 3–5, 15 | Public clinic landing page and sign-up links | Implemented. Public clinic information, services, photo credits and booking/account links. |
| 4, 7, 15, 18 | Owner/Admin accounts and role separation | Implemented. Public registration creates Owners; Admin access is protected. JWT sessions and bcrypt password hashing remain. |
| 7, 18 | Eight-hour tokens; password rules | Implemented in authentication controller: 8-hour JWT; 8–72 characters, uppercase/lowercase/number. |
| 5, 15–16 | Approved pets, photo upload, detail/history, six pets per page | Implemented. Owner pages filter Approved pets and paginate by six. Image uploads are resized and saved. |
| 5–6, 16 | Dog/Cat/Other and pet registration during booking | Implemented with later improvements: species-dependent breed choices, typed Other species and optional estimated weight. Actual weight is measured at consultation. |
| 16 | With-record / No-record booking, schedule, review and Pending confirmation | Implemented. Draft data persists for the browser tab. |
| 5, 16, 18 | Available/Full/Blocked/Past and transactional capacity checks | Implemented. Booking, approval and rescheduling check capacity; duplicate same-pet slots are prevented. |
| 16–17 | Approval/decline, calendar, queue, reschedule and cancel | Implemented. Later changes also require cancellation reasons and preserve changed services on reschedule. |
| 5, 17–18 | Clinical weight, diagnosis, treatment, notes and completion | Implemented. Completion saves clinical record, measured weight history, visit status, vaccine when supplied and bill in a transaction. Prescription deduction is excluded by later request. |
| 5–6, 17 | Rabies/DHPP/FVRCP records and next due date | Implemented; fixed vaccine choices remain. |
| 5, 17 | Medicine inventory CRUD, quantities/prices/expiry/thresholds | Implemented as an inventory module. Automatic deduction on new clinical completion is deliberately removed with prescriptions. |
| 5, 17 | Services/fees and schedule configuration | Implemented: service management, hours, slots, capacities and closed dates. |
| 5, 17 | Billing, manual payments and printing | Implemented. Payment processing sits above the paginated ledger; unpaid bills and paid receipts can be printed. New clinical bills currently contain the service fee. |
| 5, 17 | Reports and expenses | Implemented. Date-range financial/appointment reporting and expense management remain. |
| 9, 17–18 | Audit logs and before/after changes | Implemented, including a detail viewer and redaction of sensitive/image fields. |
| 15 | Bell dropdown: three latest messages, search/history/read state | Implemented. Compact page size is three; full history is paginated. Admin also receives booking inbox notifications. |
| 18 | Appointment/vaccine reminders with deduplication | Reminder generation and protected scheduler endpoint implemented. Exact unattended production cadence remains outstanding; see below. |

## Intentional differences: update the PDF

| PDF statement | Current system / approved later requirement |
| --- | --- |
| Prescriptions, dosage/frequency/duration, prescription history and automatic stock deduction (pp. 3–5, 9, 12–13, 17–19) | Active prescription workflows replaced by optional follow-up plans/checkups. New prescription payloads are rejected. Historical records remain preserved. New completion does not deduct medicines or add medicine charges. |
| Required 20–2,000-character explanation for both Consultation and Follow-up (p. 16) | Consultation remains required; follow-up notes are optional, maximum 2,000 characters. Follow-up requires an existing approved record. |
| Pet registration weight (p. 16) | Owner estimated weight is optional; clinical measured weight is required later. |
| Email/password login only (p. 15) | Email OR Philippine mobile/password login. OTP integration also exists but is disabled until a real provider is configured. |
| Every visit follows owner online booking (pp. 4, 16–17) | Admin-only emergency intake also supports existing pets and new guest patients without an account, including closed/blocked days. Emergency visits do not consume normal slot capacity. |
| All logged-in pages use a left sidebar (p. 10) | Owner navigation uses the requested top-navigation design; Admin retains its sidebar. Red/blush palette and Inter remain. |
| Twelve database collections (pp. 7–9) | Thirteen current model collections, including `OtpLimit` for verification rate limits. Users/appointments/consultations also gained phone, guest, emergency and follow-up fields. |
| Production Express listener on port 4000 serves both frontend and API (p. 7) | Vercel serves the compiled frontend and invokes Express as a serverless API; local development still uses 3000/4000 with npm start. |
| Notifications addressed to Owners (p. 9) | Owner notices plus Admin booking inbox notices. |
| Cloud deployment is future work (p. 19) | Vercel and MongoDB Atlas are already in use. Installable/native mobile application is still outside current scope. |

## Remaining gaps / documentation work

- [ ] **Every-60-second unattended production reminders (pp. 7, 18):** local server has a 60-second interval. Vercel configuration schedules a daily job; notification requests can also trigger generation. The external minute scheduler instructions are prepared in `REMINDER-SCHEDULER-SETUP.md`, but an enabled external job has not been verified. Do not describe production as checking every minute yet.
- [ ] **Real phone OTP (later user request, not original PDF core):** live `/api/auth/config` reports `phoneOtpEnabled: false`. Provider integration/mock tests exist; actual SMS delivery is not active.
- [ ] Replace all application screenshot placeholders on PDF pp. 10–14 with current UI captures.
- [ ] Complete cover date, group-member and course placeholders on p. 1.
- [ ] Update architecture/database diagrams and descriptions for serverless deployment, the extra collection, guests/emergencies and follow-up plans.
- [ ] Revise the feature tables and summary to remove claims about active prescribing and automatic medicine deduction.
- [ ] Verify production database connection reliability. This review received one `database: disconnected` health result, followed by a successful connected result. That is evidence of an intermittent symptom, not a proven root cause.
- [ ] Performance remains separate work: large static photos and repeated embedded pet images in list responses cause heavy downloads; visible pagination currently does not guarantee server-side pagination.

Future enhancements such as online payment gateways, multi-vet scheduling, email reminders/password reset, configurable vaccines and an installable application remain excluded by the user's chosen scope. Their absence is not counted as a core implementation failure.

## Evidence and limits

- Re-extracted all 21 pages from the supplied PDF and inspected the rendered automatic-rules page (p. 18).
- Reviewed current authentication, model, consultation, booking, notifications, reminder and Vercel configuration code.
- Previous isolated API run passed five tests, covering core workflow, authorization/capacity, emergency/follow-up behavior, visit details, cancellation/rescheduling and mocked SMS integration.
- A fresh isolated test run was attempted during this review but could not complete because the local MongoDB listener on port 27018 was unavailable. It was stopped; this review does not claim a new passing test run.
- Live verification passed on retry: health connected; Owner/Admin and mobile-number logins; Dog/Cat breed catalogs; Admin inbox; Owner forbidden from Admin inventory; unauthenticated scheduler request denied. All 13 checked resource endpoints returned HTTP 200, and 17 Admin destinations rendered with zero browser runtime errors. Real OTP remained disabled. Read availability alone does not prove every mutation works in production.

The original PDF and application behavior were not changed by this review.
