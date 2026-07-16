-- ==========================================================
-- SHAKTICOP — COMPLETE SUPABASE SCHEMA v2
-- Run this entire file once in:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE
-- ==========================================================

-- ----------------------------------------------------------
-- 1. ID COUNTER (auto-generates SC2026xxxx, MHD-2026-xxxxxx etc.)
-- ----------------------------------------------------------
create table if not exists id_counters (
  prefix text primary key,
  last_value bigint not null default 100
);

-- CRITICAL: RLS must be enabled on id_counters or ALL form submissions fail
alter table id_counters enable row level security;
drop policy if exists "allow_all_id_counters" on id_counters;
create policy "allow_all_id_counters" on id_counters
  for all using (true) with check (true);

create or replace function next_custom_id(p_prefix text, p_pad int, p_format text)
returns text as $$
declare
  v_next bigint;
  v_id text;
begin
  insert into id_counters(prefix, last_value) values (p_prefix, 100)
    on conflict (prefix) do nothing;
  update id_counters set last_value = last_value + 1
    where prefix = p_prefix
    returning last_value into v_next;
  if p_format = 'SC' then
    v_id := 'SC2026' || lpad(v_next::text, p_pad, '0');
  else
    v_id := p_prefix || '-2026-' || lpad(v_next::text, p_pad, '0');
  end if;
  return v_id;
end;
$$ language plpgsql;

