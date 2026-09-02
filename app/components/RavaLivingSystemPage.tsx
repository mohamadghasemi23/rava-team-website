import Link from 'next/link'
import type {PublicBlock,PublicPagePayload} from '@/lib/cms/public-runtime'
import type {PreviewNavigationItem} from './PublicPageView'
import styles from './rava-living-system.module.css'

type Props={payload:PublicPagePayload;navigation:PreviewNavigationItem[];previewBasePath?:string}

type ContentItem={title:string;text:string}

function publicText(value:unknown){return typeof value==='string'?value.trim():''}
function contentItems(value:unknown):ContentItem[]{
  if(!Array.isArray(value))return []
  return value.flatMap((item,index)=>{
    if(typeof item==='string'&&item.trim())return[{title:item.trim(),text:''}]
    if(!item||typeof item!=='object'||Array.isArray(item))return[]
    const record=item as Record<string,unknown>
    const title=publicText(record.title||record.name||record.question)
    const text=publicText(record.text||record.body||record.description||record.answer)
    return title||text?[{title:title||String(index+1),text}]:[]
  })
}

const copy={
  fa:{platform:'پلتفرم',services:'خدمات',work:'کارها',process:'فرآیند',about:'درباره ما',start:'شروع پروژه',view:'دیدن نسخه زنده',menuTitle:'همه‌چیز برای ساخت و رشد سایت',groups:[['مدیریت محتوا','نویسنده','رسانه','دسته‌بندی'],['طراحی و تجربه','سایت‌ساز','قالب‌ها','بخش‌ها'],['عملیات و رشد','سئو و عملکرد','فرم‌ها و درخواست‌ها','نقش‌ها و دسترسی']],canvas:'صفحه اصلی',draft:'پیش‌نویس',preview:'پیش‌نمایش',published:'منتشرشده',journeyLabel:'یک مسیر روشن، بدون پیچیدگی فنی',journey:'راوا را در عمل ببینید',journeyIntro:'از اولین محتوا تا انتشار امن؛ هر مرحله واضح، قابل بازبینی و تحت کنترل شماست.',steps:[['محتوا','اطلاعات کسب‌وکار شما در ساختاری منظم و دوزبانه آماده می‌شود.'],['طراحی','محتوا با قواعد حرفه‌ای برند به یک تجربه منسجم تبدیل می‌شود.'],['پیش‌نمایش','نتیجه واقعی را در اندازه‌های مختلف، پیش از انتشار بررسی می‌کنید.'],['انتشار','نسخه تأییدشده با امکان بازگشت امن در دسترس مخاطب قرار می‌گیرد.']],promiseTitle:'فقط یک سایت تحویل نمی‌گیرید؛ یک مسیر روشن برای رشد دارید.',promiseText:'راوا محتوا، طراحی و عملیات سایت را در یک چارچوب قابل مدیریت کنار هم نگه می‌دارد. شما درباره کسب‌وکارتان تصمیم می‌گیرید؛ ما پیچیدگی فنی را مدیریت می‌کنیم.',layers:[['محتوایی که از روز اول حرفی برای گفتن دارد','ساختار صفحات، متن‌های اولیه و رسانه‌ها متناسب با حوزه کسب‌وکار آماده می‌شوند؛ نه یک سایت خالی.'],['طراحی‌ای که با برند شما زندگی می‌کند','قالب حرفه‌ای، فونت، رنگ و چیدمان در یک سیستم منسجم تنظیم می‌شوند و در موبایل هم همان کیفیت را حفظ می‌کنند.'],['عملیاتی که قابل بازبینی و بازگشت است','تغییرات پیش از انتشار دیده می‌شوند، نسخه‌ها ثبت می‌مانند و انتشار نهایی مسیر بازگشت امن دارد.']],proofTitle:'این سایت، خودش بخشی از مدرک ماست.',proofText:'راوا تیم فقط درباره ساخت سایت حرف نمی‌زند. همین صفحه روی محصولی ساخته شده که برای مدیریت چند سایت، محتوای دوزبانه، پیش‌نمایش و انتشار کنترل‌شده توسعه داده‌ایم.',proofPoints:['ساختار چندسایتی و سطح دسترسی','محتوا و راهنمای فارسی و انگلیسی','پیش‌نمایش پیش از انتشار','نسخه‌بندی و مسیر بازگشت'],servicesTitle:'از اولین کلمه تا روزی که سایت رشد می‌کند',servicesIntro:'خدمت‌ها جدا از هم فروخته نمی‌شوند؛ هرکدام بخشی از یک نتیجه واحدند.',serviceItems:[['راهبرد و معماری محتوا','مشخص می‌کنیم سایت برای چه کسی، با چه پیام و چه مسیرهایی باید کار کند.'],['طراحی و ساخت سایت','ظاهر اختصاصی روی یک زیرساخت قابل مدیریت ساخته می‌شود؛ نه یک پوسته تزئینی.'],['تولید و مدیریت محتوا','متن، تصویر و ساختار انتشار برای مخاطب واقعی و هدف تجاری آماده می‌شود.'],['رشد، سئو و پشتیبانی','بعد از انتشار، عملکرد فنی و محتوایی سایت قابل بررسی و بهبود می‌ماند.']],servicesLink:'دیدن جزئیات خدمات',proofLink:'دیدن کارهای تأییدشده',faqTitle:'پیش از شروع، پاسخ روشن بگیرید',faqItems:[['آیا برای مدیریت سایت باید کار فنی بلد باشم؟','خیر. پنل مشتری فقط گزینه‌های لازم را نشان می‌دهد و بخش‌های فنی در اختیار تیم مجاز راوا می‌ماند.'],['آیا سایت من شبیه بقیه مشتری‌ها می‌شود؟','هر قالب چارچوب طراحی مستقل دارد. برند، محتوا و انتخاب‌های مجاز شما داخل همان چارچوب تنظیم می‌شوند تا کیفیت حفظ شود.'],['آیا سایت خام تحویل می‌گیرم؟','خیر. نسخه اولیه با محتوای مناسب حوزه شما آماده می‌شود و پیش از انتشار بازبینی می‌کنید.'],['اگر از یک تغییر راضی نبودم چه می‌شود؟','تغییرات مهم پیش‌نمایش دارند و انتشار نسخه‌بندی می‌شود تا مسیر بازگشت امن باقی بماند.']],finalTitle:'برای ساختن یک سایت قابل رشد آماده‌اید؟',finalText:'از کسب‌وکار، مخاطب و چیزی که باید بفروشید شروع می‌کنیم. ادامه مسیر را ساده و شفاف نگه می‌داریم.',finalAction:'شروع گفت‌وگوی پروژه',footerNote:'طراحی سایت، تولید محتوا و زیرساخت مدیریت سایت در یک مسیر منسجم.'},
  en:{platform:'Platform',services:'Services',work:'Work',process:'Process',about:'About',start:'Start a project',view:'View live version',menuTitle:'Everything needed to build and grow a site',groups:[['Content management','Writer','Media','Categories'],['Design and experience','Site builder','Templates','Sections'],['Operations and growth','SEO and performance','Forms and enquiries','Roles and access']],canvas:'Home page',draft:'Draft',preview:'Preview',published:'Published',journeyLabel:'One clear path, without technical friction',journey:'See RAVA in action',journeyIntro:'From the first piece of content to a safe release, every stage stays visible, reviewable and under your control.',steps:[['Content','Your business information becomes an organized, bilingual content system.'],['Design','Professional brand rules turn that content into one coherent experience.'],['Preview','Review the real result across screen sizes before anything goes live.'],['Publish','Release an approved version with a safe path back whenever needed.']],promiseTitle:'You are not buying a page. You are building a clear path for growth.',promiseText:'RAVA keeps content, design and website operations inside one manageable system. You make the business decisions; we handle the technical complexity.',layers:[['Content with something to say from day one','Page structure, starter copy and media are prepared for your field instead of leaving you with an empty website.'],['Design that grows with your brand','Template, typography, colour and layout work as one system and retain the same standard on mobile.'],['Operations you can review and reverse','Important changes are previewed, versions remain recorded and every release keeps a safe path back.']],proofTitle:'This website is part of the evidence.',proofText:'RAVA TEAM does not only talk about building websites. This page runs on the product we are developing for multi-site management, bilingual content, real previews and controlled releases.',proofPoints:['Multi-site structure and scoped access','Native Persian and English content','Review before release','Versioning and a safe path back'],servicesTitle:'From the first word to the work that follows launch',servicesIntro:'These services are not isolated deliverables. Each one supports the same business outcome.',serviceItems:[['Strategy and content architecture','Define who the site serves, what it needs to say and how visitors should move through it.'],['Website design and delivery','Build a distinct visual system on manageable foundations, rather than applying a decorative skin.'],['Content production and operation','Prepare copy, imagery and publishing structure for real audiences and commercial goals.'],['Growth, SEO and support','Keep technical and editorial performance open to review and improvement after launch.']],servicesLink:'Explore our services',proofLink:'View verified work',faqTitle:'Clear answers before the work begins',faqItems:[['Do I need technical skills to manage the website?','No. Customers see the controls they need, while technical provisioning remains with authorised RAVA personnel.'],['Will my website look like every other customer site?','Each Template has its own design framework. Your brand, content and approved choices are configured within it without sacrificing quality.'],['Will I receive an empty website?','No. The first version includes field-appropriate starter content for your review before anything is released.'],['What if I do not approve a change?','Important changes have a preview, and releases are versioned so a safe path back remains available.']],finalTitle:'Ready to build a website that can keep growing?',finalText:'We begin with your business, your audience and what the site needs to sell. The path from there stays clear and manageable.',finalAction:'Start a project conversation',footerNote:'Website design, content production and site operations in one coherent system.'}
} as const

