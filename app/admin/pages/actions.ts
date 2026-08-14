'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AdminActionState = { ok?: boolean; message?: string; redirectTo?: string; nonce?: number }

async function getEditor() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, active').eq('id', userId).single()
  if (!profile?.active || !['super_admin', 'admin', 'content_manager'].includes(profile.role)) redirect('/admin')
  return { supabase, userId }
}

function cleanSlug(value: string) { return value.trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06ff-]/g, '') }
function errorMessage(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback
  if (error.code === '23505') return 'این آدرس صفحه قبلاً استفاده شده است. یک آدرس دیگر انتخاب کنید.'
  return error.message ? `خطای سرور: ${error.message}` : fallback
}

export async function createPage(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const { supabase, userId } = await getEditor(); const title = String(formData.get('title') ?? '').trim(); const slug = cleanSlug(String(formData.get('slug') ?? ''))
  if (!title || !slug) return { ok:false, message:'عنوان و آدرس صفحه الزامی است.', nonce:Date.now() }
  const { data,error } = await supabase.from('pages').insert({ title,slug,status:'draft',created_by:userId,updated_by:userId }).select('id').single()
  if (error || !data) return { ok:false,message:errorMessage(error,'ساخت صفحه انجام نشد.'),nonce:Date.now() }
  revalidatePath('/admin'); revalidatePath('/admin/pages')
  return { ok:true,message:`صفحه «${title}» با موفقیت ساخته شد.`,redirectTo:`/admin/pages/${data.id}`,nonce:Date.now() }
}

export async function updatePage(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const { supabase,userId }=await getEditor(); const id=String(formData.get('id')??''); const title=String(formData.get('title')??'').trim(); const slug=cleanSlug(String(formData.get('slug')??'')); const status=String(formData.get('status')??'draft'); const seoTitle=String(formData.get('seo_title')??'').trim(); const seoDescription=String(formData.get('seo_description')??'').trim()
  if(!id||!title||!slug||!['draft','published','hidden','scheduled'].includes(status)) return {ok:false,message:'اطلاعات فرم کامل یا معتبر نیست.',nonce:Date.now()}
  const {data,error}=await supabase.from('pages').update({title,slug,status,seo:{title:seoTitle,description:seoDescription},published_at:status==='published'?new Date().toISOString():null,updated_by:userId,updated_at:new Date().toISOString()}).eq('id',id).select('id').single()
  if(error||!data)return{ok:false,message:errorMessage(error,'ویرایش صفحه انجام نشد.'),nonce:Date.now()}
  revalidatePath('/admin');revalidatePath('/admin/pages');revalidatePath(`/admin/pages/${id}`);revalidatePath(`/${slug}`)
  return{ok:true,message:`تغییرات صفحه «${title}» با موفقیت ذخیره شد.`,nonce:Date.now()}
}

export async function setPageStatus(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const {supabase,userId}=await getEditor();const id=String(formData.get('id')??'');const status=String(formData.get('status')??'');if(!id||!['draft','published','hidden'].includes(status))return{ok:false,message:'وضعیت انتخاب‌شده معتبر نیست.',nonce:Date.now()};const{error}=await supabase.from('pages').update({status,published_at:status==='published'?new Date().toISOString():null,updated_by:userId,updated_at:new Date().toISOString()}).eq('id',id);if(error)return{ok:false,message:errorMessage(error,'تغییر وضعیت صفحه انجام نشد.'),nonce:Date.now()};revalidatePath('/admin');revalidatePath('/admin/pages');return{ok:true,message:status==='published'?'صفحه با موفقیت منتشر شد.':status==='hidden'?'صفحه با موفقیت مخفی شد.':'صفحه به پیش‌نویس منتقل شد.',nonce:Date.now()}
}

export async function createBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const {supabase}=await getEditor();const pageId=String(formData.get('page_id')??'');const blockType=String(formData.get('block_type')??'text');if(!pageId)return{ok:false,message:'شناسه صفحه معتبر نیست.',nonce:Date.now()};
 const {data:last}=await supabase.from('page_blocks').select('position').eq('page_id',pageId).order('position',{ascending:false}).limit(1).maybeSingle();
 const defaults:Record<string,object>={hero:{title:'عنوان اصلی',text:'توضیح کوتاه این بخش',button_label:'بیشتر بدانید',button_url:'#'},text:{title:'عنوان بخش',text:'متن این بخش را وارد کنید.'},image:{url:'',alt:'',caption:''},cta:{title:'آماده شروع هستید؟',text:'برای شروع همکاری با ما در تماس باشید.',button_label:'تماس با ما',button_url:'/contact'},gallery:{title:'گالری',images:[]}};
 const {error}=await supabase.from('page_blocks').insert({page_id:pageId,block_type:blockType,position:(last?.position??-1)+1,visible:true,data:defaults[blockType]??{}});if(error)return{ok:false,message:errorMessage(error,'افزودن بلاک انجام نشد.'),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:'بلاک جدید با موفقیت اضافه شد.',nonce:Date.now()}
}

