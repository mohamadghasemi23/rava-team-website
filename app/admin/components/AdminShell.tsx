'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useEffect,useMemo,useState} from 'react'
import AdminIcon,{type AdminIconName} from './AdminIcon'
import {AdminLocaleContext,type AdminLanguage} from './AdminLocale'

type NavItem={label:{fa:string;en:string};href?:string;icon:AdminIconName;keywords:string[];children?:NavItem[]}
type ContextHelp={key:string;estimated_minutes:number;translation?:{title:string;summary:string;body_markdown:string;steps:unknown[];warnings:unknown[];version:number}|null}
const navigation:NavItem[]=[
  {label:{fa:'خانه',en:'Home'},href:'/admin',icon:'home',keywords:['dashboard','home','داشبورد','خانه']},
  {label:{fa:'مدیریت کسب‌وکارها',en:'Business management'},icon:'business',keywords:['owner','platform','tenant','customer','billing','contract','مالک','مشتری','سایت','قرارداد','مالی'],children:[
    {label:{fa:'سایت‌ها و مشتریان',en:'Sites & customers'},href:'/admin/platform/sites',icon:'sites',keywords:['organizations','sites','tenants','customers','مشتری','سایت']},
    {label:{fa:'ساخت سایت جدید',en:'Create a new site'},href:'/admin/platform/sites/new',icon:'add',keywords:['new','provision','create site','ساخت سایت','مشتری جدید']},
    {label:{fa:'قراردادها و امور مالی',en:'Contracts & billing'},href:'/admin/platform/billing',icon:'billing',keywords:['billing','contract','invoice','usage','payment','قرارداد','صورتحساب','پرداخت','مصرف']}]},
  {label:{fa:'محتوا و فایل‌ها',en:'Content & files'},icon:'content',keywords:['content','cms','محتوا'],children:[
    {label:{fa:'صفحه‌های سایت',en:'Site pages'},href:'/admin/pages',icon:'pages',keywords:['pages','page','صفحه','صفحات']},
    {label:{fa:'تصاویر و فایل‌ها',en:'Media library'},href:'/admin/media',icon:'media',keywords:['media','image','upload','رسانه','تصویر','آپلود']}]},
  {label:{fa:'راهنما و یادگیری',en:'Help & learning'},icon:'learning',keywords:['help','academy','training','راهنما','آموزش'],children:[
    {label:{fa:'مدیریت راهنماها',en:'Manage help content'},href:'/admin/help',icon:'help',keywords:['help','topics','context','راهنما']},
    {label:{fa:'آموزش‌های راوا',en:'RAVA Academy'},href:'/admin/academy',icon:'academy',keywords:['academy','course','lesson','آکادمی','دوره']}]},
  {label:{fa:'تنظیمات و امنیت',en:'Settings & security'},icon:'settings',keywords:['system','security','logs','errors','سیستم','امنیت','گزارش','خطا'],children:[
    {label:{fa:'گزارش فعالیت‌ها',en:'Activity log'},href:'/admin/system/logs',icon:'activity',keywords:['logs','audit','لاگ','گزارش']},
    {label:{fa:'خطاهای سامانه',en:'System errors'},href:'/admin/system/errors',icon:'errors',keywords:['errors','exceptions','خطا']},
    {label:{fa:'کاربران و دسترسی‌ها',en:'Users & access'},href:'/admin/system/access',icon:'access',keywords:['roles','permissions','access','دسترسی','نقش','کاربر']}]},
]
const copy={
  fa:{controlCenter:'مرکز مدیریت',search:'دنبال کدام بخش می‌گردید؟',noResult:'بخشی با این عنوان پیدا نشد.',menu:'باز کردن منو',close:'بستن',language:'English',helpTitle:'راهنمای همین صفحه',loading:'راهنما در حال آماده‌شدن است…',empty:'راهنمای این صفحه هنوز منتشر نشده است.',academy:'دیدن آموزش‌های مرتبط',warnings:'نکته‌های مهم',minute:'دقیقه',current:'شما اینجا هستید'},
  en:{controlCenter:'Management center',search:'Where would you like to go?',noResult:'No matching section was found.',menu:'Open menu',close:'Close',language:'فارسی',helpTitle:'Help for this page',loading:'Preparing this guide…',empty:'A guide has not been published for this page yet.',academy:'View related learning',warnings:'Important notes',minute:'min',current:'You are here'},
}
function itemMatches(item:NavItem,query:string):boolean{if(!query)return true;const haystack=[item.label.fa,item.label.en,...item.keywords].join(' ').toLowerCase();return haystack.includes(query.toLowerCase())||Boolean(item.children?.some(child=>itemMatches(child,query)))}
function isItemActive(item:NavItem,pathname:string):boolean{return item.href?pathname===item.href||(item.href!=='/admin'&&pathname.startsWith(`${item.href}/`)):Boolean(item.children?.some(child=>isItemActive(child,pathname)))}
function currentLabel(pathname:string,language:AdminLanguage){for(const item of navigation){if(item.href&&isItemActive(item,pathname))return item.label[language];const child=item.children?.find(entry=>isItemActive(entry,pathname));if(child)return child.label[language]}return copy[language].controlCenter}

