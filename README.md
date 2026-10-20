# Portfolio

Premium personal portfolio built with Next.js App Router, React, TypeScript, and Tailwind CSS. Public portfolio reads use Supabase's official JavaScript client and the publishable key; RLS remains mandatory. No service-role key is sent to browser code. The contact intake route uses its server-only key for narrowly scoped inserts and notification-status updates after request validation and abuse checks.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the intended project.
3. Apply the reviewed SQL through a versioned Supabase migration before running the data-backed site. See [Supabase setup](supabase/README.md).
4. Disable public Auth sign-ups, create the verified admin Auth user, and add its UUID to `public.admin_users` through the trusted setup process documented in [Supabase setup](supabase/README.md).
5. Install dependencies and run `npm run dev`; open `http://localhost:3000`.

If the public variables are missing, data-backed routes show an error state. The project does not fall back to fabricated content.

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — Next.js lint command
- `npm run typecheck` — TypeScript check
- `npm test` — unit and rendering tests

## Architecture

- `app/` contains App Router routes, route metadata, and loading/error/not-found states.
- `components/` contains reusable presentation components.
- `lib/supabase/client.ts` creates a server-only Supabase client from public environment configuration.
- `lib/supabase/database.types.ts` contains the typed schema surface consumed by the client.
- `lib/supabase/portfolio-data.ts` contains typed, published-only queries, slug validation, mapping, and pagination.
- `lib/supabase/ssr.ts`, `lib/supabase/admin-auth.ts`, and `middleware.ts` implement cookie-backed sessions. Each admin route and mutation verifies the Auth user and then verifies `admin_users`; RLS is still the database authority.
- `app/admin/` contains the protected content studio, collection editor, private contact inbox, safe rich-text preview, and media upload routes. Dashboard content operations use the signed-in user's RLS-bound client. The contact endpoint is the only feature using the server-only service key, and only for the fixed submission insert and notification-status update.
- The media API validates bucket, visibility, size, declared MIME type, and file signatures before upload. Private file previews use short-lived signed URLs.
- The contact page uses a server-only `/api/contact` intake route with validation, Turnstile verification, Upstash rate limiting, database idempotency, private storage, and optional Resend notifications. See [Contact setup](supabase/README.md#contact-submissions); the form stays unavailable until required environment variables and the database migration are configured.
- `supabase/schema.sql` is a schema source artifact. It has not been applied; convert it into a versioned migration for the confirmed portfolio project before deployment.
- `tests/` covers mocked data access behavior, representative component rendering, and admin payload validation. These do not replace live authentication, RLS, or Storage tests.

## Administrator dashboard

Visit `/admin/login` and sign in with the separately provisioned administrator account. There is no public registration or UI for changing administrator membership. Dashboard reads, server actions, and media API operations use the signed-in user's cookie-bound Supabase client; database grants and RLS must be deployed as written in the approved schema. The admin area must not be considered secure on a database where the schema and policies have not been applied and tested.

The editor stores supported structured rich-text blocks, not arbitrary HTML. The private preview renders text nodes only. Public media files are accessible to anyone with their URL; confidential files belong in the private bucket. The dashboard can create temporary 60-second private previews for authenticated administrators.

Before production, install dependencies with a generated package lock, run the test/type/build scripts, apply the schema to the verified project, create the first admin through the trusted process, and test the cases listed in [Supabase setup](supabase/README.md) using anonymous, ordinary authenticated, and admin accounts.

## Deployment

Use a Next.js compatible host such as Vercel. Configure the two public Supabase variables in the deployment environment and apply reviewed migrations to the intended Supabase project. Ensure RLS is enabled and tested before making the site public. Do not add a service-role key to frontend or `NEXT_PUBLIC_` variables.
