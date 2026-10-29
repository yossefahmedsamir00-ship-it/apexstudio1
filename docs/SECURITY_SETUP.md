# APEX STUDIO — Authentication and Security Setup

## Owner sign-in

The admin page supports:
- Email + password login
- Email one-time code (OTP)
- Supabase Auth session validation
- A server-side owner check against `apex_owner_settings.owner_user_id`
- A one-time owner claim for the verified address `yossefahmedsamir00@gmail.com`

A valid Supabase session alone is not sufficient to access the admin dashboard. The owner bootstrap Edge Function verifies the user token, confirmed email, and configured owner record. Customer/anonymous sessions remain intact but cannot see owner data.

Admin URL:
`https://yossefahmedsamir00-ship-it.github.io/apexstudio1/admin.html`

## Enable OTP email template

The UI calls Supabase Auth `signInWithOtp` and verifies the code with `verifyOtp({ type: 'email' })`. For code entry to work, configure the Supabase Auth email template to include the generated code, not only a confirmation link.

1. Open the Supabase project dashboard:
   `https://supabase.com/dashboard/project/dyoaiszrmfrdxgouzgzq/auth/templates`
2. Choose the relevant Magic Link / OTP email template.
3. Make the template explicitly display `{{ .Token }}` as a 6-digit one-time code.
4. Keep the code short-lived; use the project's email OTP expiry and rate-limit settings.
5. Configure the allowed redirect URLs for the deployed website:
   `https://yossefahmedsamir00-ship-it.github.io/apexstudio1/*`
6. Test in a separate browser profile using the verified owner email before relying on the login flow.

The login screen uses a generic message regardless of whether a matching account exists. This reduces user enumeration via the OTP request UI. Supabase Auth remains responsible for token generation, one-time verification, expiry and its configured request throttles.

## Turn on leaked-password protection

The Supabase Security Advisor currently reported that leaked-password protection is disabled. In the dashboard's Authentication password security settings, enable the compromised-password / Have I Been Pwned check where supported. This is a provider-side setting and was not changed by the application code.

## Security events

The backend stores metadata-only security events and audit records in:
- `public.security_events`
- `public.audit_logs`

These tables have RLS enabled and no direct browser grants. The backend service role writes them; the owner dashboard reads them only through the authenticated, owner-checked chat/admin service.

Logs avoid passwords, OTP values, session tokens, payment credentials, and full message content. Some auth failures are only present in Supabase Auth logs because no user-authenticated request exists yet when a password or OTP fails.

## Limits and remaining scope

- Login/password/OTP abuse also depends on Supabase Auth's configured throttles and email delivery limits.
- The app does not store or hash passwords itself; Supabase Auth owns password storage and verification.
- The site is on GitHub Pages, a static frontend; server-managed HttpOnly app cookies are not available from the static site itself. Supabase manages its Auth session and token refresh.
- Confirm the email OTP template configuration and successful real email delivery before considering OTP production-ready.
