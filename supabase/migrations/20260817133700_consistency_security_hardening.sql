-- RAVA consistency + security hardening pass.
-- Code-only migration. Not applied to production by this PR.
-- Every feature must ship with tenant-safe observability, permission-aware bilingual help,
-- contextual bindings and secure-by-default data access.

create or replace function private.actor_can_observe_scope(
  p_organization_id uuid,
  p_site_id uuid
) returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_site_org uuid;
begin
  if v_user is null then return false; end if;

  if exists(select 1 from public.profiles p where p.id=v_user and p.active and p.role='super_admin') then
    return true;
  end if;

  if p_site_id is not null then
    select organization_id into v_site_org from public.sites where id=p_site_id;
    if v_site_org is null then return false; end if;
    if p_organization_id is not null and p_organization_id<>v_site_org then return false; end if;
  else
    v_site_org:=p_organization_id;
  end if;

  if v_site_org is null then
    return exists(
      select 1 from public.memberships m
      where m.user_id=v_user and m.status='active' and m.scope_type='platform'
    );
  end if;

  return exists(
    select 1 from public.memberships m
    where m.user_id=v_user and m.status='active'
      and (
        m.scope_type='platform'
        or (m.scope_type='organization' and m.organization_id=v_site_org)
        or (m.scope_type='site' and p_site_id is not null and m.site_id=p_site_id)
      )
  );
end;
$$;

revoke all on function private.actor_can_observe_scope(uuid,uuid) from public,anon;
grant execute on function private.actor_can_observe_scope(uuid,uuid) to authenticated;

