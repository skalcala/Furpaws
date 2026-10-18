# Portal design revision — October 18, 2026

The requested red/blush palette remains. Existing clinical and booking behavior was preserved.

- Form action rows have breathing room and align Back/Continue and consultation Save/Back to the right.
- Owner home care reminders use readable full-width rows rather than three narrow columns.
- My Pets uses photo-led cards, pet details, approval state and clear profile links.
- Informational red instruction banners are removed; actual errors, field validation and full-slot dialogs remain.
- Notifications have a scrollable list without search or numbered pagination. Personal inboxes offer Mark all as read. Clicking an update marks it read and opens the related appointments, approval, pet profile or medical-record page.
- Bulk notification updates are restricted to the signed-in recipient and audience. An Admin cannot mark Owners' notices read through the log.
- Settings was removed from Owner navigation and stays in the account dropdown.
- Settings supports uploading/replacing/removing a profile photo; the saved image also appears in the header. Uploads are resized; the API validates the image value and caps its size. Photo payloads are excluded from profile-change audit snapshots.
- About and Services share one landing-page section and navigation item. Photos alternate right/left/right/left through the page.
- The landing page has one registration CTA, Create an owner account. Other links explain care or booking.
- Admin dashboard spacing and hero proportions are more compact and responsive.
- Vaccination forms/record labels use Next date given. The stored nextDueDate field and later-than-date-given validation are unchanged.

## Verification

- Production React build passed.
- Six isolated API tests passed, including profile-photo persistence/validation and recipient-scoped bulk notification updates.
- `npm run test:ui:portal` passed: single registration CTA, combined care section, notification navigation/read-all, profile upload persistence after reload, pet card presentation, reminder geometry, mobile overflow, right-aligned actions and vaccination label. Zero browser runtime errors.
- Browser screenshots are private under `.local/portal-review/` and use disposable local fixtures.
- Temporary test databases were removed. No production pet records, appointments or payments were created or modified by verification.
