'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, PERMISSIONS } from '@/lib/authz/permissions'
import { recordAuditEvent, recordSecurityEvent } from '@/lib/observability/events'
import { getAdminLocale } from '@/lib/i18n/admin-locale'

export type AdminActionState = { ok?: boolean; message?: string; redirectTo?: string; nonce?: number }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getActor() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('active').eq('id', userId).single()
  if (!profile?.active) redirect('/admin')
  return { supabase, userId }
}

type Scope = { siteId: string; organizationId: string }

async function siteScope(supabase: Awaited<ReturnType<typeof createClient>>, siteId: string): Promise<Scope | null> {
  if (!UUID_RE.test(siteId)) return null
  const { data } = await supabase.from('sites').select('id,organization_id').eq('id', siteId).maybeSingle()
  return data ? { siteId: data.id, organizationId: data.organization_id } : null
}

async function pageScope(supabase: Awaited<ReturnType<typeof createClient>>, pageId: string) {
  if (!UUID_RE.test(pageId)) return null
  const { data: page } = await supabase.from('pages').select('id,site_id,title,slug,status').eq('id', pageId).maybeSingle()
  if (!page?.site_id) return null
  const scope = await siteScope(supabase, page.site_id)
  return scope ? { ...scope, page } : null
}

async function authorize(scope: Scope, permission: typeof PERMISSIONS.CMS_MANAGE | typeof PERMISSIONS.CMS_PUBLISH) {
  const allowed = await hasPermission(permission, { organizationId: scope.organizationId, siteId: scope.siteId })
  if (!allowed) {
    await recordSecurityEvent({ eventType: 'cms.permission_denied', outcome: 'blocked', organizationId: scope.organizationId, siteId: scope.siteId, route: '/admin/pages', context: { permission }, severity: 'warning' })
  }
  return allowed
}

function cleanSlug(value: string) { return value.trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06ff-]/g, '') }
function errorMessage(error: { code?: string; message?: string } | null, fallback: string, duplicate: string) {
  if (!error) return fallback
  if (error.code === '23505') return duplicate
  return fallback
}

export async function createPage(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const { supabase, userId } = await getActor(); const title = String(formData.get('title') ?? '').trim(); const slug = cleanSlug(String(formData.get('slug') ?? '')); const scope=await siteScope(supabase,String(formData.get('site_id')??''))
  if (!title || !slug || !scope) return { ok:false, message:l('عنوان، آدرس یا سایت انتخاب‌شده معتبر نیست.','The title, address, or selected site is invalid.'), nonce:Date.now() }
  if(!await authorize(scope,PERMISSIONS.CMS_MANAGE)) return {ok:false,message:l('اجازه ساخت صفحه برای این سایت را ندارید.','You cannot create a page for this site.'),nonce:Date.now()}
  const { data,error } = await supabase.from('pages').insert({ site_id:scope.siteId,title,slug,status:'draft',created_by:userId,updated_by:userId }).select('id').single()
  if (error || !data) return { ok:false,message:errorMessage(error,l('ساخت صفحه انجام نشد.','The page could not be created.'),l('این آدرس صفحه قبلاً استفاده شده است. یک آدرس دیگر انتخاب کنید.','This page address is already in use. Choose another address.')),nonce:Date.now() }
  await recordAuditEvent({action:'cms.page.created',entityType:'page',entityId:data.id,organizationId:scope.organizationId,siteId:scope.siteId,after:{title,slug,status:'draft'},context:{source:'admin_pages'}})
  revalidatePath('/admin'); revalidatePath('/admin/pages')
  return { ok:true,message:l(`صفحه «${title}» با موفقیت ساخته شد.`,`Page “${title}” was created successfully.`),redirectTo:`/admin/pages/${data.id}`,nonce:Date.now() }
}

