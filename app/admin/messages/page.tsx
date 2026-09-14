import { requireRavaStaff } from '@/lib/auth/require-staff'
import { updateLeadStatus } from './actions'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  new: 'جدید',
  in_progress: 'در حال پیگیری',
  replied: 'پاسخ داده شد',
  closed: 'بسته شد',
  spam: 'اسپم',
}

export default async function MessagesAdminPage() {
  const { supabase } = await requireRavaStaff()
  const { data: leads } = await supabase
    .from('leads')
    .select('id,name,email,phone,service_interest,message,status,source_path,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>پیام‌ها و درخواست‌ها</h1></div></header>
    <section className="admin-panel">
      <div className="admin-section-title"><h2>Inbox</h2><span>{leads?.length ?? 0} پیام اخیر</span></div>
      {!leads?.length ? <div className="admin-empty">هنوز پیامی دریافت نشده است.</div> : (
        <div className="admin-form">
          {leads.map((lead) => <article className="admin-panel" key={lead.id}>
            <div className="admin-section-title"><div><b>{lead.name}</b><small>{new Date(lead.created_at).toLocaleString('fa-IR')}</small></div><span>{statusLabel[lead.status] ?? lead.status}</span></div>
            <p>{lead.message}</p>
            <p><small>{lead.service_interest ? `خدمت: ${lead.service_interest} · ` : ''}{lead.phone ? `تلفن: ${lead.phone} · ` : ''}{lead.email ? `ایمیل: ${lead.email}` : ''}</small></p>
            <div className="admin-actions">
              <form action={updateLeadStatus.bind(null, lead.id, 'in_progress')}><button className="admin-muted-button" type="submit">در حال پیگیری</button></form>
              <form action={updateLeadStatus.bind(null, lead.id, 'replied')}><button className="admin-primary-button" type="submit">پاسخ داده شد</button></form>
              <form action={updateLeadStatus.bind(null, lead.id, 'closed')}><button className="admin-muted-button" type="submit">بسته شد</button></form>
              <form action={updateLeadStatus.bind(null, lead.id, 'spam')}><button className="admin-danger-button" type="submit">اسپم</button></form>
            </div>
          </article>)}
        </div>
      )}
    </section>
  </main>
}
