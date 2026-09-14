'use client'

type DailyPoint = { day: string; views: number }
type TopPage = { path: string; views: number }

export default function AdminAnalyticsCharts({ daily, topPages }: { daily: DailyPoint[]; topPages: TopPage[] }) {
  const maxViews = Math.max(1, ...daily.map((item) => item.views))
  const width = 720
  const height = 220
  const pad = 24
  const points = daily.map((item, index) => {
    const x = daily.length <= 1 ? width / 2 : pad + (index * (width - pad * 2)) / (daily.length - 1)
    const y = height - pad - (item.views / maxViews) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const topMax = Math.max(1, ...topPages.map((item) => item.views))

  return <div className="admin-analytics-grid">
    <section className="admin-panel">
      <div className="admin-section-title"><h2>روند بازدید ۳۰ روز اخیر</h2><span>{daily.reduce((sum, item) => sum + item.views, 0)} بازدید</span></div>
      {daily.length ? <>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="نمودار روند بازدید ۳۰ روز اخیر" style={{ width: '100%', height: 'auto' }}>
          <line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="currentColor" opacity="0.18" />
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, fontSize:12, opacity:.65 }}><span>{daily[0]?.day}</span><span>{daily[daily.length-1]?.day}</span></div>
      </> : <div className="admin-empty">هنوز داده بازدید ثبت نشده است.</div>}
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>صفحات پربازدید</h2><span>۳۰ روز اخیر</span></div>
      {!topPages.length ? <div className="admin-empty">هنوز داده‌ای برای رتبه‌بندی صفحات وجود ندارد.</div> : <div className="admin-form">
        {topPages.map((item) => <div key={item.path}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}><b dir="ltr">{item.path}</b><span>{item.views}</span></div>
          <div style={{ height:8, borderRadius:999, background:'rgba(127,127,127,.18)', overflow:'hidden', marginTop:6 }}>
            <div style={{ width:`${Math.max(4,(item.views/topMax)*100)}%`, height:'100%', background:'currentColor', opacity:.75 }} />
          </div>
        </div>)}
      </div>}
    </section>
  </div>
}
