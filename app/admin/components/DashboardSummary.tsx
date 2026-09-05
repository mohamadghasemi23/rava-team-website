'use client'

import Link from 'next/link'
import {useAdminLocale} from './AdminLocale'

const copy={
  fa:{title:'کارهای روزمره',summary:'فقط بخش‌هایی نمایش داده می‌شوند که اکنون قابل استفاده و دارای اقدام مشخص هستند.',pages:'صفحه‌های سایت',pagesAction:'بازبینی و ویرایش صفحه‌ها',media:'کتابخانه رسانه',mediaAction:'مدیریت تصویرها و ویدیوها',signout:'خروج امن از پنل',label:'کارهای قابل انجام'},
  en:{title:'Everyday tasks',summary:'Only available areas with a clear action are shown here.',pages:'Site pages',pagesAction:'Review and edit pages',media:'Media library',mediaAction:'Manage images and videos',signout:'Sign out securely',label:'Available tasks'},
}
export default function DashboardSummary({pages,media}:{pages:number;media:number}){const{language}=useAdminLocale(),t=copy[language];return <><section className="admin-panel"><h2>{t.title}</h2><p>{t.summary}</p><div className="admin-stats" aria-label={t.label}><Link href="/admin/pages"><article><span>{t.pages}</span><b>{pages}</b><small>{t.pagesAction} ←</small></article></Link><Link href="/admin/media"><article><span>{t.media}</span><b>{media}</b><small>{t.mediaAction} ←</small></article></Link></div></section><form action="/auth/signout" method="post"><button className="admin-signout" type="submit">{t.signout}</button></form></>}
