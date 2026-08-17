import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'
import { saveBindingAction, saveCourseAction, saveCourseTranslationAction, saveCurriculumAction, saveTopicAction, saveTranslationAction } from './actions'

type Topic={id:string;key:string;module_key:string|null;feature_key:string|null;minimum_permission:string|null;status:string;category:string;audience:string;is_featured:boolean;estimated_minutes:number;sort_order:number}
type Translation={topic_id:string;locale:string;title:string;summary:string;version:number}
type Course={id:string;key:string;module_key:string|null;status:string;audience:string;estimated_minutes:number;sort_order:number}
type CourseTranslation={course_id:string;locale:string;title:string;summary:string;version:number}

export default async function HelpManagementPage(){
  await requirePermission(PERMISSIONS.PLATFORM_HELP_MANAGE)
  const supabase=await createClient()
  const [topicsR,translationsR,coursesR,courseTranslationsR,modulesR,permissionsR,bindingsR,curriculumR]=await Promise.all([
    supabase.from('help_topics').select('id,key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order').order('sort_order').order('key'),
    supabase.from('help_translations').select('topic_id,locale,title,summary,version').order('locale'),
    supabase.from('academy_courses').select('id,key,module_key,status,audience,estimated_minutes,sort_order').order('sort_order').order('key'),
    supabase.from('academy_course_translations').select('course_id,locale,title,summary,version').order('locale'),
    supabase.from('module_catalog').select('key,name_fa,name_en').order('key'),
    supabase.from('permissions').select('key,name_fa').order('key'),
    supabase.from('help_context_bindings').select('id,topic_id,route_pattern,context_key,priority').order('priority'),
    supabase.from('academy_course_topics').select('course_id,topic_id,position').order('position'),
  ])
  const topics=(topicsR.data??[]) as Topic[], translations=(translationsR.data??[]) as Translation[], courses=(coursesR.data??[]) as Course[], courseTranslations=(courseTranslationsR.data??[]) as CourseTranslation[]
  const modules=modulesR.data??[], permissions=permissionsR.data??[], bindings=bindingsR.data??[], curriculum=curriculumR.data??[]
  const faTitle=(id:string)=>translations.find(t=>t.topic_id===id&&t.locale==='fa')?.title??topics.find(t=>t.id===id)?.key??id
  return <main className="admin-shell">
    <header className="admin-head"><div><span className="kicker">GUIDANCE ENGINE</span><h1>Help / Academy Engine</h1><p>مدیریت مرکزی آموزش‌های فارسی و انگلیسی، Contextual Help، دوره‌ها و سرفصل‌های آموزشی RAVA.</p></div></header>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>ساخت Topic جدید</h2><p>هر عملیات یا Feature مهم باید یک Help Key مستقل داشته باشد.</p></div><span>{topics.length} Topic</span></div>
      <ActionForm action={saveTopicAction} className="admin-form" confirmTitle="ذخیره Topic" confirmMessage="این Topic در موتور راهنما ذخیره شود؟">
        <label>Help Key<input name="key" placeholder="commerce.orders.refund" required/></label>
        <label>Module<select name="module_key" defaultValue=""><option value="">General</option>{modules.map(m=><option key={m.key} value={m.key}>{m.name_fa} · {m.key}</option>)}</select></label>
        <label>Feature Key<input name="feature_key" placeholder="orders.refund"/></label>
        <label>Minimum Permission<select name="minimum_permission" defaultValue=""><option value="">بدون محدودیت اضافه</option>{permissions.map(p=><option key={p.key} value={p.key}>{p.name_fa} · {p.key}</option>)}</select></label>
        <label>Category<input name="category" defaultValue="general"/></label>
        <label>Audience<select name="audience" defaultValue="all"><option value="all">All</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="staff">Staff</option><option value="customer">Customer</option></select></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label>زمان مطالعه<input type="number" name="estimated_minutes" min="1" max="240" defaultValue="3"/></label>
        <label>ترتیب<input type="number" name="sort_order" defaultValue="0"/></label>
        <label className="admin-check"><input type="checkbox" name="featured"/><span><b>Featured</b><small>در Help Center برجسته نمایش داده شود</small></span></label>
        <button className="admin-primary-button" type="submit">ذخیره Topic</button>
      </ActionForm>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>محتوای دو زبانه</h2><p>برای هر Topic نسخه فارسی و انگلیسی مستقل و Versioned ذخیره می‌شود.</p></div></div>
      <ActionForm action={saveTranslationAction} className="admin-form" confirmTitle="ذخیره ترجمه" confirmMessage="این نسخه آموزشی ذخیره شود؟">
        <label>Topic<select name="topic_id" required defaultValue=""><option value="" disabled>انتخاب Topic</option>{topics.map(t=><option key={t.id} value={t.id}>{faTitle(t.id)} · {t.key}</option>)}</select></label>
        <label>Language<select name="locale" defaultValue="fa"><option value="fa">فارسی</option><option value="en">English</option></select></label>
        <label>عنوان<input name="title" required/></label>
        <label>خلاصه<textarea name="summary" rows={2}/></label>
        <label className="admin-full-field">آموزش اصلی (Markdown)<textarea name="body_markdown" rows={8}/></label>
        <label className="admin-full-field">مثال (Markdown)<textarea name="example_markdown" rows={4}/></label>
        <label>مراحل — هر خط یک مرحله<textarea name="steps" rows={6}/></label>
        <label>هشدارها — هر خط یک هشدار<textarea name="warnings" rows={6}/></label>
        <label className="admin-full-field">Search Keywords — با کاما جدا کن<input name="keywords"/></label>
        <button className="admin-primary-button" type="submit">ذخیره ترجمه</button>
      </ActionForm>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Topic</th><th>FA</th><th>EN</th><th>Status</th><th>Category</th></tr></thead><tbody>{topics.map(t=><tr key={t.id}><td><b>{t.key}</b></td><td>{translations.find(x=>x.topic_id===t.id&&x.locale==='fa')?.title??'—'}</td><td>{translations.find(x=>x.topic_id===t.id&&x.locale==='en')?.title??'—'}</td><td>{t.status}</td><td>{t.category}</td></tr>)}</tbody></table></div>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>Contextual Help Binding</h2><p>Help دکمه‌ی همان صفحه را به Topic مناسب وصل می‌کند.</p></div><span>{bindings.length} Binding</span></div>
      <ActionForm action={saveBindingAction} className="admin-form" confirmTitle="اتصال Help" confirmMessage="این Topic به Route مشخص‌شده متصل شود؟">
        <label>Topic<select name="topic_id" required defaultValue=""><option value="" disabled>انتخاب Topic</option>{topics.map(t=><option key={t.id} value={t.id}>{faTitle(t.id)}</option>)}</select></label>
        <label>Route Pattern<input name="route_pattern" placeholder="/admin/system/access" required/></label>
        <label>Context Key<input name="context_key" placeholder="access-control"/></label>
        <label>Priority<input name="priority" type="number" defaultValue="100"/></label>
        <button className="admin-primary-button" type="submit">ذخیره Binding</button>
      </ActionForm>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>RAVA Academy</h2><p>دوره‌های کامل برای آموزش کل سیستم و مسیرهای تخصصی.</p></div><span>{courses.length} Course</span></div>
      <ActionForm action={saveCourseAction} className="admin-form" confirmTitle="ساخت دوره" confirmMessage="این دوره آموزشی ذخیره شود؟">
        <label>Course Key<input name="key" placeholder="rava.owner.onboarding" required/></label>
        <label>Module<select name="module_key" defaultValue=""><option value="">General</option>{modules.map(m=><option key={m.key} value={m.key}>{m.name_fa}</option>)}</select></label>
        <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label>Audience<select name="audience" defaultValue="all"><option value="all">All</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="staff">Staff</option><option value="customer">Customer</option></select></label>
        <label>زمان دوره<input name="estimated_minutes" type="number" defaultValue="15"/></label><label>ترتیب<input name="sort_order" type="number" defaultValue="0"/></label>
        <button className="admin-primary-button" type="submit">ذخیره Course</button>
      </ActionForm>
      <ActionForm action={saveCourseTranslationAction} className="admin-form" confirmTitle="ترجمه دوره" confirmMessage="محتوای این زبان ذخیره شود؟">
        <label>Course<select name="course_id" required defaultValue=""><option value="" disabled>انتخاب دوره</option>{courses.map(c=><option key={c.id} value={c.id}>{courseTranslations.find(t=>t.course_id===c.id&&t.locale==='fa')?.title??c.key}</option>)}</select></label>
        <label>Language<select name="locale" defaultValue="fa"><option value="fa">فارسی</option><option value="en">English</option></select></label>
        <label>عنوان<input name="title" required/></label><label>خلاصه<textarea name="summary" rows={2}/></label><label className="admin-full-field">مقدمه دوره<textarea name="intro_markdown" rows={5}/></label>
        <button className="admin-primary-button" type="submit">ذخیره ترجمه دوره</button>
      </ActionForm>
      <ActionForm action={saveCurriculumAction} confirmTitle="تغییر سرفصل" confirmMessage="لیست Lessonهای این Course جایگزین شود؟">
        <label>Course<select name="course_id" required defaultValue=""><option value="" disabled>انتخاب دوره</option>{courses.map(c=><option key={c.id} value={c.id}>{courseTranslations.find(t=>t.course_id===c.id&&t.locale==='fa')?.title??c.key}</option>)}</select></label>
        <fieldset className="admin-permission-grid"><legend>Lesson / Topicها</legend>{topics.filter(t=>t.status==='published').map(t=><label className="admin-check" key={t.id}><input type="checkbox" name="topic_ids" value={t.id}/><span><b>{faTitle(t.id)}</b><small>{t.key}</small></span></label>)}</fieldset>
        <button className="admin-primary-button" type="submit">ذخیره سرفصل</button>
      </ActionForm>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Course</th><th>FA</th><th>EN</th><th>Lessons</th><th>Status</th></tr></thead><tbody>{courses.map(c=><tr key={c.id}><td>{c.key}</td><td>{courseTranslations.find(t=>t.course_id===c.id&&t.locale==='fa')?.title??'—'}</td><td>{courseTranslations.find(t=>t.course_id===c.id&&t.locale==='en')?.title??'—'}</td><td>{curriculum.filter(x=>x.course_id===c.id).length}</td><td>{c.status}</td></tr>)}</tbody></table></div>
    </section>
  </main>
}