export async function updatePage(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const { supabase,userId }=await getActor(); const id=String(formData.get('id')??''); const title=String(formData.get('title')??'').trim(); const slug=cleanSlug(String(formData.get('slug')??'')); const status=String(formData.get('status')??'draft'); const seoTitle=String(formData.get('seo_title')??'').trim(); const seoDescription=String(formData.get('seo_description')??'').trim()
  if(!id||!title||!slug||seoTitle.length>70||seoDescription.length>180||!['draft','published','hidden','scheduled'].includes(status)) return {ok:false,message:l('اطلاعات فرم کامل یا معتبر نیست؛ عنوان گوگل حداکثر ۷۰ و توضیح گوگل حداکثر ۱۸۰ نویسه است.','The form is invalid. The Google title is limited to 70 characters and its description to 180.'),nonce:Date.now()}
  const scoped=await pageScope(supabase,id);if(!scoped||!await authorize(scoped,PERMISSIONS.CMS_MANAGE)||status==='published'&&!await authorize(scoped,PERMISSIONS.CMS_PUBLISH))return{ok:false,message:l('صفحه پیدا نشد یا اجازه این تغییر را ندارید.','The page was not found or you cannot make this change.'),nonce:Date.now()}
  const {data,error}=await supabase.from('pages').update({title,slug,status,seo:{title:seoTitle,description:seoDescription},published_at:status==='published'?new Date().toISOString():null,updated_by:userId,updated_at:new Date().toISOString()}).eq('id',id).eq('site_id',scoped.siteId).select('id').single()
  if(error||!data)return{ok:false,message:errorMessage(error,l('ویرایش صفحه انجام نشد.','The page could not be updated.'),l('این آدرس صفحه قبلاً استفاده شده است. یک آدرس دیگر انتخاب کنید.','This page address is already in use. Choose another address.')),nonce:Date.now()}
  await recordAuditEvent({action:'cms.page.updated',entityType:'page',entityId:id,organizationId:scoped.organizationId,siteId:scoped.siteId,before:{title:scoped.page.title,slug:scoped.page.slug,status:scoped.page.status},after:{title,slug,status},context:{source:'admin_pages'}})
  revalidatePath('/admin');revalidatePath('/admin/pages');revalidatePath(`/admin/pages/${id}`);revalidatePath(`/${slug}`)
  return{ok:true,message:l(`تغییرات صفحه «${title}» با موفقیت ذخیره شد.`,`Changes to page “${title}” were saved successfully.`),nonce:Date.now()}
}

export async function setPageStatus(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en;const {supabase,userId}=await getActor();const id=String(formData.get('id')??'');const status=String(formData.get('status')??'');if(!id||!['draft','published','hidden'].includes(status))return{ok:false,message:l('وضعیت انتخاب‌شده معتبر نیست.','The selected status is invalid.'),nonce:Date.now()};const scoped=await pageScope(supabase,id);const permission=status==='published'?PERMISSIONS.CMS_PUBLISH:PERMISSIONS.CMS_MANAGE;if(!scoped||!await authorize(scoped,permission))return{ok:false,message:l('صفحه پیدا نشد یا اجازه تغییر وضعیت آن را ندارید.','The page was not found or you cannot change its status.'),nonce:Date.now()};const{error}=await supabase.from('pages').update({status,published_at:status==='published'?new Date().toISOString():null,updated_by:userId,updated_at:new Date().toISOString()}).eq('id',id).eq('site_id',scoped.siteId);if(error)return{ok:false,message:errorMessage(error,l('تغییر وضعیت صفحه انجام نشد.','The page status could not be changed.'),l('این آدرس صفحه قبلاً استفاده شده است.','This page address is already in use.')),nonce:Date.now()};await recordAuditEvent({action:status==='published'?'cms.page.published':'cms.page.status_changed',entityType:'page',entityId:id,organizationId:scoped.organizationId,siteId:scoped.siteId,before:{status:scoped.page.status},after:{status},context:{source:'admin_pages'},severity:status==='published'?'notice':'info'});revalidatePath('/admin');revalidatePath('/admin/pages');return{ok:true,message:status==='published'?l('صفحه با موفقیت منتشر شد.','The page was published successfully.'):status==='hidden'?l('صفحه با موفقیت مخفی شد.','The page was hidden successfully.'):l('صفحه به پیش‌نویس منتقل شد.','The page was moved to draft.'),nonce:Date.now()}
}

