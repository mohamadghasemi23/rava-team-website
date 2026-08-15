create or replace function public.commit_verified_payment(p_transaction uuid,p_provider_reference text,p_provider_status text,p_verified_at timestamptz default now()) returns void language plpgsql security definer set search_path=public as $$
declare t public.payment_transactions%rowtype;o public.orders%rowtype;
begin
 select * into t from public.payment_transactions where id=p_transaction for update;if not found then raise exception 'transaction_not_found';end if;
 if t.status='paid' then return;end if;if t.status not in('created','redirected','callback_received','verifying') then raise exception 'invalid_payment_state';end if;
 select * into o from public.orders where id=t.order_id and tenant_id=t.tenant_id for update;if not found then raise exception 'order_not_found';end if;
 if o.payment_status='paid' then update public.payment_transactions set status='paid',provider_reference=coalesce(provider_reference,p_provider_reference),provider_status=p_provider_status,verified_at=coalesce(verified_at,p_verified_at),updated_at=now() where id=t.id;return;end if;
 if round(o.grand_total)::bigint<>t.amount or o.currency<>t.currency then raise exception 'payment_amount_mismatch';end if;
 update public.payment_transactions set status='paid',provider_reference=p_provider_reference,provider_status=p_provider_status,verified_at=p_verified_at,updated_at=now() where id=t.id;
 update public.orders set payment_status='paid',status=case when status='pending' then 'confirmed' else status end,updated_at=now() where id=o.id;
 insert into public.payment_events(tenant_id,transaction_id,event_type,payload) values(t.tenant_id,t.id,'payment.verified',jsonb_build_object('order_id',o.id,'amount',t.amount,'currency',t.currency));
end$$;
revoke all on function public.commit_verified_payment(uuid,text,text,timestamptz) from public;
-- Intentionally no anon/authenticated execute grant. Trusted service-role payment orchestration invokes this function after provider verification.
