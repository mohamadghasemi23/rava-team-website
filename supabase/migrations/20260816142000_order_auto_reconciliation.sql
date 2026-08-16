-- RAVA automatic order reconciliation. Normal flows automate safe bookkeeping; manual overrides remain available for exceptions.
create table if not exists public.order_reconciliation_events(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete restrict,
 order_id uuid not null references public.orders(id) on delete restrict,event_type text not null,payload jsonb not null default '{}'::jsonb,
 actor_user_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
create index if not exists order_reconciliation_events_idx on public.order_reconciliation_events(tenant_id,order_id,created_at desc);
alter table public.order_reconciliation_events enable row level security;
create policy order_reconciliation_events_admin on public.order_reconciliation_events for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.transition_order_state_v2(p_tenant uuid,p_order uuid,p_status text,p_fulfillment text,p_note text default null,p_actor uuid default null) returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders;old_status text;old_fulfillment text;released_count int:=0;cancelled_shipments int:=0;successful_refunds numeric(20,4):=0;open_refunds numeric(20,4):=0;refund_due numeric(20,4):=0;
begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;
 select * into o from public.orders where id=p_order and tenant_id=p_tenant for update;if o.id is null then raise exception 'order_not_found';end if;
 old_status:=o.status;old_fulfillment:=o.fulfillment_status;
 if p_status not in('pending','confirmed','processing','completed','cancelled') then raise exception 'invalid_order_status';end if;
 if p_fulfillment not in('unfulfilled','preparing','packed','shipped','delivered','returned','cancelled') then raise exception 'invalid_fulfillment_status';end if;
 if old_status='cancelled' and p_status<>'cancelled' then raise exception 'cancelled_order_is_terminal';end if;
 if old_status='completed' and p_status<>'completed' then raise exception 'completed_order_is_terminal';end if;
 if p_fulfillment in('shipped','delivered') and o.payment_status not in('paid','authorized','partially_refunded') then raise exception 'cannot_ship_unpaid_order';end if;
 if p_status='cancelled' and old_fulfillment in('shipped','delivered') then raise exception 'cancel_after_shipment_requires_override';end if;

 if p_status='cancelled' and old_status<>'cancelled' then
  update public.order_inventory_reservations set status='released',updated_at=now() where tenant_id=p_tenant and order_id=p_order and status='active';get diagnostics released_count=row_count;
  update public.order_shipments set status='cancelled',updated_at=now() where tenant_id=p_tenant and order_id=p_order and status in('preparing','packed');get diagnostics cancelled_shipments=row_count;
  if o.payment_status in('paid','partially_refunded') then
   select coalesce(sum(amount),0) into successful_refunds from public.order_refund_reconciliations where tenant_id=p_tenant and order_id=p_order and status='succeeded';
   select coalesce(sum(amount),0) into open_refunds from public.order_refund_reconciliations where tenant_id=p_tenant and order_id=p_order and status in('planned','requested','processing');
   refund_due:=greatest(o.grand_total-successful_refunds-open_refunds,0);
   if refund_due>0 then
    insert into public.order_refund_reconciliations(tenant_id,order_id,source,status,amount,currency,note,actor_user_id) values(p_tenant,p_order,'manual','planned',refund_due,o.currency,'Auto-created after order cancellation. Financial transfer still requires an approved refund path.',p_actor);
   end if;
  end if;
 end if;

 update public.orders set status=p_status,fulfillment_status=p_fulfillment,cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,now()) else cancelled_at end,completed_at=case when p_status='completed' then coalesce(completed_at,now()) else completed_at end,updated_at=now() where id=p_order returning * into o;
 insert into public.order_status_history(tenant_id,order_id,from_status,to_status,from_fulfillment_status,to_fulfillment_status,note,actor_user_id) values(p_tenant,p_order,old_status,p_status,old_fulfillment,p_fulfillment,left(nullif(trim(p_note),''),1000),p_actor);
 insert into public.order_reconciliation_events(tenant_id,order_id,event_type,payload,actor_user_id) values(p_tenant,p_order,case when p_status='cancelled' then 'order.cancelled_reconciled' else 'order.transitioned' end,jsonb_build_object('released_reservations',released_count,'cancelled_shipments',cancelled_shipments,'refund_due',refund_due,'from_status',old_status,'to_status',p_status,'from_fulfillment',old_fulfillment,'to_fulfillment',p_fulfillment),p_actor);
 return o;
