import type {CSSProperties} from 'react'
import Link from 'next/link'
import type {PublicBlock,PublicPagePayload} from '@/lib/cms/public-runtime'
import styles from '@/app/[slug]/public-page.module.css'

export type PreviewNavigationItem={id:string;title:string;slug:string}

export const publicText=(value:unknown)=>typeof value==='string'?value.slice(0,10000):''
const items=(value:unknown)=>Array.isArray(value)?value.slice(0,24):[]
const safeUrl=(value:unknown)=>{const url=publicText(value).trim();return /^\/(?!\/)/.test(url)||/^#[a-zA-Z0-9_-]+$/.test(url)||/^https?:\/\//i.test(url)||/^mailto:/i.test(url)||/^tel:/i.test(url)?url:''}
const safeColor=(value:unknown)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:''

function pageStyle(payload:PublicPagePayload):CSSProperties{
  const colors=payload.site.theme?.colors
  if(!colors||typeof colors!=='object'||Array.isArray(colors))return{}
  const palette=colors as Record<string,unknown>
  return{...(safeColor(palette.background||palette.paper)?{'--page-bg':safeColor(palette.background||palette.paper)}:{}),...(safeColor(palette.surface)?{'--page-surface':safeColor(palette.surface)}:{}),...(safeColor(palette.text||palette.ink)?{'--page-text':safeColor(palette.text||palette.ink)}:{}),...(safeColor(palette.primary)?{'--page-primary':safeColor(palette.primary)}:{}),...(safeColor(palette.accent)?{'--page-accent':safeColor(palette.accent)}:{})}as CSSProperties
}

function Cards({data}:{data:Record<string,unknown>}){const entries=items(data.items);if(!entries.length)return null;return <div className={styles.grid}>{entries.map((entry,index)=>{if(typeof entry==='string')return <article className={styles.card} key={`${entry}:${index}`}><b>{entry}</b></article>;const item=entry&&typeof entry==='object'&&!Array.isArray(entry)?entry as Record<string,unknown>:{};return <article className={styles.card} key={`${publicText(item.title)}:${index}`}><b>{publicText(item.title)||`${index+1}`}</b><span>{publicText(item.text||item.description)}</span></article>})}</div>}

function Block({block,locale}:{block:PublicBlock;locale:string}){
  const d=block.data||{},title=publicText(d.title),body=publicText(d.text||d.body||d.description),link=safeUrl(d.button_url||d.url),label=publicText(d.button_label)||(locale.startsWith('fa')?'بیشتر بدانید':'Learn more')
  if(block.type==='hero')return <section className={`${styles.block} ${styles.hero}`}><span className={styles.eyebrow}>RAVA / {String(block.position+1).padStart(2,'0')}</span><h1>{title}</h1>{body&&<p>{body}</p>}{link&&<Link className={styles.button} href={link}>{label}</Link>}</section>
  if(block.type==='image')return <section className={styles.block}>{link&&<img className={styles.media} src={link} alt={publicText(d.alt)}/>} {publicText(d.caption)&&<span className={styles.caption}>{publicText(d.caption)}</span>}</section>
  if(block.type==='gallery'){const images=items(d.images).map(safeUrl).filter(Boolean);return <section className={styles.block}>{title&&<h2>{title}</h2>}<div className={styles.gallery}>{images.map((image,index)=><img key={`${image}:${index}`} src={image} alt="" loading="lazy"/>)}</div></section>}
  if(block.type==='cta')return <section className={`${styles.block} ${styles.cta}`}><h2>{title}</h2>{body&&<p>{body}</p>}{link&&<Link className={styles.button} href={link}>{label}</Link>}</section>
  if(['service_list','project_list','services','projects','steps','faq'].includes(block.type))return <section className={styles.block}>{title&&<h2>{title}</h2>}{body&&<p>{body}</p>}<Cards data={d}/></section>
  if(['text','legal','rich_text'].includes(block.type))return <section className={styles.block}>{title&&<h2>{title}</h2>}{body&&<p>{body}</p>}</section>
  if(block.type==='lead_form')return <section className={`${styles.block} ${styles.cta}`}><h2>{title||(locale.startsWith('fa')?'شروع گفتگو':'Start a conversation')}</h2><p>{locale.startsWith('fa')?'فرم امن تماس پس از فعال‌سازی بخش ارتباط با مشتری در اینجا نمایش داده می‌شود.':'The secure contact form appears here after the customer communication module is enabled.'}</p></section>
  return null
}

export default function PublicPageView({payload,navigation=[],previewBasePath}:{payload:PublicPagePayload;navigation?:PreviewNavigationItem[];previewBasePath?:string}){
  const locale=payload.site.locale||'fa',isFa=locale.startsWith('fa')
  return <div className={styles.page} style={pageStyle(payload)} lang={locale} dir={isFa?'rtl':'ltr'}>
    <header className={styles.header}><Link className={styles.brand} href={previewBasePath?`${previewBasePath}?page=${payload.page.id}`:'/'}>RAVA <b>TEAM</b></Link>{navigation.length?<nav className={styles.navigation} aria-label={isFa?'صفحه‌های پیش‌نمایش':'Preview pages'}>{navigation.slice(0,8).map(item=><Link className={item.id===payload.page.id?styles.activeNavigation:undefined} key={item.id} href={`${previewBasePath}?page=${item.id}`}>{item.title}</Link>)}</nav>:null}<span>{payload.site.name} / {payload.page.title}</span></header>
    <main className={styles.main}>{payload.blocks.length?payload.blocks.map(block=><Block block={block} locale={locale} key={block.id}/>):<div className={styles.empty}>{isFa?'این صفحه هنوز محتوای قابل‌نمایش ندارد.':'This page does not have previewable content yet.'}</div>}</main>
    <footer className={styles.footer}>{payload.site.name} · RAVA Platform</footer>
  </div>
}
