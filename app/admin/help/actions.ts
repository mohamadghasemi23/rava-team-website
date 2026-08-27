'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

type State={ok?:boolean;message?:string;errorId?:string;nonce?:number}

async function fail(error:unknown,eventType:string,message:string):Promise<State>{
  const locale=await getAdminLocale()
  const trace=createTraceContext(); const logged=await recordErrorEvent({error,category:'help.academy',eventType,publicMessage:message,route:'/admin/help',requestId:trace.requestId,correlationId:trace.correlationId,severity:'warning',explanationFa:'عملیات مدیریت راهنما کامل نشد. مجوز، ورودی و وضعیت پایگاه داده باید بررسی شود.',explanationEn:'The help-management operation did not complete. Check authorization, input and database state.'})
  const first=Array.isArray(logged.data)?logged.data[0]:logged.data; const errorId=first&&typeof first==='object'&&'error_id' in first?String(first.error_id):undefined
  return {ok:false,message:errorId?`${message} ${locale==='fa'?'شناسه خطا':'Error ID'}: ${errorId}`:message,errorId,nonce:Date.now()}
}

function jsonArray(value:FormDataEntryValue|null){ const raw=String(value??'').trim(); if(!raw)return []; return raw.split('\n').map(v=>v.trim()).filter(Boolean) }
function nullable(value:FormDataEntryValue|null){const v=String(value??'').trim(); return v||null}
async function message(fa:string,en:string){return (await getAdminLocale())==='fa'?fa:en}

export async function saveTopicAction(_s:State,fd:FormData):Promise<State>{
  const supabase=await createClient(); const topicId=nullable(fd.get('topic_id')); const key=String(fd.get('key')??'').trim().toLowerCase();
  if(!/^[a-z0-9_.:-]{2,120}$/.test(key))return {ok:false,message:await message('شناسه فنی راهنما معتبر نیست.','The technical guide identifier is invalid.'),nonce:Date.now()}
  const {data,error}=await supabase.rpc('upsert_help_topic',{p_topic_id:topicId,p_key:key,p_module_key:nullable(fd.get('module_key')),p_feature_key:String(fd.get('feature_key')??''),p_minimum_permission:nullable(fd.get('minimum_permission')),p_status:String(fd.get('status')??'draft'),p_category:String(fd.get('category')??'general').trim().toLowerCase(),p_audience:String(fd.get('audience')??'all'),p_featured:fd.get('featured')==='on',p_estimated_minutes:Number(fd.get('estimated_minutes')??3),p_sort_order:Number(fd.get('sort_order')??0)})
  if(error)return fail(error,'help.topic.save_failed',await message('ذخیره راهنما انجام نشد.','The guide could not be saved.'))
  revalidatePath('/admin/help'); return {ok:true,message:await message(`راهنما ذخیره شد: ${String(data)}`,`Guide saved: ${String(data)}`),nonce:Date.now()}
}

export async function saveTranslationAction(_s:State,fd:FormData):Promise<State>{
  const topicId=String(fd.get('topic_id')??''); const locale=String(fd.get('locale')??'fa'); if(!topicId)return {ok:false,message:await message('انتخاب راهنما الزامی است.','A guide must be selected.'),nonce:Date.now()}
  const supabase=await createClient(); const {error}=await supabase.rpc('set_help_translation',{p_topic_id:topicId,p_locale:locale,p_title:String(fd.get('title')??'').trim(),p_summary:String(fd.get('summary')??''),p_body_markdown:String(fd.get('body_markdown')??''),p_example_markdown:String(fd.get('example_markdown')??''),p_steps:jsonArray(fd.get('steps')),p_warnings:jsonArray(fd.get('warnings')),p_search_keywords:String(fd.get('keywords')??'').split(',').map(v=>v.trim()).filter(Boolean)})
  if(error)return fail(error,'help.translation.save_failed',await message('ذخیره متن راهنما انجام نشد.','The guide content could not be saved.'))
  revalidatePath('/admin/help'); revalidatePath('/admin/academy'); return {ok:true,message:await message('متن راهنما ذخیره شد.','Guide content saved.'),nonce:Date.now()}
}

