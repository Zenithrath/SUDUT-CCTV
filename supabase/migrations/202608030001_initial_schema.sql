-- SUDUT CCTV: durations are always stored as whole minutes.
create type public.user_role as enum ('admin', 'operator', 'viewer');
create type public.device_status as enum ('active', 'inactive', 'maintenance');
create type public.report_status as enum ('draft', 'complete', 'final');
create type public.resolution_status as enum ('open', 'resolved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Pengguna baru', role public.user_role not null default 'viewer',
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.locations (id uuid primary key default gen_random_uuid(), name text not null unique, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.devices (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  location_id uuid references public.locations(id), operational_minutes_per_day smallint not null default 1440 check (operational_minutes_per_day between 1 and 1440),
  active_from date not null default current_date, inactive_from date, status public.device_status not null default 'active', ip_address inet, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (inactive_from is null or inactive_from >= active_from)
);
create table public.cause_categories (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null unique, description text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.reporting_periods (id uuid primary key default gen_random_uuid(), month_start date not null unique check (month_start = date_trunc('month', month_start)::date), status public.report_status not null default 'draft', finalized_by uuid references public.profiles(id), finalized_at timestamptz, reopened_by uuid references public.profiles(id), reopen_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.daily_uptime_records (
  id uuid primary key default gen_random_uuid(), reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade, device_id uuid not null references public.devices(id), record_date date not null,
  available_minutes smallint not null default 1440 check (available_minutes between 1 and 1440), uptime_minutes smallint check (uptime_minutes between 0 and available_minutes),
  downtime_minutes smallint generated always as (case when uptime_minutes is null then null else available_minutes - uptime_minutes end) stored,
  cause_category_id uuid references public.cause_categories(id), cause_detail text, action_taken text, handled_by uuid references public.profiles(id), resolution_status public.resolution_status,
  planned_downtime boolean not null default false, notes text, created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(device_id, record_date), check (uptime_minutes is null or uptime_minutes = available_minutes or (cause_category_id is not null and length(trim(cause_detail)) >= 3 and resolution_status is not null)), check (resolution_status is distinct from 'resolved' or length(trim(action_taken)) >= 3)
);
create table public.audit_logs (id bigint generated always as identity primary key, user_id uuid references public.profiles(id), entity_type text not null, entity_id uuid, action text not null, old_data jsonb, new_data jsonb, created_at timestamptz not null default now());
create index daily_uptime_records_period_idx on public.daily_uptime_records(reporting_period_id); create index daily_uptime_records_device_date_idx on public.daily_uptime_records(device_id, record_date); create index devices_location_idx on public.devices(location_id); create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger devices_updated_at before update on public.devices for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.cause_categories for each row execute function public.set_updated_at();
create trigger periods_updated_at before update on public.reporting_periods for each row execute function public.set_updated_at();
create trigger records_updated_at before update on public.daily_uptime_records for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.current_role() returns public.user_role language sql stable security definer set search_path = public as $$ select role from public.profiles where id = auth.uid() and is_active = true $$;

alter table public.profiles enable row level security; alter table public.locations enable row level security; alter table public.devices enable row level security; alter table public.cause_categories enable row level security; alter table public.reporting_periods enable row level security; alter table public.daily_uptime_records enable row level security; alter table public.audit_logs enable row level security;
create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "authenticated read locations" on public.locations for select to authenticated using (true);
create policy "authenticated read devices" on public.devices for select to authenticated using (true);
create policy "authenticated read categories" on public.cause_categories for select to authenticated using (true);
create policy "authenticated read periods" on public.reporting_periods for select to authenticated using (true);
create policy "authenticated read records" on public.daily_uptime_records for select to authenticated using (true);
create policy "operators write records" on public.daily_uptime_records for all to authenticated using (public.current_role() in ('admin','operator')) with check (public.current_role() in ('admin','operator'));
create policy "admins manage devices" on public.devices for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "admins manage locations" on public.locations for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "admins manage categories" on public.cause_categories for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.current_role() = 'admin');
