import Link from 'next/link'
import { requireRavaStaff } from '@/lib/auth/require-staff'
import MediaManager from './MediaManager'

export const dynamic = 'force-dynamic'

export default async function MediaAdminPage() {
  const { supabase } = await requireRavaStaff()
  const { data } = await supabase
    .from('media_assets')
    .select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const assets = (data ?? []).map((asset) => ({
    ...asset,
    public_url: supabase.storage.from('rava-media').getPublicUrl(asset.storage_path).data.publicUrl,
  }))

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span>RAVA CONTROL CENTER</span><h1>رسانه‌ها</h1></div>
      <div className="admin-actions"><Link className="admin-link" href="/admin">داشبورد</Link></div>
    </header>
    <MediaManager initialAssets={assets}/>
  </main>
}
