import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GettingStarted from './components/GettingStarted'
import DashboardSummary from './components/DashboardSummary'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const locale=await getAdminLocale()
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('display_name, active').eq('id', userId).single()
  if (!profile?.active) redirect('/login')

  const sites = await supabase.from('sites').select('id,name,created_at', { count: 'exact' }).order('created_at',{ascending:false}).limit(1)
  const site=sites.data?.[0]??null
  const [pages,media,starter,design]=site?await Promise.all([
    supabase.from('pages').select('id',{count:'exact',head:true}).eq('site_id',site.id),
    supabase.from('media_assets').select('id',{count:'exact',head:true}).eq('site_id',site.id).is('deleted_at',null),
    supabase.from('starter_pack_installations').select('id',{count:'exact',head:true}).eq('site_id',site.id).in('status',['installed','approved']),
    supabase.from('site_design_state').select('current_revision_id,published_release_id').eq('site_id',site.id).maybeSingle(),
  ]):[{count:0},{count:0},{count:0},{data:null}]

  return <main className="admin-shell">
    <GettingStarted siteCount={sites.count??0} siteId={site?.id??null} siteName={site?.name??null} pageCount={pages.count??0} mediaCount={media.count??0} starterInstalled={(starter.count??0)>0} designReady={Boolean(design.data?.current_revision_id)} releasePublished={Boolean(design.data?.published_release_id)} displayName={profile.display_name??(locale==='fa'?'مالک راوا':'RAVA owner')}/>
    <DashboardSummary pages={pages.count??0} media={media.count??0}/>
  </main>
}
