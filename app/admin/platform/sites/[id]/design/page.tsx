import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import { applyTemplateAction, publishDesignAction, rollbackDesignAction, saveDesignDraftAction } from './actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

function validUuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
function pretty(value:unknown){return JSON.stringify(value??{},null,2)}

export default async function SiteDesignPage({params}:{params:Promise<{id:string}>}){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const {id}=await params
  if(!validUuid(id)) notFound()
  const supabase=await createClient()
  const {data:site}=await supabase.from('sites').select('id,organization_id,name,slug,theme_config,settings').eq('id',id).maybeSingle()
  if(!site) notFound()

  try {
    await authorizeSiteFeature({
      siteId:id,
      moduleKey:'design',
      permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.DESIGN_MANAGE],
      route:`/admin/platform/sites/${id}/design`,
      operation:'page.view',
    })
  } catch(error) {
    if(!(error instanceof FeatureAccessError)) throw error
    return <main className="admin-shell">
      <header className="admin-head">
        <div><span className="kicker">{l('کنترل دسترسی قابلیت','FEATURE GATE')}</span><h1>{l('طراحی این سایت در دسترس نیست','Site design is unavailable')}</h1><p>{site.name} · {l('کنترل دسترسی و امکانات فعال','Runtime entitlement enforcement')}</p></div>
        <Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>{l('بازگشت به سایت','Back to site')}</Link>
      </header>
      <section className="admin-panel">
        <div className="admin-empty">
          {error.code==='permission_denied'?l('این حساب دسترسی لازم برای مدیریت طراحی سایت را ندارد.','This account cannot manage the site design.'):l('بخش طراحی برای این سایت فعال یا قابل استفاده نیست.','The design module is not enabled or available for this site.')}
        </div>
        <div className="actions">
          <Link className="admin-muted-button" href="/admin/platform/billing">{l('بررسی قرارداد و امکانات','Review contract and entitlements')}</Link>
        </div>
      </section>
    </main>
  }

  const [{data:templates},{data:versions},{data:state},{data:revisions},{data:releases}]=await Promise.all([
    supabase.from('template_catalog').select('id,key,name_fa,name_en,description_fa,description_en,industry_key,commercial_tier,is_public,status').eq('status','active').order('commercial_tier').order(locale==='fa'?'name_fa':'name_en'),
    supabase.from('template_versions').select('id,template_id,version,status,theme_defaults,layout_blueprint,changelog_fa,changelog_en').eq('status','published').order('version',{ascending:false}),
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
      <div><span className="kicker">{l('موتور طراحی','DESIGN ENGINE')}</span><h1>{l('قالب، ظاهر و انتشار','Template, theme, and release')}</h1><p>{site.name} · {l('پیش‌نویس، پیش‌نمایش، انتشار و بازگشت با تاریخچه تغییرناپذیر.','Draft, preview, publish, and rollback with immutable history.')}</p></div>
      <Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>{l('بازگشت به سایت','Back to site')}</Link>
    </header>

    <div className="admin-stats">
      <div><strong>{locale==='fa'?currentTemplate?.name_fa:currentTemplate?.name_en??'—'}</strong><span>{l('قالب فعلی','Current template')}</span></div>
      <div><strong>{currentVersion?`v${currentVersion.version}`:'—'}</strong><span>{l('نسخه قالب','Template version')}</span></div>
      <div><strong>{currentRevision?`#${currentRevision.revision}`:'—'}</strong><span>{l('نسخه پیش‌نویس','Draft revision')}</span></div>
      <div><strong>{releases?.[0]?`#${releases[0].release_number}`:'—'}</strong><span>{l('آخرین انتشار','Latest release')}</span></div>
    </div>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('انتخاب و اعمال قالب','Choose and apply a template')}</h2><p>{l('اعمال قالب فقط یک پیش‌نویس می‌سازد؛ ظاهر عمومی سایت تا انتشار تغییر نمی‌کند.','Applying a template only creates a draft; the public site does not change until publishing.')}</p></div><span>{templates?.length??0} {l('قالب','templates')}</span></div>
      <div className="admin-access-grid">{(templates??[]).map((template)=>{
        const templateVersions=(versions??[]).filter((v)=>v.template_id===template.id)
        const latest=templateVersions[0]
        return <article className="admin-access-card" key={template.id}>
          <div><b>{locale==='fa'?template.name_fa:template.name_en}</b><small>{template.industry_key}</small><small>{template.commercial_tier.toUpperCase()} · {template.is_public?l('عمومی','Public'):l('کنترل‌شده','Controlled')}</small></div>
          <p>{locale==='fa'?template.description_fa:template.description_en}</p>
          {latest?<ActionForm action={applyTemplateAction} confirmTitle={l('اعمال قالب','Apply template')} confirmMessage={l(`نسخه ${latest.version} از «${template.name_fa}» به‌عنوان پیش‌نویس جدید اعمال شود؟`,`Apply version ${latest.version} of “${template.name_en}” as a new draft?`)}>
            <input type="hidden" name="site_id" value={id}/><input type="hidden" name="template_version_id" value={latest.id}/>
            <label>{l('تنظیمات ظاهری اختیاری','Optional theme overrides')}<textarea name="theme_overrides" rows={7} defaultValue="{}" dir="ltr"/></label>
            <label>{l('یادداشت','Note')}<input name="note" maxLength={500} placeholder={l('برای نمونه: انتخاب اولیه کارفرما','For example: Initial customer choice')}/></label>
            <button className="admin-primary-button" type="submit">{l('اعمال نسخه','Apply version')} {latest.version}</button>
          </ActionForm>:<p>{l('نسخه منتشرشده ندارد.','No published version is available.')}</p>}
        </article>
      })}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('ویرایشگر پیش‌نویس طراحی','Design draft editor')}</h2><p>{l('تنظیمات ساختاریافته، امن و نسخه‌دار هستند و ویرایشگر دیداری بعداً روی همین موتور قرار می‌گیرد.','The structured editor is secure and versioned; the visual builder will use this same engine.')}</p></div>{currentRevision?<span>{l('نسخه','Revision')} #{currentRevision.revision}</span>:null}</div>
      <ActionForm action={saveDesignDraftAction} className="admin-form" confirmTitle={l('ذخیره پیش‌نویس جدید','Save new draft')} confirmMessage={l('نسخه جدیدی از ظاهر و چیدمان ساخته شود؟','Create a new theme and layout revision?')}>
        <input type="hidden" name="site_id" value={id}/>
        <label>{l('تنظیمات ظاهر','Theme configuration')}<textarea name="theme_config" rows={18} defaultValue={pretty(themeDraft)} dir="ltr" spellCheck={false}/></label>
        <label>{l('تنظیمات چیدمان','Layout configuration')}<textarea name="layout_config" rows={18} defaultValue={pretty(layoutDraft)} dir="ltr" spellCheck={false}/></label>
        <label>{l('یادداشت نسخه','Revision note')}<input name="note" maxLength={500} placeholder={l('چه چیزی تغییر کرد؟','What changed?')}/></label>
        <button className="admin-primary-button" type="submit">{l('ذخیره نسخه پیش‌نویس','Save draft revision')}</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('انتشار','Publish')}</h2><p>{l('از نسخه فعلی یک تصویر تغییرناپذیر ساخته و به انتشار فعال سایت تبدیل می‌شود.','Creates an immutable snapshot from the current revision and makes it the active site release.')}</p></div></div>
      <ActionForm action={publishDesignAction} className="admin-form" confirmTitle={l('انتشار طراحی','Publish design')} confirmMessage={l('نسخه فعلی به انتشار جدید تبدیل و روی سایت فعال شود؟','Convert the current revision into a new active release?')}>
        <input type="hidden" name="site_id" value={id}/><label>{l('یادداشت انتشار','Release note')}<input name="release_note" maxLength={1000} placeholder={l('برای نمونه: تأیید نهایی سربرگ و رنگ‌ها','For example: Final approval of header and colors')}/></label>
        <button className="admin-primary-button" type="submit">{l('انتشار نسخه جدید','Publish new release')}</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('تاریخچه نسخه‌ها','Revision history')}</h2><p>{l('هر ذخیره یا اعمال قالب، نسخه‌ای مستقل می‌سازد.','Every save or template application creates an independent revision.')}</p></div><span>{revisions?.length??0}</span></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('نسخه','Revision')}</th><th>{l('منبع','Source')}</th><th>{l('قالب','Template')}</th><th>{l('زمان','Time')}</th><th>{l('یادداشت','Note')}</th></tr></thead><tbody>{(revisions??[]).map((revision)=>{
        const template=(templates??[]).find((item)=>item.id===revision.template_id)
        const version=(versions??[]).find((item)=>item.id===revision.template_version_id)
        return <tr key={revision.id}><td>#{revision.revision}{revision.id===state?.current_revision_id?` · ${l('فعلی','CURRENT')}`:''}</td><td>{revision.source}</td><td>{locale==='fa'?template?.name_fa:template?.name_en??'—'}{version?` v${version.version}`:''}</td><td>{new Date(revision.created_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</td><td>{revision.note??'—'}</td></tr>
      })}</tbody></table></div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('تاریخچه انتشار و بازگشت','Release history and rollback')}</h2><p>{l('بازگشت تاریخچه را پاک نمی‌کند؛ از نسخه انتخاب‌شده یک نسخه و انتشار جدید می‌سازد.','Rollback preserves history and creates a new revision and release from the selected snapshot.')}</p></div><span>{releases?.length??0}</span></div>
      <div className="admin-access-grid">{(releases??[]).map((release)=><article className="admin-access-card" key={release.id}>
        <div><b>{l('انتشار','Release')} #{release.release_number}</b><small>{release.status} · {new Date(release.published_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</small><small>{release.release_note??l('بدون یادداشت','No note')}</small></div>
        {release.id===state?.published_release_id?<p className="admin-warning-text">{l('این انتشار هم‌اکنون فعال است.','This release is currently active.')}</p>:<ActionForm action={rollbackDesignAction} danger confirmTitle={l('بازگردانی طراحی','Roll back design')} confirmMessage={l(`طراحی به نسخه انتشار شماره ${release.release_number} برگردد و انتشار جدید ساخته شود؟`,`Restore release #${release.release_number} and create a new release?`)}>
          <input type="hidden" name="site_id" value={id}/><input type="hidden" name="target_release_id" value={release.id}/>
          <label>{l('یادداشت بازگشت','Rollback note')}<input name="release_note" maxLength={1000} defaultValue={l(`بازگشت به انتشار شماره ${release.release_number}`,`Rollback to release #${release.release_number}`)}/></label>
          <button className="admin-danger-button" type="submit">{l('بازگشت به انتشار','Roll back to')} #{release.release_number}</button>
        </ActionForm>}
      </article>)}</div>
    </section>
  </main>
}
