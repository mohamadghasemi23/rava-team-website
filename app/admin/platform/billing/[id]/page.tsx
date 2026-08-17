import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { activateContractAction, issueInvoiceAction, recordPaymentAction, setMeterPriceAction, upsertEntitlementAction } from '../actions'

type Contract={id:string;contract_number:string;organization_id:string;plan_id:string|null;status:string;billing_interval:string;currency:string;base_amount_minor:number;discount_percent:number;tax_percent:number;starts_at:string|null;ends_at:string|null;grace_until:string|null;auto_renew:boolean;organizations:{name:string;slug:string}|{name:string;slug:string}[]|null;plan_catalog:{name_fa:string;key:string}|{name_fa:string;key:string}[]|null}
type Site={id:string;name:string;slug:string}
type Module={key:string;name_fa:string;name_en:string;commercial_tier:string}
type Entitlement={id:string;site_id:string|null;module_key:string;enabled:boolean;tier:string;limits:Record<string,unknown>;config:Record<string,unknown>;source:string;starts_at:string|null;ends_at:string|null}
type Meter={key:string;name_fa:string;unit:string;billable:boolean;default_unit_price_minor:number}
type MeterPrice={meter_key:string;included_quantity:number;unit_price_minor:number;soft_limit:number|null;hard_limit:number|null}
type Invoice={id:string;invoice_number:string;status:string;currency:string;subtotal_minor:number;discount_minor:number;tax_minor:number;total_minor:number;paid_minor:number;period_start:string|null;period_end:string|null;issued_at:string|null;due_at:string|null}
type Payment={id:string;invoice_id:string|null;provider:string;provider_reference:string|null;status:string;currency:string;amount_minor:number;received_at:string|null;created_at:string}

function one<T>(value:T|T[]|null){return Array.isArray(value)?value[0]??null:value}
function money(value:number,currency:string){return `${new Intl.NumberFormat('fa-IR').format(value)} ${currency}`}
function json(value:unknown){return JSON.stringify(value??{},null,2)}

