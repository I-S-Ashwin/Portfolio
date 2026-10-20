# Portfolio project handover

Verified against the repository on 2026-10-20. This describes the code and local check results only; it does not imply that a production deployment or live Supabase database exists.

## Status at a glance

- **Implemented in the repository:** Next.js App Router portfolio pages; Supabase-backed published-content reads; protected admin screens and server operations; public/private media handling; contact form server endpoint; structured rich-text editing; automated unit and component tests.
- **Partially implemented / unverified:** Supabase schema is present as SQL but is not applied. Contact functionality depends on external configuration. Auth, RLS, Storage, upload, email, responsive browser behavior, and deployment are not live-tested. Lint dependencies are declared but not installed in the current environment. Production build could not complete in the sandbox.
- **Not established:** Git repository/history, remote repository URL, production domain, hosting project, live Supabase project for this portfolio, administrator identity, and backups. None are recorded in this workspace.

## Sitemap

Public pages:

- `/` — home
- `/about`
- `/projects`, `/projects/[slug]`
- `/research`, `/research/[slug]`
- `/publications`
- `/hackathons`
- `/achievements`
- `/skills`
- `/experience`
- `/certifications`
- `/blog`, `/blog/[slug]`
- `/resources`
- `/media`
- `/contact`
- Unknown paths use `app/not-found.tsx`.

Administrator pages:

- `/admin/login`
- `/admin` — overview
- `/admin/messages` — private contact inbox
- `/admin/[section]` — collection list; sections are projects, research, publications, hackathons, achievements, skills, experience, certifications, blog, resources, and media
- `/admin/[section]/new`, `/admin/[section]/[id]`, `/admin/[section]/[id]/preview` for editable content collections
- `/api/contact` accepts contact form submissions; `/api/admin/media` handles authenticated media operations.

The public content pages share a dynamic `app/[section]/page.tsx` route for publications, hackathons, achievements, experience, certifications, and resources. Project, research, and blog detail pages have dedicated routes.

## Architecture and repository

- Framework: Next.js App Router, React, TypeScript, Tailwind CSS.
- Server components query Supabase through `lib/supabase/portfolio-data.ts`; returned public collections are filtered to published entries and paginated.
- Shared UI lives in `components/`; server/database functions and validation are in `lib/`.
- Admin writes use the signed-in user's cookie-backed Supabase client and are subject to database RLS. The contact API is the exception: server-only service-role access with fixed operations and request controls.
- `supabase/schema.sql` is the proposed base schema; `supabase/migrations/20261020201500_contact_intake_security.sql` contains contact security changes. Neither is confirmed applied to the intended database.
- Workspace path: `C:\Users\isash\Desktop\Portfolio`. No `.git` directory was present when inspected, so no remote, branch history, or commit state could be verified.
- No deployment host, domain, or production status could be verified. README mentions Vercel-compatible hosting as guidance only.

## Data model

The schema defines these main tables: `admin_users`, `media_assets`, `projects`, `research_projects`, `publications`, `hackathons`, `achievements`, `experiences`, `certifications`, `blog_posts`, `resources`, `skills`, and `contact_submissions`.

Relations:

- Projects and research projects link to skills through `project_skills` and `research_project_skills`.
- Projects, research projects, and blog posts link to media through `project_media`, `research_media`, and `blog_media`.
- Content entities reference an optional cover in `media_assets`.
- Publications may reference a research project.
- `admin_users.user_id` references a Supabase Auth user. Contact rows are private and have an idempotency key.
- Content tables share draft/published/archived status and timestamps. Media separates public and private storage buckets.

This schema description is based on SQL files, not a live database introspection.

## Authentication and authorization

Supabase Auth provides credentials and sessions; the repository does not create custom passwords. Admin pages, Server Actions, and media API calls verify the Auth user and check membership in `admin_users`. Middleware refreshes cookies but is not itself the authorization boundary. RLS in the database is intended to allow public reads of published content, admin management, and admin-only private/contact access. Media Storage policies are also defined in the SQL source.

