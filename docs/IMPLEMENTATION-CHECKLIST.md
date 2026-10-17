# Implementation checklist and design deviations

Source: https://www.figma.com/design/DV8X6Yl8wA0HfhZV3hwDsM/Untitled?m=dev

S1–S4 and all three legacy lookup frames were read before implementation. High-fidelity design context with reference renders was retrieved for all 37 application frames (14 owner and 23 admin, including substates). Some get_variable_defs calls returned `{}`; later variable and dedicated screenshot calls were blocked by the Education-plan MCP call limit. Existing design-context renders were retained for comparison. The supplied OneDrive lesson archive has now been inspected, including the React bootstrap screenshots and Mongoose model/controller/route examples. The app uses Create React App, per-resource Mongoose models, CommonJS exports, React state/effects, axios and routing following those examples.

## Shared components and states

Implemented: desktop header/logo/global search, burgundy sidebar, mobile drawer, headings, panels, pet cards, definition lists, tables, status badges, steps, calendar dates/time slots, field errors, notifications, confirm/decline/error dialogs, payment selector, report date range, and print output.

State inventory: default, hover, keyboard focus, active/selected, disabled, submitting/loading, API error with retry, invalid field, empty list, no approved pets, full/blocked/past slot, pending/approved/declined/completed/cancelled booking, expired/out-of-stock/low-stock medicine, paid/unpaid billing. State details use Ant Design and the centralized Figma theme. Mobile and tablet layouts are sensible responsive assumptions; the Figma references are desktop.

## Owner pages

| Screen | Completed behavior | Deviations vs Figma |
|---|---|---|
| U1 Dashboard | Own upcoming appointments, reminders, events and working quick links | Live data/date; event rows include a short identifier. Additional real reminders can increase panel height. |
| U2 Owner Profile | View/edit own contact details, separately change password | Added functioning edit/password dialogs and inline validation. |
| U3 My Pets | Approved own pets only, original Milo/Cleo images, links to details | Data determines count/order and card content. |
| U3a No Pets | Empty approved-pet list explains hidden pending registrations and links to booking | Automatically selected by data; direct U3a route also renders the actual pet list if pets exist. |
| U3b General Information | View approved own pet, update photo, open records | Added records link and working file picker; original reference pet images retained. |
| U3c Medical Records | Read-only diagnoses, treatment, prescriptions, vaccines, weights, notes and past appointments | Tabs actually switch datasets; populated rows reflect database history rather than Figma sample text. |
| U4 Choose Record | With record selects an approved pet; No record branches to U5 | Real selectable cards and branch controls. |
| U5 Registration | Controlled pet name/species/breed/birth date/weight/photo form | Real date and file inputs, 2 MB photo limit; forms start empty. Pet persisted atomically with booking submission. |
| U6 Schedule | Dynamic month navigation, date statuses, service, available times and required Consultation/Follow-up explanation | Current calendar and availability replace stale Figma October-13 examples. |
| U6a Slot Full | Backend 409 produces full-slot modal; return to schedule | Implemented as U6/U7 modal. Direct U6a route returns to U6 rather than inventing a full booking. |
| U7 Review | Booking summary including the owner explanation, back action, single pending submit | Submit disabled for incomplete schedule; backend revalidates capacity. |
| U8 Confirmation | Submitted appointment ID, Pending state, appointments/dashboard links | Shows actual submission; direct visit without submission has an explanatory empty state. |
| U9 My Appointments | Upcoming/Previous tabs, cancel only Pending/Approved, decline reason and records links | Actual rows; confirmation dialog before cancellation. |
| U10 Notifications | Approval/decline/reminder messages for signed-in owner only | Added mark-as-read action. |

## Admin pages

