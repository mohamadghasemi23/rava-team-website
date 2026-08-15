-- Every mutable commercial number must remain configurable and historically traceable.
create table if not exists public.commerce_config_revisions(
 id bigserial primary key,tenant_id uuid not null references public.tenants(id) on delete cascade,entity_type text not null,entity_id text not null,operation text not null check(operation in('insert','update','delete')),before_data jsonb,after_data jsonb,changed_at timestamptz not null default now(),changed_by uuid references auth.users(id) on delete set null
);
create index if not exists commerce_config_revisions_lookup on public.commerce_config_revisions(tenant_id,entity_type,entity_id,changed_at desc);
alter table public.commerce_config_revisions enable row level security;
create policy commerce_config_revisions_admin_read on public.commerce_config_revisions for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.capture_commerce_config_revision() returns trigger language plpgsql security definer set search_path=public as $$
declare t uuid;eid text;begin
 t:=coalesce(new.tenant_id,old.tenant_id);eid:=coalesce(new.id::text,old.id::text,t::text);
 insert into public.commerce_config_revisions(tenant_id,entity_type,entity_id,operation,before_data,after_data,changed_by)
 values(t,tg_table_name,eid,lower(tg_op),case when tg_op in('UPDATE','DELETE') then to_jsonb(old) else null end,case when tg_op in('INSERT','UPDATE') then to_jsonb(new) else null end,auth.uid());return coalesce(new,old);end$$;

do $$begin
 if not exists(select 1 from pg_trigger where tgname='tax_settings_revision')then create trigger tax_settings_revision after insert or update or delete on public.tax_settings for each row execute function public.capture_commerce_config_revision();end if;
 if not exists(select 1 from pg_trigger where tgname='shipping_settings_revision')then create trigger shipping_settings_revision after insert or update or delete on public.shipping_settings for each row execute function public.capture_commerce_config_revision();end if;
 if not exists(select 1 from pg_trigger where tgname='shipping_methods_revision')then create trigger shipping_methods_revision after insert or update or delete on public.shipping_methods for each row execute function public.capture_commerce_config_revision();end if;
 if not exists(select 1 from pg_trigger where tgname='promotions_revision')then create trigger promotions_revision after insert or update or delete on public.promotions for each row execute function public.capture_commerce_config_revision();end if;
end$$;

-- Historical orders already persist their calculated shipping/tax/discount values and metadata snapshots; changing today's settings must not rewrite past orders.
