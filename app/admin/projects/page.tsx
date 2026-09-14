import Link from 'next/link'
import { requireRavaStaff } from '@/lib/auth/require-staff'

export const dynamic = 'force-dynamic'

export default async function ProjectsAdminPage() {
  const { supabase } = await requireRavaStaff()
  const { data: projects } = await supabase
    .from('projects')
    .select('id,title,slug,project_kind,published,featured,show_on_home,project_year,sort_order,updated_at')
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false })

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>پروژه‌ها</h1></div><Link className="admin-link" href="/admin/projects/new">پروژه جدید</Link></header>
    <section className="admin-panel">
      <div className="admin-section-title"><h2>نمونه‌کارها و Case Studyها</h2><span>{projects?.length ?? 0} پروژه</span></div>
      {!projects?.length ? <div className="admin-empty">هنوز پروژه‌ای در V1 ثبت نشده است.</div> : (
        <div className="admin-form">
          {projects.map((project) => <article className="admin-panel" key={project.id}>
            <div className="admin-section-title"><div><b>{project.title}</b><small> /{project.slug}</small></div><span>{project.published ? 'منتشرشده' : 'پیش‌نویس'}</span></div>
            <p>{project.project_kind === 'concept' ? 'Concept Project' : 'پروژه واقعی'}{project.project_year ? ` · ${project.project_year}` : ''}{project.featured ? ' · Featured' : ''}{project.show_on_home ? ' · Home' : ''}</p>
            <div className="admin-actions"><Link className="admin-link" href={`/admin/projects/${project.id}`}>ویرایش پروژه</Link></div>
          </article>)}
        </div>
      )}
    </section>
  </main>
}
