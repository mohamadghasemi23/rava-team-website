import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { publicServiceFallbacks } from '@/lib/public-fallbacks'
import RavaInnerFrame from '../components/RavaInnerFrame'
import styles from '../components/rava-inner.module.css'

export const metadata: Metadata = { title:'خدمات', description:'خدمات طراحی و توسعه وب، فروشگاه اینترنتی، محصولات دیجیتال، برندینگ، محتوا و AI راوا.' }

export default async function ServicesPage(){
  const supabase=await createClient()
  const {data}=await supabase.from('services').select('id,title,slug,summary').eq('published',true).order('sort_order',{ascending:true})
  const services=data?.length?data:publicServiceFallbacks
  return <RavaInnerFrame eyebrow="Services" title="خدمات راوا" intro="از وب‌سایت و فروشگاه تا محصولات دیجیتال و ابزارهای هوشمند؛ هر پروژه را از مسئله واقعی کسب‌وکار شروع می‌کنیم."><section className={styles.grid}>{services.map((s,i)=><article className={styles.card} key={s.id}><span>{String(i+1).padStart(2,'0')}</span><div><h2>{s.title}</h2><p>{s.summary}</p></div><a href={`/services/${s.slug}`}>مشاهده جزئیات ↗</a></article>)}</section></RavaInnerFrame>
}