export async function createBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en;const {supabase}=await getActor();const pageId=String(formData.get('page_id')??'');const blockType=String(formData.get('block_type')??'text');const scoped=await pageScope(supabase,pageId);if(!scoped||!await authorize(scoped,PERMISSIONS.CMS_MANAGE))return{ok:false,message:l('صفحه پیدا نشد یا اجازه ویرایش آن را ندارید.','The page was not found or you cannot edit it.'),nonce:Date.now()};
 const {data:last}=await supabase.from('page_blocks').select('position').eq('page_id',pageId).order('position',{ascending:false}).limit(1).maybeSingle();
 const defaults:Record<string,object>={hero:{title:l('عنوان اصلی','Main heading'),text:l('توضیح کوتاه این بخش','A short description of this section'),button_label:l('بیشتر بدانید','Learn more'),button_url:'#'},text:{title:l('عنوان بخش','Section heading'),text:l('متن این بخش را وارد کنید.','Enter this section’s content.')},image:{url:'',alt:'',caption:''},cta:{title:l('آماده شروع هستید؟','Ready to get started?'),text:l('برای شروع همکاری با ما در تماس باشید.','Contact us to begin working together.'),button_label:l('تماس با ما','Contact us'),button_url:'/contact'},gallery:{title:l('گالری','Gallery'),images:[]}};
 const {error}=await supabase.from('page_blocks').insert({page_id:pageId,block_type:blockType,position:(last?.position??-1)+1,visible:true,data:defaults[blockType]??{}});if(error)return{ok:false,message:errorMessage(error,l('افزودن بخش انجام نشد.','The block could not be added.'),l('این آدرس قبلاً استفاده شده است.','This address is already in use.')),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:l('بخش جدید با موفقیت اضافه شد.','The new block was added successfully.'),nonce:Date.now()}
}

export async function updateBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en;const {supabase}=await getActor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const blockType=String(formData.get('block_type')??'text');const scoped=await pageScope(supabase,pageId);if(!scoped||!UUID_RE.test(id)||!await authorize(scoped,PERMISSIONS.CMS_MANAGE))return{ok:false,message:l('بخش پیدا نشد یا اجازه ویرایش آن را ندارید.','The block was not found or you cannot edit it.'),nonce:Date.now()};let data:Record<string,unknown>={};
 if(blockType==='hero'||blockType==='text'||blockType==='cta')data={title:String(formData.get('title')??''),text:String(formData.get('text')??'')};
 if(blockType==='hero'||blockType==='cta')data={...data,button_label:String(formData.get('button_label')??''),button_url:String(formData.get('button_url')??'')};
 if(blockType==='image')data={url:String(formData.get('url')??''),alt:String(formData.get('alt')??''),caption:String(formData.get('caption')??'')};
 if(blockType==='gallery')data={title:String(formData.get('title')??''),images:String(formData.get('images')??'').split('\n').map(x=>x.trim()).filter(Boolean)};
 const {error}=await supabase.from('page_blocks').update({data,updated_at:new Date().toISOString()}).eq('id',id).eq('page_id',pageId);if(error)return{ok:false,message:errorMessage(error,l('ویرایش بخش انجام نشد.','The block could not be updated.'),l('این آدرس قبلاً استفاده شده است.','This address is already in use.')),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:l('تغییرات بخش با موفقیت ذخیره شد.','The block changes were saved successfully.'),nonce:Date.now()}
}

export async function toggleBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en;const {supabase}=await getActor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const visible=String(formData.get('visible'))==='true';const scoped=await pageScope(supabase,pageId);if(!scoped||!UUID_RE.test(id)||!await authorize(scoped,PERMISSIONS.CMS_MANAGE))return{ok:false,message:l('بخش پیدا نشد یا اجازه تغییر آن را ندارید.','The block was not found or you cannot change it.'),nonce:Date.now()};const{error}=await supabase.from('page_blocks').update({visible:!visible,updated_at:new Date().toISOString()}).eq('id',id).eq('page_id',pageId);if(error)return{ok:false,message:errorMessage(error,l('تغییر نمایش بخش انجام نشد.','Block visibility could not be changed.'),l('این آدرس قبلاً استفاده شده است.','This address is already in use.')),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:visible?l('بخش مخفی شد.','The block was hidden.'):l('بخش نمایش داده شد.','The block is now visible.'),nonce:Date.now()}
}

