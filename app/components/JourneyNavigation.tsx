'use client'

import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import type {PreviewNavigationItem} from './PublicPageView'
import styles from '@/app/[slug]/public-page.module.css'

export default function JourneyNavigation({items,activeId,previewBasePath,isFa}:{items:PreviewNavigationItem[];activeId:string;previewBasePath?:string;isFa:boolean}){
  const [open,setOpen]=useState(false)
  const toggle=useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    const close=()=>setOpen(false)
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus()}}
    window.addEventListener('resize',close)
    window.addEventListener('keydown',escape)
    document.body.style.overflow=open?'hidden':''
    return()=>{window.removeEventListener('resize',close);window.removeEventListener('keydown',escape);document.body.style.overflow=''}
  },[open])
  const href=(item:PreviewNavigationItem)=>previewBasePath?`${previewBasePath}?page=${item.id}`:`/${item.slug}`
  return <div className={styles.journeyNavShell}>
    <button ref={toggle} className={`${styles.menuToggle} ${open?styles.menuToggleOpen:''}`} type="button" aria-expanded={open} aria-controls="journey-menu" aria-label={open?(isFa?'بستن منوی سایت':'Close site menu'):(isFa?'بازکردن منوی سایت':'Open site menu')} onClick={()=>setOpen(value=>!value)}><span/><span/><span/></button>
    <nav className={`${styles.navigation} ${open?styles.navigationOpen:''}`} id="journey-menu" aria-label={isFa?'صفحه‌های سایت':'Site pages'}>
      <div className={styles.mobileMenuHeading} aria-hidden="true"><span>{isFa?'منوی اصلی':'Main menu'}</span><small>{isFa?'مسیر خود را انتخاب کنید':'Choose your destination'}</small></div>
      {items.slice(0,8).map((item,index)=><Link onClick={()=>setOpen(false)} className={item.id===activeId?styles.activeNavigation:undefined} aria-current={item.id===activeId?'page':undefined} key={item.id} href={href(item)}><small aria-hidden="true">{isFa?new Intl.NumberFormat('fa-IR',{minimumIntegerDigits:2}).format(index+1):String(index+1).padStart(2,'0')}</small><span>{item.title}</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></Link>)}
    </nav>
    {open?<button type="button" className={styles.menuScrim} aria-label={isFa?'بستن منو':'Close menu'} onClick={()=>setOpen(false)}/>:null}
  </div>
}