function hrefFor(item:PreviewNavigationItem,previewBasePath?:string){return previewBasePath?`${previewBasePath}?page=${item.id}`:`/${item.slug}`}
function Arrow(){return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>}
function Mark(){return <span className={styles.mark} aria-hidden="true"><i/><i/><i/></span>}
function ProductVisual({portrait=false,priority=false}:{portrait?:boolean;priority?:boolean}){
  const source=portrait
    ?{webp:'/templates/rava-living-system/responsive-site-visual.webp',png:'/templates/rava-living-system/responsive-site-visual.png',width:941,height:1672}
    :{webp:'/templates/rava-living-system/editor-site-visual.webp',png:'/templates/rava-living-system/editor-site-visual.png',width:1817,height:866}
  return <picture aria-hidden="true"><source srcSet={source.webp} type="image/webp"/><img src={source.png} alt="" width={source.width} height={source.height} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/></picture>
}

export default function RavaLivingSystemPage({payload,navigation,previewBasePath}:Props){
  const isFa=!payload.page.slug.endsWith('-en')&&(payload.site.locale||'fa').startsWith('fa')
  const t=isFa?copy.fa:copy.en
  const hero=payload.blocks.find((block:PublicBlock)=>block.type==='hero')
  const title=typeof hero?.data?.title==='string'&&hero.data.title.trim()?hero.data.title:(isFa?'سایت حرفه‌ای؛ با یک سیستم واقعی پشت آن':'A professional website, powered by a real operating system')
  const body=typeof hero?.data?.text==='string'&&hero.data.text.trim()?hero.data.text:typeof hero?.data?.body==='string'&&hero.data.body.trim()?hero.data.body:(isFa?'راوا یک سیستم کامل برای ساخت، مدیریت و رشد سایت‌های حرفه‌ای است؛ سریع، منظم و قابل اعتماد.':'RAVA is a complete system for building, operating and growing professional websites—fast, structured and dependable.')
  const localized=navigation.filter(item=>item.slug.endsWith('-en')!==isFa).slice(0,5)
  const pageHref=(faSlug:string,enSlug:string)=>{const slug=isFa?faSlug:enSlug;const item=navigation.find(entry=>entry.slug===slug);return previewBasePath&&item?`${previewBasePath}?page=${item.id}`:`/${slug}`}
  const contact=pageHref('contact','contact-en')
  const servicesHref=pageHref('services','services-en')
  const workHref=pageHref('portfolio','portfolio-en')
  const serviceBlock=payload.blocks.find(block=>['services','service_list'].includes(block.type))
  const projectBlock=payload.blocks.find(block=>['projects','project_list'].includes(block.type))
  const faqBlock=payload.blocks.find(block=>block.type==='faq')
  const ctaBlock=payload.blocks.find(block=>block.type==='cta')
  const serviceItems=contentItems(serviceBlock?.data?.items)
  const faqItems=contentItems(faqBlock?.data?.items)
  const resolvedServices=serviceItems.length?serviceItems:t.serviceItems.map(([itemTitle,text])=>({title:itemTitle,text}))
  const resolvedFaq=faqItems.length?faqItems:t.faqItems.map(([itemTitle,text])=>({title:itemTitle,text}))
  const proofTitle=publicText(projectBlock?.data?.title)||t.proofTitle
  const proofText=publicText(projectBlock?.data?.text||projectBlock?.data?.body||projectBlock?.data?.description)||t.proofText
  const finalTitle=publicText(ctaBlock?.data?.title)||t.finalTitle
  const finalText=publicText(ctaBlock?.data?.text||ctaBlock?.data?.body||ctaBlock?.data?.description)||t.finalText
  return <div className={styles.page} lang={isFa?'fa':'en'} dir={isFa?'rtl':'ltr'} data-template="rava-service-living-system">
    <a className={styles.skip} href="#living-main">{isFa?'رفتن به محتوای اصلی':'Skip to main content'}</a>
    <div className={styles.frame}>
      <header className={styles.navbar}>
        <Link className={styles.brand} href={previewBasePath?`${previewBasePath}?page=${payload.page.id}`:'/'} aria-label={payload.site.name}><Mark/><span>RAVA TEAM</span></Link>
        <nav className={styles.primaryNav} aria-label={isFa?'منوی اصلی':'Primary navigation'}>
          <details className={styles.menu}>
            <summary><span>{t.platform}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></summary>
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
              <div className={styles.editorBody}><div className={styles.editorToolbar}><span>{t.canvas}</span><div><i/><i/><i/><i/></div></div><div className={styles.canvas}><ProductVisual priority/><div className={styles.canvasCopy}><b>{isFa?'از ساخت تا رشد؛ در یک سیستم':'From build to growth, in one system'}</b><span>{isFa?'محتوا، طراحی، سئو و انتشار کنار هم':'Content, design, SEO and release together'}</span></div></div></div>
            </div>
            <div className={styles.devices}><div className={styles.tablet}><ProductVisual portrait/></div><div className={styles.phone}><ProductVisual portrait/></div></div>
            <ol className={styles.releaseRail}><li><span/><b>{t.draft}</b></li><li><span/><b>{t.preview}</b></li><li><span/><b>{t.published}</b></li></ol>
          </div>
        </section>

        <section className={styles.journey} id="rava-journey" aria-labelledby="journey-title"><div className={styles.journeyHeader}><span>{t.journeyLabel}</span><h2 id="journey-title">{t.journey}</h2><p>{t.journeyIntro}</p></div><ol>{t.steps.map(([title,text],index)=><li key={title}><span className={styles.stepNumber}>{String(index+1).padStart(2,'0')}</span><div className={styles.stepCopy}><b>{title}</b><p>{text}</p></div><div className={styles.stepScreen} aria-hidden="true"><span/><span/><span/><span/></div></li>)}</ol></section>

        <section className={styles.promise} aria-labelledby="rava-promise"><div className={styles.promiseLead}><h2 id="rava-promise">{t.promiseTitle}</h2><p>{t.promiseText}</p></div><div className={styles.layerMap}>{t.layers.map(([layerTitle,text],index)=><article key={layerTitle}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><h3>{layerTitle}</h3><p>{text}</p></div><div className={styles.layerSignal} aria-hidden="true"><i/><i/><i/></div></article>)}</div></section>

        <section className={styles.proof} aria-labelledby="rava-proof"><div className={styles.proofStatement}><h2 id="rava-proof">{proofTitle}</h2><p>{proofText}</p><Link href={workHref}>{t.proofLink}<Arrow/></Link></div><div className={styles.proofConsole} aria-label={isFa?'نمایی از قابلیت‌های واقعی پلتفرم راوا':'Verified RAVA platform capabilities'}><div className={styles.consoleBar}><Mark/><span>{isFa?'وضعیت محصول راوا':'RAVA product status'}</span><b>{isFa?'فعال':'Live'}</b></div><ul>{t.proofPoints.map((point,index)=><li key={point}><span>{String(index+1).padStart(2,'0')}</span><b>{point}</b><i aria-hidden="true"/></li>)}</ul><div className={styles.releaseStamp}><span>{isFa?'پیش‌نویس':'Draft'}</span><span>{isFa?'بازبینی':'Review'}</span><strong>{isFa?'انتشار امن':'Safe release'}</strong></div></div></section>

        <section className={styles.servicesStage} aria-labelledby="rava-services"><header><h2 id="rava-services">{publicText(serviceBlock?.data?.title)||t.servicesTitle}</h2><p>{publicText(serviceBlock?.data?.text||serviceBlock?.data?.body||serviceBlock?.data?.description)||t.servicesIntro}</p></header><ol>{resolvedServices.slice(0,4).map((item,index)=><li key={`${item.title}:${index}`}><span>{String(index+1).padStart(2,'0')}</span><h3>{item.title}</h3><p>{item.text}</p><i aria-hidden="true"><Arrow/></i></li>)}</ol><Link className={styles.stageLink} href={servicesHref}>{t.servicesLink}<Arrow/></Link></section>

        <section className={styles.faq} aria-labelledby="rava-faq"><div className={styles.faqIntro}><h2 id="rava-faq">{publicText(faqBlock?.data?.title)||t.faqTitle}</h2><p>{isFa?'سؤال دیگری دارید؟ گفت‌وگو را از شرایط واقعی پروژه شما شروع می‌کنیم.':'Have another question? We can begin with the real constraints of your project.'}</p></div><div className={styles.faqList}>{resolvedFaq.slice(0,6).map((item,index)=><details key={`${item.title}:${index}`}><summary><span>{item.title}</span><i aria-hidden="true"/></summary><p>{item.text}</p></details>)}</div></section>

        <section className={styles.finalCta} aria-labelledby="rava-final"><div><h2 id="rava-final">{finalTitle}</h2><p>{finalText}</p></div><Link href={contact}><span>{publicText(ctaBlock?.data?.button_label)||t.finalAction}</span><Arrow/></Link></section>
      </main>
      <footer className={styles.footer}><div className={styles.footerBrand}><Mark/><div><b>RAVA TEAM</b><span>{t.footerNote}</span></div></div><nav aria-label={isFa?'پیوندهای پایین صفحه':'Footer navigation'}><Link href={servicesHref}>{t.services}</Link><Link href={workHref}>{t.work}</Link><Link href={pageHref('about','about-en')}>{t.about}</Link><Link href={contact}>{isFa?'تماس':'Contact'}</Link></nav><small>© {new Date().getUTCFullYear()} RAVA TEAM</small></footer>
    </div>
  </div>
}
