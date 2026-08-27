'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, PERMISSIONS } from '@/lib/authz/permissions'
import { createTraceContext, recordAuditEvent, recordErrorEvent, recordSecurityEvent } from '@/lib/observability/events'
import { getAdminLocale } from '@/lib/i18n/admin-locale'

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BYTES=10*1024*1024
const MIME_EXTENSIONS:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}

export type MediaAsset={id:string;storage_path:string;file_name:string;mime_type:string;alt_text:string;size_bytes:number|null;created_at:string}
export type MediaActionResult={ok:boolean;message:string;asset?:MediaAsset;errorId?:string}
type Scope={siteId:string;organizationId:string}
async function translator(){const locale=await getAdminLocale();return{locale,l:(fa:string,en:string)=>locale==='fa'?fa:en}}

async function actor(){
  const supabase=await createClient();const{data:claims}=await supabase.auth.getClaims();const userId=String(claims?.claims?.sub??'')
  if(!UUID_RE.test(userId))return null
  const{data:profile}=await supabase.from('profiles').select('active').eq('id',userId).maybeSingle()
  return profile?.active?{supabase,userId}:null
}

async function authorizeSite(supabase:Awaited<ReturnType<typeof createClient>>,siteId:string):Promise<Scope|null>{
  if(!UUID_RE.test(siteId))return null
  const{data:site}=await supabase.from('sites').select('id,organization_id').eq('id',siteId).maybeSingle();if(!site)return null
  const scope={siteId:site.id,organizationId:site.organization_id}
  if(await hasPermission(PERMISSIONS.MEDIA_MANAGE,{organizationId:scope.organizationId,siteId:scope.siteId}))return scope
  await recordSecurityEvent({eventType:'media.permission_denied',outcome:'blocked',organizationId:scope.organizationId,siteId:scope.siteId,route:'/admin/media',context:{permission:PERMISSIONS.MEDIA_MANAGE},severity:'warning'})
  return null
}

function detectedMime(bytes:Uint8Array){
  if(bytes.length>=4&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return'image/jpeg'
  if(bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v))return'image/png'
  const ascii=(start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length))
  if(bytes.length>=6&&['GIF87a','GIF89a'].includes(ascii(0,6)))return'image/gif'
  if(bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')return'image/webp'
  return null
}

async function operationalFailure(error:unknown,scope:Scope|undefined,eventType:string,message:string):Promise<MediaActionResult>{
  const{locale}=await translator()
  const trace=createTraceContext();const logged=await recordErrorEvent({error,category:'media.library',eventType,publicMessage:message,organizationId:scope?.organizationId,siteId:scope?.siteId,route:'/admin/media',requestId:trace.requestId,correlationId:trace.correlationId,context:{source:'admin_media'}})
  const first=Array.isArray(logged.data)?logged.data[0]:logged.data;const errorId=first&&typeof first==='object'&&'error_id'in first?String(first.error_id):undefined
  return{ok:false,message:errorId?`${message} ${locale==='fa'?'شناسه خطا':'Error ID'}: ${errorId}`:message,errorId}
}

export async function uploadMedia(formData:FormData):Promise<MediaActionResult>{
  const{l}=await translator();const current=await actor();if(!current)return{ok:false,message:l('نشست کاربری معتبر نیست.','The user session is invalid.')}
  const siteId=String(formData.get('site_id')??'');const scope=await authorizeSite(current.supabase,siteId);if(!scope)return{ok:false,message:l('سایت پیدا نشد یا اجازه مدیریت رسانه آن را ندارید.','The site was not found or you cannot manage its media.')}
  const value=formData.get('file');if(!(value instanceof File)||value.size<1||value.size>MAX_BYTES)return{ok:false,message:l('فایل باید تصویری و حداکثر ۱۰ مگابایت باشد.','The file must be an image no larger than 10 MB.')}
  if(value.name.length>180)return{ok:false,message:l('نام فایل بیش از حد طولانی است.','The file name is too long.')}
  const alt=String(formData.get('alt_text')??'').trim();if(alt.length>300)return{ok:false,message:l('متن جایگزین باید حداکثر ۳۰۰ نویسه باشد.','Alternative text must be at most 300 characters.')}
  const bytes=new Uint8Array(await value.arrayBuffer());const mime=detectedMime(bytes)
  if(!mime||value.type!==mime||!MIME_EXTENSIONS[mime])return{ok:false,message:l('فرمت واقعی فایل معتبر نیست. فقط قالب‌های تصویری مجاز پذیرفته می‌شوند.','The actual file format is invalid. Only supported image formats are accepted.')}
  const path=`${scope.siteId}/${randomUUID()}.${MIME_EXTENSIONS[mime]}`
  try{
    const uploaded=await current.supabase.storage.from('rava-media').upload(path,bytes,{cacheControl:'31536000',upsert:false,contentType:mime})
    if(uploaded.error)throw uploaded.error
    const{data,error}=await current.supabase.from('media_assets').insert({site_id:scope.siteId,storage_path:path,file_name:value.name,mime_type:mime,alt_text:alt,size_bytes:value.size,uploaded_by:current.userId}).select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at').single()
    if(error||!data){await current.supabase.storage.from('rava-media').remove([path]);throw error??new Error('media metadata insert failed')}
    await recordAuditEvent({action:'media.asset.uploaded',entityType:'media_asset',entityId:data.id,organizationId:scope.organizationId,siteId:scope.siteId,after:{fileName:value.name,mimeType:mime,sizeBytes:value.size,storagePath:path},context:{source:'admin_media'},severity:'notice'})
    revalidatePath('/admin/media');return{ok:true,message:l('تصویر با موفقیت بارگذاری شد.','The image was uploaded successfully.'),asset:data as MediaAsset}
  }catch(error){return operationalFailure(error,scope,'media.asset.upload_failed',l('بارگذاری تصویر انجام نشد.','The image could not be uploaded.'))}
}