export async function moveBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en;const {supabase}=await getActor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const direction=String(formData.get('direction')??'up');const scoped=await pageScope(supabase,pageId);if(!scoped||!UUID_RE.test(id)||!await authorize(scoped,PERMISSIONS.CMS_MANAGE))return{ok:false,message:l('بخش پیدا نشد یا اجازه جابه‌جایی آن را ندارید.','The block was not found or you cannot move it.'),nonce:Date.now()};const{data:blocks,error}=await supabase.from('page_blocks').select('id,position').eq('page_id',pageId).order('position',{ascending:true});if(error||!blocks)return{ok:false,message:errorMessage(error,l('جابه‌جایی انجام نشد.','The block could not be moved.'),l('این آدرس قبلاً استفاده شده است.','This address is already in use.')),nonce:Date.now()};const index=blocks.findIndex(b=>b.id===id);const target=direction==='up'?index-1:index+1;if(index<0||target<0||target>=blocks.length)return{ok:false,message:l('این بخش بیشتر از این قابل جابه‌جایی نیست.','The block cannot be moved any further.'),nonce:Date.now()};const first=await supabase.from('page_blocks').update({position:blocks[target].position}).eq('id',blocks[index].id).eq('page_id',pageId);const second=await supabase.from('page_blocks').update({position:blocks[index].position}).eq('id',blocks[target].id).eq('page_id',pageId);if(first.error||second.error)return{ok:false,message:l('جابه‌جایی بخش کامل نشد.','The block move did not complete.'),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:l('ترتیب بخش با موفقیت تغییر کرد.','The block order was changed successfully.'),nonce:Date.now()}
}

export async function deleteBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en;const{supabase}=await getActor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const scoped=await pageScope(supabase,pageId);if(!scoped||!UUID_RE.test(id)||!await authorize(scoped,PERMISSIONS.CMS_MANAGE))return{ok:false,message:l('بخش پیدا نشد یا اجازه حذف آن را ندارید.','The block was not found or you cannot delete it.'),nonce:Date.now()};const{error}=await supabase.from('page_blocks').delete().eq('id',id).eq('page_id',pageId);if(error)return{ok:false,message:errorMessage(error,l('حذف بخش انجام نشد.','The block could not be deleted.'),l('این آدرس قبلاً استفاده شده است.','This address is already in use.')),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:l('بخش با موفقیت حذف شد.','The block was deleted successfully.'),nonce:Date.now()}}

export async function deletePage(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en;const{supabase}=await getActor();const id=String(formData.get('id')??'');const scoped=await pageScope(supabase,id);if(!scoped||!await authorize(scoped,PERMISSIONS.CMS_MANAGE))return{ok:false,message:l('صفحه پیدا نشد یا اجازه حذف آن را ندارید.','The page was not found or you cannot delete it.'),nonce:Date.now()};const duplicate=l('این آدرس قبلاً استفاده شده است.','This address is already in use.');const{error:blocksError}=await supabase.from('page_blocks').delete().eq('page_id',id);if(blocksError)return{ok:false,message:errorMessage(blocksError,l('حذف محتوای صفحه انجام نشد.','The page content could not be deleted.'),duplicate),nonce:Date.now()};const{error}=await supabase.from('pages').delete().eq('id',id).eq('site_id',scoped.siteId);if(error)return{ok:false,message:errorMessage(error,l('حذف صفحه انجام نشد.','The page could not be deleted.'),duplicate),nonce:Date.now()};await recordAuditEvent({action:'cms.page.deleted',entityType:'page',entityId:id,organizationId:scoped.organizationId,siteId:scoped.siteId,before:{title:scoped.page.title,slug:scoped.page.slug,status:scoped.page.status},context:{source:'admin_pages'},severity:'notice'});revalidatePath('/admin');revalidatePath('/admin/pages');return{ok:true,message:l(`صفحه «${scoped.page.title}» با موفقیت حذف شد.`,`Page “${scoped.page.title}” was deleted successfully.`),redirectTo:`/admin/pages?site=${scoped.siteId}`,nonce:Date.now()}}
