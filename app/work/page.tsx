import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import RavaInnerFrame from '../components/RavaInnerFrame'
import styles from '../components/rava-inner.module.css'

export const metadata: Metadata = { title:'پروژه‌ها', description:'نمونه‌کارها، محصولات دیجیتال و پروژه‌های منتخب RAVA.' }

export default async function WorkPage(){
  const supabase=await createClient()
  const {data}=await supabase.from('projects').select('id,title,slug,summary,project_kind,project_year').eq('published',true).order('sort_order',{ascending:true})
  const projects=data?.length?data:[
    {id:'r1',title:'RAVA Traffic Engine',slug:'rava-traffic-engine',summary:'محصول داخلی برای رشد ارگانیک، داده و اتوماسیون.',project_kind:'real',project_year:2026},
    {id:'a1',title:'Ali Topol Store',slug:'ali-topol-store',summary:'فروشگاه اینترنتی پوشاک سایزبزرگ.',project_kind:'real',project_year:2026},
    {id:'n1',title:'NOVA',slug:'nova-concept',summary:'کانسپت فروشگاه دیجیتال برای برند مد معاصر.',project_kind:'concept',project_year:2026},
    {id:'l1',title:'LUMA',slug:'luma-concept',summary:'کانسپت محصول دیجیتال و داشبورد SaaS.',project_kind:'concept',project_year:2026},
  ]
  return <RavaInnerFrame eyebrow="Selected work" title="پروژه‌ها" intro="پروژه‌های واقعی، محصولات در حال توسعه و Concept Projectهایی که جهت طراحی و توان اجرایی راوا را نشان می‌دهند."><section className={styles.grid}>{projects.map((p,i)=><article className={styles.card} key={p.id}><span>{String(i+1).padStart(2,'0')} · {p.project_kind==='concept'?'CONCEPT PROJECT':'PROJECT'} · {p.project_year||2026}</span><div><h2>{p.title}</h2><p>{p.summary}</p></div><a href={`/work/${p.slug}`}>مشاهده پروژه ↗</a></article>)}</section></RavaInnerFrame>
}
