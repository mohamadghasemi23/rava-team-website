'use client'

import Link from 'next/link'
import AdminIcon from './AdminIcon'
import {useAdminLocale} from './AdminLocale'

type PageSummary={id:string;title:string;status:string;seo:unknown;updated_at:string}

type Props={
  site:{id:string;name:string}
  pages:PageSummary[]
  mediaBytes:number
  mediaCount:number
  published:boolean
  canManagePages:boolean
  canManageMedia:boolean
}

function seoComplete(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))return false
  const seo=value as Record<string,unknown>
  return typeof seo.title==='string'&&seo.title.trim().length>0&&typeof seo.description==='string'&&seo.description.trim().length>0
}

export default function CustomerHome({site,pages,mediaBytes,mediaCount,published,canManagePages,canManageMedia}:Props){
  const{language:locale}=useAdminLocale()
  const l=(fa:string,en:string)=>locale==='fa'?fa:en
  const incompletePage=pages.find(page=>!seoComplete(page.seo))
  const completeSeo=pages.filter(page=>seoComplete(page.seo)).length
  const seoScore=pages.length?Math.round((completeSeo/pages.length)*100):0
  const next=incompletePage&&canManagePages?{
    eyebrow:l('قدم بعدی','Next step'),
    title:l(`تکمیل اطلاعات جست‌وجوی «${incompletePage.title}»`,`Complete search details for “${incompletePage.title}”`),
    description:l('عنوان و توضیح مناسب کمک می‌کند این صفحه در نتایج جست‌وجو روشن‌تر معرفی شود.','A useful title and description help this page appear clearly in search results.'),
    href:`/admin/pages/${incompletePage.id}`,
    label:l('ادامه ویرایش','Continue editing'),
  }:canManagePages?{
    eyebrow:l('بازبینی دوره‌ای','Regular review'),title:l('محتوای صفحه‌ها را بازبینی کنید','Review your page content'),description:l('اطلاعات خدمات، راه‌های تماس و محتوای منتشرشده را به‌روز نگه دارید.','Keep services, contact details, and published content up to date.'),href:`/admin/pages?site=${encodeURIComponent(site.id)}`,label:l('دیدن صفحه‌ها','View pages'),
  }:null
  const mediaMegabytes=(mediaBytes/1024/1024).toLocaleString(locale==='fa'?'fa-IR':'en-US',{maximumFractionDigits:1})
  return <main className="rava-customer-home">
    <header className="rava-customer-welcome"><div><span>{site.name}</span><h1>{l('سایت شما آماده رشد است.','Your website is ready to grow.')}</h1><p>{l('مهم‌ترین کارهای سایت را بدون درگیری با تنظیمات فنی از همین‌جا ادامه دهید.','Continue the most important website tasks here without dealing with technical settings.')}</p></div><span className={`rava-customer-publish-state ${published?'is-published':'is-draft'}`}><i/>{published?l('منتشرشده','Published'):l('پیش‌نویس','Draft')}</span></header>
    {next?<section className="rava-customer-next"><span className="rava-customer-next-icon"><AdminIcon name="pages"/></span><div><small>{next.eyebrow}</small><h2>{next.title}</h2><p>{next.description}</p><div className="rava-customer-progress"><i><span style={{width:`${Math.max(20,seoScore)}%`}}/></i><b>{l(`${completeSeo} از ${pages.length}`,`${completeSeo} of ${pages.length}`)}</b></div></div><Link href={next.href}>{next.label}<AdminIcon name="arrow" size={17}/></Link></section>:null}
    <section className="rava-customer-overview" aria-label={l('خلاصه سایت','Site summary')}>
      <article><span><AdminIcon name="pages"/></span><small>{l('صفحه‌های سایت','Site pages')}</small><strong>{pages.length.toLocaleString(locale==='fa'?'fa-IR':'en-US')}</strong><Link href={`/admin/pages?site=${encodeURIComponent(site.id)}`}>{l('بازبینی صفحه‌ها','Review pages')}</Link></article>
      <article><span><AdminIcon name="search"/></span><small>{l('آمادگی برای جست‌وجو','Search readiness')}</small><strong>{seoScore.toLocaleString(locale==='fa'?'fa-IR':'en-US')}٪</strong><p>{incompletePage?l('هنوز جای بهبود دارد','There is room to improve'):l('اطلاعات پایه کامل است','Basic information is complete')}</p></article>
      {canManageMedia?<article><span><AdminIcon name="media"/></span><small>{l('رسانه‌های سایت','Site media')}</small><strong>{mediaCount.toLocaleString(locale==='fa'?'fa-IR':'en-US')}</strong><Link href={`/admin/media?site=${encodeURIComponent(site.id)}`}>{l(`${mediaMegabytes} مگابایت استفاده‌شده`,`${mediaMegabytes} MB used`)}</Link></article>:null}
    </section>
    <section className="rava-customer-growth-reserve"><div><small>{l('رشد','Growth')}</small><h2>{l('تحلیل سایت با داده واقعی آغاز می‌شود.','Site insights begin with real data.')}</h2><p>{l('پس از جمع‌شدن داده کافی، روند بازدید و نتیجه فعالیت‌ها در این بخش نمایش داده می‌شود.','Once enough data is collected, visit trends and outcomes will appear here.')}</p></div><span><AdminIcon name="activity"/><b>{l('هنوز داده کافی نیست','Not enough data yet')}</b></span></section>
  </main>
}
