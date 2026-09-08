import Link from 'next/link'
import {notFound,redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import {hasPermission,PERMISSIONS,requireAnyPermission} from '@/lib/authz/permissions'
import AdminIcon from '@/app/admin/components/AdminIcon'
import ActionForm from '@/app/admin/components/ActionForm'
import {updateMessageStatus} from './actions'
import styles from './messages.module.css'

export const dynamic='force-dynamic'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const object=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}

export default async function MessagesPage({searchParams}:{searchParams:Promise<{site?:string;status?:string;q?:string;message?:string}>}){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en,params=await searchParams
  const siteId=String(params.site??'');if(!UUID_RE.test(siteId))notFound()
  const supabase=await createClient(),{data:site}=await supabase.from('sites').select('id,organization_id,name').eq('id',siteId).maybeSingle();if(!site)notFound()
  await requireAnyPermission([PERMISSIONS.LEADS_VIEW,PERMISSIONS.LEADS_MANAGE],{organizationId:site.organization_id,siteId})
  const canManage=await hasPermission(PERMISSIONS.LEADS_MANAGE,{organizationId:site.organization_id,siteId})
  const{data}=await supabase.from('leads').select('id,name,email,phone,subject,message,status,source,metadata,created_at,updated_at').eq('site_id',siteId).order('created_at',{ascending:false}).limit(100)
  const messages=data??[]
  const query=String(params.q??'').trim().slice(0,80).toLocaleLowerCase(locale==='fa'?'fa':'en'),filter=['unread','resolved','archived'].includes(String(params.status))?String(params.status):'all'
  const visible=messages.filter(item=>{
    const matchesStatus=filter==='all'||filter==='unread'&&item.status==='new'||filter==='resolved'&&item.status==='replied'||filter==='archived'&&item.status==='closed'
    const haystack=[item.name,item.email,item.phone,item.subject,item.message].filter(Boolean).join(' ').toLocaleLowerCase(locale==='fa'?'fa':'en')
    return matchesStatus&&(!query||haystack.includes(query))
  })
  const requested=String(params.message??''),selected=(UUID_RE.test(requested)?visible.find(item=>item.id===requested):null)??visible[0]??null
  const href=(overrides:Record<string,string|undefined>)=>{const next=new URLSearchParams({site:siteId});if(filter!=='all')next.set('status',filter);if(query)next.set('q',query);for(const[key,value]of Object.entries(overrides)){if(value)next.set(key,value);else next.delete(key)}return`/admin/messages?${next}`}
  const date=(value:string)=>new Date(value).toLocaleString(locale==='fa'?'fa-IR':'en-GB',{dateStyle:'medium',timeStyle:'short'})
  const initials=(name:string)=>name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()
  const meta=selected?object(selected.metadata):{}
  return <main className={styles.page}><header className={styles.head}><div><small>{site.name}</small><h1>{l('پیام‌های سایت','Site messages')}</h1><p>{l('درخواست‌های ارسال‌شده از فرم‌های همین سایت را اینجا پیگیری کنید.','Track requests submitted through this site’s forms here.')}</p></div><form className={styles.tools} method="get"><input type="hidden" name="site" value={siteId}/><Link className={`${styles.filter} ${filter==='all'?styles.active:''}`} href={href({status:undefined,message:undefined})}>{l('همه','All')}</Link><Link className={`${styles.filter} ${filter==='unread'?styles.active:''}`} href={href({status:'unread',message:undefined})}>{l('خوانده‌نشده','Unread')}</Link><Link className={`${styles.filter} ${filter==='resolved'?styles.active:''}`} href={href({status:'resolved',message:undefined})}>{l('رسیدگی‌شده','Resolved')}</Link><label>{l('جست‌وجو','Search')}<input name="q" defaultValue={query} placeholder={l('نام، موضوع یا شماره تماس','Name, subject, or phone')}/></label><button type="submit"><AdminIcon name="search" size={16}/>{l('جست‌وجو','Search')}</button></form></header>{!visible.length?<section className={styles.empty}><div><span><AdminIcon name="messages" size={27}/></span><h2>{l('هنوز پیامی دریافت نشده است.','No messages have been received yet.')}</h2><p>{l('وقتی کاربری فرم سایت را ارسال کند، پیام در این بخش نمایش داده می‌شود.','Messages appear here when someone submits a site form.')}</p></div></section>:<div className={`${styles.layout} ${selected?styles.hasSelection:''}`}><section className={styles.list}>{visible.map(item=><Link className={`${styles.row} ${selected?.id===item.id?styles.selected:''}`} href={href({message:item.id})} key={item.id}><span className={styles.avatar}>{initials(item.name)}</span><span className={styles.copy}><b>{item.name}</b><span>{item.subject||l('درخواست جدید','New request')}</span><small>{String(object(item.metadata).page_title??item.source)}</small></span><span className={styles.meta}><time>{date(item.created_at)}</time>{item.status==='new'?<i className={styles.unread}/>:null}</span></Link>)}</section>{selected?<article className={styles.detail}><Link className={styles.back} href={href({message:undefined})}>← {l('بازگشت به پیام‌ها','Back to messages')}</Link><header className={styles.detailHeader}><span className={styles.avatar}>{initials(selected.name)}</span><div><strong>{selected.name}</strong><span>{selected.subject||l('درخواست جدید','New request')}</span></div>{selected.status==='replied'?<b className={styles.resolved}>{l('رسیدگی‌شده','Resolved')}</b>:null}</header><div className={styles.contact}>{selected.email?<div><small>{l('ایمیل','Email')}</small><a href={`mailto:${selected.email}`}>{selected.email}</a></div>:null}{selected.phone?<div><small>{l('شماره تماس','Phone')}</small><a href={`tel:${selected.phone}`}>{selected.phone}</a></div>:null}</div><div className={styles.message}>{selected.message}</div><div className={styles.source}><span>{l('صفحه ارسال:','Source page:')} <b>{String(meta.page_title??selected.source)}</b></span><span>{l('زمان دریافت:','Received:')} <b>{date(selected.created_at)}</b></span></div>{canManage&&selected.status!=='closed'?<div className={styles.actions}>{selected.status!=='replied'?<ActionForm action={updateMessageStatus} requireConfirmation={false}><input type="hidden" name="id" value={selected.id}/><input type="hidden" name="status" value="replied"/><button type="submit">{l('علامت‌گذاری به‌عنوان رسیدگی‌شده','Mark as resolved')}</button></ActionForm>:null}<ActionForm action={updateMessageStatus} confirmTitle={l('بایگانی پیام','Archive message')} confirmMessage={l('این پیام از فهرست کارهای جاری خارج شود؟','Remove this message from the active list?')}><input type="hidden" name="id" value={selected.id}/><input type="hidden" name="status" value="closed"/><button type="submit">{l('بایگانی','Archive')}</button></ActionForm></div>:null}</article>:null}</div>}</main>
}
