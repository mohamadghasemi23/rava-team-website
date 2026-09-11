'use client'

import Link from 'next/link'
import {useActionState,useEffect,useMemo,useState} from 'react'
import {setSiteHomePage,type AdminActionState} from './actions'
import {useAdminLocale} from '../components/AdminLocale'

type Page={id:string;title:string;slug:string;status:string}
type Mapping={locale:string;page_id:string}
type Props={siteId:string;primaryLocale:string;pages:Page[];mappings:Mapping[]}
const initialState:AdminActionState={}

export default function HomePageSelector({siteId,primaryLocale,pages,mappings}:Props){
 const {language}=useAdminLocale(),l=(fa:string,en:string)=>language==='fa'?fa:en
 const locales=useMemo(()=>Array.from(new Set([primaryLocale==='en'?'en':'fa',primaryLocale==='en'?'fa':'en'])),[primaryLocale])
 const initial=useMemo(()=>Object.fromEntries(locales.map(locale=>[locale,mappings.find(item=>item.locale===locale)?.page_id??''])),[locales,mappings])
 const [active,setActive]=useState(locales[0]),[saved,setSaved]=useState<Record<string,string>>(initial),[selected,setSelected]=useState<Record<string,string>>(initial)
 const [state,formAction,pending]=useActionState(setSiteHomePage,initialState)
 useEffect(()=>{if(state.ok&&state.locale){const value=state.pageId??'';setSaved(current=>({...current,[state.locale!]:value}));setSelected(current=>({...current,[state.locale!]:value}))}},[state])
 const page=pages.find(item=>item.id===selected[active]),dirty=(selected[active]??'')!==(saved[active]??'')
 const status=page?.status==='published'?l('منتشرشده','Published'):page?.status==='scheduled'?l('زمان‌بندی‌شده','Scheduled'):page?.status==='hidden'?l('مخفی','Hidden'):page?l('پیش‌نویس','Draft'):l('انتخاب نشده','Not selected')
 return <section className="rava-homepage-card" aria-labelledby="homepage-title">
   <div className="rava-homepage-heading"><div><h2 id="homepage-title">{l('صفحهٔ خانه','Homepage')}</h2><p>{l('اولین صفحه‌ای که بازدیدکننده می‌بیند.','The first page visitors see.')}</p></div><code dir="ltr">/</code></div>
   <div className="rava-homepage-tabs" role="tablist" aria-label={l('زبان صفحهٔ خانه','Homepage language')}>{locales.map(locale=><button type="button" role="tab" aria-selected={active===locale} className={active===locale?'is-active':''} key={locale} disabled={pending} onClick={()=>setActive(locale)}><span>{locale==='fa'?'فارسی':'English'}</span>{locale===primaryLocale?<small>{l('زبان اصلی','Primary')}</small>:null}</button>)}</div>
   <div className="rava-homepage-body">
    <form action={formAction} className="rava-homepage-form" aria-busy={pending}>
      <input type="hidden" name="site_id" value={siteId}/><input type="hidden" name="locale" value={active}/>
      <label htmlFor={`home-page-${active}`}>{l('صفحهٔ انتخاب‌شده','Selected page')}</label>
      <select id={`home-page-${active}`} name="page_id" value={selected[active]??''} disabled={pending} onChange={event=>setSelected(current=>({...current,[active]:event.target.value}))}><option value="">{l('بدون انتخاب','No selection')}</option>{pages.map(item=><option key={item.id} value={item.id}>{item.title} · /{item.slug}</option>)}</select>
      <button className="admin-primary-button" type="submit" disabled={!dirty||pending}>{pending?l('در حال ذخیره…','Saving…'):l('ذخیره','Save')}</button>
    </form>
    <div className={`rava-homepage-status status-${page?.status??'empty'}`}><i/><span><b>{status}</b><small>{page&&page.status!=='published'?l('این صفحه تا زمان انتشار عمومی دیده نمی‌شود.','This page stays private until it is published.'):page?l('این صفحه در آدرس اصلی سایت نمایش داده می‌شود.','This page appears at the site’s main address.'):l('هنوز صفحهٔ خانه انتخاب نشده است.','No homepage is selected yet.')}</small></span></div>
    {state.message&&state.locale===active?<div className={`rava-homepage-result ${state.ok?'is-success':'is-error'}`} role="status"><span>{state.ok?'✓ ':''}{state.message}</span>{state.ok&&page?<Link href={`/preview/sites/${siteId}?page=${page.id}`} target="_blank">{l('دیدن پیش‌نمایش واقعی','Open real preview')}</Link>:null}</div>:null}
   </div>
 </section>
}
