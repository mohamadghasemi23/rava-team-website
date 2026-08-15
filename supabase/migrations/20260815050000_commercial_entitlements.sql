-- RAVA commercial entitlements: contract/service purchases control premium capability access.
create table if not exists public.feature_catalog(
 key text primary key, label_fa text not null, label_en text not null, category text not null,
 commercial boolean not null default true, description_fa text not null default '', description_en text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.tenant_entitlements(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 feature_key text not null references public.feature_catalog(key) on delete restrict,
 status text not null default 'active' check(status in('active','trial','expired','suspended')),
 source text not null default 'contract' check(source in('contract','plan','manual','trial')),
 contract_ref text, starts_at timestamptz, ends_at timestamptz, limits jsonb not null default '{}'::jsonb,
 granted_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,feature_key)
);
insert into public.feature_catalog(key,label_fa,label_en,category,commercial) values
 ('theme.premium','قالب‌های پریمیوم','Premium themes','theme',true),
 ('theme.commerce','قالب‌های فروشگاهی','Commerce themes','theme',true),
 ('commerce.core','فروشگاه','Commerce','commerce',true),
 ('commerce.marketplace','مارکت‌پلیس','Marketplace','commerce',true),
 ('portfolio.video','پورتفولیو ویدیویی','Video portfolio','content',true),
 ('analytics.advanced','آمار پیشرفته','Advanced analytics','analytics',true),
 ('seo.managed','سئو مدیریت‌شده','Managed SEO','seo',true),
 ('seo.ai','هوش مصنوعی سئو','AI SEO','seo',true),
 ('ai.platform','ابزارهای هوش مصنوعی','AI tools','ai',true)
on conflict(key) do update set label_fa=excluded.label_fa,label_en=excluded.label_en,category=excluded.category,commercial=excluded.commercial;

alter table public.feature_catalog enable row level security;
alter table public.tenant_entitlements enable row level security;
create policy feature_catalog_authenticated_read on public.feature_catalog for select to authenticated using(true);
create policy tenant_entitlements_scoped_read on public.tenant_entitlements for select to authenticated using(public.can_access_tenant(tenant_id,null));
-- No authenticated INSERT/UPDATE/DELETE policy is intentionally created. Commercial grants are changed only by trusted platform-owner server paths.

create or replace function public.has_entitlement(p_tenant uuid,p_feature text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.tenant_entitlements e where e.tenant_id=p_tenant and e.feature_key=p_feature and e.status in('active','trial') and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now()));
$$;
revoke all on function public.has_entitlement(uuid,text) from public;
grant execute on function public.has_entitlement(uuid,text) to authenticated;
create index if not exists tenant_entitlements_lookup_idx on public.tenant_entitlements(tenant_id,feature_key,status);
