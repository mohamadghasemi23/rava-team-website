import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { activateContractAction, issueInvoiceAction, recordPaymentAction, setMeterPriceAction, upsertEntitlementAction } from '../actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

type Contract={id:string;contract_number:string;organization_id:string;plan_id:string|null;status:string;billing_interval:string;currency:string;base_amount_minor:number;discount_percent:number;tax_percent:number;starts_at:string|null;ends_at:string|null;grace_until:string|null;auto_renew:boolean;organizations:{name:string;slug:string}|{name:string;slug:string}[]|null;plan_catalog:{name_fa:string;name_en:string;key:string}|{name_fa:string;name_en:string;key:string}[]|null}
type Site={id:string;name:string;slug:string}
type Module={key:string;name_fa:string;name_en:string;commercial_tier:string}
type Entitlement={id:string;site_id:string|null;module_key:string;enabled:boolean;tier:string;limits:Record<string,unknown>;config:Record<string,unknown>;source:string;starts_at:string|null;ends_at:string|null}
type Meter={key:string;name_fa:string;name_en:string;unit:string;billable:boolean;default_unit_price_minor:number}
type MeterPrice={meter_key:string;included_quantity:number;unit_price_minor:number;soft_limit:number|null;hard_limit:number|null}
type Invoice={id:string;invoice_number:string;status:string;currency:string;subtotal_minor:number;discount_minor:number;tax_minor:number;total_minor:number;paid_minor:number;period_start:string|null;period_end:string|null;issued_at:string|null;due_at:string|null}
type Payment={id:string;invoice_id:string|null;provider:string;provider_reference:string|null;status:string;currency:string;amount_minor:number;received_at:string|null;created_at:string}

function one<T>(value:T|T[]|null){return Array.isArray(value)?value[0]??null:value}
function json(value:unknown){return JSON.stringify(value??{},null,2)}

