'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'
import { getAdminLocale } from '@/lib/i18n/admin-locale'

export type StarterActionState={ok?:boolean;message?:string;errorId?:string;nonce?:number}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function knownMessage(message:string,locale:'fa'|'en'){
  const known:Record<string,[string,string]>={
    permission_denied:['این حساب اجازه نصب بسته شروع روی این سایت را ندارد.','This account cannot install a starter pack on this site.'],feature_not_entitled:['ماژول مدیریت محتوا برای این سایت فعال نیست.','The content management module is not active for this site.'],
    incompatible_template:['قالب انتخاب‌شده با این بسته سازگار نیست.','The selected template is not compatible with this pack.'],locale_unavailable:['یکی از زبان‌های انتخاب‌شده در بسته موجود نیست.','One of the selected languages is unavailable in this pack.'],
    content_conflict:['یکی از آدرس‌های صفحات از قبل استفاده شده است.','One of the page addresses is already in use.'],invalid_locales:['انتخاب زبان معتبر نیست.','The language selection is invalid.'],
    invalid_brand_inputs:['اطلاعات برند معتبر نیست.','The brand information is invalid.'],idempotency_key_reused:['این درخواست قبلاً با تنظیمات دیگری استفاده شده است.','This request was previously used with different settings.']
  }
  const pair=Object.entries(known).find(([key])=>message.includes(key))?.[1];return pair?.[locale==='fa'?0:1]
}

export async function installStarterAction(_state:StarterActionState,formData:FormData):Promise<StarterActionState>{
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const siteId=String(formData.get('site_id')??'')
  const packVersionId=String(formData.get('pack_version_id')??'')
  const templateVersionId=String(formData.get('template_version_id')??'')
  const idempotencyKey=String(formData.get('idempotency_key')??'')
  const brandName=String(formData.get('brand_name')??'').trim()
  const locales=['fa','en'].filter(locale=>formData.get(`locale_${locale}`)==='on')
  if(![siteId,packVersionId,templateVersionId,idempotencyKey].every(value=>uuid.test(value))) return {ok:false,message:l('شناسه‌های درخواست معتبر نیستند.','The request identifiers are invalid.'),nonce:Date.now()}
  if(!locales.length||brandName.length>120) return {ok:false,message:l('حداقل یک زبان و نام برند حداکثر ۱۲۰ نویسه لازم است.','Select at least one language and use a brand name of at most 120 characters.'),nonce:Date.now()}
  try{
    await authorizeSiteFeature({siteId,moduleKey:'cms',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.STARTER_PACKS_INSTALL],route:`/admin/platform/sites/${siteId}/starter`,operation:'starter.install'})
    const supabase=await createClient()
    const {data,error}=await supabase.rpc('install_starter_pack',{p_site_id:siteId,p_starter_pack_version_id:packVersionId,p_template_version_id:templateVersionId,p_idempotency_key:idempotencyKey,p_locales:locales,p_brand_inputs:{name:brandName}})
    if(error) throw error
    const result=data as {installation_id?:string;pages_created?:number;idempotent_replay?:boolean}|null
    revalidatePath(`/admin/platform/sites/${siteId}/starter`);revalidatePath(`/admin/pages`);revalidatePath(`/admin/platform/sites/${siteId}/design`)
    return {ok:true,message:result?.idempotent_replay?l('این نصب قبلاً انجام شده بود؛ همان نتیجه امن نمایش داده شد.','This installation was already completed; the same safe result is shown.'):l(`${result?.pages_created??0} صفحه پیش‌نویس ساخته شد. برای نمایش عمومی هنوز بازبینی و انتشار لازم است.`,`${result?.pages_created??0} draft pages were created. Review and publishing are still required before public display.`),nonce:Date.now()}
  }catch(error){
    const text=error instanceof Error?error.message:String(error)
    const publicMessage=error instanceof FeatureAccessError?(error.code==='permission_denied'?l('مجوز لازم برای نصب وجود ندارد.','The required installation permission is missing.'):l('سامانه مدیریت محتوای این سایت فعال نیست.','Content management is not active for this site.')):knownMessage(text,locale)??l('نصب کامل نشد.','The installation did not complete.')
    const trace=createTraceContext()
    const logged=await recordErrorEvent({error,category:'starter.installation',eventType:'starter.install.failed',publicMessage,siteId,route:`/admin/platform/sites/${siteId}/starter`,context:{siteId},requestId:trace.requestId,correlationId:trace.correlationId,severity:'warning',explanationFa:'نصب بسته شروع پیش از انتشار عمومی متوقف شد.',explanationEn:'Starter installation stopped before public publishing.'})
    const first=Array.isArray(logged.data)?logged.data[0]:logged.data
    const errorId=first&&typeof first==='object'&&'error_id' in first?String(first.error_id):undefined
    return {ok:false,message:errorId?`${publicMessage} ${l('شناسه خطا','Error ID')}: ${errorId}`:publicMessage,errorId,nonce:Date.now()}
  }
}
