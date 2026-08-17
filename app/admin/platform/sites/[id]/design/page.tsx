import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { applyTemplateAction, publishDesignAction, rollbackDesignAction, saveDesignDraftAction } from './actions'

function validUuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
function pretty(value:unknown){return JSON.stringify(value??{},null,2)}

export default async function SiteDesignPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  if(!validUuid(id)) notFound()
  const supabase=await createClient()
  const {data:site}=await supabase.from('sites').select('id,organization_id,name,slug,theme_config,settings').eq('id',id).maybeSingle()
  if(!site) notFound()
  await requireAnyPermission([PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.DESIGN_MANAGE],{organizationId:site.organization_id,siteId:id})

  const [{data:templates},{data:versions},{data:state},{data:revisions},{data:releases}]=await Promise.all([
    supabase.from('template_catalog').select('id,key,name_fa,name_en,description_fa,industry_key,commercial_tier,is_public,status').eq('status','active').order('commercial_tier').order('name_fa'),
    supabase.from('template_versions').select('id,template_id,version,status,theme_defaults,layout_blueprint,changelog_fa').eq('status','published').order('version',{ascending:false}),
    supabase.from('site_design_state').select('site_id,current_revision_id,current_template_id,current_template_version_id,published_release_id,updated_at').eq('site_id',id).maybeSingle(),
    supabase.from('site_design_revisions').select('id,revision,source,template_id,template_version_id,theme_config,layout_config,note,created_at').eq('site_id',id).order('revision',{ascending:false}).limit(30),
    supabase.from('site_releases').select('id,release_number,status,source_revision_id,template_id,template_version_id,release_note,published_at,parent_release_id').eq('site_id',id).order('release_number',{ascending:false}).limit(30),
  ])

  const currentRevision=(revisions??[]).find((item)=>item.id===state?.current_revision_id)??revisions?.[0]
  const currentTemplate=(templates??[]).find((item)=>item.id===state?.current_template_id)
  const currentVersion=(versions??[]).find((item)=>item.id===state?.current_template_version_id)
  const themeDraft=currentRevision?.theme_config??site.theme_config??{}
  const layoutDraft=currentRevision?.layout_config??((site.settings as Record<string,unknown>|null)?.layout_config??{})

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span className="kicker">DESIGN ENGINE</span><h1>Template / Theme / Release</h1><p>{site.name} · Draft، Preview-ready revision، Publish و Rollback با تاریخچه غیرقابل‌دستکاری.</p></div>
      <Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>بازگشت به سایت</Link>
    </header>

    <div className="admin-stats">
      <div><strong>{currentTemplate?.name_fa??'—'}</strong><span>قالب فعلی</span></div>
      <div><strong>{currentVersion?`v${currentVersion.version}`:'—'}</strong><span>Template Version</span></div>
      <div><strong>{currentRevision?`#${currentRevision.revision}`:'—'}</strong><span>Draft Revision</span></div>
      <div><strong>{releases?.[0]?`#${releases[0].release_number}`:'—'}</strong><span>آخرین Release</span></div>
    </div>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>انتخاب و اعمال Template</h2><p>Apply فقط Draft جدید می‌سازد؛ تا Publish نکنی طراحی عمومی سایت تغییر نمی‌کند.</p></div><span>{templates?.length??0} قالب</span></div>
      <div className="admin-access-grid">{(templates??[]).map((template)=>{
        const templateVersions=(versions??[]).filter((v)=>v.template_id===template.id)
        const latest=templateVersions[0]
        return <article className="admin-access-card" key={template.id}>
          <div><b>{template.name_fa}</b><small>{template.name_en} · {template.industry_key}</small><small>{template.commercial_tier.toUpperCase()} · {template.is_public?'Public':'Owner/Paid controlled'}</small></div>
          <p>{template.description_fa}</p>
          {latest?<ActionForm action={applyTemplateAction} confirmTitle="اعمال قالب" confirmMessage={`نسخه ${latest.version} از «${template.name_fa}» به‌عنوان Draft جدید اعمال شود؟`}>
            <input type="hidden" name="site_id" value={id}/><input type="hidden" name="template_version_id" value={latest.id}/>
            <label>Theme Override اختیاری<textarea name="theme_overrides" rows={7} defaultValue="{}" dir="ltr"/></label>
            <label>یادداشت<input name="note" maxLength={500} placeholder="مثلاً انتخاب اولیه کارفرما"/></label>
            <button className="admin-primary-button" type="submit">Apply v{latest.version}</button>
          </ActionForm>:<p>نسخه Published ندارد.</p>}
        </article>
      })}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>Design Draft Editor</h2><p>در این فاز ویرایشگر JSON امن و Versioned است؛ Visual Builder بعداً روی همین Engine سوار می‌شود.</p></div>{currentRevision?<span>Revision #{currentRevision.revision}</span>:null}</div>
      <ActionForm action={saveDesignDraftAction} className="admin-form" confirmTitle="ذخیره Draft جدید" confirmMessage="یک Revision جدید از Theme و Layout ساخته شود؟">
        <input type="hidden" name="site_id" value={id}/>
        <label>Theme Config<textarea name="theme_config" rows={18} defaultValue={pretty(themeDraft)} dir="ltr" spellCheck={false}/></label>
        <label>Layout Config<textarea name="layout_config" rows={18} defaultValue={pretty(layoutDraft)} dir="ltr" spellCheck={false}/></label>
        <label>یادداشت Revision<input name="note" maxLength={500} placeholder="چه چیزی تغییر کرد؟"/></label>
        <button className="admin-primary-button" type="submit">Save Draft Revision</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>Publish</h2><p>Publish از Revision فعلی یک Snapshot immutable می‌سازد و آن را به Release فعال سایت تبدیل می‌کند.</p></div></div>
      <ActionForm action={publishDesignAction} className="admin-form" confirmTitle="Publish طراحی" confirmMessage="Revision فعلی به Release جدید تبدیل و روی سایت فعال شود؟">
        <input type="hidden" name="site_id" value={id}/><label>Release note<input name="release_note" maxLength={1000} placeholder="مثلاً تأیید نهایی طراحی هدر و رنگ‌ها"/></label>
        <button className="admin-primary-button" type="submit">Publish New Release</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>Revision History</h2><p>هر Save یا Apply یک Revision مستقل می‌سازد.</p></div><span>{revisions?.length??0}</span></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Revision</th><th>Source</th><th>Template</th><th>زمان</th><th>یادداشت</th></tr></thead><tbody>{(revisions??[]).map((revision)=>{
        const template=(templates??[]).find((item)=>item.id===revision.template_id)
        const version=(versions??[]).find((item)=>item.id===revision.template_version_id)
        return <tr key={revision.id}><td>#{revision.revision}{revision.id===state?.current_revision_id?' · CURRENT':''}</td><td>{revision.source}</td><td>{template?.name_fa??'—'}{version?` v${version.version}`:''}</td><td>{new Date(revision.created_at).toLocaleString('fa-IR')}</td><td>{revision.note??'—'}</td></tr>
      })}</tbody></table></div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>Release History & Rollback</h2><p>Rollback تاریخچه را پاک نمی‌کند؛ از Snapshot انتخاب‌شده یک Revision و Release جدید می‌سازد.</p></div><span>{releases?.length??0}</span></div>
      <div className="admin-access-grid">{(releases??[]).map((release)=><article className="admin-access-card" key={release.id}>
        <div><b>Release #{release.release_number}</b><small>{release.status} · {new Date(release.published_at).toLocaleString('fa-IR')}</small><small>{release.release_note??'بدون یادداشت'}</small></div>
        {release.id===state?.published_release_id?<p className="admin-warning-text">این Release در حال حاضر Active است.</p>:<ActionForm action={rollbackDesignAction} danger confirmTitle="Rollback طراحی" confirmMessage={`طراحی به Snapshot مربوط به Release #${release.release_number} برگردد و Release جدید ساخته شود؟`}>
          <input type="hidden" name="site_id" value={id}/><input type="hidden" name="target_release_id" value={release.id}/>
          <label>Rollback note<input name="release_note" maxLength={1000} defaultValue={`Rollback to release #${release.release_number}`}/></label>
          <button className="admin-danger-button" type="submit">Rollback to #{release.release_number}</button>
        </ActionForm>}
      </article>)}</div>
    </section>
  </main>
}
