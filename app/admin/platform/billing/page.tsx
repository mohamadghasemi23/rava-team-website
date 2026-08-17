import Link from 'next/link'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { createContractAction } from './actions'

type Organization = { id:string; name:string; slug:string }
type Site = { id:string; organization_id:string; name:string; slug:string }
type Plan = { id:string; key:string; name_fa:string; name_en:string; commercial_tier:string; billing_interval:string; currency:string; base_price_minor:number; active:boolean }
type Contract = { id:string; contract_number:string; organization_id:string; plan_id:string|null; status:string; billing_interval:string; currency:string; base_amount_minor:number; starts_at:string|null; ends_at:string|null; auto_renew:boolean; created_at:string }
type Invoice = { id:string; invoice_number:string; organization_id:string; contract_id:string|null; status:string; currency:string; total_minor:number; paid_minor:number; due_at:string|null; issued_at:string|null }

function money(value:number,currency:string){ return `${new Intl.NumberFormat('fa-IR').format(value)} ${currency}` }

export default async function BillingPage(){
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
  const planName=(id:string|null)=>plans.find(p=>p.id===id)?.name_fa??'سفارشی'

  return <main className="admin-shell">
    <header className="admin-head"><div><span className="kicker">COMMERCIAL CONTROL</span><h1>قرارداد، Entitlement و Billing</h1><p>Plan فقط نقطه شروع است؛ قرارداد می‌تواند ماژول، Limit، قیمت مصرف و شرایط اختصاصی خودش را داشته باشد.</p></div></header>

    <div className="admin-stats">
      <div><strong>{plans.length}</strong><span>Plan فعال</span></div>
      <div><strong>{contracts.filter(c=>c.status==='active').length}</strong><span>قرارداد فعال</span></div>
      <div><strong>{invoices.filter(i=>i.status==='overdue').length}</strong><span>Invoice معوق</span></div>
      <div><strong>{invoices.filter(i=>i.status==='issued'||i.status==='partially_paid').length}</strong><span>در انتظار پرداخت</span></div>
    </div>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>ساخت قرارداد</h2><p>قرارداد جدید را به یک Organization و یک یا چند Site متصل کن.</p></div></div>
      <ActionForm action={createContractAction} className="admin-form" confirmTitle="ساخت قرارداد" confirmMessage="این قرارداد با Plan و Siteهای انتخاب‌شده ساخته شود؟">
        <label>مشتری<select name="organization_id" required defaultValue=""><option value="" disabled>انتخاب مشتری</option>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label>شماره قرارداد<input name="contract_number" required placeholder="RAVA-1405-001" /></label>
        <label>Plan<select name="plan_id" defaultValue=""><option value="">Custom</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name_fa} · {p.commercial_tier}</option>)}</select></label>
        <label>Currency<input name="currency" defaultValue="IRR" maxLength={3}/></label>
        <label>مبلغ پایه (minor unit)<input name="base_amount_minor" type="number" min="0" defaultValue="0"/></label>
        <label>Billing Interval<select name="billing_interval" defaultValue="monthly"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="custom">Custom</option></select></label>
        <label>شروع<input name="starts_at" type="datetime-local"/></label>
        <label>پایان<input name="ends_at" type="datetime-local"/></label>
        <label className="admin-check"><input name="auto_renew" type="checkbox"/><span><b>تمدید خودکار</b><small>فقط Flag قراردادی است؛ پرداخت خودکار بعداً از Provider Adapter انجام می‌شود.</small></span></label>
        <fieldset className="admin-permission-grid"><legend>Siteهای قرارداد</legend>{sites.map(site=><label className="admin-check" key={site.id}><input type="checkbox" name="site_ids" value={site.id}/><span><b>{site.name}</b><small>{orgName(site.organization_id)} · {site.slug}</small></span></label>)}</fieldset>
        <button className="admin-primary-button" type="submit">ساخت قرارداد</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>Plan Catalog</h2><p>قیمت این Catalog مرجع است؛ قیمت واقعی هر قرارداد می‌تواند مستقل باشد.</p></div><span>{plans.length} Plan</span></div>
      <div className="admin-access-grid">{plans.map(plan=><article className="admin-access-card" key={plan.id}><div><b>{plan.name_fa}</b><small>{plan.name_en} · {plan.key}</small><small>{plan.commercial_tier} · {plan.billing_interval}</small></div><strong>{money(plan.base_price_minor,plan.currency)}</strong></article>)}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>قراردادها</h2><p>برای مدیریت Entitlement، Meter و Invoice وارد جزئیات قرارداد شو.</p></div><span>{contracts.length} قرارداد</span></div>
      {!contracts.length?<div className="admin-empty">هنوز قراردادی ساخته نشده است.</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>شماره</th><th>مشتری</th><th>Plan</th><th>Status</th><th>مبلغ پایه</th><th>مدیریت</th></tr></thead><tbody>{contracts.map(c=><tr key={c.id}><td><b>{c.contract_number}</b></td><td>{orgName(c.organization_id)}</td><td>{planName(c.plan_id)}</td><td>{c.status}</td><td>{money(c.base_amount_minor,c.currency)}</td><td><Link className="admin-muted-button" href={`/admin/platform/billing/${c.id}`}>جزئیات</Link></td></tr>)}</tbody></table></div>}
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>آخرین Invoiceها</h2><p>وضعیت صدور و پرداخت در یک نمای سریع.</p></div><span>{invoices.length} رکورد</span></div>
      {!invoices.length?<div className="admin-empty">هنوز Invoiceی صادر نشده است.</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Invoice</th><th>مشتری</th><th>Status</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td><b>{i.invoice_number}</b></td><td>{orgName(i.organization_id)}</td><td>{i.status}</td><td>{money(i.total_minor,i.currency)}</td><td>{money(i.paid_minor,i.currency)}</td><td>{i.due_at?new Date(i.due_at).toLocaleString('fa-IR'):'—'}</td></tr>)}</tbody></table></div>}
    </section>
  </main>
}