async function assetScope(id:string){
  const current=await actor();if(!current||!UUID_RE.test(id))return null
  const{data:asset}=await current.supabase.from('media_assets').select('id,site_id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at').eq('id',id).is('deleted_at',null).maybeSingle();if(!asset?.site_id)return null
  const scope=await authorizeSite(current.supabase,asset.site_id);return scope?{...current,scope,asset}:null
}

export async function updateMediaAlt(id:string,value:string):Promise<MediaActionResult>{
  const{l}=await translator();const alt=value.trim();if(!UUID_RE.test(id)||alt.length>300)return{ok:false,message:l('شناسه یا متن جایگزین معتبر نیست.','The ID or alternative text is invalid.')}
  const scoped=await assetScope(id);if(!scoped)return{ok:false,message:l('تصویر پیدا نشد یا اجازه ویرایش آن را ندارید.','The image was not found or you cannot edit it.')}
  const{data,error}=await scoped.supabase.from('media_assets').update({alt_text:alt}).eq('id',id).eq('site_id',scoped.scope.siteId).select('id').single()
  if(error||!data)return operationalFailure(error,scoped.scope,'media.asset.alt_update_failed',l('ویرایش متن جایگزین انجام نشد.','The alternative text could not be updated.'))
  await recordAuditEvent({action:'media.asset.alt_updated',entityType:'media_asset',entityId:id,organizationId:scoped.scope.organizationId,siteId:scoped.scope.siteId,before:{altText:scoped.asset.alt_text},after:{altText:alt},context:{source:'admin_media'}})
  revalidatePath('/admin/media');return{ok:true,message:l('متن جایگزین با موفقیت ذخیره شد.','The alternative text was saved successfully.')}
}

export async function deleteMedia(id:string):Promise<MediaActionResult>{
  const{l}=await translator();const scoped=await assetScope(id);if(!scoped)return{ok:false,message:l('تصویر پیدا نشد یا اجازه حذف آن را ندارید.','The image was not found or you cannot delete it.')}
  const deletedAt=new Date().toISOString();const marked=await scoped.supabase.from('media_assets').update({deleted_at:deletedAt}).eq('id',id).eq('site_id',scoped.scope.siteId).select('id').single()
  if(marked.error||!marked.data)return operationalFailure(marked.error,scoped.scope,'media.asset.delete_failed',l('حذف تصویر انجام نشد.','The image could not be deleted.'))
  const removed=await scoped.supabase.storage.from('rava-media').remove([scoped.asset.storage_path])
  if(removed.error){await scoped.supabase.from('media_assets').update({deleted_at:null}).eq('id',id).eq('site_id',scoped.scope.siteId);return operationalFailure(removed.error,scoped.scope,'media.asset.storage_delete_failed',l('حذف فایل از فضای ذخیره‌سازی انجام نشد.','The file could not be removed from storage.'))}
  await recordAuditEvent({action:'media.asset.deleted',entityType:'media_asset',entityId:id,organizationId:scoped.scope.organizationId,siteId:scoped.scope.siteId,before:{fileName:scoped.asset.file_name,mimeType:scoped.asset.mime_type,sizeBytes:scoped.asset.size_bytes,storagePath:scoped.asset.storage_path},context:{source:'admin_media'},severity:'notice'})
  revalidatePath('/admin/media');return{ok:true,message:l('تصویر با موفقیت حذف شد.','The image was deleted successfully.')}
}
