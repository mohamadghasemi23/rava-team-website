-- A provider-verified payment is financial truth. Inventory conflicts must never erase a real payment.
create or replace function public.commit_verified_payment(p_transaction uuid,p_provider_reference text,p_provider_status text,p_verified_at timestamptz default now()) returns void language plpgsql security definer set search_path=public as $$
declare t public.payment_transactions%rowtype;o public.orders%rowtype;r record;v public.product_variants%rowtype;v_inventory_exception boolean:=false;v_reason text:='';
begin
 select * into t from public.payment_transactions where id=p_transaction for update;if not found then raise exception 'transaction_not_found';end if;
 if t.status='paid' then return;end if;if t.status not in('created','redirected','callback_received','verifying') then raise exception 'invalid_payment_state';end if;
 select * into o from public.orders where id=t.order_id and tenant_id=t.tenant_id for update;if not found then raise exception 'order_not_found';end if;
 if o.payment_status='paid' then update public.payment_transactions set status='paid',provider_reference=coalesce(provider_reference,p_provider_reference),provider_status=p_provider_status,verified_at=coalesce(verified_at,p_verified_at),updated_at=now() where id=t.id;return;end if;
 if o.grand_total<>t.amount or o.currency<>t.currency then raise exception 'payment_amount_mismatch';end if;
 for r in select * from order_inventory_reservations where order_id=o.id and tenant_id=o.tenant_id and status='active' order by variant_id for update loop
   select * into v from product_variants where id=r.variant_id and tenant_id=o.tenant_id for update;
   if not found then v_inventory_exception=true;v_reason='variant_missing';update order_inventory_reservations set status='released',updated_at=now() where id=r.id;continue;end if;
   if v.track_inventory and not v.allow_backorder and v.inventory_quantity<r.quantity then
     v_inventory_exception=true;v_reason='stock_changed_after_checkout';update order_inventory_reservations set status='released',updated_at=now() where id=r.id;continue;
   end if;
   if v.track_inventory then update product_variants set inventory_quantity=inventory_quantity-r.quantity,updated_at=now() where id=v.id and tenant_id=o.tenant_id;end if;
   update order_inventory_reservations set status='committed',updated_at=now() where id=r.id;
 end loop;
 update public.payment_transactions set status='paid',provider_reference=p_provider_reference,provider_status=p_provider_status,verified_at=p_verified_at,updated_at=now() where id=t.id;
 update public.orders set payment_status='paid',status=case when status='pending' then 'confirmed' else status end,paid_at=coalesce(paid_at,p_verified_at),metadata=case when v_inventory_exception then coalesce(metadata,'{}'::jsonb)||jsonb_build_object('inventory_exception',true,'inventory_exception_reason',v_reason,'inventory_exception_at',now()) else metadata end,updated_at=now() where id=o.id and tenant_id=o.tenant_id;
 insert into public.payment_events(tenant_id,transaction_id,event_type,payload) values(t.tenant_id,t.id,case when v_inventory_exception then 'payment.verified_inventory_exception' else 'payment.verified' end,jsonb_build_object('order_id',o.id,'amount',t.amount,'currency',t.currency,'inventory_exception',v_inventory_exception,'reason',nullif(v_reason,'')));
end$$;
revoke all on function public.commit_verified_payment(uuid,text,text,timestamptz) from public;
