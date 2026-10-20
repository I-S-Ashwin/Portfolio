-- Portfolio backend schema proposal, ready for conversion into a Supabase migration.
-- Apply only to the intended portfolio Supabase project after confirming its identity.
-- Administrator membership is provisioned separately; this file creates no users.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.contact_status as enum ('new', 'read', 'archived');
create type public.media_visibility as enum ('public', 'private');

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

-- Membership records are provisioned through trusted setup only. No public role can write these.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null check (storage_bucket in ('portfolio-public', 'portfolio-private')),
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  alt_text text not null default '',
  caption text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  visibility public.media_visibility not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check ((visibility = 'public' and storage_bucket = 'portfolio-public') or
         (visibility = 'private' and storage_bucket = 'portfolio-private'))
);

create table public.projects (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}', cover_media_id uuid references public.media_assets(id) on delete set null,
  role text, start_date date, end_date date, repository_url text, demo_url text, featured boolean not null default false,
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (status <> 'published' or published_at is not null)
);
create table public.research_projects (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb, methods jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}', cover_media_id uuid references public.media_assets(id) on delete set null,
  research_status text not null default 'exploring' check (research_status in ('exploring','ongoing','completed')),
  collaborators text[] not null default '{}', started_at date, completed_at date,
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (completed_at is null or started_at is null or completed_at >= started_at),
  check (status <> 'published' or published_at is not null)
);
create table public.publications (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb, tags text[] not null default '{}',
  cover_media_id uuid references public.media_assets(id) on delete set null,
  research_project_id uuid references public.research_projects(id) on delete set null,
  venue text, doi text, external_url text, authors text[] not null default '{}', publication_date date,
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);
create table public.hackathons (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb, tags text[] not null default '{}',
  cover_media_id uuid references public.media_assets(id) on delete set null,
  event_name text, event_date date, team_name text, placement text, project_url text,
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);
create table public.achievements (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb, tags text[] not null default '{}',
  cover_media_id uuid references public.media_assets(id) on delete set null,
  issuer text, achieved_on date, credential_url text,
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);
create table public.experiences (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb, tags text[] not null default '{}',
  cover_media_id uuid references public.media_assets(id) on delete set null,
  organization text, role text, location text, start_date date, end_date date, is_current boolean not null default false,
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (not is_current or end_date is null), check (status <> 'published' or published_at is not null)
);
create table public.certifications (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb, tags text[] not null default '{}',
  cover_media_id uuid references public.media_assets(id) on delete set null,
  issuer text, issued_on date, expires_on date, credential_id text, credential_url text,
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on),
  check (status <> 'published' or published_at is not null)
);
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}', cover_media_id uuid references public.media_assets(id) on delete set null,
  reading_time_minutes integer check (reading_time_minutes is null or reading_time_minutes > 0),
  status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);
create table public.resources (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '', content jsonb not null default '{}'::jsonb, tags text[] not null default '{}',
  cover_media_id uuid references public.media_assets(id) on delete set null,
  url text not null, resource_type text not null check (resource_type in ('tool','course','book','article','documentation','other')),
  publisher text, status public.content_status not null default 'draft', published_at timestamptz,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (url ~ '^https?://'), check (status <> 'published' or published_at is not null)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(), name text not null unique check (length(trim(name)) > 0),
  category text not null, description text, sort_order integer not null default 0,
  status public.content_status not null default 'draft', published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);
