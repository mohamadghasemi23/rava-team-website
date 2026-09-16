import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { publicProjectFallbacks } from '@/lib/public-fallbacks'
import RavaInnerFrame from '../components/RavaInnerFrame'
import styles from '../components/rava-inner.module.css'

export const metadata: Metadata = { title:'پروژه‌ها', description:'نمونه‌کارها، محصولات دیجیتال و پروژه‌های منتخب RAVA.' }

export default async function WorkPage(){
  const supabase=await createClient()
  const {data}=await supabase.from('projects').select('id,title,slug,summary,project_kind,project_year').eq('published',true).order('sort_order',{ascending:true})
  const projects=data?.length?data:publicProjectFallbacks
  return <RavaInnerFrame eyebrow="Selected work" title="پروژه‌ها" intro="پروژه‌های واقعی، محصولات در حال توسعه و Concept Projectهایی که جهت طراحی و توان اجرایی راوا را نشان می‌دهند."><section className={styles.grid}>{projects.map((p,i)=><article className={styles.card} key={p.id}><span>{String(i+1).padStart(2,'0')} · {p.project_kind==='concept'?'CONCEPT PROJECT':'PROJECT'} · {p.project_year||2026}</span><div><h2>{p.title}</h2><p>{p.summary}</p></div><a href={`/work/${p.slug}`}>مشاهده پروژه ↗</a></article>)}</section></RavaInnerFrame>
}
