import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findProjectFallback } from '@/lib/public-fallbacks'
import RavaInnerFrame from '../../components/RavaInnerFrame'
import styles from '../../components/rava-inner.module.css'

function visualIndex(slug:string){
  return [...slug].reduce((total,char)=>total+char.charCodeAt(0),0)%5
}

function ProjectArtwork({title,kind,index}:{title:string;kind:'real'|'concept';index:number}){
  return <div className={`${styles.projectArtwork} ${styles[`art${index}`] || ''}`} aria-hidden="true">
    <span>RAVA / CASE STUDY</span>
    <strong>{title}</strong>
    <small>{kind==='concept'?'CONCEPT PROJECT':'SELECTED WORK'}</small>
  </div>
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params
  const supabase=await createClient()
  const {data}=await supabase.from('projects').select('title,summary,seo_title,seo_description,canonical_url').eq('slug',slug).eq('published',true).maybeSingle()
  if(data) return {title:data.seo_title||data.title,description:data.seo_description||data.summary,alternates:data.canonical_url?{canonical:data.canonical_url}:undefined}
  const fallback=findProjectFallback(slug)
  return fallback?{title:fallback.title,description:fallback.summary}:{}
}

export default async function ProjectDetailPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const supabase=await createClient()
  const {data}=await supabase.from('projects').select('id,title,summary,content,project_kind,client_name,project_year,role_text,scope,kpis,cover_media_id').eq('slug',slug).eq('published',true).maybeSingle()
  if(data){
    const content=data.content&&typeof data.content==='object'?data.content as {body?:string}:{}
    const scope=Array.isArray(data.scope)?data.scope.map(String):[]
    const kpis=Array.isArray(data.kpis)?data.kpis.map(String):[]
    const {data:links}=await supabase.from('project_media').select('media_id,sort_order,caption').eq('project_id',data.id).order('sort_order',{ascending:true})
    const mediaIds=[data.cover_media_id,...(links??[]).map(item=>item.media_id)].filter(Boolean) as string[]
    const uniqueIds=[...new Set(mediaIds)]
    const {data:assets}=uniqueIds.length?await supabase.from('media_assets').select('id,storage_path,alt_text').in('id',uniqueIds).is('deleted_at',null):{data:[] as Array<{id:string;storage_path:string;alt_text:string}>}
    const assetMap=new Map((assets??[]).map(asset=>[asset.id,{url:supabase.storage.from('rava-media').getPublicUrl(asset.storage_path).data.publicUrl,alt:asset.alt_text||data.title}]))
    const gallery=[data.cover_media_id,...(links??[]).map(item=>item.media_id)].filter((id,index,array)=>Boolean(id)&&array.indexOf(id)===index).map(id=>assetMap.get(id as string)).filter(Boolean) as Array<{url:string;alt:string}>
    const index=visualIndex(slug)

    return <RavaInnerFrame eyebrow={data.project_kind==='concept'?'CONCEPT PROJECT':'CASE STUDY'} title={data.title} intro={data.summary}>
      <section className={styles.projectHero}>{gallery[0]?<img src={gallery[0].url} alt={gallery[0].alt}/>:<ProjectArtwork title={data.title} kind={data.project_kind as 'real'|'concept'} index={index}/>}</section>
      <dl className={styles.meta}><div><dt>Client</dt><dd>{data.project_kind==='concept'?'Concept':data.client_name||'RAVA'}</dd></div><div><dt>Year</dt><dd>{data.project_year||2026}</dd></div><div><dt>Role</dt><dd>{data.role_text||'Strategy / Design / Development'}</dd></div><div><dt>Scope</dt><dd>{scope.join(' / ')||'Digital Product'}</dd></div></dl>
      <section className={styles.prose}><p>{content.body||data.summary}</p>{data.project_kind==='concept'&&<p><strong>این پروژه یک Concept Project است و پروژه واقعی مشتری محسوب نمی‌شود.</strong></p>}{kpis.length>0&&<p><strong>{kpis.join(' · ')}</strong></p>}</section>
      {gallery.length>1&&<section className={styles.projectGallery}>{gallery.slice(1).map((media,i)=><figure key={media.url}><img src={media.url} alt={media.alt}/><figcaption>{links?.[i]?.caption||''}</figcaption></figure>)}</section>}
      {gallery.length<=1&&<section className={styles.projectGallery} aria-label="جهت بصری پروژه"><div><ProjectArtwork title={data.title} kind={data.project_kind as 'real'|'concept'} index={(index+1)%5}/></div><div><ProjectArtwork title={data.title} kind={data.project_kind as 'real'|'concept'} index={(index+2)%5}/></div></section>}
      <section className={styles.projectCta}><span>Have a project?</span><h2>پروژه بعدی می‌تواند مال شما باشد.</h2><p>اگر مسئله یا ایده‌ای دارید، از همین‌جا شروع کنیم.</p><a href="/contact">شروع پروژه ↗</a></section>
    </RavaInnerFrame>
  }

  const fallback=findProjectFallback(slug)
  if(!fallback) notFound()
  const index=visualIndex(slug)
  return <RavaInnerFrame eyebrow={fallback.project_kind==='concept'?'CONCEPT PROJECT':'CASE STUDY'} title={fallback.title} intro={fallback.summary}>
    <section className={styles.projectHero}><ProjectArtwork title={fallback.title} kind={fallback.project_kind} index={index}/></section>
    <dl className={styles.meta}><div><dt>Client</dt><dd>{fallback.project_kind==='concept'?'Concept':fallback.client_name||'RAVA'}</dd></div><div><dt>Year</dt><dd>{fallback.project_year}</dd></div><div><dt>Role</dt><dd>{fallback.role_text}</dd></div><div><dt>Scope</dt><dd>{fallback.scope.join(' / ')}</dd></div></dl>
    <section className={styles.prose}><p>{fallback.body}</p>{fallback.project_kind==='concept'&&<p><strong>این پروژه یک Concept Project است و پروژه واقعی مشتری محسوب نمی‌شود.</strong></p>}{fallback.kpis.length>0&&<p><strong>{fallback.kpis.join(' · ')}</strong></p>}</section>
    <section className={styles.projectGallery}><div><ProjectArtwork title={fallback.title} kind={fallback.project_kind} index={(index+1)%5}/></div><div><ProjectArtwork title={fallback.title} kind={fallback.project_kind} index={(index+2)%5}/></div></section>
    <section className={styles.projectCta}><span>Have a project?</span><h2>پروژه بعدی می‌تواند مال شما باشد.</h2><p>اگر مسئله یا ایده‌ای دارید، از همین‌جا شروع کنیم.</p><a href="/contact">شروع پروژه ↗</a></section>
  </RavaInnerFrame>
}
