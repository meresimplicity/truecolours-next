# Firebase to Supabase migration

## Scope

The new runtime uses Supabase only. Firebase Admin remains in development dependencies for a read-only export and private file transfer. Legacy Firebase deployment settings are archived under `docs/legacy/firebase/`.

The source Firebase project also contains unrelated applications. Export is restricted to Truecolours collection names and the Auth identities referenced by those records. Never copy or change unrelated collections or disable the shared Firebase project.

## Destination setup

Apply the timestamped SQL migration to the intended new Supabase project. Prefer the Supabase CLI or the migration connector. If access is available only through the signed-in SQL editor, execute the same migration in a transaction, then register its version with `supabase migration repair --status applied 20261015100454` before a later CLI push. Do not rerun the non-idempotent initial schema creation.

Normal app credentials are the project URL and publishable key. Export/import/provisioning tools require private credentials, matching project IDs and explicit apply flags. Never put a secret/service-role key in a `NEXT_PUBLIC_` variable or browser bundle.

## Copy and reconcile

1. Set `FIREBASE_SERVICE_ACCOUNT_PATH` privately to the existing source key. Run `npm run migration:export`. Export files under ignored `tmp/migration/firebase-export/` use private filesystem permissions. The manifest records the source project, counts, excluded collections and whether writes were paused.
2. Run `npm run migration:import` to inspect the copy plan. The importer preserves source document IDs, maintains a durable UID map and archives original selected documents in a table denied to application users. It refuses ambiguous destination identity collisions.
3. Before final import, stop writes from the old Truecolours app, take a fresh export using `--writes-paused`, and run `npm run migration:import -- --apply`. This flag records a real operational pause; do not use it to bypass the consistency check.
4. Run `npm run migration:seed -- --apply` to insert missing catalogue products. Seeding does not invent selling prices or stock and preserves existing products.
5. Run `npm run migration:files` to inspect referenced customer files, then use `--apply` to copy them into private Supabase Storage and update URLs. File ownership follows the persisted UID map. Keep the original files until verification is complete.
6. Run `npm run migration:import -- --reconcile`. Confirm archive/profile/customer record counts, canonical stock buckets, invoice numbers/tokens, totals, payments and outstanding balances. Inspect the report in the private export directory. The importer intentionally does not declare cutover complete automatically.
7. Provision the requested administrator using `npm run migration:admin -- --apply`. Existing Firebase accounts need password reset or configured OAuth; passwords and refresh tokens are not transferred.
8. Configure production Supabase Auth URLs, required OAuth/email providers, deploy the app with Supabase public credentials, and verify staff/customer login, private files, branch-scoped inventory, invoice PDFs and a controlled sale/shift close. Verify the public catalogue independently.

## Rollback and status

Do not delete source data, retire Firebase credentials, or remove the private export until the destination is reconciled and the production deployment is accepted. An application rollback must not permit concurrent writes to both financial backends; reconcile new Supabase transactions before returning the old app to service.

The prepared SQL is validated by real local Postgres tests. A successful local build is not evidence that cloud migrations, identity provisioning, data copy, email delivery or production cutover have completed. Record actual outcomes separately and retain the export manifest and reconciliation report privately.
