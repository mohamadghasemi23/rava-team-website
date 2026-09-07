import Link from 'next/link'
import styles from './admin-context-preview.module.css'

export default function PreviewContextBar(){
  return <header className={styles.bar}>
    <a className={styles.brand} href="#editor"><span className={styles.mark}>R</span><b>راوا</b></a>
    <div className={styles.context}>
      <div className={styles.site}><span><small>سایت فعال</small><b>راوا تیم</b></span></div>
      <Link className={styles.template} href="/design-preview/admin-page-editor/template-guide"><i/><span><small>قالب فعال</small><b>لانچ‌پد راوا — خدماتی</b></span></Link>
    </div>
    <div className={styles.profile}><span className={styles.avatar}>م‌ق</span><span><b>محمد قاسمی</b><small>مالک پلتفرم</small></span></div>
  </header>
}