export default async function ContractBillingPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  if(!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase=await createClient()
  const {data:contract}=await supabase.from('customer_contracts').select('id,contract_number,organization_id,plan_id,status,billing_interval,currency,base_amount_minor,discount_percent,tax_percent,starts_at,ends_at,grace_until,auto_renew,organizations(name,slug),plan_catalog(name_fa,key)').eq('id',id).maybeSingle()
  if(!contract) notFound()
  const typed=contract as Contract
  await requireAnyPermission([PERMISSIONS.PLATFORM_BILLING_MANAGE,PERMISSIONS.BILLING_VIEW,PERMISSIONS.BILLING_MANAGE],{organizationId:typed.organization_id})

  const [sitesRes,modulesRes,entRes,metersRes,meterPriceRes,invoicesRes,paymentsRes]=await Promise.all([
    supabase.from('contract_sites').select('sites(id,name,slug)').eq('contract_id',id),
    supabase.from('module_catalog').select('key,name_fa,name_en,commercial_tier').order('category').order('key'),
    supabase.from('contract_entitlements').select('id,site_id,module_key,enabled,tier,limits,config,source,starts_at,ends_at').eq('contract_id',id).order('module_key'),
    supabase.from('usage_meters').select('key,name_fa,unit,billable,default_unit_price_minor').eq('active',true).order('key'),
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
    <header className="admin-head"><div><span className="kicker">CONTRACT CONTROL</span><h1>{typed.contract_number}</h1><p>{organization?.name??'—'} · {plan?.name_fa??'Custom'} · {typed.status} · {typed.billing_interval}</p></div><Link className="admin-muted-button" href="/admin/platform/billing">بازگشت به Billing</Link></header>

    <div className="admin-stats"><div><strong>{typed.status}</strong><span>وضعیت</span></div><div><strong>{sites.length}</strong><span>Site</span></div><div><strong>{entitlements.filter(e=>e.enabled).length}</strong><span>Entitlement فعال</span></div><div><strong>{invoices.length}</strong><span>Invoice</span></div></div>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>قرارداد</h2><p>فعال‌سازی قرارداد Plan Entitlementها را به Site Entitlementهای اجرایی Sync می‌کند.</p></div></div>
      <div className="admin-access-grid"><article className="admin-access-card"><b>Commercial terms</b><small>Base: {money(typed.base_amount_minor,typed.currency)}</small><small>Discount: {typed.discount_percent}% · Tax: {typed.tax_percent}%</small><small>Start: {typed.starts_at?new Date(typed.starts_at).toLocaleString('fa-IR'):'—'}</small><small>End: {typed.ends_at?new Date(typed.ends_at).toLocaleString('fa-IR'):'—'}</small></article><article className="admin-access-card"><b>Sites</b>{sites.map(s=><small key={s.id}>{s.name} · {s.slug}</small>)}</article></div>
      {typed.status!=='active'?<ActionForm action={activateContractAction} danger confirmTitle="فعال‌سازی قرارداد" confirmMessage="قرارداد فعال و Entitlementهای آن روی Siteها Sync شوند؟"><input type="hidden" name="contract_id" value={typed.id}/><button className="admin-primary-button" type="submit">فعال‌سازی قرارداد</button></ActionForm>:null}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>Entitlement / Add-on</h2><p>ماژول اختصاصی قرارداد می‌تواند روی کل قرارداد یا یک Site خاص اعمال شود.</p></div><span>{entitlements.length} رکورد</span></div>
      <ActionForm action={upsertEntitlementAction} className="admin-form" confirmTitle="ثبت Entitlement" confirmMessage="این Add-on یا Override قراردادی ذخیره شود؟">
        <input type="hidden" name="contract_id" value={typed.id}/><label>Site<select name="site_id" defaultValue=""><option value="">همه Siteهای قرارداد</option>{sites.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Module<select name="module_key" required defaultValue=""><option value="" disabled>انتخاب ماژول</option>{modules.map(m=><option key={m.key} value={m.key}>{m.name_fa} · {m.commercial_tier}</option>)}</select></label><label>Tier<input name="tier" defaultValue="premium"/></label><label>Ends At<input name="ends_at" type="datetime-local"/></label><label>Limits JSON<textarea name="limits" rows={4} defaultValue="{}"/></label><label>Config JSON<textarea name="config" rows={4} defaultValue="{}"/></label><label className="admin-check"><input name="enabled" type="checkbox" defaultChecked/><span><b>فعال</b><small>اگر خاموش باشد Entitlement به‌صورت صریح غیرفعال ثبت می‌شود.</small></span></label><button className="admin-primary-button" type="submit">ذخیره Entitlement</button>
      </ActionForm>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Module</th><th>Scope</th><th>Source</th><th>Tier</th><th>Enabled</th><th>Limits</th></tr></thead><tbody>{entitlements.map(e=><tr key={e.id}><td>{e.module_key}</td><td>{e.site_id?sites.find(s=>s.id===e.site_id)?.name??e.site_id:'Contract'}</td><td>{e.source}</td><td>{e.tier}</td><td>{e.enabled?'Yes':'No'}</td><td><code>{json(e.limits)}</code></td></tr>)}</tbody></table></div>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>Usage Meter Pricing</h2><p>Included Quantity و Soft/Hard Limit و قیمت مصرف اضافه را برای هر Meter مشخص کن.</p></div></div>
      <div className="admin-access-grid">{meters.map(m=>{const price=meterPrices.find(p=>p.meter_key===m.key);return <article className="admin-access-card" key={m.key}><div><b>{m.name_fa}</b><small>{m.key} · {m.unit}{m.billable?' · billable':''}</small></div><ActionForm action={setMeterPriceAction} confirmTitle="ذخیره Meter" confirmMessage={`تنظیمات ${m.name_fa} ذخیره شود؟`}><input type="hidden" name="contract_id" value={typed.id}/><input type="hidden" name="meter_key" value={m.key}/><label>Included<input name="included_quantity" type="number" step="any" min="0" defaultValue={price?.included_quantity??0}/></label><label>Unit Price<input name="unit_price_minor" type="number" min="0" defaultValue={price?.unit_price_minor??m.default_unit_price_minor}/></label><label>Soft Limit<input name="soft_limit" type="number" step="any" min="0" defaultValue={price?.soft_limit??''}/></label><label>Hard Limit<input name="hard_limit" type="number" step="any" min="0" defaultValue={price?.hard_limit??''}/></label><button className="admin-muted-button" type="submit">ذخیره</button></ActionForm></article>})}</div>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>صدور Invoice</h2><p>Invoice از مبلغ پایه قرارداد و مصرف billable همان بازه ساخته می‌شود.</p></div></div>
      <ActionForm action={issueInvoiceAction} className="admin-form" confirmTitle="صدور Invoice" confirmMessage="Invoice برای بازه انتخاب‌شده صادر شود؟"><input type="hidden" name="contract_id" value={typed.id}/><label>Invoice Number<input name="invoice_number" required placeholder="INV-1405-001"/></label><label>Period Start<input name="period_start" type="datetime-local" required/></label><label>Period End<input name="period_end" type="datetime-local" required/></label><label>Due At<input name="due_at" type="datetime-local" required/></label><button className="admin-primary-button" type="submit">صدور Invoice</button></ActionForm>
      {!invoices.length?<div className="admin-empty">Invoiceی صادر نشده است.</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Invoice</th><th>Status</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Total</th><th>Paid</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td><b>{i.invoice_number}</b><small>{i.issued_at?new Date(i.issued_at).toLocaleString('fa-IR'):''}</small></td><td>{i.status}</td><td>{money(i.subtotal_minor,i.currency)}</td><td>{money(i.discount_minor,i.currency)}</td><td>{money(i.tax_minor,i.currency)}</td><td>{money(i.total_minor,i.currency)}</td><td>{money(i.paid_minor,i.currency)}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>ثبت Payment</h2><p>این بخش ثبت مالی است؛ اتصال خودکار به درگاه‌های ایران/بین‌المللی بعداً از Provider Adapter انجام می‌شود.</p></div></div>
      <ActionForm action={recordPaymentAction} className="admin-form" confirmTitle="ثبت پرداخت" confirmMessage="این پرداخت به Invoice اضافه شود؟"><label>Invoice<select name="invoice_id" required defaultValue=""><option value="" disabled>انتخاب Invoice</option>{invoices.filter(i=>i.status!=='paid'&&i.status!=='void').map(i=><option value={i.id} key={i.id}>{i.invoice_number} · باقی‌مانده {money(i.total_minor-i.paid_minor,i.currency)}</option>)}</select></label><label>Provider<input name="provider" required placeholder="manual / zarinpal / stripe"/></label><label>Amount<input name="amount_minor" required type="number" min="1"/></label><label>Provider Reference<input name="provider_reference"/></label><label>Received At<input name="received_at" type="datetime-local"/></label><button className="admin-primary-button" type="submit">ثبت Payment</button></ActionForm>
      {payments.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Provider</th><th>Reference</th><th>Amount</th><th>Status</th><th>Time</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{p.provider}</td><td>{p.provider_reference??'—'}</td><td>{money(p.amount_minor,p.currency)}</td><td>{p.status}</td><td>{new Date(p.received_at??p.created_at).toLocaleString('fa-IR')}</td></tr>)}</tbody></table></div>:null}
    </section>
  </main>
}
