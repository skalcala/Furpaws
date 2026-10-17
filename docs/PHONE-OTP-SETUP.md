# Phone OTP activation

The app contains a Twilio Verify integration for mobile verification during registration and mobile-number changes in Settings. Codes are sent and checked by Twilio; the app does not display codes, accept a hardcoded bypass, or log OTP values. It stores short-lived rate-limit counters and returns a signed, phone-bound verification ticket after provider approval.

## Current status

SMS is not active: the owner has not yet supplied a Twilio account and credentials. Email/mobile + password login works, and existing accounts can continue signing in. Registration truthfully shows that SMS verification is unavailable while the provider is unconfigured. Unverified numbers are not marked verified.

Creating the provider account requires the owner's email, identity/contact verification and provider billing/trial authorization. These cannot be invented or completed on the owner's behalf without those details.

## Activate production SMS

1. Create/sign in to your account at [Twilio Console](https://console.twilio.com/). Complete Twilio's account and billing/trial requirements.
2. Open **Verify → Services → Create service**. Name it **FurPaws**. Enable SMS and six-digit codes. Enable Fraud Guard. Allow the Philippines in the service/account geographic permissions.
3. In your Vercel **furpaws → Settings → Environment Variables**, add these as **Sensitive**, for **Production**:
   - `TWILIO_ACCOUNT_SID`: the Account SID from Twilio Console (starts `AC`).
   - `TWILIO_AUTH_TOKEN`: the Auth Token from the account credentials page.
   - `TWILIO_VERIFY_SERVICE_SID`: the Verify Service SID (starts `VA`).
4. Redeploy the existing Vercel project. No Twilio values belong in `REACT_APP_*` variables, GitHub, chat or screenshots; they are backend secrets.
5. Open registration. Enter your mobile number, choose **Send verification code**, enter the actual SMS code, and choose **Verify number**. Create account becomes available after verification. Changing the phone invalidates the old verification ticket.
6. Test wrong/expired code handling and resending after the countdown. Check Twilio delivery logs if delivery fails. Do not copy codes or private logs into GitHub.

Trial accounts can send verification messages only to approved/verified trial recipient numbers. Actual production recipients require the provider's production eligibility and billing. The owner must approve any provider charges directly.

## Behavior and limits

- Mobile input supports `09XXXXXXXXX` and `+639XXXXXXXXX`; registration normalizes and enforces phone uniqueness.
- The same account can sign in with email or either phone format plus password. OTP is mobile ownership verification, not an alternate passwordless login flow.
- Five sends per phone/hour, one send per phone/minute, ten verification checks per ten minutes, and an IP send limit are enforced using database counters. Twilio also applies its own provider limits.
- Tickets expire after ten minutes, are signed by the backend and bound to the verified phone. Provider secrets never go to the browser.
- When configured, the backend requires valid phone verification for new registrations and phone-number changes. The UI cannot bypass this requirement.
- Local classroom demo and workflow tests explicitly disable live SMS credentials. The provider test uses a mocked network response and does not send a real SMS.

Official references: [Verify setup and API](https://www.twilio.com/docs/verify/api), [send verification](https://www.twilio.com/docs/verify/api/verification), [check verification](https://www.twilio.com/docs/verify/api/verification-check).
