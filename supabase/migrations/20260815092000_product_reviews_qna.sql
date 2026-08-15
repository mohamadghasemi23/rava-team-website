-- RAVA Reviews, Ratings & Product Q&A
create table if not exists public.review_dimension_definitions(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 category_id uuid references public.product_categories(id) on delete cascade,
 key text not null, label_fa text not null, label_en text not null, enabled boolean not null default true, sort_order int not null default 0,
 created_at timestamptz not null default now(), unique(tenant_id,category_id,key)
);
create table if not exists public.product_reviews(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade, order_id uuid references public.orders(id) on delete set null,
 reviewer_user_id uuid references auth.users(id) on delete set null, reviewer_name text not null, reviewer_email_hash text,
 rating smallint not null check(rating between 1 and 5), title text not null default '', body text not null default '',
 dimension_scores jsonb not null default '{}'::jsonb, media jsonb not null default '[]'::jsonb,
 verified_purchase boolean not null default false,
 status text not null default 'pending' check(status in('pending','published','hidden','rejected','deleted','spam')),
 helpful_count int not null default 0, report_count int not null default 0,
 moderation_reason text, merchant_reply text, merchant_replied_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz,
 deleted_at timestamptz
);
create unique index if not exists product_reviews_verified_order_product_uq on public.product_reviews(order_id,product_id) where order_id is not null and status<>'deleted';
create index if not exists product_reviews_product_status_idx on public.product_reviews(tenant_id,product_id,status,created_at desc);
create table if not exists public.review_helpful_votes(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 review_id uuid not null references public.product_reviews(id) on delete cascade,
 voter_key_hash text not null, created_at timestamptz not null default now(), unique(review_id,voter_key_hash)
);
create table if not exists public.review_reports(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 review_id uuid not null references public.product_reviews(id) on delete cascade,
 reporter_key_hash text not null, reason text not null default 'other', details text not null default '', created_at timestamptz not null default now(),
 unique(review_id,reporter_key_hash)
);
create table if not exists public.product_questions(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 asker_user_id uuid references auth.users(id) on delete set null, asker_name text not null, question text not null,
 verified_purchase boolean not null default false,
 status text not null default 'pending' check(status in('pending','published','hidden','rejected','deleted','spam')),
 helpful_count int not null default 0, report_count int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz, deleted_at timestamptz
);
create table if not exists public.product_answers(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 question_id uuid not null references public.product_questions(id) on delete cascade,
 author_user_id uuid references auth.users(id) on delete set null, author_name text not null, answer text not null,
 author_type text not null default 'customer' check(author_type in('merchant','customer','staff')),
 verified_purchase boolean not null default false,
 status text not null default 'pending' check(status in('pending','published','hidden','rejected','deleted','spam')),
 helpful_count int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz
);
create table if not exists public.review_insight_snapshots(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 product_id uuid references public.products(id) on delete cascade,
 period_start date not null, period_end date not null,
 average_rating numeric(4,2), review_count int not null default 0, rating_distribution jsonb not null default '{}'::jsonb,
 themes_positive jsonb not null default '[]'::jsonb, themes_negative jsonb not null default '[]'::jsonb,
 ai_summary text, generated_at timestamptz not null default now()
);

alter table public.review_dimension_definitions enable row level security;
alter table public.product_reviews enable row level security;
alter table public.review_helpful_votes enable row level security;
alter table public.review_reports enable row level security;
alter table public.product_questions enable row level security;
alter table public.product_answers enable row level security;
alter table public.review_insight_snapshots enable row level security;
create policy review_dimensions_manage on public.review_dimension_definitions for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy product_reviews_admin_read on public.product_reviews for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy questions_admin_read on public.product_questions for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy answers_admin_read on public.product_answers for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy review_insights_admin_read on public.review_insight_snapshots for select to authenticated using(public.can_access_tenant(tenant_id,null));
-- Public review/question writes are intentionally not exposed directly. They go through trusted server handlers with validation, anti-spam and rate limits.
