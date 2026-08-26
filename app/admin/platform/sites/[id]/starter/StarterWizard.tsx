'use client'

import { useMemo, useState } from 'react'
import ActionForm from '@/app/admin/components/ActionForm'
import { installStarterAction } from './actions'
import './starter.css'

type Page={stable_key:string;title:string;slug:string;placeholder?:boolean;requires_customer_verification?:boolean}
type Option={site_type:{key:string;name_fa:string;name_en:string};industry:{key:string;name_fa:string;name_en:string};pack:{key:string;name_fa:string;name_en:string;description_fa:string;description_en:string;commercial_tier:string;version_id:string;version:number;manifest:{locales:Record<string,{pages:Page[]}>}};template:{key:string;name_fa:string;name_en:string;description_fa:string;description_en:string;commercial_tier:string;version_id:string;version:number;theme:Record<string,unknown>;layout:Record<string,unknown>};recommended_modules:string[];is_default:boolean}

const copy={fa:{title:'راه‌اندازی سایت خدماتی',intro:'بسته محتوایی و قالب سازگار را انتخاب کن؛ قبل از نصب، خروجی Draft را ببین.',pack:'بسته و قالب',brand:'نام برند',languages:'زبان‌های محتوا',preview:'پیش‌نمایش تغییرات',pages:'صفحه Draft',install:'ساخت Draftهای سایت',warning:'اطلاعات نمونه و جای‌نگهدار باید قبل از Publish توسط مالک تأیید شوند.',empty:'بسته سازگاری برای این سایت وجود ندارد.'},en:{title:'Service website setup',intro:'Choose compatible content and design, then review every draft before installation.',pack:'Pack and template',brand:'Brand name',languages:'Content languages',preview:'Change preview',pages:'draft pages',install:'Create website drafts',warning:'Placeholders and sample facts require owner verification before publishing.',empty:'No compatible starter option is available.'}}

export default function StarterWizard({siteId,siteName,options}:{siteId:string;siteName:string;options:Option[]}){
  const [locale,setLocale]=useState<'fa'|'en'>('fa');const [selected,setSelected]=useState(0);const [fa,setFa]=useState(true);const [en,setEn]=useState(true)
  const option=options[selected];const t=copy[locale]
  const pages=useMemo(()=>[...(fa?(option?.pack.manifest.locales.fa?.pages??[]):[]),...(en?(option?.pack.manifest.locales.en?.pages??[]):[])],[option,fa,en])
  const idempotency=useMemo(()=>crypto.randomUUID(),[selected])
  return <section className="starter-wizard" dir={locale==='fa'?'rtl':'ltr'}>
    <div className="starter-language"><button type="button" className={locale==='fa'?'active':''} onClick={()=>setLocale('fa')}>فارسی</button><button type="button" className={locale==='en'?'active':''} onClick={()=>setLocale('en')}>English</button></div>
    <div className="starter-heading"><div><span>SAFE DRAFT INSTALLER</span><h2>{t.title}</h2><p>{t.intro}</p></div><b>{siteName}</b></div>
    {!option?<div className="admin-empty">{t.empty}</div>:<div className="starter-grid">
      <div className="starter-controls">
        <label>{t.pack}<select value={selected} onChange={event=>setSelected(Number(event.target.value))}>{options.map((item,index)=><option key={`${item.pack.version_id}:${item.template.version_id}`} value={index}>{locale==='fa'?item.pack.name_fa:item.pack.name_en} · {locale==='fa'?item.template.name_fa:item.template.name_en} v{item.template.version}{item.is_default?' ★':''}</option>)}</select></label>
        <div className="starter-card"><b>{locale==='fa'?option.industry.name_fa:option.industry.name_en}</b><p>{locale==='fa'?option.pack.description_fa:option.pack.description_en}</p><small>{option.pack.commercial_tier.toUpperCase()} · Pack v{option.pack.version}</small></div>
        <ActionForm action={installStarterAction} className="admin-form" confirmTitle={locale==='fa'?'تأیید نصب Draft':'Confirm draft installation'} confirmMessage={locale==='fa'?`برای ${siteName} تعداد ${pages.length} صفحه Draft ساخته شود؟ هیچ چیز Publish نمی‌شود.`:`Create ${pages.length} draft pages for ${siteName}? Nothing will be published.`} confirmLabel={locale==='fa'?'بله، Draftها ساخته شوند':'Yes, create drafts'}>
          <input type="hidden" name="site_id" value={siteId}/><input type="hidden" name="pack_version_id" value={option.pack.version_id}/><input type="hidden" name="template_version_id" value={option.template.version_id}/><input type="hidden" name="idempotency_key" value={idempotency}/>
          <label>{t.brand}<input name="brand_name" maxLength={120} defaultValue={siteName}/></label>
          <fieldset className="starter-locales"><legend>{t.languages}</legend><label><input type="checkbox" name="locale_fa" checked={fa} onChange={event=>setFa(event.target.checked)}/> فارسی</label><label><input type="checkbox" name="locale_en" checked={en} onChange={event=>setEn(event.target.checked)}/> English</label></fieldset>
          <p className="starter-warning">{t.warning}</p><button className="admin-primary-button" type="submit" disabled={!fa&&!en}>{t.install}</button>
        </ActionForm>
      </div>
      <div className="starter-preview"><div><span>{t.preview}</span><b>{pages.length} {t.pages}</b></div><h3>{locale==='fa'?option.template.name_fa:option.template.name_en} · v{option.template.version}</h3><p>{locale==='fa'?option.template.description_fa:option.template.description_en}</p><div className="starter-page-list">{pages.map((page,index)=><article key={`${page.slug}:${index}`}><span>{String(index+1).padStart(2,'0')}</span><div><b>{page.title}</b><small dir="ltr">/{page.slug}</small></div><em>DRAFT</em></article>)}</div></div>
    </div>}
  </section>
}
