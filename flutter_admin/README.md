# APEX STUDIO Owner Admin

Private Flutter application for managing the same APEX STUDIO Supabase project used by the website.

## Connected modules

- Password sign-in and email OTP sign-in.
- Server-side owner verification through apex-owner-bootstrap.
- Project inquiries and lead status updates.
- Client inbox, conversation history, replies and conversation status.
- Kashier invoice creation and payment status visibility.
- Website event activity.
- Security events and audit trail.
- Emergency lockdown through the protected database RPC.

## Backend security model

- The app uses only the Supabase publishable key. It must never contain a service-role key or Supabase secret key.
- Every authenticated session is checked through apex-owner-bootstrap before the dashboard is rendered.
- The Edge Function verifies the user with Supabase Auth and confirms the configured owner identity.
- Direct table access remains protected by the existing Row Level Security policies.
- Inbox writes go through apex-client-chat, which independently checks owner access, applies rate limits and writes audit events.
- Invoice creation goes through kashier-create-invoice; payment state is reconciled server-side.
- Emergency lockdown uses set_apex_emergency_lockdown, which checks owner access and writes security/audit events.
- Do not disable RLS or add service credentials to the mobile app.

## Build Android APK

The project URL and publishable key have safe client-side defaults in lib/main.dart. They are public client configuration values, not server secrets. Override them for another environment with:

    flutter build apk --release
      --dart-define=SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
      --dart-define=SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

The APK is generated at:

    build/app/outputs/flutter-apk/app-release.apk

## Email OTP

The app requests email OTP with account creation disabled. Supabase Auth email must be enabled and the Magic Link email template must contain the six-digit {{ .Token }} variable for code-based delivery. Password login remains available.

## Owner onboarding

The existing owner account must use the owner email configured in the deployed apex-owner-bootstrap Edge Function and must have a verified email. On the first successful owner login, the Edge Function claims the owner slot if it has not already been claimed. The app does not create owner accounts or allow self-assigned roles.

## CI

GitHub Actions runs flutter pub get, flutter analyze, flutter test and creates a debug APK artifact.
