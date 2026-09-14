import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import RavaInnerFrame from '../components/RavaInnerFrame'
import styles from '../components/rava-inner.module.css'

export const metadata: Metadata = { title:'خدمات', description:'خدمات طراحی و توسعه وب، فروشگاه اینترنتی، محصولات دیجیتال، برندینگ، محتوا و AI راوا.' }

export default async function ServicesPage(){
  const supabase=await createClient()
  const {data}=await supabase.from('services').select('id,title,slug,summary').eq('published',true).order('sort_order',{ascending:true})
  const services=data?.length?data:[
    {id:'1',title:'طراحی وب',slug:'web-design',summary:'طراحی تجربه‌های وب واضح، سریع و فروش‌محور.'},{id:'2',title:'توسعه وب',slug:'web-development',summary:'توسعه امن و مقیاس‌پذیر برای نیاز واقعی کسب‌وکار.'},{id:'3',title:'فروشگاه اینترنتی',slug:'ecommerce',summary:'فروشگاه با تجربه خرید ساده و مدیریت آسان.'},{id:'4',title:'محصولات دیجیتال',slug:'digital-products',summary:'پنل، داشبورد و پلتفرم اختصاصی.'},{id:'5',title:'برندینگ و محتوا',slug:'brand-content',summary:'هویت و محتوای یکپارچه برای برند.'},{id:'6',title:'AI و اتوماسیون',slug:'ai-automation',summary:'راهکارهای هوشمند برای ساده‌سازی فرایندها.'}
  ]
  return <RavaInnerFrame eyebrow="Services" title="خدمات راوا" intro="از وب‌سایت و فروشگاه تا محصولات دیجیتال و ابزارهای هوشمند؛ هر پروژه را از مسئله واقعی کسب‌وکار شروع می‌کنیم."><section className={styles.grid}>{services.map((s,i)=><article className={styles.card} key={s.id}><span>{String(i+1).padStart(2,'0')}</span><div><h2>{s.title}</h2><p>{s.summary}</p></div><a href={`/services/${s.slug}`}>مشاهده جزئیات ↗</a></article>)}</section></RavaInnerFrame>
}
