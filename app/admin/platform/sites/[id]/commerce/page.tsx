import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import { adjustInventoryAction, createDraftOrderAction, createProductAction } from './actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function CommercePage({params}:{params:Promise<{id:string}>}){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const statusLabel=(value:string)=>({draft:l('پیش‌نویس','Draft'),active:l('فعال','Active'),archived:l('بایگانی‌شده','Archived'),pending:l('در انتظار','Pending'),confirmed:l('تأییدشده','Confirmed'),cancelled:l('لغوشده','Cancelled'),paid:l('پرداخت‌شده','Paid'),unpaid:l('پرداخت‌نشده','Unpaid'),partially_paid:l('بخشی پرداخت‌شده','Partially paid'),refunded:l('بازپرداخت‌شده','Refunded')}[value]??l('وضعیت نامشخص','Unknown status'))
  const {id}=await params
  if(!uuid.test(id))notFound()
  const supabase=await createClient()
  const {data:site}=await supabase.from('sites').select('id,organization_id,name,slug,default_currency').eq('id',id).maybeSingle()
  if(!site)notFound()

  try{
    await authorizeSiteFeature({siteId:id,moduleKey:'commerce',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.COMMERCE_VIEW,PERMISSIONS.COMMERCE_MANAGE,PERMISSIONS.COMMERCE_PRODUCTS_MANAGE,PERMISSIONS.COMMERCE_INVENTORY_MANAGE,PERMISSIONS.COMMERCE_ORDERS_VIEW,PERMISSIONS.COMMERCE_ORDERS_MANAGE],operation:'commerce.console.view',route:`/admin/platform/sites/${id}/commerce`})
  }catch(error){
    if(error instanceof FeatureAccessError)redirect(`/admin/platform/sites/${id}?feature=commerce&reason=${encodeURIComponent(error.code)}`)
    throw error
  }

  const [{data:products},{data:variants},{data:prices},{data:locations},{data:levels},{data:orders}]=await Promise.all([
    supabase.from('commerce_products').select('id,title,slug,status,product_type,updated_at').eq('site_id',id).order('updated_at',{ascending:false}).limit(100),
    supabase.from('commerce_variants').select('id,product_id,sku,title,active,track_inventory,allow_backorder').eq('site_id',id).order('created_at',{ascending:false}).limit(200),
    supabase.from('commerce_prices').select('id,variant_id,currency,amount_minor,min_quantity,active').eq('active',true).order('min_quantity',{ascending:false}).limit(500),
    supabase.from('inventory_locations').select('id,name,code,active').eq('site_id',id).order('name'),
    supabase.from('inventory_levels').select('variant_id,location_id,on_hand,reserved,updated_at').limit(1000),
    supabase.from('commerce_orders').select('id,order_number,status,payment_state,currency,customer_name,customer_email,total_minor,created_at').eq('site_id',id).order('created_at',{ascending:false}).limit(100),
  ])
  const siteVariantIds=new Set((variants??[]).map(v=>v.id))
  const siteLevels=(levels??[]).filter(l=>siteVariantIds.has(l.variant_id))
  const variantById=new Map((variants??[]).map(v=>[v.id,v]))
  const productById=new Map((products??[]).map(p=>[p.id,p]))

  return <main className="admin-shell">
    <header className="admin-head"><div><span className="eyebrow">{l('هسته فروشگاه','COMMERCE CORE')}</span><h1>{l('فروشگاه','Commerce')} · {site.name}</h1><p>{l('محصول، گونه محصول، قیمت، موجودی و سفارش این سایت را مدیریت کنید.','Manage this site’s products, variants, prices, inventory, and orders.')}</p></div><Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>{l('بازگشت به سایت','Back to site')}</Link></header>

    <div className="admin-stats">
      <div><strong>{products?.length??0}</strong><span>{l('محصول','Products')}</span></div>
      <div><strong>{variants?.length??0}</strong><span>{l('گونه و شناسه کالا','Variants and SKUs')}</span></div>
      <div><strong>{siteLevels.reduce((sum,item)=>sum+Math.max(0,item.on_hand-item.reserved),0)}</strong><span>{l('موجودی قابل فروش','Available stock')}</span></div>
      <div><strong>{orders?.length??0}</strong><span>{l('سفارش','Orders')}</span></div>
    </div>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('محصول جدید','New product')}</h2><p>{l('محصول، گونه پیش‌فرض، قیمت، انبار و موجودی اولیه در یک عملیات امن ساخته می‌شوند.','The product, default variant, price, location, and initial stock are created in one safe operation.')}</p></div></div>
      <ActionForm action={createProductAction} className="admin-form" confirmTitle={l('ساخت محصول','Create product')} confirmMessage={l('محصول و شناسه کالای اولیه ساخته شوند؟','Create the product and its initial SKU?')}>
        <input type="hidden" name="site_id" value={id}/>
        <div className="admin-form-grid"><label>{l('نام محصول','Product name')}<input name="title" required minLength={2}/></label><label>{l('شناسه نشانی','Slug')}<input name="slug" required dir="ltr" placeholder="classic-tshirt"/></label><label>{l('شناسه کالا','SKU')}<input name="sku" required dir="ltr" placeholder="TSH-BLK-3XL"/></label><label>{l('واحد پول','Currency')}<input name="currency" defaultValue={site.default_currency} maxLength={3} dir="ltr"/></label><label>{l('قیمت در کوچک‌ترین واحد پول','Price in minor units')}<input name="amount_minor" type="number" min="0" defaultValue="0"/></label><label>{l('موجودی اولیه','Initial stock')}<input name="initial_stock" type="number" min="0" defaultValue="0"/></label><label>{l('نام انبار','Location name')}<input name="location_name" defaultValue={l('انبار اصلی','Main')}/></label><label>{l('کد انبار','Location code')}<input name="location_code" defaultValue="MAIN" dir="ltr"/></label></div>
        <button className="admin-primary-button" type="submit">{l('ساخت محصول و شناسه کالا','Create product and SKU')}</button>
      </ActionForm>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('محصولات و موجودی','Products and inventory')}</h2><p>{l('هر اصلاح موجودی در تاریخچه ممیزی و گردش موجودی ثبت می‌شود.','Every stock adjustment is recorded in the audit and inventory movement history.')}</p></div><span>{products?.length??0}</span></div>
      {!products?.length?<div className="admin-empty">{l('هنوز محصولی ساخته نشده است.','No products have been created yet.')}</div>:<div className="admin-access-grid">{(variants??[]).map(v=>{
        const product=productById.get(v.product_id);const price=(prices??[]).find(p=>p.variant_id===v.id);const variantLevels=siteLevels.filter(l=>l.variant_id===v.id)
        return <article className="admin-access-card" key={v.id}><div><b>{product?.title??l('محصول','Product')} · {v.title}</b><small dir="ltr">{l('شناسه کالا','SKU')}: {v.sku}</small><small>{price?`${price.amount_minor.toLocaleString(locale==='fa'?'fa-IR':'en-US')} ${price.currency}`:l('بدون قیمت','No price')} · {product?.status?statusLabel(product.status):'—'}</small></div>
          <div>{variantLevels.length?variantLevels.map(level=>{const location=(locations??[]).find(item=>item.id===level.location_id);return <div key={level.location_id}><small>{location?.name??l('انبار','Location')} · {l('موجود','On hand')}: {level.on_hand} · {l('رزروشده','Reserved')}: {level.reserved} · {l('قابل فروش','Available')}: {level.on_hand-level.reserved}</small><ActionForm action={adjustInventoryAction} confirmTitle={l('اصلاح موجودی','Adjust inventory')} confirmMessage={l(`موجودی کالای ${v.sku} تغییر کند؟`,`Adjust inventory for SKU ${v.sku}?`)}><input type="hidden" name="site_id" value={id}/><input type="hidden" name="variant_id" value={v.id}/><input type="hidden" name="location_id" value={level.location_id}/><label>{l('مقدار تغییر','Quantity change')}<input name="quantity_delta" type="number" required placeholder={l('برای نمونه ۱۰ یا ۲-','For example 10 or -2')}/></label><label>{l('علت','Reason')}<input name="reason" maxLength={500}/></label><button className="admin-muted-button" type="submit">{l('ثبت اصلاح موجودی','Save adjustment')}</button></ActionForm></div>}):<small>{l('برای این کالا موجودی ثبت نشده است.','No inventory level is recorded for this SKU.')}</small>}</div>
        </article>})}</div>}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('سفارش پیش‌نویس','Draft order')}</h2><p>{l('یک سفارش اولیه بسازید؛ سبد خرید، پرداخت و پردازش سفارش بعداً به همین ساختار متصل می‌شوند.','Create an initial order; cart, checkout, payment, and fulfilment will connect to this same order model.')}</p></div></div>
      {(variants??[]).length?<ActionForm action={createDraftOrderAction} className="admin-form" confirmTitle={l('ساخت سفارش','Create order')} confirmMessage={l('سفارش پیش‌نویس ساخته شود؟','Create this draft order?')}><input type="hidden" name="site_id" value={id}/><div className="admin-form-grid"><label>{l('شماره سفارش','Order number')}<input name="order_number" required placeholder="ORD-1001" dir="ltr"/></label><label>{l('گونه محصول','Variant')}<select name="variant_id" required>{(variants??[]).map(v=><option key={v.id} value={v.id}>{productById.get(v.product_id)?.title??l('محصول','Product')} · {v.sku}</option>)}</select></label><label>{l('تعداد','Quantity')}<input name="quantity" type="number" min="1" defaultValue="1"/></label><label>{l('واحد پول','Currency')}<input name="currency" defaultValue={site.default_currency} maxLength={3}/></label><label>{l('نام مشتری','Customer name')}<input name="customer_name"/></label><label>{l('ایمیل','Email')}<input name="customer_email" type="email" dir="ltr"/></label></div><button className="admin-primary-button" type="submit">{l('ساخت سفارش پیش‌نویس','Create draft order')}</button></ActionForm>:<div className="admin-empty">{l('برای ساخت سفارش ابتدا محصول و شناسه کالا بسازید.','Create a product and SKU before creating an order.')}</div>}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('سفارش‌ها','Orders')}</h2><p>{l('دفتر سفارش پایه برای پرداخت، ارسال، مرجوعی و بازپرداخت آینده.','The core order ledger for future checkout, payment, fulfilment, returns, and refunds.')}</p></div><span>{orders?.length??0}</span></div>
      {!orders?.length?<div className="admin-empty">{l('هنوز سفارشی ثبت نشده است.','No orders have been recorded yet.')}</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('سفارش','Order')}</th><th>{l('مشتری','Customer')}</th><th>{l('وضعیت','Status')}</th><th>{l('پرداخت','Payment')}</th><th>{l('مبلغ کل','Total')}</th><th>{l('زمان','Time')}</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td dir="ltr">{o.order_number}</td><td>{o.customer_name??o.customer_email??'—'}</td><td>{statusLabel(o.status)}</td><td>{statusLabel(o.payment_state)}</td><td>{o.total_minor.toLocaleString(locale==='fa'?'fa-IR':'en-US')} {o.currency}</td><td>{new Date(o.created_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</td></tr>)}</tbody></table></div>}
    </section>
  </main>
}
