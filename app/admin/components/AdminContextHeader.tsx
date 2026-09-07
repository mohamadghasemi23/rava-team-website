'use client'

import Link from 'next/link'
import {useState} from 'react'
import {useAdminLocale} from './AdminLocale'
import styles from './admin-context-header.module.css'

export type AdminHeaderIssue={key:string;label:string;description:string;href:string}
export type AdminHeaderIdentity={name:string;role:string;initials:string}

type Props={
 pageTitle:string
 site:{id:string;name:string}
 template:{name:string;href:string}
 identity:AdminHeaderIdentity
 issues?:AdminHeaderIssue[]
 onHelp?:()=>void
}

export default function AdminContextHeader({pageTitle,site,template,identity,issues=[],onHelp}:Props){
 const {language:locale}=useAdminLocale()
 const l=(fa:string,en:string)=>locale==='fa'?fa:en
 const [profileOpen,setProfileOpen]=useState(false)
 const [notificationsOpen,setNotificationsOpen]=useState(false)
 const localizedCount=locale==='fa'?String(issues.length).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]):String(issues.length)
 return <>
  <header className={styles.header}>
   <div className={styles.brand}><Link href={`/admin/pages?site=${site.id}`} className={styles.logo} aria-label={l('بازگشت به صفحه‌ها','Back to pages')}><i/><i/><i/></Link><span><b>{l('راوا','RAVA')}</b><small><Link href={`/admin/pages?site=${site.id}`}>{l('صفحه‌ها','Pages')}</Link><i>/</i>{pageTitle}</small></span></div>
   <div className={styles.actions}>
    {onHelp?<button type="button" className={styles.iconButton} aria-label={l('راهنما','Help')} onClick={onHelp}>؟</button>:null}
    <div className={styles.popoverWrap}><button type="button" className={styles.iconButton} aria-label={l('اعلان‌ها','Notifications')} aria-expanded={notificationsOpen} onClick={()=>setNotificationsOpen(value=>!value)}>♢{issues.length?<b>{localizedCount}</b>:null}</button>{notificationsOpen?<div className={styles.notificationMenu}><strong>{l('کارهای نیازمند توجه','Items requiring attention')}</strong>{issues.length?issues.map(issue=><Link href={issue.href} key={issue.key} onClick={()=>setNotificationsOpen(false)}><i>!</i><span><b>{issue.label}</b><small>{issue.description}</small></span></Link>):<div className={styles.allClear}><i>✓</i><span>{l('همه موارد بررسی شده‌اند.','Everything has been reviewed.')}</span></div>}</div>:null}</div>
    <div className={styles.popoverWrap}><button type="button" className={styles.profile} aria-expanded={profileOpen} onClick={()=>setProfileOpen(value=>!value)}><span className={styles.avatar}>{identity.initials}<i/></span><span><b>{identity.name}</b><small>{identity.role}</small></span><em>⌄</em></button>{profileOpen?<div className={styles.profileMenu}><div><span className={styles.avatarLarge}>{identity.initials}<i/></span><span><b>{identity.name}</b><small>{identity.role} · {l('آنلاین','Online')}</small></span></div><hr/><span><small>{l('سایت فعال','Active site')}</small><b>{site.name}</b></span><Link href="/admin">{l('رفتن به خانه مدیریت','Go to admin home')}</Link></div>:null}</div>
   </div>
  </header>
  <div className={styles.context}><span><i/><small>{l('سایت فعال','Active site')}</small><b>{site.name}</b></span><em/><Link href={template.href}><small>{l('قالب فعال','Active template')}</small><b>{template.name}</b><strong>{l('معرفی و راهنما','Details and guide')} ←</strong></Link></div>
 </>
}
