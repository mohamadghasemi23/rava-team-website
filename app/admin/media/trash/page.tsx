import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrashManager from './TrashManager'

export const dynamic='force-dynamic'

export default async function MediaTrashPage(){
 const supabase=await createClient();const{data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
 const{data:profile}=await supabase.from('profiles').select('role,active').eq('id',userId).single();if(!profile?.active||!['super_admin','admin','content_manager'].includes(profile.role))redirect('/admin')
 const{data}=await supabase.from('media_assets').select('id,storage_path,file_name,mime_type,alt_text,size_bytes,deleted_at').not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(100)
 return <main className="admin-shell"><header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>سطل زباله رسانه‌ها</h1></div><Link className="admin-link" href="/admin/media">بازگشت به رسانه‌ها</Link></header><TrashManager initialAssets={data??[]}/></main>
}
