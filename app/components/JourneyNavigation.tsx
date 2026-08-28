'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import type {PreviewNavigationItem} from './PublicPageView'
import styles from '@/app/[slug]/public-page.module.css'

export default function JourneyNavigation({items,activeId,previewBasePath,isFa}:{items:PreviewNavigationItem[];activeId:string;previewBasePath?:string;isFa:boolean}){
  const [open,setOpen]=useState(false)
  useEffect(()=>{const close=()=>setOpen(false);window.addEventListener('resize',close);return()=>window.removeEventListener('resize',close)},[])
  const href=(item:PreviewNavigationItem)=>previewBasePath?`${previewBasePath}?page=${item.id}`:`/${item.slug}`
  return <div className={styles.journeyNavShell}>
    <button className={styles.menuToggle} type="button" aria-expanded={open} aria-controls="journey-menu" aria-label={isFa?'بازکردن منوی سایت':'Open site menu'} onClick={()=>setOpen(value=>!value)}><span/><span/><span/></button>
    <nav className={`${styles.navigation} ${open?styles.navigationOpen:''}`} id="journey-menu" aria-label={isFa?'صفحه‌های سایت':'Site pages'}>
      {items.slice(0,8).map(item=><Link onClick={()=>setOpen(false)} className={item.id===activeId?styles.activeNavigation:undefined} aria-current={item.id===activeId?'page':undefined} key={item.id} href={href(item)}>{item.title}</Link>)}
    </nav>
    {open?<button type="button" className={styles.menuScrim} aria-label={isFa?'بستن منو':'Close menu'} onClick={()=>setOpen(false)}/>:null}
  </div>
}