export async function updateBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const {supabase}=await getEditor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const blockType=String(formData.get('block_type')??'text');let data:Record<string,unknown>={};
 if(blockType==='hero'||blockType==='text'||blockType==='cta')data={title:String(formData.get('title')??''),text:String(formData.get('text')??'')};
 if(blockType==='hero'||blockType==='cta')data={...data,button_label:String(formData.get('button_label')??''),button_url:String(formData.get('button_url')??'')};
 if(blockType==='image')data={url:String(formData.get('url')??''),alt:String(formData.get('alt')??''),caption:String(formData.get('caption')??'')};
 if(blockType==='gallery')data={title:String(formData.get('title')??''),images:String(formData.get('images')??'').split('\n').map(x=>x.trim()).filter(Boolean)};
 const {error}=await supabase.from('page_blocks').update({data,updated_at:new Date().toISOString()}).eq('id',id);if(error)return{ok:false,message:errorMessage(error,'ویرایش بلاک انجام نشد.'),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:'تغییرات بلاک با موفقیت ذخیره شد.',nonce:Date.now()}
}

export async function toggleBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const {supabase}=await getEditor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const visible=String(formData.get('visible'))==='true';const{error}=await supabase.from('page_blocks').update({visible:!visible,updated_at:new Date().toISOString()}).eq('id',id);if(error)return{ok:false,message:errorMessage(error,'تغییر نمایش بلاک انجام نشد.'),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:visible?'بلاک مخفی شد.':'بلاک نمایش داده شد.',nonce:Date.now()}
}

export async function moveBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{
 const {supabase}=await getEditor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const direction=String(formData.get('direction')??'up');const{data:blocks,error}=await supabase.from('page_blocks').select('id,position').eq('page_id',pageId).order('position',{ascending:true});if(error||!blocks)return{ok:false,message:errorMessage(error,'جابه‌جایی انجام نشد.'),nonce:Date.now()};const index=blocks.findIndex(b=>b.id===id);const target=direction==='up'?index-1:index+1;if(index<0||target<0||target>=blocks.length)return{ok:false,message:'این بلاک بیشتر از این قابل جابه‌جایی نیست.',nonce:Date.now()};await supabase.from('page_blocks').update({position:blocks[target].position}).eq('id',blocks[index].id);await supabase.from('page_blocks').update({position:blocks[index].position}).eq('id',blocks[target].id);revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:'ترتیب بلاک با موفقیت تغییر کرد.',nonce:Date.now()}
}

export async function deleteBlock(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{const{supabase}=await getEditor();const id=String(formData.get('id')??'');const pageId=String(formData.get('page_id')??'');const{error}=await supabase.from('page_blocks').delete().eq('id',id);if(error)return{ok:false,message:errorMessage(error,'حذف بلاک انجام نشد.'),nonce:Date.now()};revalidatePath(`/admin/pages/${pageId}`);return{ok:true,message:'بلاک با موفقیت حذف شد.',nonce:Date.now()}}

export async function deletePage(_state:AdminActionState,formData:FormData):Promise<AdminActionState>{const{supabase}=await getEditor();const id=String(formData.get('id')??'');if(!id)return{ok:false,message:'شناسه صفحه معتبر نیست.',nonce:Date.now()};const{data:page}=await supabase.from('pages').select('title').eq('id',id).single();const{error:blocksError}=await supabase.from('page_blocks').delete().eq('page_id',id);if(blocksError)return{ok:false,message:errorMessage(blocksError,'حذف محتوای صفحه انجام نشد.'),nonce:Date.now()};const{error}=await supabase.from('pages').delete().eq('id',id);if(error)return{ok:false,message:errorMessage(error,'حذف صفحه انجام نشد.'),nonce:Date.now()};revalidatePath('/admin');revalidatePath('/admin/pages');return{ok:true,message:`صفحه${page?.title?` «${page.title}»`:''} با موفقیت حذف شد.`,redirectTo:'/admin/pages',nonce:Date.now()}}
