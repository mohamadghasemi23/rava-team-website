import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedPage, type PublicBlock, type PublicPagePayload } from '@/lib/cms/public-runtime'
import styles from './public-page.module.css'

export const dynamic = 'force-dynamic'

const text = (value: unknown) => typeof value === 'string' ? value.slice(0, 10000) : ''
const items = (value: unknown) => Array.isArray(value) ? value.slice(0, 24) : []
const safeUrl = (value: unknown) => {
  const url = text(value).trim()
  if (/^\/(?!\/)/.test(url) || /^#[a-zA-Z0-9_-]+$/.test(url) || /^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)) return url
  return ''
}
const safeColor = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : ''

function pageStyle(payload: PublicPagePayload): CSSProperties {
  const colors = payload.site.theme?.colors
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) return {}
  const palette = colors as Record<string, unknown>
  return {
    ...(safeColor(palette.background || palette.paper) ? {'--page-bg':safeColor(palette.background || palette.paper)} : {}),
    ...(safeColor(palette.surface) ? {'--page-surface':safeColor(palette.surface)} : {}),
    ...(safeColor(palette.text || palette.ink) ? {'--page-text':safeColor(palette.text || palette.ink)} : {}),
    ...(safeColor(palette.primary) ? {'--page-primary':safeColor(palette.primary)} : {}),
    ...(safeColor(palette.accent) ? {'--page-accent':safeColor(palette.accent)} : {}),
  } as CSSProperties
}

function Cards({data}:{data:Record<string,unknown>}) {
  const entries=items(data.items)
  if(!entries.length)return null
  return <div className={styles.grid}>{entries.map((entry,index)=>{
    if(typeof entry==='string')return <article className={styles.card} key={`${entry}:${index}`}><b>{entry}</b></article>
    const item=entry&&typeof entry==='object'&&!Array.isArray(entry)?entry as Record<string,unknown>:{}
    return <article className={styles.card} key={`${text(item.title)}:${index}`}><b>{text(item.title)||`${index+1}`}</b><span>{text(item.text||item.description)}</span></article>
  })}</div>
}

function Block({block}:{block:PublicBlock}) {
  const d=block.data||{}
  const title=text(d.title)
  const body=text(d.text||d.body||d.description)
  const link=safeUrl(d.button_url||d.url)
  const label=text(d.button_label)||'بیشتر بدانید'
  if(block.type==='hero')return <section className={`${styles.block} ${styles.hero}`}><span className={styles.eyebrow}>RAVA / {String(block.position+1).padStart(2,'0')}</span><h1>{title}</h1>{body&&<p>{body}</p>}{link&&<Link className={styles.button} href={link}>{label}</Link>}</section>
  if(block.type==='image')return <section className={styles.block}>{link&&<img className={styles.media} src={link} alt={text(d.alt)}/>} {text(d.caption)&&<span className={styles.caption}>{text(d.caption)}</span>}</section>
  if(block.type==='gallery'){const images=items(d.images).map(safeUrl).filter(Boolean);return <section className={styles.block}>{title&&<h2>{title}</h2>}<div className={styles.gallery}>{images.map((image,index)=><img key={`${image}:${index}`} src={image} alt="" loading="lazy"/>)}</div></section>}
  if(block.type==='cta')return <section className={`${styles.block} ${styles.cta}`}><h2>{title}</h2>{body&&<p>{body}</p>}{link&&<Link className={styles.button} href={link}>{label}</Link>}</section>
  if(['service_list','project_list','services','projects','steps','faq'].includes(block.type))return <section className={styles.block}>{title&&<h2>{title}</h2>}{body&&<p>{body}</p>}<Cards data={d}/></section>
  if(['text','legal','rich_text'].includes(block.type))return <section className={styles.block}>{title&&<h2>{title}</h2>}{body&&<p>{body}</p>}</section>
  if(block.type==='lead_form')return <section className={`${styles.block} ${styles.cta}`}><h2>{title||'شروع گفتگو'}</h2><p>فرم امن تماس در مرحله Module Registry به این بخش متصل می‌شود.</p></section>
  return null
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params
  const payload=await getPublishedPage(slug)
  if(!payload)return{title:'این صفحه موجود نیست.'}
  const seo=payload.page.seo||{}
  return{title:text(seo.title||seo.metaTitle)||payload.page.title,description:text(seo.description||seo.metaDescription)||undefined,robots:seo.noIndex?{index:false,follow:false}:undefined}
}

export default async function PublicCmsPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params
  const payload=await getPublishedPage(slug)
  if(!payload)notFound()
  return <div className={styles.page} style={pageStyle(payload)} lang={payload.site.locale||'fa'} dir={(payload.site.locale||'fa').startsWith('fa')?'rtl':'ltr'}>
    <header className={styles.header}><Link className={styles.brand} href="/">RAVA <b>TEAM</b></Link><span>{payload.site.name} / {payload.page.title}</span></header>
    <main className={styles.main}>{payload.blocks.length?payload.blocks.map(block=><Block block={block} key={block.id}/>):<div className={styles.empty}>این صفحه هنوز محتوای قابل‌نمایش ندارد.</div>}</main>
    <footer className={styles.footer}>{payload.site.name} · RAVA Platform</footer>
  </div>
}