export default async function ContractBillingPage({params}:{params:Promise<{id:string}>}){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const money=(value:number,currency:string)=>`${new Intl.NumberFormat(locale==='fa'?'fa-IR':'en-US').format(value)} ${currency}`
  const statusLabel=(value:string)=>({active:l('فعال','Active'),draft:l('پیش‌نویس','Draft'),issued:l('صادرشده','Issued'),partially_paid:l('نیمه‌پرداخت‌شده','Partially paid'),paid:l('پرداخت‌شده','Paid'),overdue:l('سررسیدگذشته','Overdue'),void:l('باطل‌شده','Void')}[value]??value)
  const intervalLabel=(value:string)=>({monthly:l('ماهانه','Monthly'),quarterly:l('سه‌ماهه','Quarterly'),yearly:l('سالانه','Yearly'),custom:l('سفارشی','Custom')}[value]??l('سفارشی','Custom'))
  const tierLabel=(value:string)=>({core:l('پایه','Core'),premium:l('حرفه‌ای','Premium'),enterprise:l('سازمانی','Enterprise'),custom:l('سفارشی','Custom')}[value]??l('سفارشی','Custom'))
  const sourceLabel=(value:string)=>({contract:l('قرارداد','Contract'),plan:l('طرح','Plan'),override:l('اختصاصی','Override'),system:l('سامانه','System')}[value]??l('سامانه','System'))
  const {id}=await params
  if(!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase=await createClient()
  const {data:contract}=await supabase.from('customer_contracts').select('id,contract_number,organization_id,plan_id,status,billing_interval,currency,base_amount_minor,discount_percent,tax_percent,starts_at,ends_at,grace_until,auto_renew,organizations(name,slug),plan_catalog(name_fa,name_en,key)').eq('id',id).maybeSingle()
  if(!contract) notFound()
  const typed=contract as Contract
  await requireAnyPermission([PERMISSIONS.PLATFORM_BILLING_MANAGE,PERMISSIONS.BILLING_VIEW,PERMISSIONS.BILLING_MANAGE],{organizationId:typed.organization_id})

  const [sitesRes,modulesRes,entRes,metersRes,meterPriceRes,invoicesRes,paymentsRes]=await Promise.all([
    supabase.from('contract_sites').select('sites(id,name,slug)').eq('contract_id',id),
    supabase.from('module_catalog').select('key,name_fa,name_en,commercial_tier').order('category').order('key'),
    supabase.from('contract_entitlements').select('id,site_id,module_key,enabled,tier,limits,config,source,starts_at,ends_at').eq('contract_id',id).order('module_key'),
    supabase.from('usage_meters').select('key,name_fa,name_en,unit,billable,default_unit_price_minor').eq('active',true).order('key'),
    supabase.from('contract_meter_prices').select('meter_key,included_quantity,unit_price_minor,soft_limit,hard_limit').eq('contract_id',id),
    supabase.from('invoices').select('id,invoice_number,status,currency,subtotal_minor,discount_minor,tax_minor,total_minor,paid_minor,period_start,period_end,issued_at,due_at').eq('contract_id',id).order('created_at',{ascending:false}),
    supabase.from('payment_records').select('id,invoice_id,provider,provider_reference,status,currency,amount_minor,received_at,created_at').eq('organization_id',typed.organization_id).order('created_at',{ascending:false}).limit(100),
  ])
  const sites=(sitesRes.data??[]).map((row:any)=>one(row.sites)).filter(Boolean) as Site[]
  const modules=(modulesRes.data??[]) as Module[]
  const entitlements=(entRes.data??[]) as Entitlement[]
  const meters=(metersRes.data??[]) as Meter[]
  const meterPrices=(meterPriceRes.data??[]) as MeterPrice[]
  const invoices=(invoicesRes.data??[]) as Invoice[]
  const invoiceIds=new Set(invoices.map(i=>i.id))
  const payments=((paymentsRes.data??[]) as Payment[]).filter(p=>p.invoice_id&&invoiceIds.has(p.invoice_id))
  const organization=one(typed.organizations)
  const plan=one(typed.plan_catalog)

  return <main className="admin-shell">
    <header className="admin-head"><div><span className="kicker">{l('مدیریت قرارداد','CONTRACT CONTROL')}</span><h1>{typed.contract_number}</h1><p>{organization?.name??'—'} · {(locale==='fa'?plan?.name_fa:plan?.name_en)??l('سفارشی','Custom')} · {statusLabel(typed.status)} · {intervalLabel(typed.billing_interval)}</p></div><Link className="admin-muted-button" href="/admin/platform/billing">{l('بازگشت به امور مالی','Back to billing')}</Link></header>

    <div className="admin-stats"><div><strong>{statusLabel(typed.status)}</strong><span>{l('وضعیت','Status')}</span></div><div><strong>{sites.length}</strong><span>{l('سایت','Sites')}</span></div><div><strong>{entitlements.filter(e=>e.enabled).length}</strong><span>{l('امکان فعال','Active entitlements')}</span></div><div><strong>{invoices.length}</strong><span>{l('صورتحساب','Invoices')}</span></div></div>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('قرارداد','Contract')}</h2><p>{l('فعال‌سازی قرارداد، امکانات آن را روی سایت‌های قرارداد اعمال می‌کند.','Activating the contract applies its entitlements to the contracted sites.')}</p></div></div>
      <div className="admin-access-grid"><article className="admin-access-card"><b>{l('شرایط تجاری','Commercial terms')}</b><small>{l('مبلغ پایه','Base')}: {money(typed.base_amount_minor,typed.currency)}</small><small>{l('تخفیف','Discount')}: {typed.discount_percent}% · {l('مالیات','Tax')}: {typed.tax_percent}%</small><small>{l('شروع','Start')}: {typed.starts_at?new Date(typed.starts_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB'):'—'}</small><small>{l('پایان','End')}: {typed.ends_at?new Date(typed.ends_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB'):'—'}</small></article><article className="admin-access-card"><b>{l('سایت‌ها','Sites')}</b>{sites.map(s=><small key={s.id}>{s.name} · {s.slug}</small>)}</article></div>
      {typed.status!=='active'?<ActionForm action={activateContractAction} danger confirmTitle={l('فعال‌سازی قرارداد','Activate contract')} confirmMessage={l('قرارداد فعال و امکانات آن روی سایت‌ها اعمال شوند؟','Activate the contract and apply its entitlements to the sites?')}><input type="hidden" name="contract_id" value={typed.id}/><button className="admin-primary-button" type="submit">{l('فعال‌سازی قرارداد','Activate contract')}</button></ActionForm>:null}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('امکانات و افزونه‌ها','Entitlements and add-ons')}</h2><p>{l('امکان اختصاصی را روی کل قرارداد یا یک سایت مشخص اعمال کنید.','Apply a contract entitlement globally or to a specific site.')}</p></div><span>{entitlements.length} {l('رکورد','records')}</span></div>
      <ActionForm action={upsertEntitlementAction} className="admin-form" confirmTitle={l('ثبت امکان','Save entitlement')} confirmMessage={l('این امکان یا تغییر قراردادی ذخیره شود؟','Save this contract entitlement or override?')}>
        <input type="hidden" name="contract_id" value={typed.id}/><label>{l('سایت','Site')}<select name="site_id" defaultValue=""><option value="">{l('همه سایت‌های قرارداد','All contract sites')}</option>{sites.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>{l('بخش','Module')}<select name="module_key" required defaultValue=""><option value="" disabled>{l('انتخاب بخش','Select module')}</option>{modules.map(m=><option key={m.key} value={m.key}>{locale==='fa'?m.name_fa:m.name_en} · {tierLabel(m.commercial_tier)}</option>)}</select></label><label>{l('سطح','Tier')}<input name="tier" defaultValue="premium"/></label><label>{l('پایان اعتبار','Ends at')}<input name="ends_at" type="datetime-local"/></label><label>{l('محدودیت‌های فنی','Limits JSON')}<textarea name="limits" rows={4} defaultValue="{}" dir="ltr"/></label><label>{l('تنظیمات فنی','Config JSON')}<textarea name="config" rows={4} defaultValue="{}" dir="ltr"/></label><label className="admin-check"><input name="enabled" type="checkbox" defaultChecked/><span><b>{l('فعال','Enabled')}</b><small>{l('در صورت خاموش‌بودن، این امکان صریحاً غیرفعال ثبت می‌شود.','When disabled, the entitlement is explicitly recorded as unavailable.')}</small></span></label><button className="admin-primary-button" type="submit">{l('ذخیره امکان','Save entitlement')}</button>
      </ActionForm>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('بخش','Module')}</th><th>{l('محدوده','Scope')}</th><th>{l('منبع','Source')}</th><th>{l('سطح','Tier')}</th><th>{l('فعال','Enabled')}</th><th>{l('محدودیت‌ها','Limits')}</th></tr></thead><tbody>{entitlements.map(e=>{const module=modules.find(m=>m.key===e.module_key);return <tr key={e.id}><td>{module?(locale==='fa'?module.name_fa:module.name_en):(locale==='fa'?'بخش سفارشی':e.module_key)}</td><td>{e.site_id?sites.find(s=>s.id===e.site_id)?.name??e.site_id:l('قرارداد','Contract')}</td><td>{sourceLabel(e.source)}</td><td>{tierLabel(e.tier)}</td><td>{e.enabled?l('بله','Yes'):l('خیر','No')}</td><td><code>{json(e.limits)}</code></td></tr>})}</tbody></table></div>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('قیمت‌گذاری مصرف','Usage meter pricing')}</h2><p>{l('مقدار شامل طرح، آستانه هشدار، سقف قطعی و قیمت مصرف اضافه را مشخص کنید.','Define included usage, warning and hard limits, and overage pricing.')}</p></div></div>
      <div className="admin-access-grid">{meters.map(m=>{const price=meterPrices.find(p=>p.meter_key===m.key),meterName=locale==='fa'?m.name_fa:m.name_en;return <article className="admin-access-card" key={m.key}><div><b>{meterName}</b><small>{locale==='fa'?(m.billable?'قابل‌صورتحساب':'بدون هزینه'):`${m.key} · ${m.unit}${m.billable?' · Billable':''}`}</small></div><ActionForm action={setMeterPriceAction} confirmTitle={l('ذخیره قیمت مصرف','Save usage pricing')} confirmMessage={l(`تنظیمات ${m.name_fa} ذخیره شود؟`,`Save settings for ${m.name_en}?`)}><input type="hidden" name="contract_id" value={typed.id}/><input type="hidden" name="meter_key" value={m.key}/><label>{l('مقدار شامل طرح','Included quantity')}<input name="included_quantity" type="number" step="any" min="0" defaultValue={price?.included_quantity??0}/></label><label>{l('قیمت هر واحد','Unit price')}<input name="unit_price_minor" type="number" min="0" defaultValue={price?.unit_price_minor??m.default_unit_price_minor}/></label><label>{l('آستانه هشدار','Soft limit')}<input name="soft_limit" type="number" step="any" min="0" defaultValue={price?.soft_limit??''}/></label><label>{l('سقف قطعی','Hard limit')}<input name="hard_limit" type="number" step="any" min="0" defaultValue={price?.hard_limit??''}/></label><button className="admin-muted-button" type="submit">{l('ذخیره','Save')}</button></ActionForm></article>})}</div>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('صدور صورتحساب','Issue invoice')}</h2><p>{l('صورتحساب از مبلغ پایه قرارداد و مصرف قابل‌پرداخت همان بازه ساخته می‌شود.','The invoice uses the contract base amount and billable usage for the selected period.')}</p></div></div>
      <ActionForm action={issueInvoiceAction} className="admin-form" confirmTitle={l('صدور صورتحساب','Issue invoice')} confirmMessage={l('صورتحساب برای بازه انتخاب‌شده صادر شود؟','Issue an invoice for the selected period?')}><input type="hidden" name="contract_id" value={typed.id}/><label>{l('شماره صورتحساب','Invoice number')}<input name="invoice_number" required placeholder="INV-1405-001"/></label><label>{l('شروع بازه','Period start')}<input name="period_start" type="datetime-local" required/></label><label>{l('پایان بازه','Period end')}<input name="period_end" type="datetime-local" required/></label><label>{l('سررسید','Due at')}<input name="due_at" type="datetime-local" required/></label><button className="admin-primary-button" type="submit">{l('صدور صورتحساب','Issue invoice')}</button></ActionForm>
      {!invoices.length?<div className="admin-empty">{l('صورتحسابی صادر نشده است.','No invoices have been issued.')}</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('صورتحساب','Invoice')}</th><th>{l('وضعیت','Status')}</th><th>{l('جمع جزء','Subtotal')}</th><th>{l('تخفیف','Discount')}</th><th>{l('مالیات','Tax')}</th><th>{l('کل','Total')}</th><th>{l('پرداخت‌شده','Paid')}</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td><b>{i.invoice_number}</b><small>{i.issued_at?new Date(i.issued_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB'):''}</small></td><td>{statusLabel(i.status)}</td><td>{money(i.subtotal_minor,i.currency)}</td><td>{money(i.discount_minor,i.currency)}</td><td>{money(i.tax_minor,i.currency)}</td><td>{money(i.total_minor,i.currency)}</td><td>{money(i.paid_minor,i.currency)}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('ثبت پرداخت','Record payment')}</h2><p>{l('پرداخت مالی را ثبت کنید؛ اتصال خودکار به درگاه‌ها از سامانه یکپارچه درگاه انجام می‌شود.','Record a payment; automatic gateways will connect through the centralized provider layer.')}</p></div></div>
      <ActionForm action={recordPaymentAction} className="admin-form" confirmTitle={l('ثبت پرداخت','Record payment')} confirmMessage={l('این پرداخت به صورتحساب اضافه شود؟','Add this payment to the invoice?')}><label>{l('صورتحساب','Invoice')}<select name="invoice_id" required defaultValue=""><option value="" disabled>{l('انتخاب صورتحساب','Select invoice')}</option>{invoices.filter(i=>i.status!=='paid'&&i.status!=='void').map(i=><option value={i.id} key={i.id}>{i.invoice_number} · {l('باقی‌مانده','Remaining')} {money(i.total_minor-i.paid_minor,i.currency)}</option>)}</select></label><label>{l('درگاه یا روش','Provider')}<input name="provider" required placeholder="manual / zarinpal / stripe"/></label><label>{l('مبلغ','Amount')}<input name="amount_minor" required type="number" min="1"/></label><label>{l('شناسه مرجع درگاه','Provider reference')}<input name="provider_reference"/></label><label>{l('زمان دریافت','Received at')}<input name="received_at" type="datetime-local"/></label><button className="admin-primary-button" type="submit">{l('ثبت پرداخت','Record payment')}</button></ActionForm>
      {payments.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('درگاه','Provider')}</th><th>{l('شناسه مرجع','Reference')}</th><th>{l('مبلغ','Amount')}</th><th>{l('وضعیت','Status')}</th><th>{l('زمان','Time')}</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{p.provider}</td><td>{p.provider_reference??'—'}</td><td>{money(p.amount_minor,p.currency)}</td><td>{statusLabel(p.status)}</td><td>{new Date(p.received_at??p.created_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</td></tr>)}</tbody></table></div>:null}
    </section>
  </main>
}
