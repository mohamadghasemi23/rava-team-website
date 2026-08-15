-- Manual override layer: admins can correct operational state without erasing history.
create table if not exists public.order_manual_overrides(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete restrict,order_id uuid not null references public.orders(id) on delete restrict,
 override_type text not null check(override_type in('order_state','payment_status','shipment','return','financial_note')),
 before_state jsonb not null default '{}'::jsonb,after_state jsonb not null default '{}'::jsonb,reason text not null,actor_user_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
create index if not exists order_manual_overrides_order_idx on public.order_manual_overrides(tenant_id,order_id,created_at desc);
alter table public.order_manual_overrides enable row level security;
create policy order_manual_overrides_admin_read on public.order_manual_overrides for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.manual_override_order_state(p_tenant uuid,p_order uuid,p_status text,p_fulfillment text,p_reason text,p_actor uuid default null)
returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders;before jsonb;
begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'override_reason_required';end if;
 if p_status not in('pending','confirmed','processing','completed','cancelled') then raise exception 'invalid_order_status';end if;
 if p_fulfillment not in('unfulfilled','preparing','packed','shipped','delivered','returned','cancelled') then raise exception 'invalid_fulfillment_status';end if;
 select * into o from public.orders where id=p_order and tenant_id=p_tenant for update;if o.id is null then raise exception 'order_not_found';end if;
 before:=jsonb_build_object('status',o.status,'fulfillment_status',o.fulfillment_status,'cancelled_at',o.cancelled_at,'completed_at',o.completed_at);
 update public.orders set status=p_status,fulfillment_status=p_fulfillment,
 cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,now()) else null end,
 completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,updated_at=now() where id=o.id returning * into o;
 insert into public.order_status_history(tenant_id,order_id,from_status,to_status,from_fulfillment_status,to_fulfillment_status,note,actor_user_id)
 values(p_tenant,p_order,before->>'status',p_status,before->>'fulfillment_status',p_fulfillment,'MANUAL OVERRIDE: '||left(trim(p_reason),900),p_actor);
 insert into public.order_manual_overrides(tenant_id,order_id,override_type,before_state,after_state,reason,actor_user_id)
 values(p_tenant,p_order,'order_state',before,jsonb_build_object('status',p_status,'fulfillment_status',p_fulfillment),left(trim(p_reason),1000),p_actor);
 return o;
end$$;
revoke all on function public.manual_override_order_state(uuid,uuid,text,text,text,uuid) from public,anon;grant execute on function public.manual_override_order_state(uuid,uuid,text,text,text,uuid) to authenticated;

create or replace function public.manual_override_payment_status(p_tenant uuid,p_order uuid,p_payment_status text,p_reason text,p_actor uuid default null)
returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders;before jsonb;
begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;if length(trim(coalesce(p_reason,'')))<5 then raise exception 'override_reason_required';end if;
 if p_payment_status not in('unpaid','pending','authorized','paid','failed','refunded','partially_refunded','cancelled') then raise exception 'invalid_payment_status';end if;
 select * into o from public.orders where id=p_order and tenant_id=p_tenant for update;if o.id is null then raise exception 'order_not_found';end if;before:=jsonb_build_object('payment_status',o.payment_status);
 update public.orders set payment_status=p_payment_status,updated_at=now() where id=o.id returning * into o;
 insert into public.order_manual_overrides(tenant_id,order_id,override_type,before_state,after_state,reason,actor_user_id) values(p_tenant,p_order,'payment_status',before,jsonb_build_object('payment_status',p_payment_status),left(trim(p_reason),1000),p_actor);
 return o;
end$$;
revoke all on function public.manual_override_payment_status(uuid,uuid,text,text,uuid) from public,anon;grant execute on function public.manual_override_payment_status(uuid,uuid,text,text,uuid) to authenticated;
-- Manual payment status is an administrative override only. It never creates/edits provider verification records and must remain visibly distinguishable in audit history.
