# Core feature completion — October 17, 2026

Latest change: [Follow-up and emergency revision](FOLLOWUP-EMERGENCY-REVISION.md) supersedes the prescription and required-follow-up-detail entries below.

Source requirements: FurPaws-Documentation.pdf (core scope only) and the Owner/Admin fixes requested in chat. Future enhancements remain outside this revision.

## Owner registration

- [x] Dog and Cat have separate searchable breed choices, sourced from breed APIs with cached fallback lists.
- [x] Aspin and Puspin are included. Mixed breed and Unknown are available.
- [x] Changing species clears the former breed. Backend rejects breeds from the wrong species list.
- [x] Other requires a typed species, such as Rabbit or Bird.
- [x] Registration weight is optional and explicitly estimated. Clinical completion requires a newly measured actual weight.
- [x] Consultation and follow-up keep the required owner explanation of symptoms/reason for visit.

## Admin fixes

- [x] Header search is labelled for pets, owners, email and phone; results open Pets & Owners.
- [x] New booking notifications go to each Admin's bell inbox. Inbox supports unread state and recipient-only marking as read.
- [x] Owner and Admin cancellations require a 5–500 character reason, stored with who cancelled and when; the Owner notification includes the reason.
- [x] Rescheduling persists changed service and validates the new service's explanation requirements.
- [x] Availability excludes the appointment being rescheduled from its own capacity count.
- [x] Queue has an explicit date selector and schedule-status guidance. An isolated local demo provides a visit today without changing the real clinic schedule.
- [x] Start Consultation has Back controls and confirmation before discarding entered details.
- [x] Diagnosis, treatment and notes have explanatory placeholders.
- [x] Prescription dosage, frequency and duration offer editable choices. Templates are not medicine-specific dosage recommendations.
- [x] Payment processing and bill detail are above the paginated bill ledger.

## PDF core gaps closed

- [x] Audit detail displays before/after snapshots, with secrets and image payloads redacted. Approval audits include prior snapshots; the API no longer truncates at 1,000 entries.
- [x] Unpaid bills can be printed; paid bills print receipts. All line items print together.
- [x] Full dates/times show the full-slot warning and cannot be selected; all-past time slots label the day Past.
- [x] Mutation endpoints reject unexpected request fields instead of silently ignoring them.
- [x] Protected reminder endpoint accepts a dedicated external-scheduler key and handles concurrent deduplication safely.
- [ ] Create the external every-minute job in the user's scheduler account. Follow REMINDER-SCHEDULER-SETUP.md. The endpoint/key are ready; the job is not active until configured.

Existing core flows retained: Owner separation, Admin-only clinical edits, Pending/Approved/Declined rules, schedule and slot capacity, duplicate-pet prevention, stock/expiry checks, atomic clinical completion, weight history, prescriptions, vaccines, itemized billing, manual payment recording, reports, expenses, audit logs, settings and pagination.

## Testing and classroom demo

```sh
npm run test:workflow
npm run build
npm run demo
```

`test:workflow` creates a temporary local database, runs the clinical/visit-details/workflow regression suites and removes only that temporary database. Local MongoDB must be running; `server/.env` must point to local MongoDB.

`demo` uses only local `furpaws_demo` and opens http://127.0.0.1:4500/login. It seeds demonstration accounts and an Approved visit today. Admin: `admin@furpaws.test`; Owner: `ava@furpaws.test`; demo password: `FurPaws123`. It serves the compiled frontend; run `npm run build` again after changing UI code. Use `DEMO_PORT=4501 npm run demo` if the default demo port is occupied. Start MongoDB with `npm run db:start` first.

The original PDF still needs its screenshot placeholders, cover member/course details and outdated UI/deployment descriptions updated separately. These are documentation corrections, not missing application features. No member names or course details have been invented.

## Verification evidence

- Three isolated API regression suites passed: clinic transactions/capacity/stock/permissions, visit-detail validation, and the new registration/inbox/reschedule/cancellation/audit cases.
- Production React build compiled successfully.
- Browser checks exercised species changes, custom species, blank estimated weight, header search, consultation Back and discard confirmation, editable prescription input, payment-panel order, and audit detail.
- Test bookings and changes were confined to the local demo/temporary test databases. Production verification uses authenticated reads and the normal idempotent reminder endpoint.
- Live production verification passed: database connection, both logins, breed catalogs, Admin inbox, Owner permissions, scheduler authentication and an authorized reminder call. All 17 Admin destinations loaded with zero browser runtime errors.
- Deployment: https://furpaws-khaki.vercel.app (Vercel deployment dpl_FfyuLp8cYYX7AtXWsVeC5unQafH4).
- Additional browser workflow checks passed for new-booking Admin alerts, persisted rescheduled service and required cancellation reasons.
