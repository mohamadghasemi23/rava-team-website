-- Commerce Audit: reconcile the original commerce payment table with Payment Engine V1.
-- Keep monetary values as exact decimal major units; adapters convert to provider minor units when required.
alter table public.payment_transactions add column if not exists gateway_config_id uuid references public.payment_gateway_configs(id) on delete set null;
alter table public.payment_transactions add column if not exists provider_key text;
alter table public.payment_transactions add column if not exists attempt_no int not null default 1;
alter table public.payment_transactions add column if not exists provider_authority text;
alter table public.payment_transactions add column if not exists provider_reference text;
alter table public.payment_transactions add column if not exists provider_status text;
alter table public.payment_transactions add column if not exists request_fingerprint text;
alter table public.payment_transactions add column if not exists callback_fingerprint text;
alter table public.payment_transactions add column if not exists failure_code text;
alter table public.payment_transactions add column if not exists failure_message text;
alter table public.payment_transactions add column if not exists updated_at timestamptz not null default now();

-- The original schema called this column `provider`; preserve old data while making provider_key canonical.
update public.payment_transactions set provider_key=provider where provider_key is null and provider is not null;
alter table public.payment_transactions alter column provider drop not null;

-- Normalize legacy states before replacing the old status check.
update public.payment_transactions set status=case status
 when 'pending' then 'created'
 when 'authorized' then 'redirected'
 when 'succeeded' then 'paid'
 when 'voided' then 'cancelled'
 else status end
where status in('pending','authorized','succeeded','voided');

do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.payment_transactions'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%status%' loop
  execute format('alter table public.payment_transactions drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.payment_transactions add constraint payment_transactions_status_check check(status in('created','redirected','callback_received','verifying','paid','failed','cancelled','expired','refunded','partially_refunded'));
alter table public.payment_transactions add constraint payment_transactions_attempt_check check(attempt_no>0);
alter table public.payment_transactions alter column provider_key set not null;

-- Global money: 4 decimal places safely covers common ISO-4217 currencies and leaves room for providers with sub-cent accounting.
alter table public.payment_transactions alter column amount type numeric(20,4) using amount::numeric;
alter table public.payment_transactions add constraint payment_transactions_amount_nonnegative check(amount>=0);

create unique index if not exists payment_transactions_provider_reference_uq on public.payment_transactions(provider_key,provider_reference) where provider_reference is not null;
create index if not exists payment_tx_order_idx on public.payment_transactions(tenant_id,order_id,created_at desc);
create index if not exists payment_tx_status_idx on public.payment_transactions(tenant_id,status,created_at desc);

comment on column public.payment_transactions.amount is 'Exact major-unit amount. Never truncate decimals. Provider adapters perform currency-specific minor-unit conversion.';
