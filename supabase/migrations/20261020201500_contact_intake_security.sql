-- Contact intake is performed only by the server route after validation,
-- Turnstile verification, and durable rate limiting. Never grant browser inserts.
alter table public.contact_submissions
  add column subject text,
  add column idempotency_key uuid not null default gen_random_uuid(),
  add column notification_status text not null default 'not_configured'
    check (notification_status in ('not_configured','pending','sent','failed'));

alter table public.contact_submissions
  add constraint contact_subject_valid check (subject is null or length(trim(subject)) between 1 and 200);

create unique index contact_submissions_idempotency_key_uidx
  on public.contact_submissions(idempotency_key);

revoke insert on public.contact_submissions from anon, authenticated;
revoke insert (name, email, message) on public.contact_submissions from anon, authenticated;
grant insert (name, email, subject, message, idempotency_key, notification_status)
  on public.contact_submissions to service_role;
grant select (id, notification_status) on public.contact_submissions to service_role;
grant update (notification_status) on public.contact_submissions to service_role;

drop policy if exists contact_public_submit on public.contact_submissions;

-- Public reads remain denied. Existing admin-only read/update/delete policies stay in force.
