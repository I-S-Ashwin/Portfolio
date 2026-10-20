# Supabase backend setup

`schema.sql` is the reviewed schema source for the portfolio backend. It has **not** been applied to any Supabase project. Before applying it, confirm the target project and generate a versioned migration with the Supabase CLI (`supabase migration new portfolio_backend`), then move/review the SQL as a migration. Do not apply this schema to the connected `GreenMind` project unless you confirm that it is the intended portfolio database.

## Administrator provisioning

1. Disable public sign-up in Supabase Auth and configure the intended site URL and allowed redirect URLs.
2. Create/invite the administrator identity through the Supabase dashboard or a trusted server-only provisioning process. Do not seed a password or identity into the repository.
3. Verify ownership of that identity, then insert its Auth UUID into `public.admin_users` through the trusted SQL editor or a controlled migration/data operation:

```sql
insert into public.admin_users (user_id)
values ('<verified-auth-user-uuid>');
```

4. Never grant `anon` or ordinary authenticated users write access to `admin_users`. Revoke membership before removing an administrator account; revoke/sign out sessions as part of incident response.

## Application secrets

The publishable key and project URL can be used by client Supabase clients with RLS enabled. `SUPABASE_SERVICE_ROLE_KEY` is server-only, must not be referenced by client components, and must never be committed. Prefer ordinary user-session writes protected by RLS; if a trusted endpoint needs service-role access, keep that code server-only and validate every request.

## Contact submissions

The contact page posts to `/api/contact`; it does not write through a browser Supabase client. The server route uses `SUPABASE_SERVICE_ROLE_KEY` only on the server, after strict validation, exact-origin checking, Cloudflare Turnstile Siteverify, and an Upstash Redis limit of five requests per HMAC-hashed client address per hour. Public and ordinary authenticated roles have no insert, read, update, or delete access to submissions. Admin read/update/delete access remains protected by `admin_users` RLS. The unique `idempotency_key` constraint prevents retries from creating duplicate rows or notifications. Configure the app behind a trusted proxy that appends the client address to `x-forwarded-for`.

Required contact environment variables: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `CONTACT_RATE_LIMIT_HMAC_SECRET`. Email notification is optional and uses `RESEND_API_KEY`, `CONTACT_NOTIFICATION_FROM` (a verified Resend sender), and `CONTACT_NOTIFICATION_TO`. Without those three notification values, successful submissions are still stored and the UI explicitly reports that notification is unconfigured. Provider failure is also reported truthfully while preserving the stored message. No real email was sent during implementation.

The service-role key has broad database authority. Keep it exclusively in the server deployment environment, never in browser variables or source control, and restrict the contact route to the fixed insert/update columns shown in the handler. Use provider dashboard test credentials and mock-based application tests; do not send live test email without authorization. Existing rows migrated from the earlier schema have a nullable subject so no historical content is fabricated.

The Supabase CLI is not installed in this workspace, so `supabase/migrations/20261020201500_contact_intake_security.sql` was added as a standard migration file but has not been applied or tested against a live project. Apply it only to the confirmed portfolio database after reviewing it. The base `schema.sql` represents a fresh database with the same contact security model.

## Storage

- `portfolio-public` is intentionally public for approved published assets. Public bucket objects are retrievable by anyone who has the URL; never put private documents there.
- `portfolio-private` requires an authenticated administrator policy for read/write operations.
- Upload code must enforce actual MIME/type and size constraints, generate safe paths, and create matching `media_assets` rows. Keep bucket policies and metadata consistent.

## Dashboard authorization boundaries

- The app uses cookie-bound `@supabase/ssr` clients. Server rendering, Server Actions, and upload API routes call `auth.getUser()` and query the current user's `admin_users` membership on every privileged request.
- Middleware refreshes cookies only. It is a convenience layer and is not treated as authorization.
- Dashboard writes use the user's publishable-key client, so Postgres and Storage RLS apply. The public contact form is a separately scoped exception: `/api/contact` uses a server-only service key for fixed contact table operations after validation, Turnstile verification, origin checking, and rate limiting. It must never import that key into browser code.
- The app has no administrator creation or role-change screen. Create/invite identities through Supabase Auth and provision membership only through the trusted SQL setup above.
- Rich text accepts an allowlist of structured JSON nodes and previews render only ordinary React text. Arbitrary HTML, links, and script nodes are not rendered.
- Upload API routes check same-origin requests, file size, MIME type, initial file signatures, a generated path, and administrator membership. Storage bucket policies remain required. Application-layer checks do not replace bucket size/MIME restrictions.

## Verification after applying

Run Supabase security and performance advisors. Test as `anon`, a regular authenticated user, and the seeded administrator:

- Anonymous reads return only published entries and public media; drafts and private media are inaccessible.
- Anonymous writes to all content tables and `admin_users` fail.
- Anonymous contact insertion can set only sender name, email, and message; reads, updates, and deletes fail.
- A normal authenticated user cannot access admin rows, private submissions, drafts, private media, or perform content mutations.
- The verified admin can manage content and media, view submissions, and cannot retrieve private files without an authenticated session.
- Removing admin membership blocks subsequent privileged requests after token/session refresh or revocation.

Also verify dashboard flows: sign in/out; open `/admin` directly without a session; sign in as a normal authenticated user and try `/admin`; attempt direct anon and normal-user writes to each table and both storage buckets; create a draft, preview it, publish it, confirm the public route returns it, then unpublish and confirm it disappears; upload valid and spoofed/oversized files into each bucket; verify private preview expires and is unavailable without an admin session; submit cross-origin upload/update/delete requests and confirm they are rejected.

These checks require the confirmed portfolio project to have the reviewed migration applied and test identities provisioned. The connected Supabase project has not been confirmed as this portfolio database, so do not run these checks against it by assumption.
