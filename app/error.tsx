'use client'

import { useEffect, useState } from 'react'

export default function ErrorPage({ error, reset }:{ error:Error & { digest?:string }; reset:()=>void }) {
  const [eventId,setEventId]=useState('')

  useEffect(()=>{
    let cancelled=false
    fetch('/api/observability/client-error',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({message:error.message,digest:error.digest,stack:error.stack,route:window.location.pathname}),
      keepalive:true,
    }).then(r=>r.ok?r.json():null).then(data=>{if(!cancelled&&data?.eventId)setEventId(data.eventId)}).catch(()=>{})
    return()=>{cancelled=true}
  },[error])

  return <main className="not-found-shell"><section className="not-found-card"><span className="not-found-code">500</span><h1>یک خطای غیرمنتظره رخ داد</h1><p>اطلاعات فنی حساس نمایش داده نمی‌شود. می‌توانید دوباره تلاش کنید.</p>{eventId?<p><b>کد خطا:</b> <code dir="ltr">{eventId}</code></p>:<p>در حال ثبت کد خطا…</p>}<div className="actions"><button className="button" type="button" onClick={reset}>تلاش دوباره</button><a className="button ghost" href="/">صفحه اصلی</a></div></section></main>
}
