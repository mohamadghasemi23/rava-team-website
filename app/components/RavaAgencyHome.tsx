'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './rava-agency-home.module.css'

type HomeContent = {
  hero?: { badge?: string; title?: string; description?: string; primary_cta?: string; secondary_cta?: string }
  stats?: Array<{ value?: string; label?: string }>
  marquee?: string
  services_intro?: string
  about?: { title?: string; body?: string }
  values?: Array<{ title?: string; body?: string }>
  final_cta?: { title?: string; body?: string; button?: string }
}

type Service = { id:string; title:string; slug:string; summary:string }
type Project = {
  id:string; title:string; slug:string; summary:string; project_kind:'real'|'concept'; client_name:string|null; project_year:number|null; role_text:string|null; scope:string[]; kpis:string[]; featured:boolean; coverUrl:string; gallery:string[]
}
type SiteSettings = { email?:string; phone?:string; address?:string; instagram?:string; linkedin?:string; telegram?:string; footer_text?:string; enamad_enabled?:boolean; enamad_url?:string; enamad_image?:string }

const sectionAnim = { hidden:{opacity:0,y:28}, show:{opacity:1,y:0,transition:{duration:.65,ease:'easeOut' as const}} }
const mainNav = [
  { href:'/services', label:'خدمات' },
  { href:'/work', label:'پروژه‌ها' },
  { href:'/about', label:'درباره راوا' },
]

function splitHeroTitle(value:string){
  const title=value.trim()||'تجربه‌های دیجیتال بهتر می‌سازیم.'
  const marker='بهتر'
  if(title.includes(marker)){
    const [before,...after]=title.split(marker)
    return {line1:before.trim(),highlight:marker,line2:after.join(marker).trim()}
  }
  const words=title.split(/\s+/)
  const pivot=Math.max(1,Math.ceil(words.length/2))
  return {line1:words.slice(0,pivot).join(' '),highlight:'',line2:words.slice(pivot).join(' ')}
}