end$$;
revoke all on function public.transition_order_state_v2(uuid,uuid,text,text,text,uuid) from public,anon;grant execute on function public.transition_order_state_v2(uuid,uuid,text,text,text,uuid) to authenticated;

create or replace function public.update_shipment_and_reconcile_order(p_tenant uuid,p_shipment uuid,p_carrier text,p_tracking text,p_url text,p_status text,p_actor uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare s public.order_shipments;o public.orders;open_count int;shipped_count int;delivered_count int;total_count int;new_fulfillment text;new_status text;
begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;
 if p_status not in('preparing','packed','shipped','delivered','returned','cancelled') then raise exception 'invalid_shipment_status';end if;
 select * into s from public.order_shipments where id=p_shipment and tenant_id=p_tenant for update;if s.id is null then raise exception 'shipment_not_found';end if;
 select * into o from public.orders where id=s.order_id and tenant_id=p_tenant for update;if o.id is null then raise exception 'order_not_found';end if;
 if p_status in('shipped','delivered') and o.payment_status not in('paid','authorized','partially_refunded') then raise exception 'cannot_ship_unpaid_order';end if;
 update public.order_shipments set carrier=left(trim(p_carrier),100),tracking_code=nullif(left(trim(coalesce(p_tracking,'')),200),''),tracking_url=nullif(left(trim(coalesce(p_url,'')),500),''),status=p_status,shipped_at=case when p_status='shipped' then coalesce(shipped_at,now()) else shipped_at end,delivered_at=case when p_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,updated_at=now() where id=s.id;
 select count(*),count(*) filter(where status in('preparing','packed')),count(*) filter(where status='shipped'),count(*) filter(where status='delivered') into total_count,open_count,shipped_count,delivered_count from public.order_shipments where tenant_id=p_tenant and order_id=o.id and status<>'cancelled';
 if total_count>0 and delivered_count=total_count then new_fulfillment:='delivered';new_status:='completed';
 elsif delivered_count>0 or shipped_count>0 then new_fulfillment:='shipped';new_status:=case when o.status='confirmed' then 'processing' else o.status end;
 elsif open_count>0 then new_fulfillment:=case when exists(select 1 from public.order_shipments where tenant_id=p_tenant and order_id=o.id and status='packed') then 'packed' else 'preparing' end;new_status:=case when o.status='confirmed' then 'processing' else o.status end;
 else new_fulfillment:=o.fulfillment_status;new_status:=o.status;end if;
 if new_fulfillment<>o.fulfillment_status or new_status<>o.status then
  update public.orders set fulfillment_status=new_fulfillment,status=new_status,completed_at=case when new_status='completed' then coalesce(completed_at,now()) else completed_at end,updated_at=now() where id=o.id;
  insert into public.order_status_history(tenant_id,order_id,from_status,to_status,from_fulfillment_status,to_fulfillment_status,note,actor_user_id) values(p_tenant,o.id,o.status,new_status,o.fulfillment_status,new_fulfillment,'Auto-reconciled from shipment status.',p_actor);
 end if;
 insert into public.order_reconciliation_events(tenant_id,order_id,event_type,payload,actor_user_id) values(p_tenant,o.id,'shipment.reconciled',jsonb_build_object('shipment_id',s.id,'shipment_status',p_status,'order_status',new_status,'fulfillment_status',new_fulfillment),p_actor);
end$$;
revoke all on function public.update_shipment_and_reconcile_order(uuid,uuid,text,text,text,text,uuid) from public,anon;grant execute on function public.update_shipment_and_reconcile_order(uuid,uuid,text,text,text,text,uuid) to authenticated;
