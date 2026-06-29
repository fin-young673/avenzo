-- Avozea Agency Manager Supabase schema
-- Run this in the Supabase SQL editor before connecting the Vercel app.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  website_url text,
  niche text,
  source text,
  status text default 'Lead',
  tags text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_name text not null,
  package_type text,
  status text default 'Idea',
  platform text,
  start_date date,
  target_launch date,
  actual_launch date,
  target_price numeric(10,2) default 0,
  actual_price numeric(10,2) default 0,
  direct_costs numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  step_name text,
  step_description text,
  step_order integer default 0,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  note_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.retainers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  tier text,
  monthly_value numeric(10,2) not null default 0,
  start_date date,
  status text default 'Active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.retainer_updates (
  id uuid primary key default gen_random_uuid(),
  retainer_id uuid references public.retainers(id) on delete cascade,
  update_text text not null,
  month_label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.outreach_log (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  business_name text not null,
  contact_name text,
  platform text,
  message_type text,
  status text default 'Sent',
  notes text,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.case_studies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text default 'In Progress',
  before_url text,
  after_url text,
  before_screenshot_url text,
  after_screenshot_url text,
  testimonial text,
  permission_confirmed boolean default false,
  results_summary text,
  published_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_url text,
  document_type text,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  notes text,
  upload_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  estimated_time text,
  tools_used text,
  steps jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  note_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Updated-at triggers
drop trigger if exists clients_set_updated_at on public.clients;
drop trigger if exists projects_set_updated_at on public.projects;
drop trigger if exists project_deliverables_set_updated_at on public.project_deliverables;
drop trigger if exists project_notes_set_updated_at on public.project_notes;
drop trigger if exists retainers_set_updated_at on public.retainers;
drop trigger if exists retainer_updates_set_updated_at on public.retainer_updates;
drop trigger if exists outreach_log_set_updated_at on public.outreach_log;
drop trigger if exists case_studies_set_updated_at on public.case_studies;
drop trigger if exists documents_set_updated_at on public.documents;
drop trigger if exists processes_set_updated_at on public.processes;
drop trigger if exists client_notes_set_updated_at on public.client_notes;
drop trigger if exists settings_set_updated_at on public.settings;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger project_deliverables_set_updated_at before update on public.project_deliverables for each row execute function public.set_updated_at();
create trigger project_notes_set_updated_at before update on public.project_notes for each row execute function public.set_updated_at();
create trigger retainers_set_updated_at before update on public.retainers for each row execute function public.set_updated_at();
create trigger retainer_updates_set_updated_at before update on public.retainer_updates for each row execute function public.set_updated_at();
create trigger outreach_log_set_updated_at before update on public.outreach_log for each row execute function public.set_updated_at();
create trigger case_studies_set_updated_at before update on public.case_studies for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger processes_set_updated_at before update on public.processes for each row execute function public.set_updated_at();
create trigger client_notes_set_updated_at before update on public.client_notes for each row execute function public.set_updated_at();
create trigger settings_set_updated_at before update on public.settings for each row execute function public.set_updated_at();

-- Row level security. These policies allow the private password-gated frontend to use the anon key.
-- For a stricter future version, replace this with Supabase Auth.
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_notes enable row level security;
alter table public.retainers enable row level security;
alter table public.retainer_updates enable row level security;
alter table public.outreach_log enable row level security;
alter table public.case_studies enable row level security;
alter table public.documents enable row level security;
alter table public.processes enable row level security;
alter table public.client_notes enable row level security;
alter table public.settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['clients','projects','project_deliverables','project_notes','retainers','retainer_updates','outreach_log','case_studies','documents','processes','client_notes','settings'] loop
    execute format('drop policy if exists "private_app_all" on public.%I', t);
    execute format('create policy "private_app_all" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Public storage bucket for project documents, screenshots and briefs.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

drop policy if exists "documents_storage_read" on storage.objects;
drop policy if exists "documents_storage_insert" on storage.objects;
drop policy if exists "documents_storage_update" on storage.objects;
drop policy if exists "documents_storage_delete" on storage.objects;

create policy "documents_storage_read" on storage.objects for select using (bucket_id = 'documents');
create policy "documents_storage_insert" on storage.objects for insert with check (bucket_id = 'documents');
create policy "documents_storage_update" on storage.objects for update using (bucket_id = 'documents') with check (bucket_id = 'documents');
create policy "documents_storage_delete" on storage.objects for delete using (bucket_id = 'documents');
