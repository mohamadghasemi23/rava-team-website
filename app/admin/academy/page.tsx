import { createClient } from '@/lib/supabase/server'
import { markLessonAction } from '@/app/admin/help/actions'

export default async function AcademyPage(){
  const supabase=await createClient(); const {data:claims}=await supabase.auth.getClaims(); const userId=String(claims?.claims?.sub??'')
  const [coursesR,ctR,mapR,topicsR,trR,progressR]=await Promise.all([
    supabase.from('academy_courses').select('id,key,status,estimated_minutes').eq('status','published').order('sort_order'),
    supabase.from('academy_course_translations').select('course_id,locale,title,summary,intro_markdown'),
    supabase.from('academy_course_topics').select('course_id,topic_id,position,required').order('position'),
    supabase.from('help_topics').select('id,key,estimated_minutes,status').eq('status','published'),
    supabase.from('help_translations').select('topic_id,locale,title,summary,body_markdown,steps,warnings,example_markdown,version'),
    userId?supabase.from('academy_progress').select('course_id,topic_id,completed').eq('user_id',userId):Promise.resolve({data:[]}),
  ])
  const courses=coursesR.data??[], translations=ctR.data??[], map=mapR.data??[], topics=topicsR.data??[], topicTranslations=trR.data??[], progress=progressR.data??[]
  return <main className="admin-shell"><header className="admin-head"><div><span className="kicker">RAVA ACADEMY</span><h1>آکادمی راوا</h1><p>آموزش مرحله‌به‌مرحله سیستم. محتوای فارسی و انگلیسی مستقل و Versioned است.</p></div></header>
    {courses.length===0?<section className="admin-panel"><div className="admin-empty">هنوز دوره Published وجود ندارد.</div></section>:courses.map(course=>{
      const fa=translations.find(x=>x.course_id===course.id&&x.locale==='fa'); const lessons=map.filter(x=>x.course_id===course.id); const done=lessons.filter(l=>progress.some(p=>p.course_id===course.id&&p.topic_id===l.topic_id&&p.completed)).length; const pct=lessons.length?Math.round(done/lessons.length*100):0
      return <section className="admin-panel" key={course.id}><div className="admin-section-title"><div><h2>{fa?.title??course.key}</h2><p>{fa?.summary??''}</p></div><span>{pct}% کامل</span></div>{fa?.intro_markdown?<p>{fa.intro_markdown}</p>:null}
        <div className="admin-access-grid">{lessons.map(link=>{const topic=topics.find(t=>t.id===link.topic_id); const tr=topicTranslations.find(t=>t.topic_id===link.topic_id&&t.locale==='fa'); const completed=progress.some(p=>p.course_id===course.id&&p.topic_id===link.topic_id&&p.completed); return <article className="admin-access-card" key={link.topic_id}><div><b>{tr?.title??topic?.key}</b><small>{tr?.summary??''}</small><small>{topic?.estimated_minutes??3} دقیقه · Version {tr?.version??1}</small></div>{tr?.body_markdown?<p>{tr.body_markdown}</p>:null}{Array.isArray(tr?.steps)&&tr.steps.length?<ol>{tr.steps.map((s:any,i:number)=><li key={i}>{String(s)}</li>)}</ol>:null}{Array.isArray(tr?.warnings)&&tr.warnings.length?<details><summary>هشدارها</summary><ul>{tr.warnings.map((w:any,i:number)=><li key={i}>{String(w)}</li>)}</ul></details>:null}<form action={markLessonAction}><input type="hidden" name="course_id" value={course.id}/><input type="hidden" name="topic_id" value={link.topic_id}/><input type="hidden" name="completed" value={completed?'false':'true'}/><button className={completed?'admin-muted-button':'admin-primary-button'} type="submit">{completed?'علامت‌گذاری به‌عنوان ناتمام':'این درس را یاد گرفتم'}</button></form></article>})}</div>
      </section>})}
  </main>
}