| Screen | Completed behavior | Deviations vs Figma |
|---|---|---|
| A1 Dashboard | Live appointment/pet/owner/stock totals and quick links | Values come from MongoDB instead of static Figma totals. |
| A2 Approvals | Pending requests, review, approve/decline | Review uses modal; approval and pet update are transactional. |
| A2a No Record Detail | Owner/booking/registration review and both decisions | Modal or direct A2a/:id subview. |
| A2b Decline Reason Required | Inline error, request remains Pending | Real validation modal, not a separate static page. |
| A3 Appointments | Status tabs, table/calendar, reschedule/cancel | Calendar uses current live availability. Added actionable dialogs. |
| A4 Today's Queue | Only today's Approved visits, linked Start Consultation | Completion occurs in Save and Complete; redundant Mark as Done is omitted to prevent bypassing clinical completion. |
| A5 Consultation | Approved-only form, weight, diagnosis, treatment, notes, medicine prescriptions, saved history | Real inputs and repeatable prescription lines; starts with actual pet weight, not fabricated clinical findings. |
| A5a Vaccination | Vaccine type/date given/next due, weight and notes; auto record/bill/reminders | Nonapplicable consultation/prescription fields disabled; standalone direct ID required. |
| A5b Out of Stock | Reject unavailable inventory in UI and API, explanatory modal | Modal within A5, no standalone fake prescription. |
| A5c Expired | Reject expired inventory in UI and API, explanatory modal | Modal within A5. |
| A6 Pets & Owners | Search owner/pet/contact and open owner | Global search routes here; live rows. |
| A6a Owner Profile & Pets | Contact details and associated pets, including Pending | Live owner selection. |
| A6b Pet Detail & Validation | Read/edit identity, photo, approve/decline Pending pet | Added working edit/decision dialogs. Current weight is maintained by consultation completion. |
| A6c Medical Records | Complete pet record, Admin correction of diagnosis/treatment/notes | Edits preserve original prescription/billing/weight ledger; no silent stock reapplication. |
| A7 Vaccinations | History, due list, record links, edit vaccine/dates | Added edit dialog; initial vaccination creation goes through A5a. |
| A8 Medicine Inventory | Add/edit/delete, quantity/price/unit/expiry, stock alerts | Added CRUD dialogs. Medicines referenced by prescription history cannot be deleted. |
| A9 Services | Add/edit/activate/deactivate medical service and fee | Added CRUD dialogs; medical service types limited to Consultation/Vaccination. |
| A10 Schedule Settings | Hours, capacity, times, blocked dates, holidays, leave | Added editor; leave is clinic-wide because only OWNER/ADMIN roles were specified. |
| A11 Billing & Payments | Automatic bills, itemized totals, payment recording, receipt print | Bill selector and pay action added; printing enabled after payment. |
| A12 Reports | Reporting dates, revenue, expenses, net income, activity/status distribution and print | Live totals and rows; actual print stylesheet rather than static print control. |
| A13 Expenses | Create/edit/delete expenses; totals feed report | Added CRUD dialogs and deletion confirmation. |
| A14 Notifications | Owner notification history, message, recipient and date | Live messages; delivery is in-app. |
| A15 Audit Logs | Actor/action/resource/record/time history | Read-only, paginated UI, API returns latest 1,000 entries. |

The legacy screen 23 is mapped to A5. No extra clinical screen or role was invented.

## Requested follow-up changes (16 October 2026)

- [x] Updated per latest request: Owner and Admin layouts fill the browser width with no outer margins or maximum-width cap. Internal content padding is preserved.
- [x] Create React App using `react-scripts`, `src/index.js`, and `public/index.html`; no Vite runtime/config/dependency.
- [x] Root `npm start` launches the React frontend and Express/nodemon backend together.
- [x] Separate `server/models/User.js`, `Pet.js`, etc., matching the model examples in the lesson archive.
- [x] Required detailed symptoms/checkup reason for Consultation and prior-treatment/progress details for Follow-up (20–2,000 trimmed characters).
- [x] Explanation validated on both frontend and backend before new pet/booking writes.
- [x] Saved explanation visible in Owner review/confirmation/history and Admin approval/consultation.
- [x] Vaccination excludes this required explanation. Existing older bookings remain accessible.
- [x] Node tests cover both service types, invalid lengths/types, whitespace, stored text, Admin visibility and the vaccine exception.
- [x] Browser verification checks both booking variants, Admin visibility, and equal margins on 21 routes and three viewport sizes.

## S3: all 12 rules

- [x] 1. New pet Pending and hidden from owner pet/record endpoints until approved.
- [x] 2. Only backend ADMIN role can approve/decline bookings/pets.
- [x] 3. First-record approval also approves the new pet in the same transaction.
- [x] 4. UI disables full/blocked/past slots; API rejects them. Clinic hours, holidays, leave and day capacity apply.
- [x] 5. Same pet cannot have an active booking in the same date/time slot.
- [x] 6. Only Approved appointments accept a consultation.
- [x] 7. ADMIN creates/edits clinical records; OWNER views only.
- [x] 8. Expired/out-of-stock/insufficient medicine rejected in UI and backend.
- [x] 9. Inventory is reduced only when the prescription/consultation transaction commits.
- [x] 10. Completion marks appointment Completed and updates current weight/history once.
- [x] 11. Owner pet, record, appointment and notification reads are filtered/authorized on backend.
- [x] 12. Approvals, declines, record edits, deletions and stock changes create audit entries in the mutation transaction.

