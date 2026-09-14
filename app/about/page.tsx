import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import RavaInnerFrame from '../components/RavaInnerFrame'
import styles from '../components/rava-inner.module.css'

export const metadata: Metadata = { title:'درباره راوا', description:'RAVA یک تیم مستقل دیجیتال برای طراحی و توسعه وب، محصولات دیجیتال، محتوا و راهکارهای AI است.' }

const fallback={ intro:'راوا یک تیم مستقل دیجیتال است که روی طراحی و توسعه وب، محصولات دیجیتال، محتوا و راهکارهای مبتنی بر هوش مصنوعی کار می‌کند.', body:'ما پروژه را از تکنولوژی شروع نمی‌کنیم؛ از مسئله شروع می‌کنیم. بعد مناسب‌ترین طراحی، ساختار و ابزار را برای حل آن انتخاب می‌کنیم. هدف ما ساختن چیزی نیست که فقط در زمان تحویل خوب به نظر برسد؛ چیزی می‌سازیم که قابل استفاده، قابل توسعه و ارزشمند باشد.', values:[{title:'وضوح',body:'قبل از ساختن، باید دقیق بدانیم چه مسئله‌ای را حل می‌کنیم.'},{title:'کیفیت',body:'جزئیات بخشی از محصول‌اند، نه مرحله آخر پروژه.'},{title:'سادگی',body:'پیچیدگی فنی نباید به تجربه پیچیده برای کاربر تبدیل شود.'},{title:'رشد',body:'هر چیزی که می‌سازیم باید بتواند همراه کسب‌وکار بزرگ‌تر شود.'}] }

export default async function AboutPage(){
  const supabase=await createClient(); const {data}=await supabase.from('site_content').select('content').eq('section_key','about').maybeSingle();
  const value=data?.content&&typeof data.content==='object'?data.content as Record<string,unknown>:{}; const about={...fallback,...value}; const values=Array.isArray(about.values)?about.values as Array<{title?:string;body?:string}>:fallback.values
  return <RavaInnerFrame eyebrow="About RAVA" title="یک تیم مستقل برای ساختن بهتر." intro={String(about.intro||fallback.intro)}><section className={styles.prose}><p>{String(about.body||fallback.body)}</p></section><section className={styles.grid}>{values.slice(0,4).map((v,i)=><article className={styles.card} key={i}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{v.title}</h3><p>{v.body}</p></div></article>)}</section></RavaInnerFrame>
}
