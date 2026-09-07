'use client'

import {useCallback, useState} from 'react'
import {useAdminLocale} from '../../components/AdminLocale'
import SiteDraftPreview from '../../components/SiteDraftPreview'
import AdminContextHeader from '../../components/AdminContextHeader'
import BlockInspectorForm, {type SavePhase} from './BlockInspectorForm'
import styles from './page-editor-workspace.module.css'

type Block={id:string;block_type:string;position:number;visible:boolean;data:Record<string,unknown>}
type EditorIdentity={name:string;role:string;initials:string;templateName:string;templateHref:string}
type EditorIssue={key:string;label:string;description:string;href:string}
type Props={site:{id:string;name:string};page:{id:string;title:string;status:string};blocks:Block[];demoPreviewPath?:string;identity?:EditorIdentity;issues?:EditorIssue[]}

const faNames:Record<string,string>={hero:'بخش آغازین',text:'بخش متنی',image:'تصویر',cta:'دعوت به همکاری',gallery:'گالری'}
const enNames:Record<string,string>={hero:'Hero',text:'Text section',image:'Image',cta:'Call to action',gallery:'Gallery'}

export default function PageEditorWorkspace({site,page,blocks,demoPreviewPath,identity,issues=[]}:Props){
 const {language:locale}=useAdminLocale()
 const l=(fa:string,en:string)=>locale==='fa'?fa:en
 const [selected,setSelected]=useState(blocks.find(block=>block.block_type==='hero')?.id??blocks[0]?.id??'')
 const [help,setHelp]=useState(false)
 const [fullPreview,setFullPreview]=useState(false)
 const [savePhase,setSavePhase]=useState<SavePhase>(demoPreviewPath?'demo':'clean')
 const [previewRevision,setPreviewRevision]=useState(0)
 const names=locale==='fa'?faNames:enNames
 const selectedBlock=blocks.find(block=>block.id===selected)??blocks[0]
 const changeStatus=useCallback((phase:SavePhase)=>setSavePhase(phase),[])
 const saved=useCallback(()=>setPreviewRevision(value=>value+1),[])
 const statusCopy:Record<SavePhase,string>={clean:l('همه تغییرات ذخیره شده‌اند','All changes are saved'),dirty:l('تغییر ذخیره‌نشده','Unsaved change'),saving:l('در حال ذخیره…','Saving…'),saved:l('تغییرات ذخیره شد','Changes saved'),error:l('ذخیره انجام نشد','Save failed'),demo:l('نسخه نمایشی؛ ذخیره غیرفعال است','Demo mode; saving is disabled')}

 return <section className={`${styles.workspace} ${fullPreview?styles.fullPreview:''}`} aria-label={l('ویرایشگر صفحه','Page editor')}>
  {identity?<AdminContextHeader pageTitle={page.title} site={site} template={{name:identity.templateName,href:identity.templateHref}} identity={identity} issues={issues} onHelp={()=>setHelp(value=>!value)}/>:null}
  <div className={styles.grid}>
   <aside className={styles.structure}>
   <h2>{l('ساختار صفحه','Page structure')}</h2>
    <label className={styles.mobileBlockPicker}><span>{l('بخش موردنظر','Choose a section')}</span><select value={selected} onChange={event=>{setSelected(event.target.value);setSavePhase(demoPreviewPath?'demo':'clean')}}>{blocks.map((block,index)=><option value={block.id} key={block.id}>{`${index+1}. ${names[block.block_type]??block.block_type}${block.visible?'':l(' — مخفی',' — Hidden')}`}</option>)}</select></label>
    <div className={styles.blockList}>{blocks.map((block,index)=><button type="button" key={block.id} onClick={()=>{setSelected(block.id);setSavePhase(demoPreviewPath?'demo':'clean')}} className={selected===block.id?styles.selected:''}><span>{`${index+1}.`}</span><b>{names[block.block_type]??block.block_type}</b>{!block.visible?<small>{l('مخفی','Hidden')}</small>:null}</button>)}</div>
   </aside>

   <div className={styles.preview}>
    <div className={styles.previewHead}><div><b>{l('پیش‌نمایش واقعی','Real preview')}</b><span>{l('نتیجه ذخیره‌شده همین صفحه','Saved result for this page')}</span></div><div className={styles.previewStatus}><span className={`${styles.saved} ${styles[`save_${savePhase}`]}`}>{statusCopy[savePhase]}</span><span className={styles.state}><i/>{fullPreview?<button type="button" onClick={()=>setFullPreview(false)}>{l('بازگشت به ویرایش','Back to editor')}</button>:page.status==='published'?l('منتشرشده','Published'):l('پیش‌نویس','Draft')}</span></div></div>
    <SiteDraftPreview key={previewRevision} siteId={site.id} pages={[{id:page.id,title:page.title}]} initialPageId={page.id} compact srcOverride={demoPreviewPath}/>
   </div>

   <aside className={styles.inspector}>
    <div className={styles.inspectorTitle}><div><span>{l('بخش انتخاب‌شده','Selected section')}</span><h2>{selectedBlock?names[selectedBlock.block_type]??selectedBlock.block_type:l('بخشی انتخاب نشده','No section selected')}</h2></div><button type="button" onClick={()=>setHelp(value=>!value)} aria-expanded={help} aria-label={l('راهنمای این بخش','Help for this section')}>؟</button></div>
    {help?<div className={styles.help} role="note">{l('عنوان کوتاه و روشن بنویسید؛ بهتر است بیشتر از دو خط نشود. تغییرات ابتدا به‌صورت پیش‌نویس ذخیره می‌شوند.','Write a short, clear title; keep it within two lines. Changes are saved as a draft first.')}</div>:null}
    {selectedBlock?<BlockInspectorForm key={selectedBlock.id} block={selectedBlock} pageId={page.id} siteId={site.id} demo={Boolean(demoPreviewPath)} onStatusChange={changeStatus} onSaved={saved} onFullPreview={()=>setFullPreview(true)}/>:<div className={styles.placeholder}>{l('این صفحه هنوز بخشی برای ویرایش ندارد.','This page has no editable sections yet.')}</div>}
   </aside>
  </div>
 </section>
}