Additional validation: required and bounded text, email, PH phone, password length/uppercase/lowercase/number, nonnegative money/integer stock, positive consultation weight ≤500kg, birth date ≤today, date/time availability, vaccine type and date ordering. Controlled forms show inline errors; submits have loading guards. APIs return readable 400/401/403/404/409/500 responses. UI retries list failures, redirects expired sessions, and preserves booking draft during navigation. Errors without a field mapping appear at form level.

## S1/S2: six-step flow

- [x] 1. Owner signs in and starts booking.
- [x] 2. Select approved own pet or register a new Pending pet via No record.
- [x] 3. Select eligible date/time/service, review, submit, receive Pending confirmation.
- [x] 4. Admin approves or declines with a required reason. Approval updates pet, queues only today's approved visit; decline notifies and never enters queue.
- [x] 5. Admin records consultation or vaccination and optional medicine prescription, then Save and Complete.
- [x] 6. One transaction completes appointment, updates weight/history, reduces stock, creates bill, saves records, makes pet visible and creates medical reminder/notification.

## S4: access

- [x] JWT login, eight-hour expiry, hashed passwords.
- [x] Protected React routes per role; opposite-role URL redirects to own dashboard.
- [x] Backend JWT + role middleware on protected operations.
- [x] Ownership checked on item IDs, not just filtered lists.
- [x] Public account registration cannot elevate role.

## Assumptions and database

No ERD/field list was present in the retrieved frames. Explicit collection names: users, pets, appointments, consultations, medicines, vaccinations, services, schedules, bills, expenses, notifications, auditlogs. Clinical records are stored in consultations with prescription snapshots; vaccination entries are separate; weight history is embedded in pets. Other relations use Mongoose ObjectId references.

All clinic scheduling uses Asia/Manila. Pending, Approved and Completed bookings count toward slot/day capacity; declined/cancelled bookings release capacity. Booking and schedule writes serialize through a shared schedule document and MongoDB transactions to prevent races. Bills snapshot original service/medicine prices. Prescription quantity is total units dispensed. Expiry is valid through its listed day. Appointments can be consulted whenever Approved, as S3 specifies; the queue itself only shows today's visits.

Owners register pets through No record bookings, matching S4's restriction on direct pet creation. The registration is saved with the final appointment to avoid orphan Pending pets if a wizard is abandoned. Clinical corrections allow findings/notes updates; changes to previously dispensed prescriptions or paid bills need a future explicit adjustment workflow. No email/SMS provider was supplied; notification delivery is in-app. The backend checks reminders at startup and once per minute while running: visits in the next 24 hours, vaccines due in seven days, with deduplication. Completion also creates immediate care reminders.

## Verification and remaining limits

- Production Create React App build (`react-scripts build`) passed.
- Both Node integration tests passed, including capacity concurrency, stock rollback, owner isolation, required decline reason, expired medicine, completion idempotency, weight history and bill totals.
- Postman/Newman collection passed 66 HTTP requests and 69 assertions, including CRUD resources, auth denials, profile validation and the booking/approval/consultation/payment flow.
- Browser smoke pass: 31 routes loaded without page errors, owner-to-admin redirect checked, mobile dashboard had no horizontal overflow.
- Additional browser checks passed: vaccination edit/save, live Admin calendar, navigation between Services/Inventory/Expenses, and mobile Admin layout with no horizontal overflow.
- Browser end-to-end pass: No record booking → reason-required state → approval → stock-error state → completion → automatic bill → owner medical record.
- Screenshot review covered the shared shell and rendered route contact sheets; exact pixel-diff parity across all screen/state combinations is NOT claimed. Tables and forms use Ant Design, so row sizing, controls and modal rendering retain visible differences from the static Figma mocks.
- Added edit dialogs, actual errors and mobile layouts have no exact Figma counterpart. Hover/focus/loading states use themed defaults where the file supplied no variant.
- Dedicated get_screenshot/get_variable_defs coverage for every frame remains incomplete due to the Figma MCP account limit. Design-context renders/code were available for all application frames.
- No external hosting or email/SMS integration was performed. Browser print commands invoke the normal browser print dialog.
