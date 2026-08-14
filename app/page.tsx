const sections = [
  ['WHAT WE DO', 'خدماتی برای دیده‌شدن'],
  ['SELECTED WORK', 'پروژه‌های منتخب'],
  ['ABOUT RAVA', 'ما برای برندها فقط محتوا نمی‌سازیم؛ تصویر می‌سازیم.'],
]

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <div className="container nav-shell">
          <a className="brand" href="#top">RAVA <b>TEAM</b></a>
          <nav className="desktop-nav" aria-label="منوی اصلی">
            <a href="#works">پروژه‌ها</a><a href="#services">خدمات</a><a href="#about">درباره ما</a><a href="#contact">تماس</a>
          </nav>
          <a className="button small" href="#contact">شروع پروژه</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container hero-grid">
          <div>
            <span className="kicker">CREATIVE / STRATEGY / PRODUCTION</span>
            <h1>RAVA <span>TEAM</span></h1>
            <p>ما ایده‌ها را به تجربه‌های ماندگار تبدیل می‌کنیم؛ از استراتژی و هویت برند تا تولید محتوایی که دیده می‌شود.</p>
            <div className="actions"><a className="button" href="#works">دیدن پروژه‌ها</a><a className="button ghost" href="#services">خدمات ما</a></div>
          </div>
          <div className="hero-art" aria-label="فضای مدیای Hero"><strong>R</strong><small>MEDIA SLOT — DESKTOP / MOBILE</small></div>
        </div>
      </section>

      {sections.map(([kicker, title], index) => <section className="section" id={index===0?'services':index===1?'works':'about'} key={kicker}><div className="container"><span className="kicker">{kicker}</span><h2>{title}</h2><div className="placeholder-grid"><article/><article/><article/></div></div></section>)}

      <section className="section" id="contact"><div className="container cta"><span className="kicker">START A PROJECT</span><h2>Ready to be seen?</h2><p>فرم Lead در فاز بعدی مستقیماً به دیتابیس و Inbox پنل متصل می‌شود.</p></div></section>
    </main>
  )
}