export default function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(),[language,setLanguageState]=useState<AdminLanguage>('fa'),[query,setQuery]=useState(''),[mobileOpen,setMobileOpen]=useState(false),[helpOpen,setHelpOpen]=useState(false),[help,setHelp]=useState<ContextHelp|null>(null),[helpLoading,setHelpLoading]=useState(false),[collapsed,setCollapsed]=useState<Record<string,boolean>>({})
  useEffect(()=>{const saved=window.localStorage.getItem('rava-admin-language');if(saved==='en'||saved==='fa')setLanguageState(saved)},[])
  useEffect(()=>setMobileOpen(false),[pathname])
  useEffect(()=>{if(!helpOpen)return;let active=true;setHelpLoading(true);fetch(`/api/admin/help/context?path=${encodeURIComponent(pathname)}&locale=${language}`).then(r=>r.json()).then(data=>{if(active)setHelp(data.topic??null)}).catch(()=>{if(active)setHelp(null)}).finally(()=>{if(active)setHelpLoading(false)});return()=>{active=false}},[helpOpen,pathname,language])
  function setLanguage(next:AdminLanguage){setLanguageState(next);window.localStorage.setItem('rava-admin-language',next)}
  const filteredNavigation=useMemo(()=>navigation.filter(item=>itemMatches(item,query.trim())),[query]),t=copy[language],isRtl=language==='fa',tr=help?.translation,pageTitle=currentLabel(pathname,language)
  return <AdminLocaleContext.Provider value={{language,setLanguage}}><div className="rava-admin-frame" dir={isRtl?'rtl':'ltr'} lang={language}>
    <button className="rava-admin-mobile-trigger" type="button" onClick={()=>setMobileOpen(true)} aria-label={t.menu}><AdminIcon name="menu"/></button>{mobileOpen&&<button className="rava-admin-scrim" type="button" aria-label={t.close} onClick={()=>setMobileOpen(false)}/>}<aside className={`rava-admin-sidebar${mobileOpen?' is-open':''}`} aria-label={t.menu}>
      <div className="rava-admin-brand-row"><Link className="rava-admin-brand" href="/admin"><b>RAVA</b> TEAM<small>{t.controlCenter}</small></Link><button className="rava-admin-close" type="button" onClick={()=>setMobileOpen(false)} aria-label={t.close}><AdminIcon name="close"/></button></div>
      <label className="rava-admin-search"><AdminIcon name="search" size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/></label><nav className="rava-admin-tree">{filteredNavigation.length===0&&<p className="rava-admin-no-result">{t.noResult}</p>}{filteredNavigation.map(item=>{
        if(item.href){const active=isItemActive(item,pathname);return <Link key={item.href} href={item.href} aria-current={active?'page':undefined} className={`rava-admin-nav-item${active?' is-active':''}`}><i><AdminIcon name={item.icon}/></i><span>{item.label[language]}</span>{active&&<small>{t.current}</small>}</Link>}
        const key=item.label.en,active=isItemActive(item,pathname),isCollapsed=Boolean(collapsed[key]&&!query)
        return <section className={`rava-admin-nav-group${active?' has-active':''}`} key={key}><button type="button" className="rava-admin-nav-group-title" onClick={()=>setCollapsed(value=>({...value,[key]:!value[key]}))} aria-expanded={!isCollapsed}><i><AdminIcon name={item.icon}/></i><span>{item.label[language]}</span><span className={`rava-admin-chevron${isCollapsed?' is-collapsed':''}`}><AdminIcon name="chevron" size={15}/></span></button>{!isCollapsed&&<div className="rava-admin-nav-children">{item.children?.filter(child=>itemMatches(child,query.trim())).map(child=>{const childActive=isItemActive(child,pathname);return <Link key={child.href} href={child.href!} aria-current={childActive?'page':undefined} className={`rava-admin-nav-item${childActive?' is-active':''}`}><i><AdminIcon name={child.icon}/></i><span>{child.label[language]}</span></Link>})}</div>}</section>})}</nav>
      <div className="rava-admin-sidebar-footer"><button type="button" onClick={()=>setHelpOpen(true)}><AdminIcon name="help"/><span>{t.helpTitle}</span></button><button type="button" onClick={()=>setLanguage(language==='fa'?'en':'fa')}><AdminIcon name="language"/><span>{t.language}</span></button></div>
    </aside><div className="rava-admin-workspace"><div className="rava-admin-topbar"><div><small>{t.current}</small><strong>{pageTitle}</strong></div><button type="button" className="rava-context-help-trigger" onClick={()=>setHelpOpen(true)}><AdminIcon name="help"/><span>{t.helpTitle}</span></button></div><div className="rava-admin-content">{children}</div></div>
    {helpOpen&&<div className="admin-modal-backdrop" role="presentation" onMouseDown={()=>setHelpOpen(false)}><section className="admin-modal rava-admin-help-modal" role="dialog" aria-modal="true" aria-labelledby="admin-help-title" onMouseDown={e=>e.stopPropagation()}><button className="rava-help-close" type="button" onClick={()=>setHelpOpen(false)} aria-label={t.close}><AdminIcon name="close"/></button><div className="admin-modal-icon"><AdminIcon name="help"/></div>{helpLoading?<><h3 id="admin-help-title">{t.helpTitle}</h3><p>{t.loading}</p></>:tr?<><h3 id="admin-help-title">{tr.title}</h3><p className="rava-help-summary">{tr.summary}</p>{tr.body_markdown&&<p>{tr.body_markdown}</p>}{Array.isArray(tr.steps)&&tr.steps.length>0?<ol className="rava-help-steps">{tr.steps.map((step,index)=><li key={index}><b>{index+1}</b><span>{String(step)}</span></li>)}</ol>:null}{Array.isArray(tr.warnings)&&tr.warnings.length>0?<details className="rava-help-warnings"><summary><AdminIcon name="errors" size={17}/>{t.warnings}</summary><ul>{tr.warnings.map((warning,index)=><li key={index}>{String(warning)}</li>)}</ul></details>:null}<small>{help?.estimated_minutes} {t.minute} · v{tr.version}</small></>:<><h3 id="admin-help-title">{t.helpTitle}</h3><p>{t.empty}</p></>}<div className="admin-modal-actions"><Link className="admin-muted-button" href="/admin/academy" onClick={()=>setHelpOpen(false)}>{t.academy}</Link><button className="admin-primary-button" type="button" onClick={()=>setHelpOpen(false)}>{t.close}</button></div></section></div>}
  </div></AdminLocaleContext.Provider>
}
