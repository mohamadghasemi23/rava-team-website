-- Fix PL/pgSQL variable/column ambiguity in contact rate-limit upsert.

create or replace function public.submit_contact_lead(
  p_name text,
  p_email text,
  p_phone text,
  p_service_interest text,
  p_message text,
  p_source_path text,
  p_company_website text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  gateway_token text := coalesce(headers->>'x-rava-gateway-token','');
  client_key text := coalesce(headers->>'x-rava-client-key','');
  expected_hash text;
  v_window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  next_count integer;
  clean_name text := left(trim(coalesce(p_name,'')),120);
  clean_email text := lower(left(trim(coalesce(p_email,'')),240));
  clean_phone text := left(trim(coalesce(p_phone,'')),80);
  clean_message text := left(trim(coalesce(p_message,'')),5000);
  clean_service text := left(trim(coalesce(p_service_interest,'')),80);
  clean_source text := left(trim(coalesce(p_source_path,'/contact')),300);
begin
  select token_hash into expected_hash from private.contact_gateway_config where singleton=true;
  if gateway_token='' or expected_hash is null or encode(extensions.digest(gateway_token,'sha256'),'hex') <> expected_hash then
    raise insufficient_privilege using message='Contact gateway denied';
  end if;
  if client_key !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='Invalid contact client key';
  end if;

  if left(trim(coalesce(p_company_website,'')),200) <> '' then
    return jsonb_build_object('ok',true,'message','پیام شما دریافت شد.');
  end if;

  if length(clean_name)<2 or length(clean_message)<10 then
    return jsonb_build_object('ok',false,'code','validation','message','نام و توضیح پروژه را کامل‌تر وارد کنید.');
  end if;
  if clean_email='' and clean_phone='' then
    return jsonb_build_object('ok',false,'code','validation','message','حداقل ایمیل یا شماره تماس را وارد کنید.');
  end if;
  if clean_email<>'' and clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok',false,'code','validation','message','فرمت ایمیل صحیح نیست.');
  end if;
  if clean_service not in ('web-design','ecommerce','digital-product','brand-content','ai-automation','other') then
    clean_service := 'other';
  end if;

  insert into public.public_rate_limits(bucket,bucket_key,window_start,request_count)
  values('contact',client_key,v_window_start,1)
  on conflict(bucket,bucket_key,window_start) do update
    set request_count=public.public_rate_limits.request_count+1
  returning request_count into next_count;

  if next_count > 5 then
    return jsonb_build_object('ok',false,'code','rate_limit','message','تعداد درخواست‌ها زیاد بوده. چند دقیقه بعد دوباره تلاش کنید.');
  end if;

  insert into public.leads(name,email,phone,service_interest,message,source_path,status)
  values(clean_name,nullif(clean_email,''),nullif(clean_phone,''),clean_service,clean_message,coalesce(nullif(clean_source,''),'/contact'),'new');

  return jsonb_build_object('ok',true,'message','پیام شما دریافت شد. با شما در ارتباط خواهیم بود.');
end;
$$;

revoke all on function public.submit_contact_lead(text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_contact_lead(text,text,text,text,text,text,text) to anon, authenticated;
