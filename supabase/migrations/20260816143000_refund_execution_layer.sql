-- Trusted refund execution metadata and atomic commit. Provider adapters execute externally; only this server path commits provider success.
alter table public.order_refunds add column if not exists payment_transaction_id uuid references public.payment_transactions(id) on delete restrict;
alter table public.order_refunds add column if not exists idempotency_key text;
alter table public.order_refunds add column if not exists failure_message text;
alter table public.order_refunds add column if not exists updated_at timestamptz not null default now();
create unique index if not exists order_refunds_idempotency_uq on public.order_refunds(tenant_id,idempotency_key) where idempotency_key is not null;
create or replace function public.commit_provider_refund(p_tenant uuid,p_refund uuid,p_provider_key text,p_provider_reference text,p_payment_transaction uuid,p_idempotency_key text) returns void language plpgsql security definer set search_path=public as $$
declare r public.order_refunds;o public.orders;paid numeric;refunded numeric;
begin
 if current_user not in ('postgres','service_role') then raise exception 'trusted_server_only';end if;
 select * into r from public.order_refunds where id=p_refund and tenant_id=p_tenant for update;if not found then raise exception 'refund_not_found';end if;
 if r.status='succeeded' then return;end if;
 if r.status<>'processing' then raise exception 'refund_not_processing';end if;
 if not exists(select 1 from public.payment_transactions where id=p_payment_transaction and tenant_id=p_tenant and order_id=r.order_id and provider_key=p_provider_key and status='paid' and provider_reference is not null) then raise exception 'unverified_payment_source';end if;
 select * into o from public.orders where id=r.order_id and tenant_id=p_tenant for update;
 select coalesce(sum(amount),0) into refunded from public.order_refunds where tenant_id=p_tenant and order_id=r.order_id and status='succeeded' and id<>r.id;
 paid:=o.grand_total;if refunded+r.amount>paid then raise exception 'refund_exceeds_order';end if;
 update public.order_refunds set status='succeeded',provider_key=p_provider_key,provider_reference=p_provider_reference,payment_transaction_id=p_payment_transaction,idempotency_key=p_idempotency_key,failure_message=null,processed_at=now(),updated_at=now() where id=r.id;
 refunded:=refunded+r.amount;
 update public.orders set payment_status=case when refunded>=grand_total then 'refunded' else 'partially_refunded' end,updated_at=now() where id=o.id;
 insert into public.event_logs(tenant_id,category,event_name,summary_fa,metadata) values(p_tenant,'audit','payment.refund.provider_succeeded','بازپرداخت واقعی توسط درگاه تأیید و ثبت شد.',jsonb_build_object('order_id',o.id,'refund_id',r.id,'amount',r.amount,'currency',r.currency,'provider',p_provider_key,'provider_reference',p_provider_reference));
end$$;
revoke all on function public.commit_provider_refund(uuid,uuid,text,text,uuid,text) from public,anon,authenticated;grant execute on function public.commit_provider_refund(uuid,uuid,text,text,uuid,text) to service_role;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('payment.refund.execution','اجرای واقعی Refund','وقتی درگاه فعال قابلیت Refund داشته باشد، Payment Engine می‌تواند بازپرداخت کامل یا جزئی را با شناسه یکتای تکرارناپذیر اجرا کند. نتیجه موفق فقط بعد از پاسخ معتبر Provider در سفارش ثبت می‌شود.','این عملیات پول واقعی جابه‌جا می‌کند. اجرای دوباره، مبلغ بیش از سفارش یا جعل موفقیت Provider باید توسط سرور مسدود شود.','Provider refund execution','When an enabled gateway supports refunds, the Payment Engine can execute a full or partial refund with an idempotency key. Success is committed to the order only after a valid provider result.','This operation moves real money. Duplicate execution, over-refunding and fabricated provider success must be blocked server-side.',true),
('payment.refund.unsupported','درگاه بدون Refund خودکار','اگر Provider یا Adapter قابلیت Refund نداشته باشد، سیستم انتقال پول را شبیه‌سازی نمی‌کند. مدیر می‌تواند فرآیند را دستی/خارج از سیستم انجام دهد و نتیجه را با برچسب صحیح ثبت کند.','Refund دستی را هرگز به‌عنوان Refund تأییدشده توسط Gateway ثبت نکن.','Gateway without automatic refunds','If the provider or adapter does not support refunds, the system does not simulate money movement. A manager may complete the process manually or externally and record it with the correct source.','Never label a manual refund as gateway-confirmed.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;
