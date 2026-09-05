import styles from './home.module.css'

const services = [
  { no: '01', title: 'طراحی و توسعه وب‌سایت', en: 'WEB EXPERIENCE', body: 'وب‌سایت خدماتی سریع، امن و قابل توسعه؛ از معماری محتوا و تجربه کاربری تا اجرا و تحویل.' },
  { no: '02', title: 'هویت و سیستم طراحی', en: 'BRAND SYSTEM', body: 'زبان بصری منسجم برای برندی که باید در تمام نقاط تماس حرفه‌ای و قابل اعتماد دیده شود.' },
  { no: '03', title: 'محتوا و روایت برند', en: 'CONTENT DIRECTION', body: 'ساختار و محتوایی که مسئله، ارزش و تفاوت کسب‌وکار را روشن و بدون ادعای ساختگی توضیح می‌دهد.' },
  { no: '04', title: 'زیرساخت و رشد دیجیتال', en: 'PLATFORM & GROWTH', body: 'پایه فنی برای مدیریت، انتشار، اندازه‌گیری و توسعه قابلیت‌های آینده بدون بازسازی از صفر.' },
]

const work = [
  { tag: 'PRODUCT / PLATFORM', title: 'RAVA Platform', body: 'سیستم‌عامل چندمشتری برای ساخت، مدیریت و رشد وب‌سایت‌های خدماتی و فروشگاهی.', tone: 'lime' },
  { tag: 'CUSTOMER ZERO', title: 'RAVA TEAM', body: 'اولین اجرای واقعی مسیر خدماتی؛ همان زیرساختی که برای مشتریان آینده استفاده می‌شود.', tone: 'blue' },
  { tag: 'NEXT PRODUCT', title: 'RAVA Commerce', body: 'معماری آماده توسعه فروشگاه، موجودی، سفارش و اتصال به ارائه‌دهندگان پرداخت و ارسال.', tone: 'orange' },
]

const process = [
  ['شناخت', 'مسئله، مخاطب و هدف تجاری را دقیق می‌کنیم.'], ['معماری', 'ساختار محتوا، تجربه و مسیر تبدیل را می‌سازیم.'],
  ['طراحی و اجرا', 'یک سیستم منسجم، سریع و پاسخ‌گو پیاده می‌کنیم.'], ['بازبینی و رشد', 'قبل از انتشار تأیید می‌کنیم و مسیر توسعه را باز نگه می‌داریم.'],
]

const enamadHtml = `<a referrerpolicy='origin' target='_blank' rel='noopener noreferrer' href='https://trustseal.enamad.ir/?id=7351410&Code=XHzd3GoRDofutohK4DoiakcUJAxvtGev'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7351410&Code=XHzd3GoRDofutohK4DoiakcUJAxvtGev' alt='نماد اعتماد الکترونیکی RAVA TEAM' code='XHzd3GoRDofutohK4DoiakcUJAxvtGev'></a>`

