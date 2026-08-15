create table if not exists public.review_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 require_moderation boolean not null default true,
 allow_media boolean not null default true,
 allow_video boolean not null default true,
 allow_qna boolean not null default true,
 allow_customer_answers boolean not null default true,
 verified_purchase_only boolean not null default false,
 review_request_enabled boolean not null default true,
 review_request_delay_days int not null default 7 check(review_request_delay_days between 0 and 90),
 max_media_items int not null default 8 check(max_media_items between 0 and 12),
 ai_insights_enabled boolean not null default false,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.review_request_queue(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 customer_email text, customer_phone text,
 scheduled_for timestamptz not null, status text not null default 'scheduled' check(status in('scheduled','sent','cancelled','failed','reviewed')),
 attempts int not null default 0, last_error text, sent_at timestamptz, created_at timestamptz not null default now(),
 unique(order_id,product_id)
);
alter table public.review_settings enable row level security;alter table public.review_request_queue enable row level security;
create policy review_settings_manage on public.review_settings for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy review_requests_read on public.review_request_queue for select to authenticated using(public.can_access_tenant(tenant_id,null));
create index if not exists review_request_due_idx on public.review_request_queue(status,scheduled_for) where status='scheduled';
