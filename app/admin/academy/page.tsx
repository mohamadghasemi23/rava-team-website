import { createClient } from '@/lib/supabase/server'
import { markLessonAction } from '@/app/admin/help/actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export default async function AcademyPage(){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
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
  return <main className="admin-shell"><header className="admin-head"><div><span className="kicker">{l('مرکز آموزش راوا','RAVA ACADEMY')}</span><h1>{l('آکادمی راوا','RAVA Academy')}</h1><p>{l('آموزش مرحله‌به‌مرحله سامانه با محتوای مستقل فارسی و انگلیسی.','Step-by-step platform learning with independent Persian and English content.')}</p></div></header>
    {courses.length===0?<section className="admin-panel"><div className="admin-empty">{l('هنوز دوره‌ای منتشر نشده است.','No courses have been published yet.')}</div></section>:courses.map(course=>{
      const translated=translations.find(x=>x.course_id===course.id&&x.locale===locale); const lessons=map.filter(x=>x.course_id===course.id); const done=lessons.filter(item=>progress.some(p=>p.course_id===course.id&&p.topic_id===item.topic_id&&p.completed)).length; const pct=lessons.length?Math.round(done/lessons.length*100):0
      return <section className="admin-panel" key={course.id}><div className="admin-section-title"><div><h2>{translated?.title??l('دوره بدون عنوان','Untitled course')}</h2><p>{translated?.summary??''}</p></div><span>{pct}% {l('کامل','complete')}</span></div>{translated?.intro_markdown?<p>{translated.intro_markdown}</p>:null}
        <div className="admin-access-grid">{lessons.map(link=>{const topic=topics.find(t=>t.id===link.topic_id); const tr=topicTranslations.find(t=>t.topic_id===link.topic_id&&t.locale===locale); const completed=progress.some(p=>p.course_id===course.id&&p.topic_id===link.topic_id&&p.completed); return <article className="admin-access-card" key={link.topic_id}><div><b>{tr?.title??l('درس بدون عنوان','Untitled lesson')}</b><small>{tr?.summary??''}</small><small>{topic?.estimated_minutes??3} {l('دقیقه','minutes')} · {l('نسخه','Version')} {tr?.version??1}</small></div>{tr?.body_markdown?<p>{tr.body_markdown}</p>:null}{Array.isArray(tr?.steps)&&tr.steps.length?<ol>{tr.steps.map((s:any,i:number)=><li key={i}>{String(s)}</li>)}</ol>:null}{Array.isArray(tr?.warnings)&&tr.warnings.length?<details><summary>{l('هشدارها','Warnings')}</summary><ul>{tr.warnings.map((w:any,i:number)=><li key={i}>{String(w)}</li>)}</ul></details>:null}<form action={markLessonAction}><input type="hidden" name="course_id" value={course.id}/><input type="hidden" name="topic_id" value={link.topic_id}/><input type="hidden" name="completed" value={completed?'false':'true'}/><button className={completed?'admin-muted-button':'admin-primary-button'} type="submit">{completed?l('علامت‌گذاری به‌عنوان ناتمام','Mark as incomplete'):l('این درس را یاد گرفتم','Mark lesson as learned')}</button></form></article>})}</div>
      </section>})}
  </main>
}
