'use client'

import {useState} from 'react'
import {useAdminLocale} from '@/app/admin/components/AdminLocale'
import styles from './design-preview.module.css'

type PreviewPage={id:string;title:string}

export default function DesignPreviewFrame({siteId,pages}:{siteId:string;pages:PreviewPage[]}){
  const {language}=useAdminLocale()
  const [pageId,setPageId]=useState(pages[0]?.id??'')
  const [viewport,setViewport]=useState<'desktop'|'mobile'>('desktop')
  const l=(fa:string,en:string)=>language==='fa'?fa:en
  if(!pageId)return <div className="admin-empty">{l('ابتدا یک صفحه برای سایت بسازید تا پیش‌نمایش نمایش داده شود.','Create a site page first to see the preview.')}</div>
  const src=`/preview/sites/${siteId}?page=${pageId}`
  return <div className={styles.root}><div className={styles.toolbar}><label><span>{l('صفحه پیش‌نمایش','Preview page')}</span><select value={pageId} onChange={(event)=>setPageId(event.target.value)}>{pages.map((page)=><option value={page.id} key={page.id}>{page.title}</option>)}</select></label><div className={styles.sizes} role="group" aria-label={l('اندازه نمایش','Preview viewport')}><button type="button" className={viewport==='desktop'?styles.active:''} onClick={()=>setViewport('desktop')}>{l('رایانه','Desktop')}</button><button type="button" className={viewport==='mobile'?styles.active:''} onClick={()=>setViewport('mobile')}>{l('موبایل','Mobile')}</button></div><a className={`admin-muted-button ${styles.open}`} href={src} target="_blank" rel="noreferrer">{l('نمایش در صفحه کامل','Open full preview')}</a></div><div className={`${styles.stage} ${viewport==='mobile'?styles.mobile:''}`}><iframe key={src} src={src} title={l('پیش‌نمایش زنده پیش‌نویس سایت','Live site draft preview')} referrerPolicy="same-origin"/></div></div>
}
