# Follow-up, emergency consultation and sign-in revision

Requested changes from the supplied screenshot:

- [x] Email or Philippine mobile number + password sign-in, with normalized numbers and duplicate-account checks.
- [x] Consistent red palette, typography, field sizes and account-switch behavior on login/registration. Switching accounts clears the previous booking draft.
- [x] Owner pet-picture upload uses a visible file control and preview, handles decode errors, and resizes large images before saving. Supported browser-decodable JPG/PNG/WebP/AVIF photos are converted to WebP; unsupported HEIC needs conversion to JPG/PNG.
- [x] Follow-up notes are optional, labelled accordingly and capped at 2,000 characters. General consultation still requires a detailed explanation.
- [x] Follow-up checkups are disabled for No record bookings and rejected by the backend. Existing approved records are required.
- [x] Numeric fields block alphabetic/exponent input and invalid pasted text; backend numeric/range validation remains enforced.
- [x] Prescriptions and prescription-history screens are replaced with optional follow-up plans/checkups in Admin and Owner medical records. New prescription API payloads are rejected. New bills contain the service fee; inventory is no longer deducted on clinical completion.
- [x] Emergency consultation button supports existing pets, new pets under an existing owner, and a new guest contact/patient without login credentials. Completed visits save clinical history, measured weight, a service bill and the optional follow-up plan.
- [x] Existing-pet emergency visits link to the same pet and owner IDs. Guest contacts cannot log in. Unknown birth dates are allowed for emergency intake and display as unknown.
- [x] Same-slot pet double booking is prevented, including simultaneous repeated No record submissions. Emergency start requests are idempotent; another active visit for the same pet today must be reviewed first.
- [x] Emergency encounters can be recorded immediately even on closed/blocked days and do not consume scheduled slot capacity. This is an explicit urgent-care workflow, available only to Admin.
- [x] Follow-up plans do not silently book appointments; the owner must still select an available slot.
- [ ] Activate actual SMS delivery using the owner's Twilio account/credentials. Integration and setup instructions are complete in PHONE-OTP-SETUP.md; sending real SMS cannot be verified until a provider is connected.

Historical prescription documents, audit entries and previously issued bills remain intact for traceability. Removing the active prescription feature does not erase historical financial/clinical data.

Verification: isolated API suites cover authorization, phone login, duplicate phone registration, optional follow-up, no-record rejection, emergency record linking, guest login denial, duplicate prevention, measured weight and service-only billing. The SMS-provider test is mocked and does not claim real delivery.

## Verified results

- Five API tests passed in a disposable local database.
- Production React build passed.
- `npm run test:ui:workflow` passed: OTP UI state using mocked responses, mobile layout without horizontal overflow, email/mobile login, persisted photo upload, numeric character blocking, disabled No record follow-up, optional follow-up notes, guest emergency intake, clinical completion, unpaid bill control and saved follow-up history.
- Test databases were removed; no test clinical records or payments were created in production.

Production verified: https://furpaws-khaki.vercel.app — deployment `dpl_EvYvPm2S3Kmy85poYJWxuFuTpxZc`. Database connected; email and mobile logins passed; all 17 Admin destinations loaded with zero browser runtime errors. Live OTP configuration remains disabled until the owner's provider credentials are added.
