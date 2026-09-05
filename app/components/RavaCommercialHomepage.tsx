'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import type {PublicPagePayload} from '@/lib/cms/public-runtime'
import type {PreviewNavigationItem} from './PublicPageView'
import styles from './rava-commercial-homepage.module.css'

type Props={payload:PublicPagePayload;navigation:PreviewNavigationItem[];previewBasePath?:string}
type Slide={title:string;descriptor:string;headline:string;body:string;tone:'consulting'|'health'|'learning'}

const content={
  fa:{nav:['خدمات','قالب‌ها','نمونه‌ها','فرآیند','درباره ما'],start:'شروع پروژه',headline:'سایت حرفه‌ای؛ با یک سیستم واقعی پشت آن',body:'راوا یک سیستم کامل برای ساخت، مدیریت و رشد سایت‌های حرفه‌ای است؛ سریع، منظم و قابل اعتماد.',secondary:'راوا چگونه کار می‌کند؟',sliderTitle:'برای کسب‌وکار شما هم یک مسیر داریم.',sliderBody:'هر قالب، یک هویت مستقل؛ متناسب با مخاطب و هدف شما.',choose:'دیدن این قالب',slides:[{title:'خدمات حرفه‌ای',descriptor:'دقیق، معتبر و نتیجه‌محور',headline:'راه‌حل روشن برای تصمیم‌های مهم',body:'اعتماد از اولین نگاه شروع می‌شود.',tone:'consulting'},{title:'کلینیک آرامش',descriptor:'تجربه‌ای مطمئن در مراقبت از سلامت شما',headline:'سلامتی شما، اولویت ماست',body:'با بهره‌گیری از پزشکان متخصص و خدمات حرفه‌ای، مسیر دریافت مراقبت را ساده و روشن کنید.',tone:'health'},{title:'آموزش',descriptor:'پویا، منظم و الهام‌بخش',headline:'یادگیری برای فردای واقعی',body:'دانش را در تجربه‌ای روان و ماندگار ارائه کنید.',tone:'learning'}]},
  en:{nav:['Services','Templates','Work','Process','About'],start:'Start a project',headline:'A professional website with a real system behind it',body:'RAVA is a complete system for building, managing and growing professional websites—fast, organized and dependable.',secondary:'How does RAVA work?',sliderTitle:'There is a distinct direction for your business.',sliderBody:'Every template has its own identity, shaped around its audience and goal.',choose:'View this template',slides:[{title:'Professional services',descriptor:'Precise, credible and outcome-led',headline:'Clarity for consequential decisions',body:'Trust begins with the first interaction.',tone:'consulting'},{title:'Aramesh Clinic',descriptor:'Confident care for your health',headline:'Your health is our priority',body:'Specialist physicians and a clear service journey make professional care easier to access.',tone:'health'},{title:'Education',descriptor:'Dynamic, structured and inspiring',headline:'Learning for what comes next',body:'Turn knowledge into a fluid, lasting experience.',tone:'learning'}]}
}

function Arrow(){return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>}
function Pause({paused}:{paused:boolean}){return <svg aria-hidden="true" viewBox="0 0 24 24">{paused?<path d="m9 7 8 5-8 5Z"/>:<><path d="M9 7v10"/><path d="M15 7v10"/></>}</svg>}
function hrefFor(item:PreviewNavigationItem,base?:string){return base?`${base}?page=${item.id}`:`/${item.slug}`}

