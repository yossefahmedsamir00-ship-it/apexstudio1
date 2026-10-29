# APEX STUDIO — Kashier setup

The hosted checkout integration is deployed in **test mode by default**. No real charge can be completed until a merchant account is approved and the correct credentials are stored as Supabase Edge Function secrets.

## 1. Create test credentials

Use Kashier's official developer quickstart to create a sandbox/test merchant account and collect its merchant ID, API key, and secret key:

- https://developers.kashier.io/docs/get-started/quickstart

Test mode is intended for development and does not move real money. The production merchant account must be activated by Kashier before any live transaction can be accepted.

## 2. Add secrets in Supabase

Open the Supabase project's **Edge Function Secrets** page:

- https://supabase.com/dashboard/project/dyoaiszrmfrdxgouzgzq/functions/secrets

Add these values using your own test credentials. Never commit them to GitHub or paste them into source files.

```text
KASHIER_MODE=test
KASHIER_TEST_MERCHANT_ID=MID-...
KASHIER_TEST_API_KEY=...
KASHIER_TEST_SECRET_KEY=...
APEX_SITE_URL=https://yossefahmedsamir00-ship-it.github.io/apexstudio1/
```

If Kashier provides a separate Payment API Key, also set:

```text
KASHIER_TEST_PAYMENT_API_KEY=...
```

If that key is the same as the test API key, `KASHIER_TEST_PAYMENT_API_KEY` may be omitted. The integration uses the API key to sign/verify webhook events when no separate Payment API Key is set.

The integration uses Supabase's standard `SUPABASE_URL` and server-side secret/service-role environment values supplied to Edge Functions. Do not copy either server credential into the frontend.

## 3. Claim the owner dashboard

1. Open https://yossefahmedsamir00-ship-it.github.io/apexstudio1/admin.html
2. Choose **Create owner login** and use the APEX contact email: `yossefahmedsamir00@gmail.com`.
3. Confirm the email in your mailbox, then sign in.
4. The server allows this verified email to claim the owner record only while no owner is configured. The dashboard is protected by Supabase Auth and RLS.

Use a strong, unique password and do not share it.

## 4. Create and test an invoice

1. In Admin, choose a project lead (optional), enter the agreed invoice amount in EGP, and write a clear description.
2. Create the invoice, then copy its customer link immediately. The raw one-time link token is never stored in the database and cannot be reconstructed after the page is refreshed.
3. Open the link in a separate browser window and press **Continue to secure payment**.
4. Complete the flow using Kashier's sandbox/test tools. Use **Refresh payment status** after returning; the page only marks an invoice paid after a server-verified status or valid signed webhook.

The webhook endpoint is included in each hosted session request:
`https://dyoaiszrmfrdxgouzgzq.supabase.co/functions/v1/kashier-webhook`

## 5. Before accepting real money

Do not switch `KASHIER_MODE` to `live` until the merchant account has been approved, the live methods have been enabled, and the full test checklist has passed. Add separate live credentials as Supabase secrets:

```text
KASHIER_MODE=live
KASHIER_LIVE_MERCHANT_ID=MID-...
KASHIER_LIVE_API_KEY=...
KASHIER_LIVE_SECRET_KEY=...
```

If a separate live Payment API Key is provided, set `KASHIER_LIVE_PAYMENT_API_KEY` as well. Test and live credentials are separate and must not be mixed.

**Important:** the site owner is under 18. For real payments, a parent/guardian or legally eligible adult/business representative must own and complete any merchant onboarding if required by Kashier. Do not bypass identity, age, or business verification requirements.

## Payment architecture

- `apex-owner-bootstrap`: one-time, verified-email owner setup.
- `kashier-create-invoice`: authenticated owner-only invoice creation.
- `kashier-payment`: public invoice preview, hosted checkout creation, and server-side status reconciliation; the unguessable token is checked against its SHA-256 hash.
- `kashier-webhook`: signature validation, amount/currency checks, and idempotent order status updates.
- Database: invoice amounts are set by the owner, stored as integer minor units, and restricted to EGP. Public visitors cannot read or edit invoice records directly.
