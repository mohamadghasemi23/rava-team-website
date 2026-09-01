import Link from 'next/link'
import type {PublicBlock,PublicPagePayload} from '@/lib/cms/public-runtime'
import type {PreviewNavigationItem} from './PublicPageView'
import styles from './rava-living-system.module.css'

type Props={payload:PublicPagePayload;navigation:PreviewNavigationItem[];previewBasePath?:string;showMenuPreview?:boolean}

const copy={
  fa:{platform:'پلتفرم',services:'خدمات',work:'کارها',process:'فرآیند',about:'درباره ما',start:'شروع پروژه',view:'دیدن نسخه زنده',menuTitle:'همه‌چیز برای ساخت و رشد سایت',groups:[['مدیریت محتوا','نویسنده','رسانه','دسته‌بندی'],['طراحی و تجربه','سایت‌ساز','قالب‌ها','بلوک‌ها'],['عملیات و رشد','سئو و عملکرد','فرم‌ها و لید','نقش‌ها و دسترسی']],canvas:'صفحه اصلی',draft:'پیش‌نویس',preview:'پیش‌نمایش',published:'منتشرشده',journey:'راوا را در عمل ببینید',steps:[['محتوا','محتوای خود را وارد و مدیریت کنید.'],['طراحی','با ابزارهای قاعده‌مند، سایت خود را بسازید.'],['پیش‌نمایش','قبل از انتشار، همه‌چیز را بررسی کنید.'],['انتشار','با یک تأیید، سایت شما آماده است.']]},
  en:{platform:'Platform',services:'Services',work:'Work',process:'Process',about:'About',start:'Start a project',view:'View live version',menuTitle:'Everything needed to build and grow a site',groups:[['Content management','Writer','Media','Categories'],['Design and experience','Site builder','Templates','Blocks'],['Operations and growth','SEO and performance','Forms and leads','Roles and access']],canvas:'Home page',draft:'Draft',preview:'Preview',published:'Published',journey:'See RAVA in action',steps:[['Content','Bring in and manage your business content.'],['Design','Build with professional, constraint-led tools.'],['Preview','Review the real result before anything goes live.'],['Publish','Approve one safe, versioned release.']]}
} as const

function hrefFor(item:PreviewNavigationItem,previewBasePath?:string){return previewBasePath?`${previewBasePath}?page=${item.id}`:`/${item.slug}`}
function Arrow(){return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>}
function Mark(){return <span className={styles.mark} aria-hidden="true"><i/><i/><i/></span>}

