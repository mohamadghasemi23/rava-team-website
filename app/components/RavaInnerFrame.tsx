import { createClient } from '@/lib/supabase/server'
import RavaInnerHeader from './RavaInnerHeader'
import styles from './rava-inner.module.css'

type SettingsValue = Record<string, unknown>

export default async function RavaInnerFrame({ eyebrow, title, intro, children }: { eyebrow:string; title:string; intro?:string; children:React.ReactNode }) {
  let general: SettingsValue = {}
  let enamad: SettingsValue = {}

  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('key,value').in('key',['general','enamad'])
    const rows = Object.fromEntries((data ?? []).map(row=>[row.key, row.value && typeof row.value === 'object' ? row.value : {}])) as Record<string, SettingsValue>
    general = rows.general ?? {}
    enamad = rows.enamad ?? {}
  } catch {
    general = {}
    enamad = {}
  }

  const socials = [
    ['Instagram', String(general.instagram ?? '')],
    ['Telegram', String(general.telegram ?? '')],
    ['LinkedIn', String(general.linkedin ?? '')],
  ].filter((item)=>item[1])

  return <div className={styles.site}>
    <RavaInnerHeader />
    <main className={styles.main}>
      <section className={styles.hero}><span>{eyebrow}</span><h1>{title}</h1>{intro && <p>{intro}</p>}</section>
      {children}
    </main>
    <footer className={styles.footer}>
      <div><a className={styles.brand} href="/">RAVA <b>TEAM</b></a><p>{String(general.footer_note ?? 'طراحی و توسعه وب، محصولات دیجیتال و راهکارهای خلاقانه.')}</p></div>
      <div className={styles.footerMeta}><span>{String(general.address ?? 'Shiraz, Iran')}</span>{general.email ? <a href={`mailto:${String(general.email)}`}>{String(general.email)}</a> : null}{general.phone ? <a href={`tel:${String(general.phone)}`}>{String(general.phone)}</a> : null}</div>
      {socials.length>0&&<div className={styles.footerMeta}>{socials.map(([label,url])=><a href={url} key={label} target="_blank" rel="noreferrer">{label}</a>)}</div>}
      {Boolean(enamad.enabled)&&enamad.logo_url ? <a className={styles.enamad} href={String(enamad.validation_url ?? '#')} target="_blank" rel="noreferrer"><img src={String(enamad.logo_url)} alt={String(enamad.title ?? 'نماد اعتماد الکترونیکی')}/></a> : null}
      <small>© RAVA TEAM 2026</small>
    </footer>
  </div>
}
