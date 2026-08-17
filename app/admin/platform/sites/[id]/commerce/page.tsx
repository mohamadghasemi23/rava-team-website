import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import { adjustInventoryAction, createDraftOrderAction, createProductAction } from './actions'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function CommercePage({params}:{params:Promise<{id:string}>}){
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
    <header className="admin-head"><div><span className="eyebrow">COMMERCE CORE</span><h1>فروشگاه · {site.name}</h1><p>محصول، Variant/SKU، قیمت، موجودی و سفارش روی Commerce Entitlement همین سایت.</p></div><Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>بازگشت به سایت</Link></header>

    <div className="admin-stats">
      <div><strong>{products?.length??0}</strong><span>محصول</span></div>
      <div><strong>{variants?.length??0}</strong><span>Variant / SKU</span></div>
      <div><strong>{siteLevels.reduce((sum,l)=>sum+Math.max(0,l.on_hand-l.reserved),0)}</strong><span>موجودی قابل فروش</span></div>
      <div><strong>{orders?.length??0}</strong><span>سفارش</span></div>
    </div>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>محصول جدید</h2><p>در یک تراکنش Product، Default Variant، Price، Location و موجودی اولیه ساخته می‌شود.</p></div></div>
      <ActionForm action={createProductAction} className="admin-form" confirmTitle="ساخت محصول" confirmMessage="محصول و SKU اولیه ساخته شوند؟">
        <input type="hidden" name="site_id" value={id}/>
        <div className="admin-form-grid"><label>نام محصول<input name="title" required minLength={2}/></label><label>Slug<input name="slug" required dir="ltr" placeholder="classic-tshirt"/></label><label>SKU<input name="sku" required dir="ltr" placeholder="TSH-BLK-3XL"/></label><label>Currency<input name="currency" defaultValue={site.default_currency} maxLength={3} dir="ltr"/></label><label>قیمت (minor unit)<input name="amount_minor" type="number" min="0" defaultValue="0"/></label><label>موجودی اولیه<input name="initial_stock" type="number" min="0" defaultValue="0"/></label><label>نام انبار<input name="location_name" defaultValue="Main"/></label><label>کد انبار<input name="location_code" defaultValue="MAIN" dir="ltr"/></label></div>
        <button className="admin-primary-button" type="submit">ساخت Product + SKU</button>
      </ActionForm>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>محصولات و موجودی</h2><p>موجودی مستقیم و بدون Movement تغییر نمی‌کند؛ هر Adjustment در Audit/Inventory Movement ثبت می‌شود.</p></div><span>{products?.length??0}</span></div>
      {!products?.length?<div className="admin-empty">هنوز محصولی ساخته نشده.</div>:<div className="admin-access-grid">{(variants??[]).map(v=>{
        const product=productById.get(v.product_id);const price=(prices??[]).find(p=>p.variant_id===v.id);const variantLevels=siteLevels.filter(l=>l.variant_id===v.id)
        return <article className="admin-access-card" key={v.id}><div><b>{product?.title??'محصول'} · {v.title}</b><small dir="ltr">SKU: {v.sku}</small><small>{price?`${price.amount_minor.toLocaleString()} ${price.currency}`:'بدون قیمت'} · {product?.status??'—'}</small></div>
          <div>{variantLevels.length?variantLevels.map(level=>{const location=(locations??[]).find(l=>l.id===level.location_id);return <div key={level.location_id}><small>{location?.name??'Location'} · On hand: {level.on_hand} · Reserved: {level.reserved} · Available: {level.on_hand-level.reserved}</small><ActionForm action={adjustInventoryAction} confirmTitle="اصلاح موجودی" confirmMessage={`موجودی SKU ${v.sku} تغییر کند؟`}><input type="hidden" name="site_id" value={id}/><input type="hidden" name="variant_id" value={v.id}/><input type="hidden" name="location_id" value={level.location_id}/><label>Delta<input name="quantity_delta" type="number" required placeholder="مثلاً 10 یا -2"/></label><label>علت<input name="reason" maxLength={500}/></label><button className="admin-muted-button" type="submit">ثبت Adjustment</button></ActionForm></div>}):<small>برای این SKU سطح موجودی ثبت نشده.</small>}</div>
        </article>})}</div>}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>Draft Order</h2><p>فعلاً Order هسته‌ای از یک Variant ساخته می‌شود؛ Cart/Checkout/Payment Adapter در فاز بعد روی همین Order Model سوار می‌شوند.</p></div></div>
      {(variants??[]).length?<ActionForm action={createDraftOrderAction} className="admin-form" confirmTitle="ساخت سفارش" confirmMessage="Draft Order ساخته شود؟"><input type="hidden" name="site_id" value={id}/><div className="admin-form-grid"><label>شماره سفارش<input name="order_number" required placeholder="ORD-1001" dir="ltr"/></label><label>Variant<select name="variant_id" required>{(variants??[]).map(v=><option key={v.id} value={v.id}>{productById.get(v.product_id)?.title??'Product'} · {v.sku}</option>)}</select></label><label>تعداد<input name="quantity" type="number" min="1" defaultValue="1"/></label><label>Currency<input name="currency" defaultValue={site.default_currency} maxLength={3}/></label><label>نام مشتری<input name="customer_name"/></label><label>Email<input name="customer_email" type="email" dir="ltr"/></label></div><button className="admin-primary-button" type="submit">Create Draft Order</button></ActionForm>:<div className="admin-empty">برای ساخت سفارش ابتدا Product/SKU بساز.</div>}
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>سفارش‌ها</h2><p>Order ledger پایه برای Checkout، Payment، Fulfillment، Return و Refund آینده.</p></div><span>{orders?.length??0}</span></div>
      {!orders?.length?<div className="admin-empty">هنوز سفارشی ثبت نشده.</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th>Total</th><th>Time</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td dir="ltr">{o.order_number}</td><td>{o.customer_name??o.customer_email??'—'}</td><td>{o.status}</td><td>{o.payment_state}</td><td>{o.total_minor.toLocaleString()} {o.currency}</td><td>{new Date(o.created_at).toLocaleString('fa-IR')}</td></tr>)}</tbody></table></div>}
    </section>
  </main>
}
