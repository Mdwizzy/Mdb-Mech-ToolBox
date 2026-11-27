import { corsHeaders, requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, adminClient } = await requireUser(req);
    const { event_type, resource_key, success } = await req.json();
    if (!['calculator','conversion','search','knowledge'].includes(event_type) || typeof resource_key !== 'string' || resource_key.length < 1 || resource_key.length > 160) throw new Error('Invalid usage event.');
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error: countError } = await adminClient.from('usage_events').select('*', { count:'exact', head:true }).eq('user_id',user.id).gte('created_at',since);
    if (countError) throw countError;
    if ((count || 0) >= 60) throw new Error('Usage event limit reached.');
    const { error } = await adminClient.from('usage_events').insert({ user_id:user.id, event_type, resource_key, success:success===false?false:true });
    if (error) throw error;
    return Response.json({ ok:true }, { headers:corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const status = message.includes('Sign in') || message.includes('session') ? 401 : 400;
    return Response.json({ error:message }, { status, headers:corsHeaders });
  }
});
