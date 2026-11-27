-- MechToolbox administration schema. Apply before configuring /admin.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 account_status text not null default 'active' check(account_status in ('active','restricted')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'user' check(role in ('admin','user')),
 assigned_by uuid references auth.users(id) on delete set null, assigned_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'name','')) on conflict do nothing;
 insert into public.user_roles(user_id,role) values(new.id,'user') on conflict do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created_mechtoolbox on auth.users;
create trigger on_auth_user_created_mechtoolbox after insert on auth.users for each row execute function public.handle_new_user();
-- Existing project accounts receive the least-privileged role during migration.
insert into public.profiles(id,display_name)
 select id,coalesce(raw_user_meta_data->>'name','') from auth.users on conflict do nothing;
insert into public.user_roles(user_id,role) select id,'user' from auth.users on conflict do nothing;

create table if not exists public.calculators (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, category text not null,
 description text not null default '', formula_display text not null default '',
 logic_id text not null check(logic_id in ('pump_hydraulic_power','pressure_from_force','pipe_flow_rate','darcy_weisbach','reynolds_number','shaft_power','thermal_expansion','heat_duty','lmtd','bearing_life')),
 inputs jsonb not null default '[]', output jsonb not null default '{}', assumptions text not null default '',
 worked_example jsonb not null default '{}', sources jsonb not null default '[]',
 status text not null default 'draft' check(status in ('draft','published','archived')),
 verification_status text not null default 'draft' check(verification_status in ('draft','under_review','verified','needs_review')),
 featured boolean not null default false, verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.calculator_test_cases (
 id uuid primary key default gen_random_uuid(), calculator_id uuid not null references public.calculators(id) on delete cascade,
 name text not null, inputs jsonb not null, expected numeric not null, tolerance numeric not null default 0.000001 check(tolerance>=0), logic_id_at_test text not null,
 actual numeric, passed boolean, notes text not null default '', tested_by uuid references auth.users(id) on delete set null,
 tested_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.engineering_content (
 id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
 content_type text not null check(content_type in ('formula','article','equipment','material','symbol','learning','pipe_reference','workshop_reference')),
 category text not null default 'General', summary text not null default '', body jsonb not null default '[]', sources jsonb not null default '[]',
 status text not null default 'draft' check(status in ('draft','published','archived')), featured boolean not null default false,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.fastener_reference (
 id uuid primary key default gen_random_uuid(), system text not null check(system in ('metric','imperial')),
 nominal_size text not null, fastener_type text not null default 'hex bolt', across_flats numeric, socket_size numeric, thread_pitch numeric,
 standard text not null default '', property_class text not null default '', dimensions jsonb not null default '{}', source text not null default '',
 status text not null default 'published' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(system,nominal_size,fastener_type,standard)
);
create table if not exists public.material_properties (
 id uuid primary key default gen_random_uuid(), material text not null, standard text not null default '', grade text not null default '',
 properties jsonb not null default '{}', source text not null default '', status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.feedback (
 id uuid primary key default gen_random_uuid(), submitted_by uuid references auth.users(id) on delete set null, email text not null default '',
 type text not null check(type in ('calculation_error','broken_tool','reference_error','feature_request','technical_issue','suggestion')),
 title text not null, details text not null, priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 status text not null default 'new' check(status in ('new','under_investigation','in_progress','resolved','rejected')),
 assigned_to uuid references auth.users(id) on delete set null, internal_notes text not null default '', resolution_history jsonb not null default '[]',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.usage_events (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 event_type text not null check(event_type in ('calculator','conversion','search','knowledge')),
 resource_key text not null, success boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.app_categories (
 id uuid primary key default gen_random_uuid(), name text not null unique, section text not null default 'tools',
 display_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.app_settings (
 key text primary key, value jsonb not null default '{}', updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.admin_audit_log (
 id bigint generated always as identity primary key, administrator_id uuid references auth.users(id) on delete set null,
 action text not null, resource_type text not null, resource_id text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.write_admin_audit() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare rid text; payload jsonb;
begin
 rid:=coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'key',to_jsonb(old)->>'key','');
 payload:=jsonb_build_object('old',case when tg_op='INSERT' then null else to_jsonb(old) end,'new',case when tg_op='DELETE' then null else to_jsonb(new) end);
 if auth.uid() is not null then
  insert into public.admin_audit_log(administrator_id,action,resource_type,resource_id,details) values(auth.uid(),tg_op,tg_table_name,rid,payload);
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.write_admin_audit() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['calculators','calculator_test_cases','engineering_content','fastener_reference','material_properties','feedback','app_categories','app_settings'] loop
  execute format('drop trigger if exists audit_%I on public.%I',t,t);
  execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.write_admin_audit()',t,t);
 end loop;
end $$;

-- Run only once from the Supabase SQL editor as project owner after the admin signs up.
create or replace function public.provision_first_admin(target_user uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.user_roles where role='admin') then raise exception 'An administrator is already provisioned'; end if;
 update public.user_roles set role='admin',assigned_by=null,assigned_at=now() where user_id=target_user;
 if not found then raise exception 'Create the user in Supabase Auth before provisioning'; end if;
 insert into public.admin_audit_log(administrator_id,action,resource_type,resource_id,details)
 values(target_user,'PROVISION_FIRST_ADMIN','user_roles',target_user::text,'{"provisioning":"project-owner SQL editor"}');
end $$;
revoke all on function public.provision_first_admin(uuid) from public,anon,authenticated;
grant execute on function public.provision_first_admin(uuid) to service_role;

create or replace function public.enforce_calculator_verification() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='UPDATE' and old.logic_id is distinct from new.logic_id then
  new.verification_status:='needs_review'; new.verified_at:=null;
 end if;
 if new.verification_status='verified' and (
  not exists(select 1 from public.calculator_test_cases t where t.calculator_id=new.id and t.logic_id_at_test=new.logic_id and t.passed=true)
  or exists(select 1 from public.calculator_test_cases t where t.calculator_id=new.id and t.logic_id_at_test=new.logic_id and t.passed=false)
 ) then raise exception 'Calculator cannot be verified until current-logic tests pass.'; end if;
 return new;
end $$;
drop trigger if exists enforce_calculator_verification on public.calculators;
create trigger enforce_calculator_verification before insert or update on public.calculators for each row execute function public.enforce_calculator_verification();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.updated_at:=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['profiles','calculators','engineering_content','fastener_reference','material_properties','feedback','app_settings'] loop
  execute format('drop trigger if exists touch_%I on public.%I',t,t);
  execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()',t,t);
 end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.calculators enable row level security;
alter table public.calculator_test_cases enable row level security;
alter table public.engineering_content enable row level security;
alter table public.fastener_reference enable row level security;
alter table public.material_properties enable row level security;
alter table public.feedback enable row level security;
alter table public.usage_events enable row level security;
alter table public.app_categories enable row level security;
alter table public.app_settings enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "profile self or admin read" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy "profile self update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "roles self or admin read" on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy "published calculators readable" on public.calculators for select to anon,authenticated using(status='published' or public.is_admin());
create policy "admins manage calculators" on public.calculators for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admins read tests" on public.calculator_test_cases for select to authenticated using(public.is_admin());
create policy "published content readable" on public.engineering_content for select to anon,authenticated using(status='published' or public.is_admin());
create policy "admins manage content" on public.engineering_content for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "published fasteners readable" on public.fastener_reference for select to anon,authenticated using(status='published' or public.is_admin());
create policy "admins manage fasteners" on public.fastener_reference for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "published materials readable" on public.material_properties for select to anon,authenticated using(status='published' or public.is_admin());
create policy "admins manage materials" on public.material_properties for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "submit feedback" on public.feedback for insert to anon,authenticated with check(submitted_by is null or submitted_by=auth.uid());
create policy "admins manage feedback" on public.feedback for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admins read usage" on public.usage_events for select to authenticated using(public.is_admin());
create policy "categories readable" on public.app_categories for select to anon,authenticated using(true);
create policy "admins manage categories" on public.app_categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "public settings readable" on public.app_settings for select to anon,authenticated using(key in ('home_sections','announcements'));
create policy "admins manage settings" on public.app_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admins read audit" on public.admin_audit_log for select to authenticated using(public.is_admin());

revoke all on public.user_roles,public.admin_audit_log from anon,authenticated;
grant select on public.user_roles,public.admin_audit_log to authenticated;
grant select,insert,update,delete on public.calculators,public.engineering_content,public.fastener_reference,public.material_properties,public.feedback,public.app_categories,public.app_settings to authenticated;
grant select on public.calculator_test_cases to authenticated;
grant select,insert on public.feedback to anon;
grant select on public.calculators,public.engineering_content,public.fastener_reference,public.material_properties,public.app_categories,public.app_settings to anon;
grant select on public.usage_events to authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles,public.user_roles,public.calculators,public.calculator_test_cases,public.engineering_content,public.fastener_reference,public.material_properties,public.feedback,public.usage_events,public.app_categories,public.app_settings,public.admin_audit_log to service_role;
grant usage,select on all sequences in schema public to service_role;

insert into public.calculators(name,slug,category,description,formula_display,logic_id,inputs,output,assumptions,status)
values
 ('Pump hydraulic power','pump-hydraulic-power','PUMPS','Estimate power transferred to liquid from flow, head and density.','P = ρgQH','pump_hydraulic_power','[{"name":"Flow rate","unit":"m³/h","initial":100},{"name":"Total head","unit":"m","initial":50},{"name":"Fluid density","unit":"kg/m³","initial":1000}]','{"unit":"W"}','Hydraulic power only; pump and motor losses are excluded.','published'),
 ('Pressure from force','pressure-from-force','FUNDAMENTALS','Calculate uniform pressure from applied force and loaded area.','P = F / A','pressure_from_force','[{"name":"Applied force","unit":"N","initial":10000},{"name":"Area","unit":"m²","initial":0.02}]','{"unit":"Pa"}','Use effective loaded area.','published'),
 ('Pipe flow rate','pipe-flow-rate','FLUID MECHANICS','Calculate flow in a full circular pipe from internal diameter and mean velocity.','Q = A × v','pipe_flow_rate','[{"name":"Internal diameter","unit":"mm","initial":100},{"name":"Mean velocity","unit":"m/s","initial":2}]','{"unit":"m³/s"}','Diameter is internal diameter; pipe is assumed full.','published'),
 ('Darcy–Weisbach pressure drop','darcy-weisbach-pressure-drop','FLUID MECHANICS','Estimate straight-pipe friction pressure drop.','Δp = f (L / D) (ρv² / 2)','darcy_weisbach','[{"name":"Darcy friction factor","unit":"—","initial":0.02},{"name":"Pipe length","unit":"m","initial":100},{"name":"Internal diameter","unit":"m","initial":0.1},{"name":"Fluid density","unit":"kg/m³","initial":1000},{"name":"Mean velocity","unit":"m/s","initial":2}]','{"unit":"Pa"}','Fittings, elevation and equipment losses are excluded.','published'),
 ('Reynolds number','reynolds-number','FLUID MECHANICS','Calculate a dimensionless internal-flow Reynolds number.','Re = ρvD / μ','reynolds_number','[{"name":"Density","unit":"kg/m³","initial":1000},{"name":"Velocity","unit":"m/s","initial":1},{"name":"Pipe diameter","unit":"m","initial":0.05},{"name":"Dynamic viscosity","unit":"Pa·s","initial":0.001}]','{"unit":"—"}','Use consistent SI units.','published'),
 ('Shaft power from torque','shaft-power-from-torque','ROTATING EQUIPMENT','Calculate shaft power from torque and rotational speed.','P = T × 2πN / 60','shaft_power','[{"name":"Torque","unit":"N·m","initial":100},{"name":"Rotational speed","unit":"rpm","initial":1500}]','{"unit":"W"}','Torque in N·m; speed in rpm.','published'),
 ('Thermal expansion','thermal-expansion','THERMAL','Estimate free linear expansion due to a temperature change.','ΔL = αL₀ΔT','thermal_expansion','[{"name":"Expansion coefficient","unit":"1/K","initial":0.000012},{"name":"Original length","unit":"m","initial":10},{"name":"Temperature change","unit":"K","initial":80}]','{"unit":"m"}','Free expansion only; restraint stresses are excluded.','published'),
 ('Heat exchanger duty','heat-exchanger-duty','HEAT TRANSFER','Estimate sensible heat duty at constant specific heat.','Q̇ = ṁcₚΔT','heat_duty','[{"name":"Mass flow","unit":"kg/s","initial":2},{"name":"Specific heat","unit":"J/(kg·K)","initial":4180},{"name":"Temperature change","unit":"K","initial":25}]','{"unit":"W"}','Latent heat is not included.','published'),
 ('Log mean temperature difference','log-mean-temperature-difference','HEAT TRANSFER','Calculate LMTD from positive terminal temperature differences.','LMTD = (ΔT₁ − ΔT₂) / ln(ΔT₁ / ΔT₂)','lmtd','[{"name":"Terminal difference ΔT₁","unit":"K","initial":50},{"name":"Terminal difference ΔT₂","unit":"K","initial":20}]','{"unit":"K"}','Multipass correction is separate; terminal differences must not cross.','published'),
 ('Bearing L₁₀ life','bearing-l10-life','ROTATING EQUIPMENT','Basic rating life estimate for a rolling-element bearing.','L₁₀ = (C / P)ᵖ × 10⁶ revolutions','bearing_life','[{"name":"Dynamic rating C","unit":"kN","initial":30},{"name":"Equivalent load P","unit":"kN","initial":5},{"name":"Life exponent p","unit":"—","initial":3}]','{"unit":"million rev"}','Basic rating life only; lubrication and reliability adjustments are excluded.','published')
on conflict(slug) do nothing;
insert into public.app_categories(name,section,display_order) values
 ('Pumps','calculators',1),('Fluid mechanics','calculators',2),('Rotating equipment','calculators',3),('Heat transfer','calculators',4),('Thermal','calculators',5)
on conflict(name) do nothing;

create index if not exists usage_events_type_time_idx on public.usage_events(event_type,created_at desc);
create index if not exists feedback_status_time_idx on public.feedback(status,created_at desc);
create index if not exists audit_created_idx on public.admin_audit_log(created_at desc);