export default function HomePage() {
  return <main className={styles.site}>
    <header className={styles.header}><a className={styles.logo} href="#top" aria-label="RAVA TEAM — صفحه نخست"><span>RAVA</span><b>TEAM</b></a><nav aria-label="منوی اصلی"><a href="#services">خدمات</a><a href="#work">پلتفرم</a><a href="#about">درباره</a></nav><a className={styles.headerCta} href="#contact">شروع گفتگو <span>↗</span></a></header>
    <section className={styles.hero} id="top"><div className={styles.heroCopy}><span className={styles.eyebrow}>INDEPENDENT DIGITAL STUDIO · TEHRAN / WORLDWIDE</span><h1>فقط سایت<br/>نمی‌سازیم؛<br/><em>زیرساخت رشد</em><br/>می‌سازیم.</h1><p>RAVA TEAM طراحی، محتوا و تکنولوژی را کنار هم می‌گذارد تا کسب‌وکارها یک حضور دیجیتال حرفه‌ای، قابل مدیریت و آماده آینده داشته باشند.</p><div className={styles.heroActions}><a href="#contact">پروژه‌تان را تعریف کنید <span>←</span></a><a href="#work">دیدن مسیر RAVA</a></div></div><div className={styles.heroVisual} aria-hidden="true"><div className={styles.orbit}><span>STRATEGY</span><span>DESIGN</span><span>TECHNOLOGY</span></div><strong>R</strong><div className={styles.signal}/><small>DESIGNED TO EVOLVE — 2026</small></div><div className={styles.heroIndex}><b>01</b><span>RAVA TEAM<br/>DIGITAL EXPERIENCE</span></div></section>
    <section className={styles.manifesto}><span>WHAT WE BELIEVE</span><p>یک وب‌سایت خوب فقط زیبا نیست. باید <b>شفاف، سریع، قابل اعتماد</b> و برای تغییرات فردا آماده باشد.</p></section>
    <section className={styles.services} id="services"><div className={styles.sectionHead}><div><span>CAPABILITIES / 04</span><h2>از ایده تا یک<br/>سیستم واقعی.</h2></div><p>خدمت‌ها جدا از هم فروخته نمی‌شوند؛ هر بخش برای ساخت یک تجربه منسجم کنار بخش دیگر قرار می‌گیرد.</p></div><div className={styles.serviceList}>{services.map(item=><article key={item.no}><span>{item.no}</span><div><small>{item.en}</small><h3>{item.title}</h3></div><p>{item.body}</p><b aria-hidden="true">↗</b></article>)}</div></section>
    <section className={styles.work} id="work"><div className={styles.sectionHead}><div><span>SELECTED SYSTEMS</span><h2>چیزی فراتر از<br/>یک ویترین آنلاین.</h2></div><p>RAVA TEAM اولین مشتری پلتفرمی است که برای تحویل سریع‌تر و مدیریت حرفه‌ای سایت‌های آینده ساخته می‌شود.</p></div><div className={styles.workGrid}>{work.map((item,index)=><article className={styles[item.tone]} key={item.title}><div><span>{item.tag}</span><b>0{index+1}</b></div><div className={styles.workMark}>{index===0?'R/':index===1?'RT':'C+'}</div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
    <section className={styles.about} id="about"><div className={styles.aboutMark}><span>RAVA</span><b>TEAM</b><small>BUILT WITH INTENT</small></div><div className={styles.aboutCopy}><span>ABOUT / MOHAMMAD GHASEMI</span><h2>یک تیم کوچک با نگاه سیستمی.</h2><p>راوا با مدیریت محمد قاسمی روی ساخت تجربه‌هایی کار می‌کند که بین طراحی سطح بالا و زیرساخت فنی جدایی نمی‌اندازند. هدف، تحویل یک صفحه موقت نیست؛ ساخت دارایی دیجیتالی است که صاحب کسب‌وکار بتواند آن را مدیریت و توسعه دهد.</p><a href="#contact">آشنایی و شروع همکاری <span>←</span></a></div></section>
    <section className={styles.process}><div className={styles.sectionHead}><div><span>HOW WE WORK</span><h2>مسیر روشن،<br/>تصمیم‌های قابل ردیابی.</h2></div></div><ol>{process.map(([title,body],index)=><li key={title}><span>0{index+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>
    <section className={styles.contact} id="contact"><span>HAVE A PROJECT IN MIND?</span><h2>بیایید چیزی بسازیم<br/>که <em>ارزش ماندن</em> داشته باشد.</h2><p>برای شروع، درباره کسب‌وکار، مسئله و نتیجه‌ای که انتظار دارید صحبت می‌کنیم.</p><a href="mailto:hello@ravateam.ir">hello@ravateam.ir <b>↗</b></a></section>
    <footer className={styles.footer}><div><a className={styles.logo} href="#top"><span>RAVA</span><b>TEAM</b></a><p>DESIGN · CONTENT · TECHNOLOGY</p></div><div><a href="#services">خدمات</a><a href="#work">پلتفرم</a><a href="#about">درباره</a></div><div className={styles.enamad} dangerouslySetInnerHTML={{__html:enamadHtml}}/><small>© 2026 RAVA TEAM<br/>ALL RIGHTS RESERVED</small></footer>
  </main>
}
