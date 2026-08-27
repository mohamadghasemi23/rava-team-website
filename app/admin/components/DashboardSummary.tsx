'use client'

import Link from 'next/link'
import {useAdminLocale} from './AdminLocale'

const copy={
  fa:{stats:['صفحه‌ها','پروژه‌ها','پیام‌ها','تصاویر و فایل‌ها'],actions:['بازبینی صفحه‌ها','به‌زودی','به‌زودی','مدیریت فایل‌ها'],title:'فضای مدیریت محتوای شما آماده است',summary:'صفحه‌ها هنوز پیش‌نویس‌اند و تا زمان بازبینی و تأیید شما به‌شکل عمومی منتشر نمی‌شوند.',pages:'بازبینی صفحه‌ها',media:'مدیریت تصاویر و فایل‌ها',signout:'خروج امن از پنل',label:'خلاصه وضعیت پنل'},
  en:{stats:['Pages','Projects','Messages','Media files'],actions:['Review pages','Coming soon','Coming soon','Manage files'],title:'Your content workspace is ready',summary:'Every page remains a draft and will not become public until you review and approve it.',pages:'Review pages',media:'Manage images and files',signout:'Sign out securely',label:'Administration summary'},
}
export default function DashboardSummary({pages,projects,leads,media}:{pages:number;projects:number;leads:number;media:number}){
  const{language}=useAdminLocale(),t=copy[language],counts=[pages,projects,leads,media]
  return <><section className="admin-stats" aria-label={t.label}>{counts.map((count,index)=>{const card=<article><span>{t.stats[index]}</span><b>{count}</b><small>{t.actions[index]} ←</small></article>;return index===0?<Link href="/admin/pages" key={t.stats[index]}>{card}</Link>:index===3?<Link href="/admin/media" key={t.stats[index]}>{card}</Link>:<div key={t.stats[index]}>{card}</div>})}</section><section className="admin-panel"><h2>{t.title}</h2><p>{t.summary}</p><div className="admin-actions"><Link className="admin-link" href="/admin/pages">{t.pages}</Link><Link className="admin-link" href="/admin/media">{t.media}</Link></div></section><form action="/auth/signout" method="post"><button className="admin-signout" type="submit">{t.signout}</button></form></>
}
