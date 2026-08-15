-- International shipping needs an address-country signal. Keep it optional/disabled until the tenant enables it.
insert into public.checkout_fields(tenant_id,field_key,field_type,label_fa,label_en,required,enabled,sort_order,max_length,validation_rule)
select id,'country_code','text','کشور (کد دوحرفی)','Country code',false,false,35,2,'plain' from public.tenants
on conflict(tenant_id,field_key) do nothing;
