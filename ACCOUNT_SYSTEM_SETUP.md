# TRUECOLOURS account setup

The application uses Supabase Auth, Postgres, private Storage and Realtime. Firebase and NextAuth are no longer application runtime dependencies.

## Project

The requested project is `truecolours` (`iyjkepjvsfvhviamsixx`) in the `truecolours` organization, on the Free plan in Ireland. The app requires the migration in `supabase/migrations/20261015100454_supabase_retail_backend.sql` before account provisioning.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and in the hosting environment. These identify the same project. Privileged keys are never public variables and are never used by normal app requests.

## Admin login

`/admin/login` accepts the configured `TRUECOLOURS_ADMIN_USERNAME` (default `admin123`) or an individual staff email. The alias resolves on the server to `TRUECOLOURS_ADMIN_LOGIN_EMAIL`. Supabase verifies the submitted password and the database checks active staff access. There is no browser password fallback.

To provision the requested initial administrator, set the server-only values `SUPABASE_PROJECT_REF`, `SUPABASE_SECRET_KEY` and `TRUECOLOURS_ADMIN_PASSWORD` privately, then run:

```sh
npm run migration:admin
npm run migration:admin -- --apply
```

The first command previews the intended project and username. The apply command creates or updates only an account managed by this script and assigns its canonical administrator record. It refuses to reset an unrelated account with the same email. The bootstrap password does not need to remain in a deployed application.

A privileged owner can assign individual staff roles and branches. Role changes take effect through the canonical staff record; deactivating staff denies further protected reads and commands. Customer profile metadata cannot promote an account.

## Customer authentication

Email/password registration supports confirmation and password reset. Configure Supabase Auth Site URL and permitted redirects for the production domain and `/auth/callback` and `/account/reset-password`. Customer Google OAuth remains optional and requires its provider configuration in Supabase; it is not an admin login option.

Legacy Firebase passwords are not exported. Migrated customers require a Supabase password reset or their configured OAuth provider before signing in. Do not send reset messages until the destination domain and email delivery are ready.

## Access and operations

RLS protects every application table. Customer account records and uploads are private. Staff permissions are checked with a verified Supabase identity, a current Auth session, and an active staff role/branch assignment. Financial operations and stock changes run atomically in Postgres with durable idempotency keys. Admin pages and authenticated API responses are not cached by the service worker.

Set `INVOICE_EMAIL_WEBHOOK_URL` only when an email provider is ready; it must honor the `Idempotency-Key` header. No email is sent by account provisioning or source export.

Run `npm run test:backend`, `node --test tests/admin-login.test.mjs tests/request-security.test.mjs`, `npx tsc --noEmit`, and `npm run build` before deployment. The SQL tests execute the actual migration in local Postgres (PGlite), covering customer isolation, role enforcement, revoked sessions, stock version conflicts, overselling, checkout retry behavior and invoice payment guards.
