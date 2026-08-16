-- Safe customer profile bootstrap and trusted checkout order-to-account linking.
create or replace function public.ensure_customer_profile(p_tenant uuid,p_full_name text default null,p_phone text default null,p_email text default null,p_locale text default 'fa') returns uuid language plpgsql security definer set search_path=public as $$declare cid uuid;begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 insert into public.customer_profiles(tenant_id,user_id,full_name,phone,email,locale,created_at,updated_at) values(p_tenant,auth.uid(),nullif(left(trim(coalesce(p_full_name,'')),120),''),nullif(left(trim(coalesce(p_phone,'')),40),''),nullif(left(trim(coalesce(p_email,'')),200),''),case when p_locale in('fa','en') then p_locale else 'fa' end,now(),now()) on conflict(tenant_id,user_id) do update set full_name=coalesce(excluded.full_name,customer_profiles.full_name),phone=coalesce(excluded.phone,customer_profiles.phone),email=coalesce(excluded.email,customer_profiles.email),locale=excluded.locale,updated_at=now() returning id into cid;
 return cid;end$$;
revoke all on function public.ensure_customer_profile(uuid,text,text,text,text) from public,anon;grant execute on function public.ensure_customer_profile(uuid,text,text,text,text) to authenticated;

create or replace function public.attach_order_to_customer(p_tenant uuid,p_order uuid,p_user uuid) returns void language plpgsql security definer set search_path=public as $$declare cid uuid;begin
 if current_user not in('postgres','service_role') then raise exception 'trusted_server_only';end if;
 select id into cid from public.customer_profiles where tenant_id=p_tenant and user_id=p_user;if cid is null then return;end if;
 update public.orders set customer_id=cid,updated_at=now() where id=p_order and tenant_id=p_tenant and customer_id is null;
end$$;
revoke all on function public.attach_order_to_customer(uuid,uuid,uuid) from public,anon,authenticated;grant execute on function public.attach_order_to_customer(uuid,uuid,uuid) to service_role;
