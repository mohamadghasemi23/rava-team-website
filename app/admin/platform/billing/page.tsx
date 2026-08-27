import Link from 'next/link'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { createContractAction } from './actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

type Organization = { id:string; name:string; slug:string }
type Site = { id:string; organization_id:string; name:string; slug:string }
type Plan = { id:string; key:string; name_fa:string; name_en:string; commercial_tier:string; billing_interval:string; currency:string; base_price_minor:number; active:boolean }
type Contract = { id:string; contract_number:string; organization_id:string; plan_id:string|null; status:string; billing_interval:string; currency:string; base_amount_minor:number; starts_at:string|null; ends_at:string|null; auto_renew:boolean; created_at:string }
type Invoice = { id:string; invoice_number:string; organization_id:string; contract_id:string|null; status:string; currency:string; total_minor:number; paid_minor:number; due_at:string|null; issued_at:string|null }

export default async function BillingPage(){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const money=(value:number,currency:string)=>`${new Intl.NumberFormat(locale==='fa'?'fa-IR':'en-US').format(value)} ${currency}`
  const statusLabel=(value:string)=>({active:l('فعال','Active'),draft:l('پیش‌نویس','Draft'),issued:l('صادرشده','Issued'),partially_paid:l('نیمه‌پرداخت‌شده','Partially paid'),paid:l('پرداخت‌شده','Paid'),overdue:l('سررسیدگذشته','Overdue'),cancelled:l('لغوشده','Cancelled')}[value]??value)
  await requireAnyPermission([PERMISSIONS.PLATFORM_BILLING_MANAGE,PERMISSIONS.BILLING_VIEW,PERMISSIONS.BILLING_MANAGE])
  const supabase=await createClient()
  const [orgRes,siteRes,planRes,contractRes,invoiceRes]=await Promise.all([
    supabase.from('organizations').select('id,name,slug').order('name'),
    supabase.from('sites').select('id,organization_id,name,slug').order('name'),
    supabase.from('plan_catalog').select('id,key,name_fa,name_en,commercial_tier,billing_interval,currency,base_price_minor,active').eq('active',true).order('sort_order'),
    supabase.from('customer_contracts').select('id,contract_number,organization_id,plan_id,status,billing_interval,currency,base_amount_minor,starts_at,ends_at,auto_renew,created_at').order('created_at',{ascending:false}).limit(100),
    supabase.from('invoices').select('id,invoice_number,organization_id,contract_id,status,currency,total_minor,paid_minor,due_at,issued_at').order('created_at',{ascending:false}).limit(50),
  ])
  const organizations=(orgRes.data??[]) as Organization[]
  const sites=(siteRes.data??[]) as Site[]
  const plans=(planRes.data??[]) as Plan[]
  const contracts=(contractRes.data??[]) as Contract[]
  const invoices=(invoiceRes.data??[]) as Invoice[]
  const orgName=(id:string)=>organizations.find(o=>o.id===id)?.name??id
  const planName=(id:string|null)=>{const plan=plans.find(p=>p.id===id);return plan?(locale==='fa'?plan.name_fa:plan.name_en):l('سفارشی','Custom')}

  return <main className="admin-shell">
    <header className="admin-head"><div><span className="kicker">{l('مرکز مدیریت تجاری','COMMERCIAL CONTROL')}</span><h1>{l('قراردادها و امور مالی','Contracts and billing')}</h1><p>{l('هر قرارداد می‌تواند امکانات، محدودیت‌ها، قیمت مصرف و شرایط اختصاصی خود را داشته باشد.','Each contract can define its own modules, limits, usage pricing, and commercial terms.')}</p></div></header>

    <div className="admin-stats">
      <div><strong>{plans.length}</strong><span>{l('طرح فعال','Active plans')}</span></div>
      <div><strong>{contracts.filter(c=>c.status==='active').length}</strong><span>{l('قرارداد فعال','Active contracts')}</span></div>
      <div><strong>{invoices.filter(i=>i.status==='overdue').length}</strong><span>{l('صورتحساب معوق','Overdue invoices')}</span></div>
      <div><strong>{invoices.filter(i=>i.status==='issued'||i.status==='partially_paid').length}</strong><span>{l('در انتظار پرداخت','Awaiting payment')}</span></div>
    </div>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('ساخت قرارداد','Create contract')}</h2><p>{l('قرارداد جدید را به یک مشتری و یک یا چند سایت متصل کنید.','Connect the new contract to a customer and one or more sites.')}</p></div></div>
      <ActionForm action={createContractAction} className="admin-form" confirmTitle={l('ساخت قرارداد','Create contract')} confirmMessage={l('قرارداد با طرح و سایت‌های انتخاب‌شده ساخته شود؟','Create this contract with the selected plan and sites?')}>
        <label>{l('مشتری','Customer')}<select name="organization_id" required defaultValue=""><option value="" disabled>{l('انتخاب مشتری','Select customer')}</option>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label>{l('شماره قرارداد','Contract number')}<input name="contract_number" required placeholder="RAVA-1405-001" /></label>
        <label>{l('طرح','Plan')}<select name="plan_id" defaultValue=""><option value="">{l('سفارشی','Custom')}</option>{plans.map(p=><option key={p.id} value={p.id}>{locale==='fa'?p.name_fa:p.name_en} · {p.commercial_tier}</option>)}</select></label>
        <label>{l('واحد پول','Currency')}<input name="currency" defaultValue="IRR" maxLength={3}/></label>
        <label>{l('مبلغ پایه در کوچک‌ترین واحد پول','Base amount in minor units')}<input name="base_amount_minor" type="number" min="0" defaultValue="0"/></label>
        <label>{l('دوره صورتحساب','Billing interval')}<select name="billing_interval" defaultValue="monthly"><option value="monthly">{l('ماهانه','Monthly')}</option><option value="quarterly">{l('سه‌ماهه','Quarterly')}</option><option value="yearly">{l('سالانه','Yearly')}</option><option value="custom">{l('سفارشی','Custom')}</option></select></label>
        <label>{l('شروع','Start')}<input name="starts_at" type="datetime-local"/></label>
        <label>{l('پایان','End')}<input name="ends_at" type="datetime-local"/></label>
        <label className="admin-check"><input name="auto_renew" type="checkbox"/><span><b>{l('تمدید خودکار','Automatic renewal')}</b><small>{l('این گزینه فقط شرط قرارداد را ثبت می‌کند؛ پرداخت خودکار بعداً از درگاه پرداخت انجام می‌شود.','This records the contract term; automatic payment will later use a payment provider.')}</small></span></label>
        <fieldset className="admin-permission-grid"><legend>{l('سایت‌های قرارداد','Contract sites')}</legend>{sites.map(site=><label className="admin-check" key={site.id}><input type="checkbox" name="site_ids" value={site.id}/><span><b>{site.name}</b><small>{orgName(site.organization_id)} · {site.slug}</small></span></label>)}</fieldset>
        <button className="admin-primary-button" type="submit">{l('ساخت قرارداد','Create contract')}</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('فهرست طرح‌ها','Plan catalog')}</h2><p>{l('قیمت طرح مرجع است و مبلغ واقعی هر قرارداد می‌تواند مستقل باشد.','Plan pricing is a reference; each contract may define an independent amount.')}</p></div><span>{plans.length} {l('طرح','plans')}</span></div>
      <div className="admin-access-grid">{plans.map(plan=><article className="admin-access-card" key={plan.id}><div><b>{locale==='fa'?plan.name_fa:plan.name_en}</b><small>{plan.key}</small><small>{plan.commercial_tier} · {plan.billing_interval}</small></div><strong>{money(plan.base_price_minor,plan.currency)}</strong></article>)}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('قراردادها','Contracts')}</h2><p>{l('برای مدیریت امکانات، مصرف و صورتحساب وارد جزئیات قرارداد شوید.','Open a contract to manage entitlements, usage, and invoices.')}</p></div><span>{contracts.length} {l('قرارداد','contracts')}</span></div>
      {!contracts.length?<div className="admin-empty">{l('هنوز قراردادی ساخته نشده است.','No contracts have been created yet.')}</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('شماره','Number')}</th><th>{l('مشتری','Customer')}</th><th>{l('طرح','Plan')}</th><th>{l('وضعیت','Status')}</th><th>{l('مبلغ پایه','Base amount')}</th><th>{l('مدیریت','Manage')}</th></tr></thead><tbody>{contracts.map(c=><tr key={c.id}><td><b>{c.contract_number}</b></td><td>{orgName(c.organization_id)}</td><td>{planName(c.plan_id)}</td><td>{statusLabel(c.status)}</td><td>{money(c.base_amount_minor,c.currency)}</td><td><Link className="admin-muted-button" href={`/admin/platform/billing/${c.id}`}>{l('جزئیات','Details')}</Link></td></tr>)}</tbody></table></div>}
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('آخرین صورتحساب‌ها','Latest invoices')}</h2><p>{l('وضعیت صدور و پرداخت را در یک نمای سریع ببینید.','Review issue and payment status at a glance.')}</p></div><span>{invoices.length} {l('رکورد','records')}</span></div>
      {!invoices.length?<div className="admin-empty">{l('هنوز صورتحسابی صادر نشده است.','No invoices have been issued yet.')}</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('صورتحساب','Invoice')}</th><th>{l('مشتری','Customer')}</th><th>{l('وضعیت','Status')}</th><th>{l('مبلغ کل','Total')}</th><th>{l('پرداخت‌شده','Paid')}</th><th>{l('سررسید','Due')}</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td><b>{i.invoice_number}</b></td><td>{orgName(i.organization_id)}</td><td>{statusLabel(i.status)}</td><td>{money(i.total_minor,i.currency)}</td><td>{money(i.paid_minor,i.currency)}</td><td>{i.due_at?new Date(i.due_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB'):'—'}</td></tr>)}</tbody></table></div>}
    </section>
  </main>
}
