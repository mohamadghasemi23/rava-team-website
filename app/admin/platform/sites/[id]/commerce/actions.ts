'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature } from '@/lib/entitlements/runtime'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'
import { getAdminLocale } from '@/lib/i18n/admin-locale'

export type CommerceActionState={ok?:boolean;message?:string;errorId?:string;nonce?:number}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function text(fd:FormData,key:string){return String(fd.get(key)??'').trim()}
function int(value:string,fallback=0){const n=Number.parseInt(value,10);return Number.isFinite(n)?n:fallback}
function refresh(siteId:string){revalidatePath(`/admin/platform/sites/${siteId}/commerce`);revalidatePath(`/admin/platform/sites/${siteId}`)}
async function translator(){const locale=await getAdminLocale();return{locale,l:(fa:string,en:string)=>locale==='fa'?fa:en}}

async function failure(error:unknown,eventType:string,siteId:string,message:string,context:Record<string,unknown>={}):Promise<CommerceActionState>{
  const{locale}=await translator()
  const trace=createTraceContext()
  const logged=await recordErrorEvent({error,category:'commerce',eventType,publicMessage:message,siteId,route:`/admin/platform/sites/${siteId}/commerce`,context,requestId:trace.requestId,correlationId:trace.correlationId,severity:'warning',explanationFa:'عملیات فروشگاه کامل نشد. علت می‌تواند دسترسی، Entitlement، ورودی نامعتبر یا خطای تراکنش باشد.',explanationEn:'The commerce operation did not complete because of permission, entitlement, validation, or transaction failure.'})
  const first=Array.isArray(logged.data)?logged.data[0]:logged.data
  const errorId=first&&typeof first==='object'&&'error_id'in first?String(first.error_id):undefined
  return {ok:false,message:errorId?`${message} ${locale==='fa'?'شناسه خطا':'Error ID'}: ${errorId}`:message,errorId,nonce:Date.now()}
}

export async function createProductAction(_state:CommerceActionState,fd:FormData):Promise<CommerceActionState>{
  const{l}=await translator()
  const siteId=text(fd,'site_id'),title=text(fd,'title'),slug=text(fd,'slug').toLowerCase(),sku=text(fd,'sku'),currency=(text(fd,'currency')||'IRR').toUpperCase(),amount=int(text(fd,'amount_minor')),stock=int(text(fd,'initial_stock'))
  if(!uuid.test(siteId)||title.length<2||!/^[a-z0-9][a-z0-9-]{1,120}$/.test(slug)||!sku||!/^[A-Z]{3}$/.test(currency)||amount<0||stock<0)return{ok:false,message:l('اطلاعات محصول معتبر نیست.','The product information is invalid.'),nonce:Date.now()}
  try{
    await authorizeSiteFeature({siteId,moduleKey:'commerce',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.COMMERCE_PRODUCTS_MANAGE,PERMISSIONS.COMMERCE_MANAGE],operation:'product.create',route:`/admin/platform/sites/${siteId}/commerce`})
    const supabase=await createClient();const {data,error}=await supabase.rpc('create_commerce_product',{p_site_id:siteId,p_title:title,p_slug:slug,p_sku:sku,p_currency:currency,p_amount_minor:amount,p_initial_stock:stock,p_location_name:text(fd,'location_name')||'Main',p_location_code:(text(fd,'location_code')||'MAIN').toUpperCase()})
    if(error)return failure(error,'commerce.product.create_failed',siteId,l('ساخت محصول انجام نشد.','The product could not be created.'),{title,slug,sku})
    refresh(siteId);const row=Array.isArray(data)?data[0]:data
    return{ok:true,message:l(`محصول ساخته شد${row&&typeof row==='object'&&'product_id'in row?` · ${String(row.product_id)}`:''}.`,`Product created${row&&typeof row==='object'&&'product_id'in row?` · ${String(row.product_id)}`:''}.`),nonce:Date.now()}
  }catch(error){return failure(error,'commerce.product.create_failed',siteId,l('ساخت محصول انجام نشد.','The product could not be created.'),{title,slug,sku})}
}

