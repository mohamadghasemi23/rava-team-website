'use server'

import {revalidatePath} from 'next/cache'
import {createClient} from '@/lib/supabase/server'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import {PERMISSIONS,hasPermission} from '@/lib/authz/permissions'
import {recordAuditEvent} from '@/lib/observability/events'
import type {AdminActionState} from '@/app/admin/components/ActionForm'

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function updateMessageStatus(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const id=String(formData.get('id')??''),status=String(formData.get('status')??'')
  if(!UUID_RE.test(id)||!['replied','closed'].includes(status))return{ok:false,message:l('درخواست معتبر نیست.','The request is invalid.'),nonce:Date.now()}
  const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)return{ok:false,message:l('نشست شما معتبر نیست.','Your session is not valid.'),nonce:Date.now()}
  const{data:lead}=await supabase.from('leads').select('id,site_id,status').eq('id',id).maybeSingle()
  if(!lead?.site_id)return{ok:false,message:l('پیام پیدا نشد.','The message was not found.'),nonce:Date.now()}
  const{data:site}=await supabase.from('sites').select('organization_id').eq('id',lead.site_id).maybeSingle()
  const allowed=site&&await hasPermission(PERMISSIONS.LEADS_MANAGE,{organizationId:site.organization_id,siteId:lead.site_id})
  if(!allowed)return{ok:false,message:l('اجازه تغییر این پیام را ندارید.','You cannot change this message.'),nonce:Date.now()}
  const{data:updated,error}=await supabase.from('leads').update({status,updated_at:new Date().toISOString()}).eq('id',id).eq('site_id',lead.site_id).select('id').maybeSingle()
  if(error||!updated)return{ok:false,message:l('وضعیت پیام تغییر نکرد.','The message status could not be changed.'),nonce:Date.now()}
  await recordAuditEvent({action:status==='replied'?'lead.resolved':'lead.archived',entityType:'lead',entityId:id,organizationId:site.organization_id,siteId:lead.site_id,before:{status:lead.status},after:{status},context:{source:'customer_messages'},severity:'notice'})
  revalidatePath('/admin');revalidatePath('/admin/messages')
  return{ok:true,message:status==='replied'?l('پیام به‌عنوان رسیدگی‌شده ثبت شد.','The message was marked as resolved.'):l('پیام بایگانی شد.','The message was archived.'),nonce:Date.now()}
}
