import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRavaStaff } from '@/lib/auth/require-staff'
import { updateProject } from '../actions'
import ProjectMediaEditor from '../ProjectMediaEditor'

export const dynamic = 'force-dynamic'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireRavaStaff()

  const [{ data: project }, { data: assets }, { data: gallery }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('media_assets').select('id,storage_path,file_name,alt_text').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('project_media').select('media_id,sort_order,caption,media_assets(id,storage_path,file_name,alt_text)').eq('project_id', id).order('sort_order', { ascending: true }),
  ])

  if (!project) notFound()

  const withUrl = (asset: { id:string; storage_path:string; file_name:string; alt_text:string }) => ({
    ...asset,
    public_url: supabase.storage.from('rava-media').getPublicUrl(asset.storage_path).data.publicUrl,
  })

  const mediaAssets = (assets ?? []).map(withUrl)
  const galleryItems = (gallery ?? []).map((item) => ({
    ...item,
    media_assets: item.media_assets && !Array.isArray(item.media_assets) ? withUrl(item.media_assets as { id:string; storage_path:string; file_name:string; alt_text:string }) : null,
  }))

  const content = project.content && typeof project.content === 'object' ? project.content as { body?: string } : {}
  const scope = Array.isArray(project.scope) ? project.scope.join('\n') : ''
  const kpis = Array.isArray(project.kpis) ? project.kpis.join('\n') : ''
  const action = updateProject.bind(null, id)

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>ویرایش پروژه</h1></div><Link className="admin-link" href="/admin/projects">بازگشت</Link></header>

    <form action={action} className="admin-panel admin-form">
      <label>عنوان<input name="title" required defaultValue={project.title} maxLength={160}/></label>
      <label>Slug<input name="slug" dir="ltr" defaultValue={project.slug} maxLength={140}/></label>
      <label>نوع پروژه<select name="project_kind" defaultValue={project.project_kind}><option value="real">پروژه واقعی</option><option value="concept">Concept Project</option></select></label>
      <label>خلاصه<textarea name="summary" rows={3} defaultValue={project.summary ?? ''} maxLength={600}/></label>
      <label>متن اصلی<textarea name="body" rows={8} defaultValue={content.body ?? ''} maxLength={20000}/></label>
      <label>نام Client<input name="client_name" defaultValue={project.client_name ?? ''} maxLength={160}/></label>
      <label>سال<input name="project_year" type="number" min="2000" max="2100" defaultValue={project.project_year ?? ''}/></label>
      <label>Role<input name="role_text" defaultValue={project.role_text ?? ''} maxLength={300}/></label>
      <label>Scope — هر مورد یک خط<textarea name="scope" rows={4} defaultValue={scope}/></label>
      <label>KPI — هر مورد یک خط<textarea name="kpis" rows={4} defaultValue={kpis}/></label>
      <label>ترتیب نمایش<input name="sort_order" type="number" defaultValue={project.sort_order ?? 0}/></label>
      <label>SEO Title<input name="seo_title" defaultValue={project.seo_title ?? ''} maxLength={180}/></label>
      <label>SEO Description<textarea name="seo_description" rows={3} defaultValue={project.seo_description ?? ''} maxLength={320}/></label>
      <label>Canonical URL<input name="canonical_url" dir="ltr" defaultValue={project.canonical_url ?? ''} maxLength={500}/></label>
      <label><input name="featured" type="checkbox" defaultChecked={project.featured}/> Featured</label>
      <label><input name="show_on_home" type="checkbox" defaultChecked={project.show_on_home}/> نمایش در Home</label>
      <label><input name="published" type="checkbox" defaultChecked={project.published}/> انتشار</label>
      <button className="admin-primary-button" type="submit">ذخیره تغییرات</button>
    </form>

    <ProjectMediaEditor projectId={id} assets={mediaAssets} coverMediaId={project.cover_media_id ?? null} gallery={galleryItems}/>
  </main>
}