export async function saveBindingAction(_s:State,fd:FormData):Promise<State>{
  const topicId=String(fd.get('topic_id')??''); const route=String(fd.get('route_pattern')??'').trim(); if(!topicId||!route)return {ok:false,message:await message('راهنما و مسیر صفحه الزامی هستند.','A guide and page route are required.'),nonce:Date.now()}
  const supabase=await createClient(); const {error}=await supabase.rpc('set_help_context_binding',{p_topic_id:topicId,p_route_pattern:route,p_context_key:nullable(fd.get('context_key')),p_priority:Number(fd.get('priority')??100)})
  if(error)return fail(error,'help.binding.save_failed',await message('اتصال راهنما به صفحه انجام نشد.','The guide could not be connected to the page.'))
  revalidatePath('/admin/help'); return {ok:true,message:await message('راهنما به صفحه متصل شد.','The guide was connected to the page.'),nonce:Date.now()}
}

export async function saveCourseAction(_s:State,fd:FormData):Promise<State>{
  const supabase=await createClient(); const {data,error}=await supabase.rpc('upsert_academy_course',{p_course_id:nullable(fd.get('course_id')),p_key:String(fd.get('key')??'').trim().toLowerCase(),p_module_key:nullable(fd.get('module_key')),p_status:String(fd.get('status')??'draft'),p_audience:String(fd.get('audience')??'all'),p_sort_order:Number(fd.get('sort_order')??0),p_estimated_minutes:Number(fd.get('estimated_minutes')??15)})
  if(error)return fail(error,'academy.course.save_failed',await message('ذخیره دوره انجام نشد.','The course could not be saved.'))
  revalidatePath('/admin/help'); revalidatePath('/admin/academy'); return {ok:true,message:await message(`دوره ذخیره شد: ${String(data)}`,`Course saved: ${String(data)}`),nonce:Date.now()}
}

export async function saveCourseTranslationAction(_s:State,fd:FormData):Promise<State>{
  const supabase=await createClient(); const {error}=await supabase.rpc('set_academy_course_translation',{p_course_id:String(fd.get('course_id')??''),p_locale:String(fd.get('locale')??'fa'),p_title:String(fd.get('title')??''),p_summary:String(fd.get('summary')??''),p_intro_markdown:String(fd.get('intro_markdown')??'')})
  if(error)return fail(error,'academy.translation.save_failed',await message('ذخیره متن دوره انجام نشد.','The course content could not be saved.'))
  revalidatePath('/admin/help'); revalidatePath('/admin/academy'); return {ok:true,message:await message('متن دوره ذخیره شد.','Course content saved.'),nonce:Date.now()}
}

export async function saveCurriculumAction(_s:State,fd:FormData):Promise<State>{
  const supabase=await createClient(); const {error}=await supabase.rpc('set_academy_course_topics',{p_course_id:String(fd.get('course_id')??''),p_topic_ids:fd.getAll('topic_ids').map(String).filter(Boolean)})
  if(error)return fail(error,'academy.curriculum.save_failed',await message('ذخیره سرفصل دوره انجام نشد.','The course curriculum could not be saved.'))
  revalidatePath('/admin/help'); revalidatePath('/admin/academy'); return {ok:true,message:await message('سرفصل‌های دوره ذخیره شدند.','Course curriculum saved.'),nonce:Date.now()}
}

export async function markLessonAction(fd:FormData){
  const supabase=await createClient(); await supabase.rpc('mark_academy_topic_complete',{p_course_id:String(fd.get('course_id')??''),p_topic_id:String(fd.get('topic_id')??''),p_completed:String(fd.get('completed')??'true')==='true'}); revalidatePath('/admin/academy')
}
