import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findServiceFallback } from '@/lib/public-fallbacks'
import RavaInnerFrame from '../../components/RavaInnerFrame'
import styles from '../../components/rava-inner.module.css'

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params
  const supabase=await createClient()
  const {data}=await supabase.from('services').select('title,summary,seo_title,seo_description,canonical_url').eq('slug',slug).eq('published',true).maybeSingle()
  if(data) return {title:data.seo_title||data.title,description:data.seo_description||data.summary,alternates:data.canonical_url?{canonical:data.canonical_url}:undefined}
  const fallback=findServiceFallback(slug)
  return fallback?{title:fallback.title,description:fallback.summary}:{}
}

export default async function ServiceDetailPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const supabase=await createClient()
  const {data}=await supabase.from('services').select('title,summary,content').eq('slug',slug).eq('published',true).maybeSingle()
  if(data){
    const content=data.content&&typeof data.content==='object'?data.content as {body?:string}:{}
    return <RavaInnerFrame eyebrow="RAVA SERVICE" title={data.title} intro={data.summary}><section className={styles.prose}><p>{content.body||data.summary}</p><p><a href="/contact">برای این سرویس شروع پروژه کنید ↗</a></p></section></RavaInnerFrame>
  }
  const fallback=findServiceFallback(slug)
  if(!fallback) notFound()
  return <RavaInnerFrame eyebrow="RAVA SERVICE" title={fallback.title} intro={fallback.summary}><section className={styles.prose}><p>{fallback.body}</p><p><a href="/contact">برای این سرویس شروع پروژه کنید ↗</a></p></section></RavaInnerFrame>
}
