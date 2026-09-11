'use server'

import {createClient} from '@/lib/supabase/server'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import {hasPermission,PERMISSIONS} from '@/lib/authz/permissions'
import {AiProviderError,generateSeoWithOpenAI} from '@/lib/ai/providers/openai-responses'
import {recordAuditEvent,recordErrorEvent,recordSecurityEvent} from '@/lib/observability/events'

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type SeoSuggestionState={ok:boolean;message:string;suggestion?:{title:string;description:string;focusKeyword:string;reasoning:string}}

export async function requestSeoSuggestion(pageId:string):Promise<SeoSuggestionState>{
 const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
 if(!UUID_RE.test(pageId))return{ok:false,message:l('صفحه معتبر نیست.','The page is invalid.')}
 const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)return{ok:false,message:l('برای ادامه دوباره وارد شوید.','Sign in again to continue.')}
 const{data:page}=await supabase.from('pages').select('id,site_id,title,slug').eq('id',pageId).maybeSingle();if(!page?.site_id)return{ok:false,message:l('صفحه پیدا نشد.','The page was not found.')}
 const{data:site}=await supabase.from('sites').select('id,organization_id,name,primary_locale').eq('id',page.site_id).maybeSingle();if(!site)return{ok:false,message:l('سایت پیدا نشد.','The site was not found.')}
 const ownerAllowed=await hasPermission(PERMISSIONS.PLATFORM_SITES_MANAGE,{organizationId:site.organization_id,siteId:site.id})
 if(!ownerAllowed){await recordSecurityEvent({eventType:'seo.ai.access_blocked',outcome:'blocked',organizationId:site.organization_id,siteId:site.id,route:`/admin/pages/${pageId}`,severity:'notice',context:{reason:'owner_preview_only'}});return{ok:false,message:l('پیشنهاد هوشمند فعلاً فقط برای مالک راوا فعال است.','AI suggestions are currently available only to the RAVA owner.')}}
 const{data:blocks}=await supabase.from('page_blocks').select('block_type,data').eq('page_id',pageId).eq('visible',true).order('position')
 const content=(blocks??[]).map(block=>{const data=block.data&&typeof block.data==='object'?block.data as Record<string,unknown>:{};return[block.block_type,data.title,data.text,data.caption].filter(value=>typeof value==='string').join('\n')}).join('\n\n').slice(0,6000)
 try{const suggestion=await generateSeoWithOpenAI({locale:site.primary_locale?.startsWith('fa')?'fa':'en',siteName:site.name,pageTitle:page.title,slug:page.slug,content});await recordAuditEvent({action:'seo.ai.suggestion_generated',entityType:'page',entityId:page.id,organizationId:site.organization_id,siteId:site.id,after:{titleLength:suggestion.title.length,descriptionLength:suggestion.description.length,focusKeyword:suggestion.focusKeyword},context:{provider:'openai',humanApprovalRequired:true},severity:'info'});return{ok:true,message:l('پیشنهاد آماده است؛ قبل از استفاده آن را مقایسه و تأیید کنید.','The suggestion is ready. Compare and approve it before applying.'),suggestion}}
 catch(error){const notConfigured=error instanceof AiProviderError&&error.code==='provider_not_configured';await recordErrorEvent({error,category:'ai_provider',eventType:notConfigured?'seo.ai.provider_disabled':'seo.ai.suggestion_failed',publicMessage:notConfigured?l('پیشنهاد هوشمند فعلاً فعال نیست.','AI suggestions are currently disabled.'):l('ساخت پیشنهاد هوشمند انجام نشد.','The AI suggestion could not be generated.'),organizationId:site.organization_id,siteId:site.id,route:`/admin/pages/${pageId}`,context:{provider:'openai',configured:!notConfigured},severity:notConfigured?'info':'warning'});return{ok:false,message:notConfigured?l('پیشنهاد هوشمند فعلاً فعال نیست؛ سایر امکانات بدون محدودیت در دسترس‌اند.','AI suggestions are currently disabled; all other features remain available.'):l('پیشنهاد هوشمند آماده نشد. تنظیمات اتصال یا سرویس را بررسی کنید.','The AI suggestion is unavailable. Check the provider configuration or service.')}}
}
