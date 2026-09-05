'use client'

import {useState} from 'react'
import {useAdminLocale} from './AdminLocale'
import AdminIcon from './AdminIcon'
import styles from './site-draft-preview.module.css'

type PreviewPage={id:string;title:string}
type Viewport='desktop'|'tablet'|'mobile'

export default function SiteDraftPreview({siteId,pages,initialPageId}:{siteId:string;pages:PreviewPage[];initialPageId?:string}){
  const {language}=useAdminLocale()
  const initial=pages.some(page=>page.id===initialPageId)?initialPageId!:pages[0]?.id??''
  const [pageId,setPageId]=useState(initial)
  const [viewport,setViewport]=useState<Viewport>('desktop')
  const l=(fa:string,en:string)=>language==='fa'?fa:en
  if(!pageId)return <div className="admin-empty">{l('ابتدا یک صفحه برای سایت بسازید تا پیش‌نمایش نمایش داده شود.','Create a site page first to see the preview.')}</div>
  const src=`/preview/sites/${siteId}?page=${pageId}`
  return <div className={styles.root}>
    <div className={styles.notice}><AdminIcon name="check" size={18}/><div><b>{l('نمایش واقعی پیش‌نویس','Real draft preview')}</b><span>{l('همان قالب، رنگ، قلم، منو و محتوایی است که پس از انتشار دیده می‌شود؛ این نسخه فعلاً خصوصی است.','This uses the same template, colors, type, navigation, and content visitors will see after publishing. It remains private for now.')}</span></div></div>
    <div className={styles.toolbar}><label><span>{l('صفحه پیش‌نمایش','Preview page')}</span><select value={pageId} onChange={(event)=>setPageId(event.target.value)}>{pages.map((page)=><option value={page.id} key={page.id}>{page.title}</option>)}</select></label><div className={styles.sizes} role="group" aria-label={l('اندازه نمایش','Preview viewport')}><button type="button" className={viewport==='desktop'?styles.active:''} aria-pressed={viewport==='desktop'} onClick={()=>setViewport('desktop')}>{l('رایانه','Desktop')}</button><button type="button" className={viewport==='tablet'?styles.active:''} aria-pressed={viewport==='tablet'} onClick={()=>setViewport('tablet')}>{l('تبلت','Tablet')}</button><button type="button" className={viewport==='mobile'?styles.active:''} aria-pressed={viewport==='mobile'} onClick={()=>setViewport('mobile')}>{l('موبایل','Mobile')}</button></div><a className={`admin-muted-button ${styles.open}`} href={src} target="_blank" rel="noreferrer"><AdminIcon name="arrow" size={16}/>{l('نمایش تمام‌صفحه','Open full preview')}</a></div>
    <div className={`${styles.stage} ${styles[viewport]}`}><iframe key={src} src={src} title={l('پیش‌نمایش زنده پیش‌نویس سایت','Live site draft preview')} referrerPolicy="same-origin" loading="lazy"/></div>
  </div>
}
