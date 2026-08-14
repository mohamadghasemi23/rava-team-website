-- Remove legacy global permission entry points now that permissions are tenant-scoped.
drop function if exists public.set_admin_permission(uuid,text,boolean);
drop function if exists public.has_admin_permission(text);
