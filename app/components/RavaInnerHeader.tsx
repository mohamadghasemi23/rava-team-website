'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './rava-inner.module.css'

const navItems = [
  { href:'/services', label:'خدمات' },
  { href:'/work', label:'پروژه‌ها' },
  { href:'/about', label:'درباره راوا' },
]

export default function RavaInnerHeader(){
  const [open,setOpen]=useState(false)

  useEffect(()=>{
    if(!open) return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
    window.addEventListener('keydown',onKey)
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}
  },[open])

  return <>
    <header className={styles.header}>
      <a className={styles.brand} href="/">RAVA <b>TEAM</b></a>
      <nav aria-label="منوی اصلی">{navItems.map(item=><a href={item.href} key={item.href}>{item.label}</a>)}</nav>
      <a className={styles.cta} href="/contact">شروع پروژه</a>
      <button type="button" className={styles.menuButton} aria-label={open?'بستن منو':'باز کردن منو'} aria-expanded={open} aria-controls="inner-mobile-navigation" onClick={()=>setOpen(value=>!value)}><span/><span/></button>
    </header>
    <AnimatePresence>{open&&<motion.div id="inner-mobile-navigation" className={styles.mobileMenu} initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.22}}><nav aria-label="منوی موبایل">{navItems.map((item,i)=><a href={item.href} key={item.href} onClick={()=>setOpen(false)}><span>{String(i+1).padStart(2,'0')}</span>{item.label}</a>)}<a href="/contact" onClick={()=>setOpen(false)}><span>04</span>شروع پروژه</a></nav></motion.div>}</AnimatePresence>
  </>
}