export default function RavaAgencyHome({ home, services, projects, settings }: { home:HomeContent; services:Service[]; projects:Project[]; settings:SiteSettings }) {
  const heroRef = useRef<HTMLElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const [activeProject,setActiveProject] = useState(0)
  const [menuOpen,setMenuOpen] = useState(false)
  const featured = projects.find(p=>p.featured) ?? projects[0]
  const values = home.values ?? []
  const stats = (home.stats ?? []).slice(0,3)
  const marqueeItems = useMemo(()=>String(home.marquee || '').split('—').map(x=>x.trim()).filter(Boolean),[home.marquee])
  const heroTitle=splitHeroTitle(home.hero?.title||'تجربه‌های دیجیتال بهتر می‌سازیم.')

  useEffect(()=>{
    gsap.registerPlugin(ScrollTrigger)
    if (!heroRef.current) return
    const ctx = gsap.context(()=>{
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)',()=>{
        gsap.set(`.${styles.heroLineInner}`,{yPercent:115})
        const tl = gsap.timeline({defaults:{ease:'power4.out'}})
        tl.fromTo(`.${styles.heroTop}`,{opacity:0,y:-18},{opacity:1,y:0,duration:.8})
          .to(`.${styles.heroLineInner}`,{yPercent:0,duration:1.05,stagger:.12},'-=.25')
          .fromTo(`.${styles.heroSub}`,{opacity:0,y:22},{opacity:1,y:0,duration:.8},'-=.6')
          .fromTo(`.${styles.stat}`,{opacity:0,y:20},{opacity:1,y:0,duration:.65,stagger:.1},'-=.35')
        if(marqueeRef.current) gsap.to(marqueeRef.current,{xPercent:-50,duration:26,ease:'none',repeat:-1})
      })
    },heroRef)
    return ()=>ctx.revert()
  },[])

  useEffect(()=>{
    if(!menuOpen) return
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKeyDown=(event:KeyboardEvent)=>{ if(event.key==='Escape') setMenuOpen(false) }
    window.addEventListener('keydown',onKeyDown)
    return ()=>{
      document.body.style.overflow=previousOverflow
      window.removeEventListener('keydown',onKeyDown)
    }
  },[menuOpen])

  const projectPreview = projects[Math.min(activeProject,Math.max(0,projects.length-1))]

  return <div className={styles.site}>
    <header className={styles.header}>
      <a className={styles.brand} href="#top">RAVA <b>TEAM</b></a>
      <nav className={styles.nav} aria-label="منوی اصلی">
        {mainNav.map(item=><a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <a className={styles.headerCta} href="/contact">شروع پروژه</a>
      <button type="button" className={styles.menuButton} aria-label={menuOpen?'بستن منو':'باز کردن منو'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={()=>setMenuOpen(open=>!open)}>
        <span/><span/>
      </button>
    </header>

    <AnimatePresence>
      {menuOpen&&<motion.div id="mobile-navigation" className={styles.mobileMenu} initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.22}}>
        <nav aria-label="منوی موبایل">
          {mainNav.map((item,i)=><a key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}><span>{String(i+1).padStart(2,'0')}</span>{item.label}</a>)}
          <a href="/contact" onClick={()=>setMenuOpen(false)}><span>04</span>شروع پروژه</a>
        </nav>
      </motion.div>}
    </AnimatePresence>

    <main className={styles.main} id="top">
      <section ref={heroRef} className={styles.hero}>
        <div className={styles.heroTop}><span className={styles.badge}><i/> {home.hero?.badge || 'آماده همکاری روی پروژه‌های جدید'}</span><span>RAVA DIGITAL STUDIO — SHIRAZ</span></div>
        <span className={styles.star} aria-hidden>✳</span>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroMask}><span className={styles.heroLineInner}>{heroTitle.line1}</span></span>
          {(heroTitle.highlight||heroTitle.line2)&&<span className={styles.heroMask}><span className={styles.heroLineInner}>{heroTitle.highlight&&<><em>{heroTitle.highlight}</em>{' '}</>}{heroTitle.line2}</span></span>}
        </h1>
        <div className={styles.heroBottom}>
          <div>
            <p className={styles.heroSub}>{home.hero?.description}</p>
            <div className={styles.heroActions}><a href="/contact">{home.hero?.primary_cta||'شروع پروژه'}</a><a href="/work">{home.hero?.secondary_cta||'دیدن نمونه‌کارها'}</a></div>
          </div>
          <a href="#services" className={styles.scrollCue}>برای دیدن بیشتر اسکرول کنید ↓</a>
        </div>
        <div className={styles.rule}/>
        <div className={styles.stats}>{stats.map((s,i)=><div className={styles.stat} key={i}><b>{s.value || '—'}</b><span>{s.label || ''}</span></div>)}</div>
        <div className={styles.marquee}><div ref={marqueeRef} className={styles.marqueeTrack}>{[...marqueeItems,...marqueeItems].map((item,i)=><span key={i}>{item}<i>✦</i></span>)}</div></div>
      </section>

      <motion.section id="services" className={styles.section} variants={sectionAnim} initial="hidden" whileInView="show" viewport={{once:true,margin:'-80px'}}>
        <SectionHead eyebrow="(Process) / What we do" title="چه کاری انجام می‌دهیم"/>
        <p className={styles.lead}>{home.services_intro}</p>
        <div className={styles.services}>{services.slice(0,6).map((s,i)=><a href={`/services/${s.slug}`} className={styles.serviceRow} key={s.id}><span>{String(i+1).padStart(2,'0')}</span><h3>{s.title}</h3><p>{s.summary}</p><b>↗</b></a>)}</div>
      </motion.section>

      <motion.section className={styles.section} variants={sectionAnim} initial="hidden" whileInView="show" viewport={{once:true,margin:'-80px'}}>
        <SectionHead eyebrow="Selected work" title="Projects"/>
        <div className={styles.bento}>{projects.slice(0,6).map((p,i)=><a href={`/work/${p.slug}`} className={`${styles.tile} ${styles[`tile${i%6}`] || ''}`} key={p.id}>{p.coverUrl && <img src={p.coverUrl} alt={p.title}/>}<div className={styles.tileShade}/><div className={styles.tileTop}><span>{p.project_kind==='concept'?'CONCEPT':'RAVA PROJECT'}</span><small>{p.project_year || '2026'}</small></div><div className={styles.tileBottom}><h3>{p.title}</h3><p>{p.summary}</p></div></a>)}</div>
      </motion.section>

      <motion.section className={styles.section} variants={sectionAnim} initial="hidden" whileInView="show" viewport={{once:true,margin:'-80px'}}>
        <SectionHead eyebrow="Selected work" title="Projects II"/>
        <div className={styles.projectSplit}>
          <ul className={styles.projectList}>{projects.map((p,i)=><li key={p.id}><a href={`/work/${p.slug}`} onMouseEnter={()=>setActiveProject(i)} onFocus={()=>setActiveProject(i)}><span>{String(i+1).padStart(2,'0')}</span><b>{p.title}</b><small>{p.project_kind==='concept'?'Concept':'Project'}</small></a></li>)}</ul>
          <div className={styles.stickyPreview}><AnimatePresence mode="wait">{projectPreview && <motion.a href={`/work/${projectPreview.slug}`} key={projectPreview.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} transition={{duration:.35}} className={styles.previewCard}>{projectPreview.coverUrl && <img src={projectPreview.coverUrl} alt={projectPreview.title}/>}<div className={styles.previewShade}/><div><span>{projectPreview.project_kind==='concept'?'CONCEPT PROJECT':'SELECTED WORK'}</span><h3>{projectPreview.title}</h3><p>{projectPreview.summary}</p></div></motion.a>}</AnimatePresence></div>
        </div>
      </motion.section>

      {featured && <motion.section className={styles.section} variants={sectionAnim} initial="hidden" whileInView="show" viewport={{once:true,margin:'-80px'}}>
        <SectionHead eyebrow="Featured Case Study" title={featured.title}/>
        <div className={styles.caseStudy}>
          <div className={styles.caseMedia}>{(featured.gallery[0] || featured.coverUrl) && <img src={featured.gallery[0] || featured.coverUrl} alt={featured.title}/>}</div>
          <div className={styles.caseCopy}><p>{featured.summary}</p><dl><div><dt>Client</dt><dd>{featured.client_name || 'RAVA'}</dd></div><div><dt>Year</dt><dd>{featured.project_year || 2026}</dd></div><div><dt>Role</dt><dd>{featured.role_text || 'Strategy / Design / Development'}</dd></div><div><dt>Scope</dt><dd>{featured.scope.join(' / ') || 'Digital Product'}</dd></div></dl><div className={styles.kpis}>{featured.kpis.slice(0,3).map((k,i)=><div key={i}><b>{k}</b></div>)}</div><a href={`/work/${featured.slug}`}>مشاهده مطالعه موردی ↗</a></div>
        </div>
      </motion.section>}

      <motion.section className={styles.section} variants={sectionAnim} initial="hidden" whileInView="show" viewport={{once:true,margin:'-80px'}}>
        <SectionHead eyebrow="About / Who we are" title={home.about?.title || 'یک تیم مستقل برای ساختن بهتر.'}/>
        <div className={styles.aboutGrid}><p className={styles.aboutLead}>{home.about?.body}</p><div className={styles.values}>{values.slice(0,4).map((v,i)=><article key={i}><span>{String(i+1).padStart(2,'0')}</span><h3>{v.title}</h3><p>{v.body}</p></article>)}</div></div>
      </motion.section>

      <section className={styles.finalCta} id="contact"><span>Got a project?</span><h2>{home.final_cta?.title || 'پروژه‌ای دارید؟ شروع کنیم.'}</h2><p>{home.final_cta?.body}</p><a href="/contact">{home.final_cta?.button || 'شروع پروژه'} ↗</a></section>

      <footer className={styles.footer}><div><a className={styles.brand} href="#top">RAVA <b>TEAM</b></a><p>{settings.footer_text || 'طراحی و توسعه وب، محصولات دیجیتال و راهکارهای خلاقانه.'}</p></div><div className={styles.footerLinks}><a href="/services">خدمات</a><a href="/work">پروژه‌ها</a><a href="/about">درباره راوا</a><a href="/contact">تماس</a></div><div className={styles.footerMeta}><span>{settings.address || 'Shiraz, Iran'}</span>{settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}{settings.enamad_enabled && settings.enamad_image && <a href={settings.enamad_url || '#'} target="_blank" rel="noreferrer"><img src={settings.enamad_image} alt="نماد اعتماد الکترونیکی"/></a>}</div><small>© RAVA TEAM 2026</small></footer>
    </main>
  </div>
}

function SectionHead({eyebrow,title}:{eyebrow:string;title:string}){return <div className={styles.sectionHead}><span>{eyebrow}</span><h2>{title}</h2></div>}
