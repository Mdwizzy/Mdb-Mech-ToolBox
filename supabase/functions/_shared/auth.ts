import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function clients(req: Request): { userClient: SupabaseClient; adminClient: SupabaseClient } {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return {
    userClient: createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } }),
    adminClient: createClient(url, service, { auth: { persistSession: false } }),
  };
}

export async function requireAdmin(req: Request) {
  const { userClient, adminClient } = clients(req);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sign in is required.');
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) throw new Error('The session is invalid or expired.');
  const { data: role, error: roleError } = await adminClient.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (roleError || role?.role !== 'admin') throw new Error('Administrator access is required.');
  return { user, adminClient };
}

export async function requireUser(req: Request) {
  const { userClient, adminClient } = clients(req);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sign in is required.');
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) throw new Error('The session is invalid or expired.');
  return { user, adminClient };
}
