# MechToolbox Supabase setup

The public tools still run when Supabase is not configured. `/admin` remains locked until the database project is configured, its schema is applied, and an administrator is provisioned.

## 1. Connect a Supabase project

Copy `.env.example` to `.env.local` for local development and set the project's **Project URL** and **anon/public key**. Add the same two values as Netlify build environment variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then trigger a new deploy. The browser bundle must never receive a service-role key.

## 2. Apply the schema and deploy functions

Install the Supabase CLI, authenticate, link the project, then from the repository run:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy admin-api
supabase functions deploy verify-calculator
supabase functions deploy record-usage
```

Supabase Edge Functions use the platform's server-side `SUPABASE_SERVICE_ROLE_KEY` secret. Do not copy it to Netlify `VITE_*` variables or commit it to this repository.

## 3. Provision the first administrator

Open `/admin`, create the first account, and confirm its email if email confirmation is enabled. In the Supabase SQL editor, look up that account's UUID in **Authentication → Users**, then execute this one-time command with the UUID:

```sql
select public.provision_first_admin('00000000-0000-0000-0000-000000000000'::uuid);
```

The function refuses to grant the first role if an administrator already exists. After provisioning, sign in again at `/admin`. Further role grants and revocations go through the authenticated `admin-api` Edge Function, and users cannot edit `user_roles` directly. The database owner remains the recovery path if all administrator accounts are lost.

## Security and stored data

The migration keeps roles separate from profiles, adds row-level policies to administrative tables, seeds the ten built-in calculators as published records, and creates triggers for an append-only audit view. Calculator test cases can only be written by the verification function, which selects from fixed calculation modules; text entered in metadata is never evaluated as code. Changing a calculator's logic identifier resets its verification state. Analytics show stored usage events and explicit empty states rather than invented figures.

The current client collects analytics only for signed-in users and only after a tool action. Anonymous reports are supported through the feedback insert policy; report details are visible to administrators only.
