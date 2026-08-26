'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'

export type StarterActionState={ok?:boolean;message?:string;errorId?:string;nonce?:number}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function knownMessage(message:string){
  const known:Record<string,string>={
    permission_denied:'این حساب اجازه نصب بسته شروع روی این سایت را ندارد.',feature_not_entitled:'ماژول CMS این سایت فعال نیست.',
    incompatible_template:'قالب انتخاب‌شده با این بسته سازگار نیست.',locale_unavailable:'یکی از زبان‌های انتخاب‌شده در بسته موجود نیست.',
    content_conflict:'یکی از آدرس‌های صفحات از قبل استفاده شده است.',invalid_locales:'انتخاب زبان معتبر نیست.',
    invalid_brand_inputs:'اطلاعات برند معتبر نیست.',idempotency_key_reused:'این درخواست قبلاً با تنظیمات دیگری استفاده شده است.'
  }
  return Object.entries(known).find(([key])=>message.includes(key))?.[1]
}

export async function installStarterAction(_state:StarterActionState,formData:FormData):Promise<StarterActionState>{
  const siteId=String(formData.get('site_id')??'')
  const packVersionId=String(formData.get('pack_version_id')??'')
  const templateVersionId=String(formData.get('template_version_id')??'')
  const idempotencyKey=String(formData.get('idempotency_key')??'')
  const brandName=String(formData.get('brand_name')??'').trim()
  const locales=['fa','en'].filter(locale=>formData.get(`locale_${locale}`)==='on')
  if(![siteId,packVersionId,templateVersionId,idempotencyKey].every(value=>uuid.test(value))) return {ok:false,message:'شناسه‌های درخواست معتبر نیستند.',nonce:Date.now()}
  if(!locales.length||brandName.length>120) return {ok:false,message:'حداقل یک زبان و نام برند حداکثر ۱۲۰ نویسه لازم است.',nonce:Date.now()}
  try{
    await authorizeSiteFeature({siteId,moduleKey:'cms',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.STARTER_PACKS_INSTALL],route:`/admin/platform/sites/${siteId}/starter`,operation:'starter.install'})
    const supabase=await createClient()
    const {data,error}=await supabase.rpc('install_starter_pack',{p_site_id:siteId,p_starter_pack_version_id:packVersionId,p_template_version_id:templateVersionId,p_idempotency_key:idempotencyKey,p_locales:locales,p_brand_inputs:{name:brandName}})
    if(error) throw error
    const result=data as {installation_id?:string;pages_created?:number;idempotent_replay?:boolean}|null
    revalidatePath(`/admin/platform/sites/${siteId}/starter`);revalidatePath(`/admin/pages`);revalidatePath(`/admin/platform/sites/${siteId}/design`)
    return {ok:true,message:result?.idempotent_replay?'این نصب قبلاً انجام شده بود؛ همان نتیجه امن نمایش داده شد.':`${result?.pages_created??0} صفحه Draft ساخته شد. برای نمایش عمومی هنوز بازبینی و Publish لازم است.`,nonce:Date.now()}
  }catch(error){
    const text=error instanceof Error?error.message:String(error)
    const publicMessage=error instanceof FeatureAccessError?(error.code==='permission_denied'?'Permission لازم برای نصب وجود ندارد.':'CMS این سایت فعال نیست.'):knownMessage(text)??'نصب کامل نشد.'
    const trace=createTraceContext()
    const logged=await recordErrorEvent({error,category:'starter.installation',eventType:'starter.install.failed',publicMessage,siteId,route:`/admin/platform/sites/${siteId}/starter`,context:{siteId},requestId:trace.requestId,correlationId:trace.correlationId,severity:'warning',explanationFa:'نصب بسته شروع پیش از انتشار عمومی متوقف شد.',explanationEn:'Starter installation stopped before public publishing.'})
    const first=Array.isArray(logged.data)?logged.data[0]:logged.data
    const errorId=first&&typeof first==='object'&&'error_id' in first?String(first.error_id):undefined
    return {ok:false,message:errorId?`${publicMessage} شناسه خطا: ${errorId}`:publicMessage,errorId,nonce:Date.now()}
  }
}