export default function RavaCommercialHomepage({payload,navigation,previewBasePath}:Props){
  const isFa=!payload.page.slug.endsWith('-en')&&(payload.site.locale||'fa').startsWith('fa')
  const t=isFa?content.fa:content.en
  const [active,setActive]=useState(1)
  const [userPaused,setUserPaused]=useState(false)
  const [interactionPaused,setInteractionPaused]=useState(false)
  const [timerKey,setTimerKey]=useState(0)
  const pointerStart=useRef<number|null>(null)
  const autoplay=useRef(Autoplay({delay:6000,stopOnInteraction:false,stopOnMouseEnter:false}))
  const [emblaRef,emblaApi]=useEmblaCarousel({align:'start',containScroll:false,direction:isFa?'rtl':'ltr',duration:56,loop:true},[autoplay.current])
  const hero=payload.blocks.find(block=>block.type==='hero')
  const title=typeof hero?.data?.title==='string'&&hero.data.title.trim()?hero.data.title:t.headline
  const body=typeof hero?.data?.text==='string'&&hero.data.text.trim()?hero.data.text:t.body
  const localized=navigation.filter(item=>item.slug.endsWith('-en')!==isFa)
  const contact=localized.find(item=>item.slug===(isFa?'contact':'contact-en'))
  const contactHref=contact?hrefFor(contact,previewBasePath):(isFa?'/contact':'/contact-en')
  const paused=userPaused||interactionPaused
  const move=useCallback((delta:number)=>{if(!emblaApi)return;if(delta<0)emblaApi.scrollPrev();else emblaApi.scrollNext();autoplay.current.reset()},[emblaApi])
  const setDragProgress=useCallback((progress:number)=>{if(!emblaApi)return;const selected=emblaApi.selectedScrollSnap();emblaApi.slideNodes().forEach((node,index)=>{const card=node.firstElementChild as HTMLElement|null;if(!card)return;const direction=index===selected?(Math.sign(progress)||1):(Math.sign(progress)*-1||-1);const amount=index===selected?Math.abs(progress):Math.max(0,Math.abs(progress)-.12);card.style.setProperty('--drag-rotate',`${direction*amount*10.7}deg`);card.style.setProperty('--drag-scale',String(1-amount*.089))})},[emblaApi])
  const clearDragProgress=useCallback(()=>{pointerStart.current=null;emblaApi?.slideNodes().forEach(node=>{const card=node.firstElementChild as HTMLElement|null;card?.style.removeProperty('--drag-rotate');card?.style.removeProperty('--drag-scale')})},[emblaApi])
  useEffect(()=>{
    if(!emblaApi)return
    const select=()=>{setActive(emblaApi.selectedScrollSnap());setTimerKey(key=>key+1)}
    const settle=()=>clearDragProgress()
    emblaApi.on('select',select).on('settle',settle)
    emblaApi.scrollTo(1,true);select()
    return()=>{emblaApi.off('select',select).off('settle',settle)}
  },[clearDragProgress,emblaApi])
  useEffect(()=>{const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(paused||reduced)autoplay.current.stop();else autoplay.current.play()},[paused])
  return <div className={styles.page} dir={isFa?'rtl':'ltr'} lang={isFa?'fa':'en'}>
    <a className={styles.skip} href="#main">{isFa?'رفتن به محتوای اصلی':'Skip to main content'}</a>
    <header className={styles.header}>
      <Link className={styles.brand} href={previewBasePath?`${previewBasePath}?page=${payload.page.id}`:'/'}>RAVA TEAM</Link>
      <nav aria-label={isFa?'منوی اصلی':'Primary navigation'}>{localized.slice(0,5).length?localized.slice(0,5).map(item=><Link key={item.id} href={hrefFor(item,previewBasePath)}>{item.title}</Link>):t.nav.map(label=><a key={label} href="#showcase">{label}</a>)}</nav>
      <Link className={styles.headerCta} href={contactHref}><span>{t.start}</span><Arrow/></Link>
      <details className={styles.mobileMenu}><summary aria-label={isFa?'بازکردن منو':'Open menu'}><i/><i/><i/></summary><div>{t.nav.map(label=><a key={label} href="#showcase">{label}</a>)}<Link href={contactHref}>{t.start}</Link></div></details>
    </header>
    <main id="main">
      <section className={styles.hero}>
        <div className={styles.heroCopy}><h1>{title}</h1><p>{body}</p><div className={styles.actions}><Link className={styles.primary} href={contactHref}><span>{t.start}</span><Arrow/></Link><a className={styles.textLink} href="#showcase">{t.secondary}</a></div></div>
        <div className={styles.webCanvas} aria-label={isFa?'نمونه سایت حرفه‌ای ساخته‌شده با راوا':'A professional website made with RAVA'}>
          <div className={styles.canvasNav}><b>RAVA</b><span>{isFa?'خدمات　رویکرد　مقاله‌ها':'Services　Approach　Journal'}</span></div>
          <div className={styles.canvasBody}><div className={styles.canvasScene}><div className={styles.canvasGlow}/><div className={styles.canvasServices}><span/><span/><span/></div></div><div><small>{isFa?'راهکارهای دیجیتال برای رشد':'Digital systems for growth'}</small><h2>{isFa?'کسب‌وکارها را به رشد می‌رسانیم.':'Helping businesses grow with clarity.'}</h2><p>{isFa?'طراحی، محتوا و توسعه در یک تجربه منسجم و حرفه‌ای.':'Design, content and development in one coherent experience.'}</p><span>{isFa?'دیدن خدمات':'Explore services'}</span></div></div>
          <div className={styles.canvasFoot}><span>{isFa?'راهبرد':'Strategy'}</span><span>{isFa?'محتوا':'Content'}</span><span>{isFa?'طراحی':'Design'}</span><b>{isFa?'منتشرشده':'Published'}<i/></b></div>
        </div>
        <div className={styles.curve}/>
      </section>
      <section className={styles.showcase} id="showcase" aria-labelledby="showcase-title" onMouseEnter={()=>setInteractionPaused(true)} onMouseLeave={()=>setInteractionPaused(false)} onFocusCapture={()=>setInteractionPaused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setInteractionPaused(false)}}>
        <header><h2 id="showcase-title">{t.sliderTitle}</h2><p>{t.sliderBody}</p></header>
        <div className={styles.viewport} ref={emblaRef} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);pointerStart.current=event.clientX;setInteractionPaused(true)}} onPointerMove={event=>{if(pointerStart.current===null)return;const progress=Math.max(-.28,Math.min(.28,(event.clientX-pointerStart.current)/Math.max(event.currentTarget.clientWidth,1)));setDragProgress(progress)}} onPointerUp={event=>{event.currentTarget.releasePointerCapture(event.pointerId);clearDragProgress();setInteractionPaused(false);autoplay.current.reset()}} onPointerCancel={()=>{clearDragProgress();setInteractionPaused(false)}} onLostPointerCapture={()=>{clearDragProgress();setInteractionPaused(false)}}>
          <div className={styles.track}>
            {t.slides.map((item,index)=>{const slide=item as Slide;const slideImage={consulting:'/templates/rava-commercial-homepage/professional-consulting.webp',health:'/templates/rava-commercial-homepage/healthcare-doctor.webp',learning:'/templates/rava-commercial-homepage/education-mentorship.webp'}[slide.tone];return <div className={styles.slideSlot} key={slide.tone}><article className={`${styles.slide} ${styles[slide.tone]}`} aria-hidden={index!==active}><div className={styles.slideNav}><b>{slide.title}</b><span>{isFa?'خدمات　درباره ما　تماس':'Services　About　Contact'}</span></div><div className={styles.slideBody}><div><small>{slide.descriptor}</small><h3>{slide.headline}</h3><p>{slide.body}</p><Link href={contactHref} tabIndex={index===active?0:-1}>{t.choose}</Link></div><div className={styles.slideArt}><Image src={slideImage} alt="" fill sizes="(max-width: 820px) 88vw, 38vw" priority={index===1}/></div></div><div className={styles.slideFooter}><span>{isFa?'راهبرد روشن':'Clear strategy'}</span><span>{isFa?'تجربه منسجم':'Coherent experience'}</span><span>{isFa?'رشد پایدار':'Sustainable growth'}</span></div></article></div>})}
          </div>
        </div>
        <div className={`${styles.controls} ${paused?styles.isPaused:''}`}><span aria-live="polite">{String(active+1).padStart(2,'0')} / {String(t.slides.length).padStart(2,'0')}</span><div className={styles.timer}><i key={`${active}-${timerKey}`}/></div><button type="button" onClick={()=>setUserPaused(value=>!value)} aria-label={userPaused?(isFa?'ادامه پخش خودکار':'Resume autoplay'):(isFa?'توقف پخش خودکار':'Pause autoplay')} aria-pressed={userPaused}><Pause paused={userPaused}/></button><button type="button" onClick={()=>move(-1)} aria-label={isFa?'قالب قبلی':'Previous template'}><Arrow/></button><button type="button" onClick={()=>move(1)} aria-label={isFa?'قالب بعدی':'Next template'}><Arrow/></button></div>
      </section>
    </main>
  </div>
}
