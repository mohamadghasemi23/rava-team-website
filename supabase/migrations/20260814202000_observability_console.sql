alter table public.system_events
  add column if not exists event_no bigint generated always as identity,
  add column if not exists summary_fa text,
  add column if not exists cause_fa text;

create unique index if not exists system_events_event_no_idx on public.system_events(event_no);
create index if not exists system_events_event_name_created_idx on public.system_events(event_name, created_at desc);
create index if not exists system_events_error_code_idx on public.system_events(error_code) where error_code is not null;

comment on column public.system_events.event_no is 'Short numeric support ID for searching events in the admin observability console.';
comment on column public.system_events.summary_fa is 'Safe Persian explanation of what happened.';
comment on column public.system_events.cause_fa is 'Safe Persian explanation of the likely/known cause. Never store secrets.';

create or replace function public.rava_audit_cms_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_action text := lower(tg_op);
  v_entity_id text;
  v_event_id text := 'EVT-' || gen_random_uuid()::text;
  v_before jsonb;
  v_after jsonb;
  v_summary text;
  v_cause text;
  v_changed_fields jsonb := '[]'::jsonb;
begin
  if tg_op = 'DELETE' then
    v_before := to_jsonb(old);
    v_entity_id := coalesce(v_before->>'id', v_before->>'key', 'unknown');
    select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into v_changed_fields from jsonb_object_keys(v_before) k;
    v_summary := format('یک رکورد از بخش %s حذف شد.', tg_table_name);
    v_cause := 'این رویداد در اثر عملیات حذف توسط یک کاربر مجاز یا فرایند مدیریتی ثبت شده است.';
  elsif tg_op = 'INSERT' then
    v_after := to_jsonb(new);
    v_entity_id := coalesce(v_after->>'id', v_after->>'key', 'unknown');
    select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into v_changed_fields from jsonb_object_keys(v_after) k;
    v_summary := format('یک رکورد جدید در بخش %s ایجاد شد.', tg_table_name);
    v_cause := 'این رویداد در اثر عملیات ایجاد اطلاعات جدید در پنل یا فرایند سیستم ثبت شده است.';
  else
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_entity_id := coalesce(v_after->>'id', v_after->>'key', 'unknown');
    select coalesce(jsonb_agg(k order by k), '[]'::jsonb)
      into v_changed_fields
      from jsonb_object_keys(v_after) k
      where (v_before -> k) is distinct from (v_after -> k);
    v_summary := format('اطلاعات یک رکورد در بخش %s ویرایش شد.', tg_table_name);
    v_cause := 'این رویداد در اثر ذخیره تغییرات روی اطلاعات موجود ثبت شده است.';
  end if;

  insert into public.system_events(
    event_id, category, severity, event_name, message, actor_user_id,
    source, metadata, summary_fa, cause_fa
  ) values (
    v_event_id, 'audit', 'info',
    'cms.' || tg_table_name || '.' || v_action,
    format('%s %s', tg_table_name, v_action),
    v_actor, 'database',
    jsonb_build_object(
      'entity_type', tg_table_name,
      'entity_id', v_entity_id,
      'operation', v_action,
      'changed_fields', v_changed_fields
    ),
    v_summary, v_cause
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.rava_audit_cms_change() from public;

-- Automatic audit coverage. New sensitive CMS tables must be added here as part of the mandatory security baseline.
do $$
declare
  t text;
begin
  foreach t in array array['profiles','pages','page_blocks','media_assets','projects','leads','site_settings']
  loop
    execute format('drop trigger if exists rava_audit_change on public.%I', t);
    execute format('create trigger rava_audit_change after insert or update or delete on public.%I for each row execute function public.rava_audit_cms_change()', t);
  end loop;
end $$;