Admin membership must be provisioned through a trusted Supabase dashboard/SQL process after verifying the account. There is no public sign-up or admin-role management interface. **These policies and flows have not been tested against a live portfolio database.**

## Environment variables

Use `.env.example` as the variable-name reference. It contains placeholders, not usable credentials. Copy it to `.env.local` for local development; `.gitignore` excludes `.env*` except `.env.example`.

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key; relies on RLS | Public |
| `NEXT_PUBLIC_SITE_URL` | Expected site origin and Turnstile hostname | Public URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Contact handler database insert/status update | Server secret; bypasses RLS |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Contact spam challenge site key | Public |
| `TURNSTILE_SECRET_KEY` | Turnstile verification | Server secret |
| `UPSTASH_REDIS_REST_URL` | Contact rate limiter endpoint | Server configuration |
| `UPSTASH_REDIS_REST_TOKEN` | Contact rate limiter authorization | Server secret |
| `CONTACT_RATE_LIMIT_HMAC_SECRET` | Hashes client address for rate-limit key | Server secret |
| `RESEND_API_KEY` | Optional notification email | Server secret |
| `CONTACT_NOTIFICATION_FROM` | Optional verified sender | Server configuration |
| `CONTACT_NOTIFICATION_TO` | Optional notification recipient(s) | Server configuration |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional public contact address | Public |
| `NEXT_PUBLIC_GITHUB_URL` | Optional public profile link | Public |
| `NEXT_PUBLIC_LINKEDIN_URL` | Optional public profile link | Public |

The contact form remains unavailable unless its required Supabase, Turnstile, Upstash, HMAC, and site-origin configuration is present. Email is optional. No email test was sent.

## Local development

From PowerShell:

```powershell
cd C:\Users\isash\Desktop\Portfolio
Copy-Item .env.example .env.local
# Edit .env.local locally; do not paste credentials into chat or commit them.
npm ci
npm run dev
```

Open `http://localhost:3000`. The data-backed site requires the intended Supabase database schema and valid public environment values. The current database source is not applied, so an operator must first prepare and apply reviewed versioned migrations to the confirmed portfolio project.

## Content and media workflow

After the database and administrator identity are provisioned:

1. Sign in at `/admin/login` with the separately provisioned admin account.
2. Choose a content section and create a draft. Enter verified facts only; unsupported or incomplete information should stay draft.
3. Edit and save. For projects/research, add their required content sections before publishing; content validation blocks incomplete entries.
4. Preview privately, then publish. Public routes query published content only. Unpublish by returning status to draft; delete is permanent.
5. For media, use `/admin/media` to upload. Supported types are JPEG, PNG, WebP, AVIF, and PDF with 10 MB public / 20 MB private application limits. Public bucket assets are accessible to anyone with the URL; private previews are signed for 60 seconds.
6. Only attach appropriate public media to public portfolio entries. The database/bucket policies must be applied and tested first.

These steps describe implemented UI behavior; they have not been exercised against a live database/storage project in this audit.

## Backups and restore

No automated backup schedule or restore procedure is configured in this repository. Before publishing production data:

1. Enable/confirm Supabase database backups and retention in the intended Supabase project/plan.
2. Establish an independent periodic export or `pg_dump` backup in protected storage, including schema and content tables. Never put dumps or private contact data in this repository.
3. Back up Storage objects separately; database backups do not necessarily include object bytes.
4. Record encryption, access, retention, and restore-owner procedures.
5. Test restore into a separate staging project and verify references, RLS, Storage objects, and administrator access.

Use the Supabase provider’s documented restore process for the actual project and plan. No restore has been tested here.

## Testing and coverage

Current scripts in `package.json`:

```powershell
npm test -- --no-cache --pool threads --maxWorkers 1
npm run typecheck
npm run lint
npm run build
```

The test suite has four files covering admin payload validation, contact handler validation/abuse flow and SQL text assertions, component rendering, and mocked published-content data access. Latest observed results in this workspace: **21 tests passed across 4 files; TypeScript typecheck passed.** `vitest.config.ts` emits a Vite config-loader warning; the command above disables its filesystem cache to avoid the sandbox's Windows temp rename issue.

