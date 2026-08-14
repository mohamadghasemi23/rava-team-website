-- Extend tenant state enforcement to tenant-level control tables.
do $$
declare t text;
begin
  foreach t in array array['admin_permissions','tenant_memberships','tenant_modules','payment_connections'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists enforce_tenant_write_state on public.%I',t);
      execute format('create trigger enforce_tenant_write_state before insert or update or delete on public.%I for each row execute function public.enforce_tenant_write_state()',t);
    end if;
  end loop;
end$$;