export default function RavaLivingSystemPage({payload,navigation,previewBasePath,showMenuPreview=false}:Props){
  const isFa=!payload.page.slug.endsWith('-en')&&(payload.site.locale||'fa').startsWith('fa')
  const t=isFa?copy.fa:copy.en
  const hero=payload.blocks.find((block:PublicBlock)=>block.type==='hero')
  const title=typeof hero?.data?.title==='string'&&hero.data.title.trim()?hero.data.title:(isFa?'سایت حرفه‌ای؛ با یک سیستم واقعی پشت آن':'A professional website, powered by a real operating system')
  const body=typeof hero?.data?.text==='string'&&hero.data.text.trim()?hero.data.text:typeof hero?.data?.body==='string'&&hero.data.body.trim()?hero.data.body:(isFa?'راوا یک سیستم کامل برای ساخت، مدیریت و رشد سایت‌های حرفه‌ای است؛ سریع، منظم و قابل اعتماد.':'RAVA is a complete system for building, operating and growing professional websites—fast, structured and dependable.')
  const localized=navigation.filter(item=>item.slug.endsWith('-en')!==isFa).slice(0,5)
  const contact=previewBasePath?`${previewBasePath}?page=${payload.page.id}`:(isFa?'/contact':'/contact-en')
  return <div className={styles.page} lang={isFa?'fa':'en'} dir={isFa?'rtl':'ltr'} data-template="rava-service-living-system">
    <a className={styles.skip} href="#living-main">{isFa?'رفتن به محتوای اصلی':'Skip to main content'}</a>
    <div className={styles.frame}>
      <header className={styles.navbar}>
        <Link className={styles.brand} href={previewBasePath?`${previewBasePath}?page=${payload.page.id}`:'/'} aria-label={payload.site.name}><Mark/><span>RAVA TEAM</span></Link>
        <nav className={styles.primaryNav} aria-label={isFa?'منوی اصلی':'Primary navigation'}>
          <details className={styles.menu} open={showMenuPreview}>
            <summary>{t.platform}<svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></summary>
            <div className={styles.mega}>
              <div className={styles.megaIntro}><span>{t.menuTitle}</span><div className={styles.miniPreview}><Mark/><i/><i/><i/></div></div>
              {t.groups.map(([heading,...links])=><div className={styles.megaGroup} key={heading}><b>{heading}</b>{links.map(label=><Link href={contact} key={label}><span>{label}</span><Arrow/></Link>)}</div>)}
            </div>
          </details>
          {localized.length?localized.slice(0,4).map(item=><Link key={item.id} href={hrefFor(item,previewBasePath)}>{item.title}</Link>):<><Link href={isFa?'/services':'/services-en'}>{t.services}</Link><Link href={isFa?'/portfolio':'/portfolio-en'}>{t.work}</Link><Link href={isFa?'/process':'/process-en'}>{t.process}</Link><Link href={isFa?'/about':'/about-en'}>{t.about}</Link></>}
        </nav>
        <Link className={styles.navCta} href={contact}><span>{t.start}</span><Arrow/></Link>
      </header>

      <main id="living-main">
        <section className={styles.hero} aria-labelledby="living-title">
          <div className={styles.heroCopy}><h1 id="living-title">{title}</h1><p>{body}</p><div className={styles.actions}><Link className={styles.primaryAction} href={contact}><span>{t.start}</span><Arrow/></Link><Link className={styles.secondaryAction} href="#rava-journey"><span>{t.view}</span><Arrow/></Link></div></div>

          <div className={styles.productScene} aria-label={isFa?'نمایی از صفحه‌ساز، پیش‌نمایش واکنش‌گرا و مسیر انتشار راوا':'RAVA page builder, responsive preview and publishing flow'}>
            <div className={styles.editor}>
              <div className={styles.editorRail}><Mark/><i/><i/><i/><i/></div>
              <div className={styles.editorBody}><div className={styles.editorToolbar}><span>{t.canvas}</span><div><i/><i/><i/><i/></div></div><div className={styles.canvas}><img src="/templates/rava-living-system/editor-site-visual.png" alt=""/><div className={styles.canvasCopy}><b>{isFa?'از ساخت تا رشد؛ در یک سیستم':'From build to growth, in one system'}</b><span>{isFa?'محتوا، طراحی، سئو و انتشار کنار هم':'Content, design, SEO and release together'}</span></div></div></div>
            </div>
            <div className={styles.devices}><div className={styles.tablet}><img src="/templates/rava-living-system/responsive-site-visual.png" alt=""/></div><div className={styles.phone}><img src="/templates/rava-living-system/responsive-site-visual.png" alt=""/></div></div>
            <ol className={styles.releaseRail}><li><span/><b>{t.draft}</b></li><li><span/><b>{t.preview}</b></li><li><span/><b>{t.published}</b></li></ol>
          </div>
        </section>

        <section className={styles.journey} id="rava-journey" aria-labelledby="journey-title"><h2 id="journey-title">{t.journey}</h2><ol>{t.steps.map(([title,text],index)=><li key={title}><span>{String(index+1).padStart(2,'0')}</span><div><b>{title}</b><p>{text}</p></div><div className={styles.stepScreen}><i/><i/><i/></div></li>)}</ol></section>
      </main>
    </div>
  </div>
}