export async function adjustInventoryAction(_state:CommerceActionState,fd:FormData):Promise<CommerceActionState>{
  const{l}=await translator()
  const siteId=text(fd,'site_id'),variantId=text(fd,'variant_id'),locationId=text(fd,'location_id'),delta=int(text(fd,'quantity_delta'))
  if(!uuid.test(siteId)||!uuid.test(variantId)||!uuid.test(locationId)||delta===0)return{ok:false,message:l('اطلاعات تغییر موجودی معتبر نیست.','The inventory adjustment is invalid.'),nonce:Date.now()}
  try{
    await authorizeSiteFeature({siteId,moduleKey:'commerce',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.COMMERCE_INVENTORY_MANAGE,PERMISSIONS.COMMERCE_MANAGE],operation:'inventory.adjust',route:`/admin/platform/sites/${siteId}/commerce`})
    const supabase=await createClient();const {data,error}=await supabase.rpc('adjust_inventory',{p_site_id:siteId,p_variant_id:variantId,p_location_id:locationId,p_quantity_delta:delta,p_reason:text(fd,'reason')||null})
    if(error)return failure(error,'commerce.inventory.adjust_failed',siteId,l('تغییر موجودی انجام نشد.','The inventory could not be adjusted.'),{variantId,locationId,delta})
    refresh(siteId);const row=Array.isArray(data)?data[0]:data
    return{ok:true,message:l(`موجودی به‌روزرسانی شد${row&&typeof row==='object'&&'available'in row?` · قابل فروش: ${String(row.available)}`:''}.`,`Inventory updated${row&&typeof row==='object'&&'available'in row?` · Available: ${String(row.available)}`:''}.`),nonce:Date.now()}
  }catch(error){return failure(error,'commerce.inventory.adjust_failed',siteId,l('تغییر موجودی انجام نشد.','The inventory could not be adjusted.'),{variantId,locationId,delta})}
}

export async function createDraftOrderAction(_state:CommerceActionState,fd:FormData):Promise<CommerceActionState>{
  const{l}=await translator()
  const siteId=text(fd,'site_id'),orderNumber=text(fd,'order_number').toUpperCase(),currency=(text(fd,'currency')||'IRR').toUpperCase(),variantId=text(fd,'variant_id'),quantity=Math.max(1,int(text(fd,'quantity'),1))
  if(!uuid.test(siteId)||orderNumber.length<3||!/^[A-Z]{3}$/.test(currency)||!uuid.test(variantId))return{ok:false,message:l('اطلاعات سفارش معتبر نیست.','The order information is invalid.'),nonce:Date.now()}
  try{
    await authorizeSiteFeature({siteId,moduleKey:'commerce',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.COMMERCE_ORDERS_MANAGE,PERMISSIONS.COMMERCE_MANAGE],operation:'order.create',route:`/admin/platform/sites/${siteId}/commerce`})
    const supabase=await createClient();const {data,error}=await supabase.rpc('create_draft_order',{p_site_id:siteId,p_order_number:orderNumber,p_currency:currency,p_customer_email:text(fd,'customer_email')||null,p_customer_name:text(fd,'customer_name')||null,p_items:[{variant_id:variantId,quantity}]})
    if(error)return failure(error,'commerce.order.create_failed',siteId,l('ساخت سفارش انجام نشد.','The order could not be created.'),{orderNumber,variantId,quantity})
    refresh(siteId);return{ok:true,message:l(`سفارش پیش‌نویس ساخته شد${typeof data==='string'?` · ${data}`:''}.`,`Draft order created${typeof data==='string'?` · ${data}`:''}.`),nonce:Date.now()}
  }catch(error){return failure(error,'commerce.order.create_failed',siteId,l('ساخت سفارش انجام نشد.','The order could not be created.'),{orderNumber,variantId,quantity})}
}
