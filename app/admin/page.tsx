import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GettingStarted from './components/GettingStarted'
import DashboardSummary from './components/DashboardSummary'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('display_name, role, active').eq('id', userId).single()
  if (!profile?.active) redirect('/login')

  const [sites, pages, projects, leads, media] = await Promise.all([
    supabase.from('sites').select('id', { count: 'exact' }).limit(1),
    supabase.from('pages').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('media_assets').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  return <main className="admin-shell">
    <GettingStarted siteCount={sites.count??0} siteId={sites.data?.[0]?.id??null} pageCount={pages.count??0} mediaCount={media.count??0} displayName={profile.display_name??'مالک راوا'}/>
    <DashboardSummary pages={pages.count??0} projects={projects.count??0} leads={leads.count??0} media={media.count??0}/>
  </main>
}
