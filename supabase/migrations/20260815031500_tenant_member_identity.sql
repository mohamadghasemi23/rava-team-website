alter table public.tenant_memberships add column if not exists display_name text;
update public.tenant_memberships tm set display_name=p.display_name from public.profiles p where p.id=tm.user_id and (tm.display_name is null or trim(tm.display_name)='');
alter table public.tenant_memberships alter column display_name set not null;
alter table public.tenant_memberships add constraint tenant_memberships_display_name_len check(length(display_name) between 1 and 120) not valid;
alter table public.tenant_memberships validate constraint tenant_memberships_display_name_len;
