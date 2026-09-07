import LoginForm from './LoginForm'

export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}) {
  const{next}=await searchParams
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">RAVA <b>TEAM</b></div>
        <p className="auth-kicker">CONTROL CENTER</p>
        <h1 id="login-title">ورود به پنل مدیریت</h1>
        <p className="auth-copy">برای مدیریت سایت با حساب مدیریتی خود وارد شوید.</p>

        <LoginForm next={next}/>
        <a className="auth-back" href="/">بازگشت به سایت</a>
      </section>
    </main>
  )
}
