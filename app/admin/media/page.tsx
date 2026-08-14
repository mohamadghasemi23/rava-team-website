import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MediaManager from './MediaManager'

export const dynamic = 'force-dynamic'

export default async function MediaAdminPage() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id', userId).single()
  if (!profile?.active || !['super_admin','admin','content_manager'].includes(profile.role)) redirect('/admin')

  const { data } = await supabase
    .from('media_assets')
    .select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span>RAVA CONTROL CENTER</span><h1>رسانه‌ها</h1></div>
      <div className="admin-actions"><Link className="admin-link" href="/admin">داشبورد</Link></div>
    </header>
    <MediaManager initialAssets={data ?? []} userId={userId}/>
  </main>
}
