import RavaInnerHeader from './RavaInnerHeader'
import styles from './rava-inner.module.css'

export default function RavaInnerFrame({ eyebrow, title, intro, children }: { eyebrow:string; title:string; intro?:string; children:React.ReactNode }) {
  return <div className={styles.site}>
    <RavaInnerHeader />
    <main className={styles.main}>
      <section className={styles.hero}><span>{eyebrow}</span><h1>{title}</h1>{intro && <p>{intro}</p>}</section>
      {children}
    </main>
    <footer className={styles.footer}><a className={styles.brand} href="/">RAVA <b>TEAM</b></a><span>Shiraz, Iran</span><small>© RAVA TEAM 2026</small></footer>
  </div>
}
