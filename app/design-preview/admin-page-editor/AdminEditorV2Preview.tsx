'use client'

import {useState} from 'react'
import styles from './admin-editor-v2.module.css'
import PreviewAdminHeader, {type PreviewAudience} from './PreviewAdminHeader'

type Panel = 'content' | 'media' | 'seo'
type Viewport = 'desktop' | 'tablet' | 'mobile'
type Overlay = 'help' | 'library' | 'add' | 'full' | null

const sections = [
  ['hero', 'بخش آغازین', 'صفحه اصلی'],
  ['text', 'معرفی و مزیت‌ها', 'قابل ویرایش'],
  ['gallery', 'گالری تصاویر', '۳ رسانه'],
  ['cta', 'دعوت به همکاری', 'قابل ویرایش'],
]
const media = [
  '/templates/rava-commercial-homepage/professional-consulting.webp',
  '/templates/rava-commercial-homepage/education-mentorship.webp',
  '/templates/rava-commercial-homepage/healthcare-doctor.webp',
]

function Icon({name}: {name: 'help' | 'bell' | 'chevron' | 'plus' | 'external' | 'close' | 'search'}) {
  const paths = {
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.35 2.35 0 1 1 3.42 2.1c-.75.4-1.22.9-1.22 1.9M12 17h.01"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    external: <path d="M15 3h6v6M10 14 21 3M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function AdminEditorV2Preview() {
  const [section, setSection] = useState('hero')
  const [panel, setPanel] = useState<Panel>('content')
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [saved, setSaved] = useState(true)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [selectedMedia, setSelectedMedia] = useState(0)
  const [seoAdvanced, setSeoAdvanced] = useState(false)
  const [audience, setAudience] = useState<PreviewAudience>('owner')
  const title = sections.find(([key]) => key === section)?.[1] ?? 'بخش آغازین'

  function chooseSection(key: string) {
    setSection(key)
    setPanel(key === 'gallery' ? 'media' : 'content')
  }

  return <main className={styles.page} dir="rtl">
    <section className={styles.audiencePreview} aria-label="انتخاب نمای دسترسی">
      <div><b>پیش‌نمایش ساختار دسترسی</b><small>همان پنل مادر، با امکانات متناسب هر کاربر</small></div>
      <div role="group" aria-label="مشاهده پنل به عنوان">
        <button aria-pressed={audience === 'owner'} onClick={() => setAudience('owner')}><span>مالک راوا</span><small>انتخاب سایت و تخصیص قالب</small></button>
        <button aria-pressed={audience === 'customer'} onClick={() => setAudience('customer')}><span>مشتری لانچ‌پد</span><small>فقط سایت و امکانات خریداری‌شده</small></button>
      </div>
    </section>
    <div className={styles.shell}>
    <PreviewAdminHeader pageTitle="ویرایش صفحه اصلی" audience={audience} onHelp={() => setOverlay('help')} onNotificationAction={() => {setPanel('seo'); setSeoAdvanced(true)}}/>

    <div className={styles.workspace}>
      <aside className={styles.structure}>
        <div className={styles.asideHead}><span>ساختار صفحه</span><button onClick={() => setOverlay('add')}><Icon name="plus"/>افزودن</button></div>
        <nav>{sections.map(([key, label, meta], i) => <button key={key} className={section === key ? styles.active : ''} onClick={() => chooseSection(key)}><span>{i + 1}</span><b>{label}</b><small>{meta}</small></button>)}</nav>
        <button className={styles.pageHealth} onClick={() => setPanel('seo')}><span>آمادگی انتشار</span><b>۳ مورد نیازمند بررسی</b><small>تصویر اشتراک‌گذاری، توضیح جست‌وجو و متن جایگزین</small><em>بررسی سئو ←</em></button>
      </aside>

      <section className={styles.preview}>
        <div className={styles.previewTop}>
          <div><b>پیش‌نمایش واقعی</b><small>نسخه ذخیره‌شده صفحه</small></div>
          <div className={styles.previewTools}>
            <span className={saved ? styles.saved : styles.unsaved}>{saved ? 'ذخیره‌شده' : 'ذخیره‌نشده'}</span>
            <div className={styles.deviceSwitch} aria-label="اندازه پیش‌نمایش">{([['desktop', 'رایانه'], ['tablet', 'تبلت'], ['mobile', 'موبایل']] as const).map(([key, label]) => <button key={key} aria-pressed={viewport === key} onClick={() => setViewport(key)}>{label}</button>)}</div>
          </div>
        </div>
        <div className={styles.stage}><div className={`${styles.canvas} ${styles[viewport]}`}>
          <div className={styles.siteNav}><b>راوا تیم</b><span>امکانات　قالب‌ها　پرسش‌ها</span><i/></div>
          <div className={styles.hero}><span>از ایده تا انتشار</span><h1>سایتی حرفه‌ای برای رشد واقعی کسب‌وکار شما.</h1><p>طراحی، محتوا و مدیریت سایت در یک مسیر روشن و قابل‌کنترل.</p><div><button>شروع پروژه</button><button>دیدن امکانات</button></div></div>
          <div className={styles.canvasStrip}><span/><span/><span/></div>
        </div></div>
      </section>

      <aside className={styles.inspector}>
        <div className={styles.inspectorHead}><div><small>بخش انتخاب‌شده</small><h2>{title}</h2></div><button onClick={() => setOverlay('help')}>راهنمای بخش</button></div>
        <div className={styles.tabs}><button className={panel === 'content' ? styles.tabActive : ''} onClick={() => setPanel('content')}>محتوا</button><button className={panel === 'media' ? styles.tabActive : ''} onClick={() => setPanel('media')}>رسانه</button><button className={panel === 'seo' ? styles.tabActive : ''} onClick={() => setPanel('seo')}>سئو</button></div>
        {panel === 'content' ? <div className={styles.form}>
          <label>عنوان اصلی<textarea defaultValue="سایتی حرفه‌ای برای رشد واقعی کسب‌وکار شما." onChange={() => setSaved(false)}/><small>نتیجه اصلی این صفحه را روشن و کوتاه بیان کنید.</small></label>
          <label>توضیح<textarea defaultValue="طراحی، محتوا و مدیریت سایت در یک مسیر روشن و قابل‌کنترل." onChange={() => setSaved(false)}/></label>
          <div className={styles.mode}><span>چیدمان بخش</span><button className={styles.modeActive}>متن و تصویر</button><button>فقط متن</button><button>تصویرمحور</button></div>
        </div> : null}
        {panel === 'media' ? <div className={styles.mediaPanel}>
          <div className={styles.drop}><b>تصویر یا ویدئو</b><span>از کتابخانه همین سایت انتخاب کنید یا فایل تازه‌ای بارگذاری کنید.</span><button onClick={() => setOverlay('library')}>بازکردن کتابخانه</button></div>
          <div className={styles.mediaSpec}><span>استاندارد این جایگاه</span><b>تصویر افقی ۱۶:۹ · پیشنهاد: ۱۶۰۰ در ۹۰۰ پیکسل</b><small>فرمت‌های مجاز: WebP، JPEG و PNG · حداکثر حجم: ۲ مگابایت</small></div>
          <div className={styles.mediaGrid}>{media.map((src, i) => <button key={src} className={selectedMedia === i ? styles.mediaSelected : ''} onClick={() => {setSelectedMedia(i); setSaved(false)}}><img src={src} alt="نمونه رسانه راوا"/><span>{selectedMedia === i ? 'انتخاب‌شده' : 'انتخاب'}</span></button>)}</div>
          <label>متن جایگزین<input placeholder="این تصویر چه چیزی را نشان می‌دهد؟" onChange={() => setSaved(false)}/></label>
        </div> : null}
        {panel === 'seo' ? <div className={styles.seo}>
          <div className={styles.seoHeader}><div><span>آمادگی جست‌وجو</span><small>برای همین زبان و همین صفحه</small></div><b>۷۲٪</b></div><div className={styles.scoreBar}><i/></div>
          <div className={styles.seoChecks}><span className={styles.pass}>عنوان مناسب</span><span className={styles.pass}>نشانی خوانا</span><span className={styles.warn}>توضیح کوتاه است</span></div>
          <label>عنوان در گوگل<input defaultValue="طراحی سایت حرفه‌ای و مدیریت محتوا | راوا تیم" onChange={() => setSaved(false)}/><small>۴۹ از ۶۰ نویسه</small></label>
          <label>توضیح در گوگل<textarea defaultValue="طراحی سایت، تولید محتوا و زیرساخت مدیریت حرفه‌ای برای رشد واقعی کسب‌وکار شما." onChange={() => setSaved(false)}/></label>
          <div className={styles.serp}><small>ravateam.ir › home</small><b>طراحی سایت حرفه‌ای و مدیریت محتوا | راوا تیم</b><p>طراحی سایت، تولید محتوا و زیرساخت مدیریت حرفه‌ای برای رشد واقعی کسب‌وکار شما.</p></div>
          <button className={styles.seoMore} onClick={() => setSeoAdvanced(v => !v)}>{seoAdvanced ? 'بستن تنظیمات پیشرفته' : 'تنظیمات فنی و اشتراک‌گذاری'}</button>
          {seoAdvanced ? <div className={styles.advancedSeo}><label>نشانی اصلی<input defaultValue="https://ravateam.ir/"/></label><label>نمایش در جست‌وجو<select defaultValue="index"><option value="index">نمایش داده شود</option><option value="noindex">نمایش داده نشود</option></select></label><button onClick={() => setOverlay('library')}>انتخاب تصویر اشتراک‌گذاری</button><small>نسخه فارسی و انگلیسی، عنوان و توضیح مستقل دارند.</small></div> : null}
        </div> : null}
        <div className={styles.footerActions}><button onClick={() => setSaved(true)} disabled={saved}>ذخیره پیش‌نویس</button><button onClick={() => setOverlay('full')}>پیش‌نمایش تمام‌صفحه</button></div>
      </aside>
    </div>
  </div>

  {overlay ? <div className={styles.overlay} role="presentation" onMouseDown={() => setOverlay(null)}><section className={`${styles.dialog} ${overlay === 'full' ? styles.fullDialog : ''}`} role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
    <button className={styles.dialogClose} aria-label="بستن" onClick={() => setOverlay(null)}><Icon name="close"/></button>
    {overlay === 'help' ? <><span className={styles.dialogEyebrow}>راهنمای همین مرحله</span><h2>ویرایش بخش، بدون به‌هم‌زدن قالب</h2><p>محتوا را تغییر دهید، رسانه مناسب را انتخاب کنید و نتیجه را در سه اندازه ببینید. ذخیره پیش‌نویس سایت منتشرشده را تغییر نمی‌دهد.</p><ol><li>محتوا را ویرایش کنید.</li><li>پیش‌نمایش رایانه، تبلت و موبایل را ببینید.</li><li>پیش‌نویس را ذخیره و برای انتشار بررسی کنید.</li></ol></> : null}
    {overlay === 'add' ? <><span className={styles.dialogEyebrow}>افزودن بخش</span><h2>چه چیزی به صفحه اضافه شود؟</h2><div className={styles.addGrid}><button>معرفی خدمات</button><button>نمونه‌کارها</button><button>پرسش‌های رایج</button><button>دعوت به اقدام</button></div><small>تعداد و ترتیب بخش‌ها بر اساس استاندارد قالب کنترل می‌شود.</small></> : null}
    {overlay === 'library' ? <><span className={styles.dialogEyebrow}>کتابخانه همین سایت</span><h2>انتخاب رسانه</h2><label className={styles.librarySearch}><Icon name="search"/><input placeholder="جست‌وجوی تصویر و ویدئو"/></label><div className={styles.libraryGrid}>{media.map((src, i) => <button key={src} onClick={() => {setSelectedMedia(i); setSaved(false); setOverlay(null)}}><img src={src} alt="رسانه نمونه"/><span>انتخاب</span></button>)}</div><button className={styles.primaryDialog}>بارگذاری فایل تازه</button></> : null}
    {overlay === 'full' ? <><div className={styles.fullBar}><b>پیش‌نمایش صفحه اصلی</b><span>فقط پیش‌نمایش — هنوز منتشر نشده</span></div><div className={`${styles.canvas} ${styles.fullCanvas}`}><div className={styles.siteNav}><b>راوا تیم</b><span>امکانات　قالب‌ها　پرسش‌ها</span><i/></div><div className={styles.hero}><span>از ایده تا انتشار</span><h1>سایتی حرفه‌ای برای رشد واقعی کسب‌وکار شما.</h1><p>طراحی، محتوا و مدیریت سایت در یک مسیر روشن و قابل‌کنترل.</p><div><button>شروع پروژه</button><button>دیدن امکانات</button></div></div></div></> : null}
  </section></div> : null}
  </main>
}