create table public.project_skills (
  project_id uuid not null references public.projects(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (project_id, skill_id)
);
create table public.research_project_skills (
  research_project_id uuid not null references public.research_projects(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (research_project_id, skill_id)
);

-- Strongly typed media joins keep referential integrity across galleries.
create table public.project_media (
  project_id uuid not null references public.projects(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0, caption text, primary key (project_id, media_asset_id)
);
create table public.research_media (
  research_project_id uuid not null references public.research_projects(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0, caption text, primary key (research_project_id, media_asset_id)
);
create table public.blog_media (
  blog_post_id uuid not null references public.blog_posts(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0, caption text, primary key (blog_post_id, media_asset_id)
);

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (length(email) <= 320 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  subject text not null check (length(trim(subject)) between 1 and 200),
  message text not null check (length(trim(message)) between 1 and 10000),
  idempotency_key uuid not null default gen_random_uuid() unique,
  received_at timestamptz not null default now(), status public.contact_status not null default 'new',
  notification_status text not null default 'not_configured' check (notification_status in ('not_configured','pending','sent','failed')),
  retention_expires_at timestamptz not null default (now() + interval '180 days'),
  spam_score integer check (spam_score is null or spam_score between 0 and 100)
);

-- Timestamp maintenance on all editable records.
do $$ declare t text; begin
  foreach t in array array['projects','research_projects','publications','hackathons','achievements','experiences','certifications','blog_posts','resources','skills'] loop
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end $$;

-- Query indexes.
create index projects_publication_idx on public.projects(status, published_at desc);
create index research_publication_idx on public.research_projects(status, published_at desc);
create index publications_date_idx on public.publications(status, publication_date desc);
create index hackathons_date_idx on public.hackathons(status, event_date desc);
create index achievements_date_idx on public.achievements(status, achieved_on desc);
create index experiences_dates_idx on public.experiences(status, start_date desc);
create index certifications_date_idx on public.certifications(status, issued_on desc);
create index blog_publication_idx on public.blog_posts(status, published_at desc);
create index resources_publication_idx on public.resources(status, published_at desc);
create index skills_category_idx on public.skills(category, sort_order);
create index contact_received_idx on public.contact_submissions(received_at desc);
create index project_skills_skill_idx on public.project_skills(skill_id);
create index research_skills_skill_idx on public.research_project_skills(skill_id);

-- Lock down default grants. Exposed tables are granted only the operations needed by clients.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.projects, public.research_projects, public.publications, public.hackathons,
  public.achievements, public.experiences, public.certifications, public.blog_posts, public.resources,
  public.skills, public.project_skills, public.research_project_skills, public.project_media,
  public.research_media, public.blog_media, public.media_assets to anon, authenticated;
grant insert (name, email, subject, message, idempotency_key, notification_status) on public.contact_submissions to service_role;
grant select (id, notification_status) on public.contact_submissions to service_role;
grant update (notification_status) on public.contact_submissions to service_role;
grant select, update, delete on public.contact_submissions to authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.projects, public.research_projects, public.publications,
  public.hackathons, public.achievements, public.experiences, public.certifications, public.blog_posts,
  public.resources, public.skills, public.project_skills, public.research_project_skills,
  public.project_media, public.research_media, public.blog_media, public.media_assets to authenticated;

-- RLS on every public table.
alter table public.admin_users enable row level security;
alter table public.media_assets enable row level security;
alter table public.projects enable row level security;
alter table public.research_projects enable row level security;
alter table public.publications enable row level security;
alter table public.hackathons enable row level security;
alter table public.achievements enable row level security;
alter table public.experiences enable row level security;
alter table public.certifications enable row level security;
alter table public.blog_posts enable row level security;
alter table public.resources enable row level security;
alter table public.skills enable row level security;
alter table public.project_skills enable row level security;
alter table public.research_project_skills enable row level security;
alter table public.project_media enable row level security;
alter table public.research_media enable row level security;
alter table public.blog_media enable row level security;
alter table public.contact_submissions enable row level security;

create policy admin_users_read_self on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

-- Public content: anon sees published rows; authenticated admins can also see/manage drafts.
do $$ declare t text; begin
  foreach t in array array['projects','research_projects','publications','hackathons','achievements','experiences','certifications','blog_posts','resources','skills'] loop
    execute format('create policy %I on public.%I for select to anon using (status = ''published'' and published_at <= now())', t || '_public_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ((status = ''published'' and published_at <= now()) or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))', t || '_read_published_or_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))', t || '_admin_manage', t);
  end loop;
end $$;

create policy media_public_read on public.media_assets for select to anon using (visibility = 'public');
create policy media_read_public_or_admin on public.media_assets for select to authenticated using (visibility = 'public' or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy media_admin_manage on public.media_assets for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Public can follow associations only when the associated content is published and asset is public.
create policy project_skills_read_published on public.project_skills for select to anon, authenticated using
  (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published' and p.published_at <= now())
   and exists (select 1 from public.skills s where s.id = skill_id and s.status = 'published' and s.published_at <= now()));
create policy project_skills_admin_manage on public.project_skills for all to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy research_skills_read_published on public.research_project_skills for select to anon, authenticated using
  (exists (select 1 from public.research_projects p where p.id = research_project_id and p.status = 'published' and p.published_at <= now())
   and exists (select 1 from public.skills s where s.id = skill_id and s.status = 'published' and s.published_at <= now()));
create policy research_skills_admin_manage on public.research_project_skills for all to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy project_media_read_published on public.project_media for select to anon, authenticated using
  (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published' and p.published_at <= now())
   and exists (select 1 from public.media_assets m where m.id = media_asset_id and m.visibility = 'public'));
create policy project_media_admin_manage on public.project_media for all to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy research_media_read_published on public.research_media for select to anon, authenticated using
  (exists (select 1 from public.research_projects p where p.id = research_project_id and p.status = 'published' and p.published_at <= now())
   and exists (select 1 from public.media_assets m where m.id = media_asset_id and m.visibility = 'public'));
create policy research_media_admin_manage on public.research_media for all to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy blog_media_read_published on public.blog_media for select to anon, authenticated using
  (exists (select 1 from public.blog_posts p where p.id = blog_post_id and p.status = 'published' and p.published_at <= now())
   and exists (select 1 from public.media_assets m where m.id = media_asset_id and m.visibility = 'public'));
create policy blog_media_admin_manage on public.blog_media for all to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Contact insert is narrowly scoped: public cannot read or change submissions.
create policy contact_admin_read on public.contact_submissions for select to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy contact_admin_update on public.contact_submissions for update to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy contact_admin_delete on public.contact_submissions for delete to authenticated using
  (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Storage buckets. Public reads for approved portfolio assets; uploads and mutations are admin-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portfolio-public', 'portfolio-public', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif','application/pdf']),
  ('portfolio-private', 'portfolio-private', false, 20971520, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy portfolio_public_admin_insert on storage.objects for insert to authenticated with check
  (bucket_id in ('portfolio-public','portfolio-private') and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy portfolio_admin_read_private on storage.objects for select to authenticated using
  (bucket_id = 'portfolio-private' and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy portfolio_admin_update on storage.objects for update to authenticated using
  (bucket_id in ('portfolio-public','portfolio-private') and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))) with check
  (bucket_id in ('portfolio-public','portfolio-private') and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy portfolio_admin_delete on storage.objects for delete to authenticated using
  (bucket_id in ('portfolio-public','portfolio-private') and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- No policy grants anonymous reads of private files or submissions.