create or replace function public.record_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_context jsonb default '{}'::jsonb,
  p_request_id uuid default null,
  p_correlation_id uuid default null,
  p_severity text default 'info'
) returns bigint
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_actor uuid:=auth.uid(); v_id bigint;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.actor_can_observe_scope(p_organization_id,p_site_id) then raise exception 'observability scope denied'; end if;
  if p_action is null or p_action !~ '^[a-z0-9_.:-]{2,120}$' then raise exception 'invalid audit action'; end if;
  if p_entity_type is null or p_entity_type !~ '^[a-z0-9_.:-]{2,80}$' then raise exception 'invalid entity type'; end if;
  if p_severity not in ('debug','info','notice','warning','error','critical') then raise exception 'invalid severity'; end if;
  if jsonb_typeof(coalesce(p_context,'{}'::jsonb))<>'object' or octet_length(coalesce(p_context,'{}'::jsonb)::text)>32768 then raise exception 'invalid context'; end if;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_data,after_data,organization_id,site_id,request_id,correlation_id,severity,context)
  values(v_actor,p_action,p_entity_type,left(p_entity_id,300),p_before_data,p_after_data,p_organization_id,p_site_id,p_request_id,p_correlation_id,p_severity,coalesce(p_context,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_error_event(
  p_category text,
  p_event_type text,
  p_public_message text,
  p_technical_message text default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_route text default null,
  p_context jsonb default '{}'::jsonb,
  p_request_id uuid default null,
  p_correlation_id uuid default null,
  p_severity public.log_severity default 'error',
  p_explanation_fa text default null,
  p_explanation_en text default null,
  p_probable_causes jsonb default '[]'::jsonb,
  p_fingerprint text default null
) returns table(id bigint,error_id uuid)
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.actor_can_observe_scope(p_organization_id,p_site_id) then raise exception 'observability scope denied'; end if;
  if p_category is null or p_category !~ '^[a-z0-9_.:-]{2,80}$' then raise exception 'invalid error category'; end if;
  if p_event_type is null or p_event_type !~ '^[a-z0-9_.:-]{2,120}$' then raise exception 'invalid error event type'; end if;
  if p_route is not null and length(p_route)>512 then raise exception 'invalid route'; end if;
  if jsonb_typeof(coalesce(p_context,'{}'::jsonb))<>'object' or octet_length(coalesce(p_context,'{}'::jsonb)::text)>32768 then raise exception 'invalid context'; end if;
  if jsonb_typeof(coalesce(p_probable_causes,'[]'::jsonb))<>'array' then raise exception 'invalid probable causes'; end if;

  return query
  insert into public.error_logs(organization_id,site_id,actor_id,category,event_type,severity,route,request_id,correlation_id,public_message,technical_message,explanation_fa,explanation_en,probable_causes,context,fingerprint)
  values(p_organization_id,p_site_id,v_actor,p_category,p_event_type,p_severity,p_route,p_request_id,p_correlation_id,left(coalesce(p_public_message,'خطایی رخ داده است.'),600),left(p_technical_message,4000),left(p_explanation_fa,2000),left(p_explanation_en,2000),coalesce(p_probable_causes,'[]'::jsonb),coalesce(p_context,'{}'::jsonb),left(p_fingerprint,128))
  returning error_logs.id,error_logs.error_id;
end;
$$;

create or replace function public.record_security_event(
  p_event_type text,
  p_outcome text default 'success',
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_route text default null,
  p_subject_type text default null,
  p_subject_id text default null,
  p_context jsonb default '{}'::jsonb,
  p_request_id uuid default null,
  p_correlation_id uuid default null,
  p_severity public.log_severity default 'notice'
) returns bigint
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_actor uuid:=auth.uid(); v_id bigint;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.actor_can_observe_scope(p_organization_id,p_site_id) then raise exception 'observability scope denied'; end if;
  if p_event_type is null or p_event_type !~ '^[a-z0-9_.:-]{2,120}$' then raise exception 'invalid security event type'; end if;
  if p_outcome not in ('success','failure','blocked','challenged') then raise exception 'invalid security outcome'; end if;
  if p_route is not null and length(p_route)>512 then raise exception 'invalid route'; end if;
  if jsonb_typeof(coalesce(p_context,'{}'::jsonb))<>'object' or octet_length(coalesce(p_context,'{}'::jsonb)::text)>32768 then raise exception 'invalid context'; end if;

  insert into public.security_events(organization_id,site_id,actor_id,event_type,severity,outcome,route,request_id,correlation_id,subject_type,subject_id,context)
  values(p_organization_id,p_site_id,v_actor,p_event_type,p_severity,p_outcome,p_route,p_request_id,p_correlation_id,left(p_subject_type,120),left(p_subject_id,300),coalesce(p_context,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- Bilingual contextual help for all major platform areas implemented after the initial Help engine.
-- Every topic has a minimum permission so help for sensitive operations is not exposed by route alone.

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('platform.design.manage','design','design.engine','design.manage','published','design','admin',true,7,30)
  on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','مدیریت قالب، Draft و Release','قالب را اعمال کن، Revision بساز، Preview کن و با تاریخچه امن Publish یا Rollback انجام بده.','هر تغییر طراحی ابتدا Draft است. Publish یک Snapshot جدید و قابل ردیابی می‌سازد و Rollback نیز تاریخچه را پاک نمی‌کند؛ یک Release جدید از Snapshot قبلی ایجاد می‌کند.',
'["قالب و نسخه مناسب را انتخاب کن.","Theme و Layout را در Draft ویرایش و ذخیره کن.","قبل از انتشار نتیجه را بازبینی کن.","با دسترسی Publish، Release جدید بساز.","برای بازگشت از Rollback استفاده کن؛ تاریخچه حذف نمی‌شود."]'::jsonb,
'["تغییر مستقیم Production خارج از Release flow مجاز نیست.","قالب Premium فقط با Entitlement معتبر قابل استفاده است."]'::jsonb,
array['قالب','طراحی','draft','release','publish','rollback'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Manage templates, drafts and releases','Apply templates, create revisions, preview changes and publish or roll back through an auditable release history.','Design changes remain drafts until published. Publishing creates an immutable snapshot; rollback creates a new release from a previous snapshot instead of erasing history.',
'["Choose the appropriate template version.","Edit and save Theme and Layout as a draft revision.","Review the result before publishing.","Use Publish permission to create a new release.","Use Rollback to restore a previous snapshot without deleting history."]'::jsonb,
'["Do not bypass the release flow for Production changes.","Premium templates require a valid entitlement."]'::jsonb,
array['template','design','draft','release','publish','rollback'] from public.help_topics where key='platform.design.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/sites/:siteId/design','design-engine',10 from public.help_topics where key='platform.design.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('platform.billing.manage','security','billing.contracts','billing.view','published','billing','admin',true,9,40)
  on conflict(key) do update set minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','قرارداد، Entitlement و Billing','پلن، قرارداد، Add-on، مصرف، Invoice و Payment را بدون مخلوط‌کردن مسئولیت‌ها مدیریت کن.','Plan، Contract، Entitlement، Usage و Invoice موجودیت‌های مستقل‌اند. فعال‌سازی قرارداد Entitlementهای سایت را Sync می‌کند و Meterها برای مصرف‌های متغیر Limit و قیمت دارند.',
'["سازمان و سایت‌های قرارداد را مشخص کن.","پلن و مبلغ پایه را انتخاب کن.","Entitlement و Add-onهای اختصاصی را تنظیم کن.","Meter و Soft/Hard Limit را تعریف کن.","Invoice را برای دوره مشخص صادر کن.","پرداخت تأییدشده را ثبت و وضعیت Invoice را کنترل کن."]'::jsonb,
'["امنیت پایه هرگز به‌عنوان قابلیت پولی غیرفعال نمی‌شود.","ثبت پرداخت دستی به معنی اتصال درگاه واقعی نیست."]'::jsonb,
array['قرارداد','صورتحساب','billing','entitlement','invoice','payment','usage'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Contracts, entitlements and billing','Manage plans, contracts, add-ons, usage, invoices and payments as separate commercial concerns.','Plan, Contract, Entitlement, Usage and Invoice remain separate entities. Activating a contract synchronizes site entitlements, while meters define variable-usage limits and pricing.',
'["Choose the organization and contracted sites.","Select a plan and base amount.","Configure contract-specific entitlements and add-ons.","Define meters and soft/hard limits.","Issue an invoice for a defined period.","Record verified payments and review invoice state."]'::jsonb,
'["Baseline security is never disabled as a paid feature.","Manual payment recording is not a live payment-gateway integration."]'::jsonb,
array['contract','billing','entitlement','invoice','payment','usage'] from public.help_topics where key='platform.billing.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/billing*','billing',10 from public.help_topics where key='platform.billing.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('platform.entitlement.runtime','security','entitlement.runtime','modules.manage','published','billing','admin',false,6,45)
  on conflict(key) do update set minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','Enforcement امکانات و محدودیت مصرف','Permission و Entitlement هر دو باید اجازه بدهند؛ Hard Limit در Backend عملیات را متوقف می‌کند.','Runtime Gate فقط ظاهر پنل را محدود نمی‌کند. Server Action/API قبل از اجرای Feature، Permission و Entitlement را بررسی می‌کند و مصرف Metered به‌صورت اتمیک با Idempotency ثبت می‌شود.',
'["Entitlement ماژول را برای Site بررسی کن.","Permission عملیاتی کاربر را جداگانه بررسی کن.","برای Feature مصرفی از Meter و Idempotency Key استفاده کن.","Soft Limit را هشدار و Hard Limit را Block کن.","Blocked/Warning decision را در Enforcement Events نگه دار."]'::jsonb,
'["هیچ Feature پولی نباید فقط با مخفی‌کردن UI محافظت شود.","مسیر قدیمی یا مستقیم ثبت Usage نباید Runtime Gate را دور بزند."]'::jsonb,
array['entitlement','limit','مصرف','runtime','hard limit','soft limit'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Runtime feature and usage enforcement','Both permission and entitlement must allow access; hard limits block the operation in the backend.','The Runtime Gate protects more than the UI. Server actions and APIs verify permission plus entitlement before execution, and metered usage is recorded atomically with idempotency.',
'["Check the site module entitlement.","Check the actor operational permission independently.","Use a meter and idempotency key for consumable features.","Treat soft limits as warnings and hard limits as blockers.","Record blocked and warning decisions as enforcement events."]'::jsonb,
'["Never protect paid functionality by hiding UI only.","Legacy or direct usage writers must not bypass the Runtime Gate."]'::jsonb,
array['entitlement','runtime','usage','hard limit','soft limit'] from public.help_topics where key='platform.entitlement.runtime'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('commerce.core.manage','commerce','commerce.core','commerce.view','published','commerce','admin',true,10,50)
  on conflict(key) do update set minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','مدیریت Commerce Core','محصول، Variant/SKU، قیمت، موجودی و Draft Order را با Permission و Entitlement مستقل مدیریت کن.','Commerce یک ماژول Premium است. داده‌های محصول، قیمت، موجودی و سفارش Tenant-aware هستند و عملیات حساس از RPC تراکنشی، RLS و Runtime Entitlement Gate عبور می‌کنند.',
'["محصول و Variant/SKU را بساز.","قیمت و ارز را تنظیم کن.","موجودی را از Inventory Location مناسب تغییر بده.","برای تغییر موجودی از Adjustment تراکنشی استفاده کن.","Draft Order را با آیتم‌های معتبر بساز.","برای عملیات Refund از Permission جداگانه استفاده کن."]'::jsonb,
'["موجودی را با Update مستقیم جدول تغییر نده.","Commerce بدون Entitlement معتبر نباید در Backend قابل اجرا باشد.","Payment Gateway و Checkout عمومی هنوز Provider جدا می‌خواهند."]'::jsonb,
array['فروشگاه','محصول','sku','موجودی','سفارش','commerce','inventory'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Manage Commerce Core','Manage products, variants/SKUs, prices, inventory and draft orders with independent permissions and entitlements.','Commerce is a Premium module. Product, pricing, inventory and order data are tenant-aware, while sensitive operations run through transactional RPCs, RLS and the Runtime Entitlement Gate.',
'["Create the product and its variant/SKU.","Configure price and currency.","Adjust stock at the correct inventory location.","Use the transactional inventory adjustment flow.","Create draft orders only from valid items.","Keep Refund as a separate permission."]'::jsonb,
'["Do not mutate inventory with direct table updates.","Commerce must be blocked in the backend without a valid entitlement.","Live checkout and payment gateways require separate provider integrations."]'::jsonb,
array['commerce','product','sku','inventory','order'] from public.help_topics where key='commerce.core.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/sites/:siteId/commerce','commerce-core',10 from public.help_topics where key='commerce.core.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
