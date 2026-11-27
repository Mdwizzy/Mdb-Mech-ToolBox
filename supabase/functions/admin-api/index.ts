import { corsHeaders, requireAdmin } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    const { user, adminClient } = await requireAdmin(req);
    const body = await req.json();
    if (body.action === 'list_users') {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const ids = data.users.map((u) => u.id);
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        adminClient.from('user_roles').select('user_id,role').in('user_id', ids),
        adminClient.from('profiles').select('id,account_status').in('id', ids),
      ]);
      const roleById = new Map((roles || []).map((r) => [r.user_id, r.role]));
      const profileById = new Map((profiles || []).map((p) => [p.id, p]));
      return Response.json({ users: data.users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, role: roleById.get(u.id) || 'user', account_status: profileById.get(u.id)?.account_status || 'active' })) }, { headers: corsHeaders });
    }
    if (body.action === 'set_role') {
      const target = String(body.user_id || '');
      const role = body.role;
      if (!target || !['admin', 'user'].includes(role)) throw new Error('A valid user and role are required.');
      if (target === user.id) throw new Error('You cannot change your own administrator role.');
      const { data: existing } = await adminClient.from('user_roles').select('role').eq('user_id', target).maybeSingle();
      if (!existing) throw new Error('The target account has no registered role.');
      if (existing.role === 'admin' && role === 'user') {
        const { count, error } = await adminClient.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
        if (error) throw error;
        if ((count || 0) <= 1) throw new Error('At least one administrator must remain.');
      }
      const { error } = await adminClient.from('user_roles').update({ role, assigned_by: user.id, assigned_at: new Date().toISOString() }).eq('user_id', target);
      if (error) throw error;
      await adminClient.from('admin_audit_log').insert({ administrator_id: user.id, action: role === 'admin' ? 'GRANT_ROLE' : 'REVOKE_ROLE', resource_type: 'user_roles', resource_id: target, details: { from: existing.role, to: role } });
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (body.action === 'set_account_status') {
      const target = String(body.user_id || '');
      const status = body.status;
      if (!target || !['active', 'restricted'].includes(status)) throw new Error('A valid user and account status are required.');
      if (target === user.id) throw new Error('You cannot restrict your own account.');
      const { data: role } = await adminClient.from('user_roles').select('role').eq('user_id', target).maybeSingle();
      if (!role) throw new Error('The target account does not exist.');
      if (role.role === 'admin') throw new Error('Administrator accounts cannot be restricted from this screen.');
      const { error: profileError } = await adminClient.from('profiles').update({ account_status: status }).eq('id', target);
      if (profileError) throw profileError;
      const { error: authError } = await adminClient.auth.admin.updateUserById(target, { ban_duration: status === 'restricted' ? '876000h' : 'none' });
      if (authError) throw authError;
      await adminClient.from('admin_audit_log').insert({ administrator_id: user.id, action: status === 'restricted' ? 'RESTRICT_ACCOUNT' : 'RESTORE_ACCOUNT', resource_type: 'profiles', resource_id: target, details: { status } });
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    throw new Error('Unknown administrative action.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const status = message.includes('sign in') || message.includes('session') ? 401 : message.includes('Administrator') ? 403 : 400;
    return Response.json({ error: message }, { status, headers: corsHeaders });
  }
});
