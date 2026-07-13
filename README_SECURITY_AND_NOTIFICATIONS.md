# Security Fixes + Notification System — Setup Guide

This covers everything you need to configure before deploying the changes.
Read it top to bottom once — most of it is copy/paste.

## 1. Rotate your Supabase service_role key

The key hardcoded in the mobile app's `src/services/config.js` (as a fallback
for `SUPABASE_ANON_KEY`) was actually your **service_role** key, not the
anon key. It has shipped inside app builds already, so treat it as
compromised:

1. Supabase Dashboard → Project Settings → API → click **Roll** next to
   `service_role`.
2. Update `SUPABASE_ANON_KEY` (or however you're passing it) in the web
   server's environment (Render) to the new service_role value. This is the
   ONLY place a service_role key should ever live.
3. Get the real **anon public** key from the same page and put it in the
   mobile app's `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never the
   service_role key.

## 2. Run the new SQL migration

In the Supabase SQL editor, run:
`supabase/migrations/002_security_and_notifications.sql`

This enables Row Level Security on `profiles`, `wallets`,
`wallet_transactions`, `player_memberships`, `tournaments`, `leaderboard`,
`streams`, and `admin_users` (previously **none** of these had RLS enabled —
the only thing protecting them was the mobile app accidentally using a
service_role key that bypasses RLS entirely). It also creates the
notification system tables (`push_tokens`, `notifications`,
`notification_recipients`).

## 3. Seed your admin identity

Generate a UUID (e.g. run `select gen_random_uuid();` in the SQL editor)
and:

```sql
INSERT INTO admin_users (user_uuid, role)
VALUES ('<paste-the-uuid-here>', 'super_admin')
ON CONFLICT (user_uuid) DO UPDATE SET role = EXCLUDED.role;
```

## 4. New backend environment variables (Render → your service → Environment)

| Variable | Value |
|---|---|
| `ADMIN_JWT_SECRET` | A long random string (e.g. `openssl rand -hex 32`). Used to sign admin session tokens. |
| `ADMIN_USERNAME` | Whatever username you want to log into the admin panel with. |
| `ADMIN_PASSWORD` | A strong password (this used to be exposed client-side via `VITE_ADMIN_PASSWORD` — that variable can be removed now, since login is verified server-side). |
| `ADMIN_UUID` | The same UUID you inserted into `admin_users` in step 3. |
| `EXPO_ACCESS_TOKEN` | Optional. Only needed if you enable [enhanced Expo push security](https://docs.expo.dev/push-notifications/sending-notifications/#additional-security-for-push-notifications). Not required to get started. |

You can now delete `VITE_ADMIN_PASSWORD` from `.env` / Render — the admin
panel no longer checks a client-side password.

## 5. Mobile app `.env`

```
EXPO_PUBLIC_SUPABASE_URL=https://mngmikejudlwtntlgmos.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<the real anon public key from step 1>
```

## 6. Install new dependencies

Web:
```
cd "Taigours E-sports 3.0 Web 2"
npm install
```
(no new packages needed — everything used was already in `package.json`)

Mobile:
```
cd "Taigour Esports App -2"
npm install
```
This pulls in `expo-notifications`, `expo-device`, and `expo-constants`.

## 7. Push notifications require a dev/production build, not Expo Go

Since Expo SDK 53+, remote push notifications don't work in Expo Go on
Android (and are unreliable in the iOS Simulator). Test on a physical
device using a development build:

```
eas build --profile development --platform android
# or
npx expo run:android
```

The app already depends on `expo-dev-client`, so this should be a drop-in
step, not a new setup.

## 8. What changed, functionally

- **Admin login is now real.** `AdminGate` calls `POST /api/admin/login`,
  which verifies credentials server-side and returns a signed JWT. Every
  `/api/admin/*` route (23 of them, plus the 3 `/api/purchase-requests`
  routes that approve/decline wallet top-ups) now requires that JWT via
  `requireAdminRole`. Previously these routes had no auth at all — anyone
  who found the URL could hit them directly.
- **Mobile app no longer holds elevated database access.** It uses a real,
  RLS-scoped anon key. Balance lookups that used to run admin-privileged
  Supabase RPCs directly from the client now go through
  `GET /api/balance/:userId` on the backend instead.
- **Notification system**: push (via Expo Push API) + in-app notification
  center, full targeting (everyone / segment / specific users), scheduling,
  and daily/weekly/monthly recurrence. See the admin panel's new "Notify"
  tab.

## 9. Known follow-ups (not done in this pass, flagging for later)

- `GET /api/balance/:userId` and a few other existing routes trust the
  `:userId` in the URL without verifying the caller is that user. The new
  notification routes use a proper `requireUser` check (validates the
  Supabase session JWT); consider retrofitting the older routes the same
  way.
- `.env` was included in your uploaded zip. Make sure it's in `.gitignore`
  and was never pushed to a public git repo — if it was, rotate everything
  in it, not just the Supabase key.
- The notification scheduler is a simple 60-second polling loop in the same
  Node process. Fine at your current scale; if you ever run multiple server
  instances, move it to a proper job queue (BullMQ) or Supabase pg_cron +
  Edge Function so scheduled sends aren't duplicated across instances.
