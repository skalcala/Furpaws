# Admin dashboard reference layout

The Admin dashboard now follows the supplied compact workspace reference while retaining FurPaws content, maroon/blush tokens and existing routes.

- Light navigation sidebar with maroon active indicators and existing menu items/icons.
- Compact welcome and clinic quick-access cards.
- All five existing clinic metrics, followed by one horizontal row of six quick links.
- Patient Queue Status and Clinic Snapshot in the main column.
- Right-hand calendar, Today’s Appointments and Smart Reminders rail.
- Calendar highlights today in Philippine time and marks dates containing Pending, Approved or Completed appointments. Month arrows browse the calendar; appointment scheduling continues through the existing appointment screens.
- Responsive layout stacks the rail and content on smaller screens.

Implementation is limited to frontend presentation and browser verification. Existing data sources, clinical rules, account behavior and stored records are unchanged.

Verification: production build and isolated portal browser checks, including calendar month controls, all five metrics, right-rail desktop placement and overflow checks at widths 390, 768, 1024 and 1920. Local fixtures are removed after the run; production clinical records are not used for mutation tests.