Lint did not run because ESLint is not installed in `node_modules`, and registry access prevented installing it. `npm run build` failed in the sandbox with `EPERM` creating a directory under `.next`; the build result is not verified. No browser E2E, accessibility, performance, live Supabase, RLS, Storage, or contact persistence tests are present/verified. The test suite is not full coverage of workflows.

## Deployment and rollback

No production deployment or URL was found; these are proposed steps, not completed actions:

1. Establish the GitHub repository and reviewed branch workflow.
2. Convert the base schema into versioned migrations; review them and apply only to the confirmed portfolio Supabase project.
3. Provision administrator, configure Auth redirects, buckets, RLS, and environment variables.
4. Run tests, typecheck, lint, and production build in CI; add browser/E2E and live security verification before release.
5. Connect a Next.js-compatible host such as Vercel, configure server secrets in its environment, and deploy a preview before production.

For rollback, redeploy the last known-good application release. Treat database schema rollback separately: use a reviewed forward migration or a tested restore, because reverting application code alone may not reverse a schema change. Preserve a verified database and Storage backup before destructive migrations. No deployment or rollback has been performed.

## Dependency and security maintenance

- Keep `package-lock.json` committed and use `npm ci` for repeatable installs. In this workspace the lockfile currently does **not** include the newly declared ESLint dependencies; refresh it with working registry access and rerun clean install.
- Review `npm audit` output and upstream release notes; update in small dependency batches, run tests/typecheck/lint/build, and inspect lockfile diffs. Do not blindly use `npm audit fix --force`.
- Keep service-role, Turnstile secret, Upstash token, HMAC secret, and Resend key in server-only environment settings. Rotate on exposure; never use a public prefix for secrets.
- Recheck Supabase Security and Performance Advisors after migrations; verify access using anon, normal authenticated, and admin identities.
- Review auth redirect allowlists, sign-up settings, RLS, Storage bucket policies, contact retention, rate-limit behavior, and backup restore periodically.

## Known limitations and outstanding work

1. No `.git` metadata, GitHub remote, or deployment information is present in this workspace.
2. The base schema has not been converted into a versioned migration or applied to a confirmed portfolio project; the contact migration is also unapplied.
3. The only previously connected Supabase project was unrelated/unconfirmed; do not target it by assumption.
4. No live administrator, data, contact service configuration, or production credentials are available here.
5. Lint install/lockfile is incomplete; production build is blocked by sandbox filesystem permissions.
6. No browser workflow, device/responsive, keyboard/accessibility audit, SEO social-preview validation, performance profiling, E2E, live RLS/Storage, email-provider, or backup/restore verification has been completed.
7. Public media is intentionally public by URL. Private files and contact submissions must remain in restricted storage/database paths.

## Prioritized improvement roadmap

1. **Release blockers:** establish Git and CI; reconcile `package.json`/lockfile; get lint, build, and tests passing in a normal environment.
2. **Backend security:** create reviewed versioned migrations, apply to confirmed staging project, seed a verified admin, and run role-by-role RLS and Storage policy tests.
3. **Critical workflows:** browser-test auth expiry/direct access, CRUD/publish/unpublish, uploads, contact validation/idempotency/rate limiting, and private inbox authorization.
4. **Operational readiness:** configure production hosting and secrets, database/object backup, restore drill, monitoring, and rollback owner/process.
5. **Quality:** automated browser tests, keyboard/screen reader checks, responsive device pass, social metadata preview check, performance/lighthouse assessment.
6. **Content and growth:** populate verified personal content, expand media associations and editorial workflow, and add additional tests for every content type as real data arrives.

## Lightweight maintenance routine

- **Weekly or before a release:** review content, contact inbox and abuse signals; verify no secrets have entered the repository; run tests and typecheck.
- **Monthly:** review dependency/security advisories, apply small updates, refresh lockfile with `npm install`, run `npm ci` plus full checks, review Supabase advisors and auth/storage policies.
- **Before schema changes:** make a protected database and Storage backup; test migration on staging; record recovery steps.
- **Quarterly:** perform a restore drill, role-based authorization review, and keyboard/mobile usability pass.