-- ----------------------------------------------------------
-- 2. PROFILES (citizen / admin / officer roles)
-- ----------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text default 'user',
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 3. CITIZEN PROFILES
-- ----------------------------------------------------------
create table if not exists citizen_profiles (
  id text primary key,
  email text,
  full_name text,
  father_name text,
  mobile text,
  district text,
  police_station text,
  address text,
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 4. OFFICERS
-- ----------------------------------------------------------
create table if not exists officers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pno text,
  type text default 'police',
  designation text,
  mobile text,
  email text,
  district text,
  station text,
  availability boolean default true,
  duty_status text default 'Available',
  photo_url text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 5. COMPLAINTS
-- ----------------------------------------------------------
create table if not exists complaints (
  id text primary key default '',
  name text,
  mobile text,
  email text,
  district text,
  police_station text,
  category text,
  incident_date date,
  incident_time text,
  location text,
  description text,
  anonymous boolean default false,
  video_url text,
  status text default 'Pending',
  assigned_officer_id uuid references officers(id),
  officer_seen_at timestamptz,
  remarks text,
  created_at timestamptz default now()
);
create or replace function set_complaint_id() returns trigger as $$
begin
  if new.id is null or new.id = '' then new.id := next_custom_id('SC', 4, 'SC'); end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_complaint_id on complaints;
create trigger trg_complaint_id before insert on complaints
  for each row execute function set_complaint_id();

-- ----------------------------------------------------------
-- 6. ANTI-ROMEO SQUAD REPORTS
-- ----------------------------------------------------------
create table if not exists ars_reports (
  id text primary key default '',
  name text,
  mobile text,
  email text,
  location text,
  district text,
  description text,
  video_url text,
  status text default 'Submitted',
  assigned_officer_id uuid references officers(id),
  officer_seen_at timestamptz,
  remarks text,
  created_at timestamptz default now()
);
create or replace function set_ars_id() returns trigger as $$
begin if new.id is null or new.id = '' then new.id := next_custom_id('ARS', 6, 'X'); end if; return new; end; $$ language plpgsql;
drop trigger if exists trg_ars_id on ars_reports;
create trigger trg_ars_id before insert on ars_reports for each row execute function set_ars_id();

-- ----------------------------------------------------------
-- 7. MAHILA HELP DESK
-- ----------------------------------------------------------
create table if not exists mhd_requests (
  id text primary key default '',
  name text,
  mobile text,
  email text,
  district text,
  police_station text,
  description text,
  callback_requested boolean default false,
  video_url text,
  status text default 'Submitted',
  assigned_officer_id uuid references officers(id),
  officer_seen_at timestamptz,
  remarks text,
  created_at timestamptz default now()
);
create or replace function set_mhd_id() returns trigger as $$
begin if new.id is null or new.id = '' then new.id := next_custom_id('MHD', 6, 'X'); end if; return new; end; $$ language plpgsql;
drop trigger if exists trg_mhd_id on mhd_requests;
create trigger trg_mhd_id before insert on mhd_requests for each row execute function set_mhd_id();

-- ----------------------------------------------------------
-- 8. EMERGENCY / SOS / SAFE TRAVEL REQUESTS
--    type column distinguishes:
--      'SOS'               — domestic violence / distress button
--      'Safe Travel Mode'  — journey monitor (no SOS pressed)
--      'Safe Travel SOS 🚨' — journey monitor WHERE citizen pressed SOS
-- ----------------------------------------------------------
create table if not exists emergency_requests (
  id text primary key default '',
  name text,
  mobile text,
  email text,
  district text,
  location text,                         -- start location OR live GPS coords
  destination text,                      -- end / destination (Safe Travel)
  transport_type text,                   -- vehicle type (Safe Travel)
  vehicle_plate text,                    -- plate number (Safe Travel)
  type text default 'SOS',
  description text,                      -- full SOS details + GPS link
  remarks text,
  status text default 'Submitted',       -- Submitted | SOS Triggered | SOS ACTIVE | Journey Complete | Auto Closed
  assigned_officer_id uuid references officers(id),
  officer_seen_at timestamptz,
  created_at timestamptz default now()
);
create or replace function set_sos_id() returns trigger as $$
begin if new.id is null or new.id = '' then new.id := next_custom_id('SOS', 6, 'X'); end if; return new; end; $$ language plpgsql;
drop trigger if exists trg_sos_id on emergency_requests;
create trigger trg_sos_id before insert on emergency_requests for each row execute function set_sos_id();

-- ----------------------------------------------------------
-- 9. COUNSELLORS
-- ----------------------------------------------------------
create table if not exists counsellors (
  id uuid primary key default gen_random_uuid(),
  name text,
  designation text,
  mobile text,
  email text,
  district text,
  station text,
  availability boolean default true,
  photo_url text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 10. COUNSELLING BOOKINGS
-- ----------------------------------------------------------
create table if not exists counselling_bookings (
  id text primary key default '',
  name text,
  mobile text,
  email text,
  district text,
  preferred_date date,
  preferred_time text,
  reason text,
  video_url text,
  session_date date,
  session_time text,
  assigned_counsellor_id uuid references counsellors(id),
  assigned_counsellor_name text,
  status text default 'Application Received',
  remarks text,
  created_at timestamptz default now()
);
create or replace function set_cns_id() returns trigger as $$
begin if new.id is null or new.id = '' then new.id := next_custom_id('CNS', 6, 'X'); end if; return new; end; $$ language plpgsql;
drop trigger if exists trg_cns_id on counselling_bookings;
create trigger trg_cns_id before insert on counselling_bookings for each row execute function set_cns_id();

-- ----------------------------------------------------------
-- 11. EMPOWERMENT / JSS APPLICATIONS
-- ----------------------------------------------------------
create table if not exists empowerment_applications (
  id text primary key default '',
  scheme_title text,
  name text,
  mobile text,
  email text,
  age int,
  gender text,
  district text,
  status text default 'Application Received',
  created_at timestamptz default now()
);
create or replace function set_sch_id() returns trigger as $$
begin if new.id is null or new.id = '' then new.id := next_custom_id('SCH', 6, 'X'); end if; return new; end; $$ language plpgsql;
drop trigger if exists trg_sch_id on empowerment_applications;
create trigger trg_sch_id before insert on empowerment_applications for each row execute function set_sch_id();

-- ----------------------------------------------------------
-- 12. CALLBACK / LEGAL AID REQUESTS
-- ----------------------------------------------------------
create table if not exists callback_requests (
  id text primary key default '',
  name text,
  mobile text,
  email text,
  district text,
  police_station text,
  reason text,
  video_url text,
  status text default 'Submitted',
  created_at timestamptz default now()
);
create or replace function set_fob_id() returns trigger as $$
begin if new.id is null or new.id = '' then new.id := next_custom_id('FOB', 6, 'X'); end if; return new; end; $$ language plpgsql;
drop trigger if exists trg_fob_id on callback_requests;
create trigger trg_fob_id before insert on callback_requests for each row execute function set_fob_id();

-- ----------------------------------------------------------
-- 13. MODULE HISTORY (timeline / audit log)
-- ----------------------------------------------------------
create table if not exists module_history (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null,
  status text,
  officer_name text,
  remarks text,
  user_email text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 14. NOTIFICATIONS
-- ----------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  title text,
  message text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 15. STATIC / REFERENCE TABLES
-- ----------------------------------------------------------
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  department text, number text, description text,
  created_at timestamptz default now()
);
create table if not exists schemes (
  id uuid primary key default gen_random_uuid(),
  title text, description text, eligibility text,
  created_at timestamptz default now()
);
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text, is_live boolean default true,
  created_at timestamptz default now()
);
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 16. ROW LEVEL SECURITY — permissive for testing
--     All tables allow full read/write with the anon key.
--     Tighten these before going to real production.
-- ----------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','citizen_profiles','officers','complaints','ars_reports',
    'mhd_requests','emergency_requests','counsellors','counselling_bookings',
    'empowerment_applications','callback_requests','module_history',
    'notifications','contacts','schemes','announcements','categories'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "allow_all_%1$s" on %1$I;', t);
    execute format('create policy "allow_all_%1$s" on %1$I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ----------------------------------------------------------
-- 17. REALTIME — cross-device live sync
-- ----------------------------------------------------------
do $$
begin
  execute 'alter publication supabase_realtime add table complaints';
  execute 'alter publication supabase_realtime add table ars_reports';
  execute 'alter publication supabase_realtime add table mhd_requests';
  execute 'alter publication supabase_realtime add table emergency_requests';
  execute 'alter publication supabase_realtime add table counselling_bookings';
  execute 'alter publication supabase_realtime add table notifications';
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------
-- 18. STORAGE BUCKET (voice recordings / attachments)
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "documents_public_read" on storage.objects;
create policy "documents_public_read" on storage.objects
  for select using (bucket_id = 'documents');

drop policy if exists "documents_public_upload" on storage.objects;
create policy "documents_public_upload" on storage.objects
  for insert with check (bucket_id = 'documents');

-- ==========================================================
-- DONE. ShaktiCop backend ready for cross-device deployment.
-- ==========================================================
