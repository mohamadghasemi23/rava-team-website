'use client'

import {useActionState, useEffect} from 'react'
import {useAdminLocale} from '../../components/AdminLocale'
import MediaPicker from '../../components/MediaPicker'
import {updateBlock, type AdminActionState} from '../actions'
import styles from './page-editor-workspace.module.css'

export type SavePhase='clean'|'dirty'|'saving'|'saved'|'error'|'demo'
type Block={id:string;block_type:string;data:Record<string,unknown>}
type Props={block:Block;pageId:string;siteId:string;demo:boolean;onStatusChange:(phase:SavePhase)=>void;onSaved:()=>void;onFullPreview:()=>void}
const initialState:AdminActionState={}

export default function BlockInspectorForm({block,pageId,siteId,demo,onStatusChange,onSaved,onFullPreview}:Props){
 const {language:locale}=useAdminLocale()
 const l=(fa:string,en:string)=>locale==='fa'?fa:en
 const [state,formAction,pending]=useActionState(updateBlock,initialState)
 const data=block.data??{}
 const value=(key:string)=>String(data[key]??'')
 const dirty=()=>onStatusChange(demo?'demo':'dirty')
 const supportsOptionalMedia=['hero','text','cta'].includes(block.block_type)

 useEffect(()=>{if(pending)onStatusChange('saving')},[pending,onStatusChange])
 useEffect(()=>{if(!state.nonce)return;if(state.ok){onStatusChange('saved');onSaved()}else onStatusChange('error')},[state.nonce,state.ok,onSaved,onStatusChange])

 return <form action={formAction} className={styles.form} onChangeCapture={dirty} aria-busy={pending}>
  <input type="hidden" name="id" value={block.id}/><input type="hidden" name="page_id" value={pageId}/>
  {block.block_type==='hero'?<>
   <label>{l('عنوان اصلی','Main title')}<textarea name="title" rows={3} minLength={3} maxLength={72} required defaultValue={value('title')}/><small>{l('حداکثر ۷۲ نویسه؛ بهتر است در موبایل بیشتر از دو خط نشود.','Up to 72 characters; preferably no more than two lines on mobile.')}</small></label>
   <label>{l('توضیح','Description')}<textarea name="text" rows={4} maxLength={600} defaultValue={value('text')}/></label>
   <label>{l('متن دکمه','Button label')}<input name="button_label" maxLength={60} required defaultValue={value('button_label')}/></label>
   <label>{l('پیوند دکمه','Button link')}<input name="button_url" dir="ltr" maxLength={500} required defaultValue={value('button_url')}/></label>
  </>:null}
  {block.block_type==='text'?<><label>{l('عنوان بخش','Section title')}<input name="title" maxLength={160} required defaultValue={value('title')}/></label><label>{l('متن بخش','Section text')}<textarea name="text" rows={10} maxLength={5000} required defaultValue={value('text')}/></label></>:null}
  {block.block_type==='cta'?<><label>{l('عنوان دعوت','Call-to-action title')}<input name="title" maxLength={160} required defaultValue={value('title')}/></label><label>{l('توضیح','Description')}<textarea name="text" rows={5} maxLength={5000} defaultValue={value('text')}/></label><label>{l('متن دکمه','Button label')}<input name="button_label" maxLength={60} required defaultValue={value('button_label')}/></label><label>{l('پیوند دکمه','Button link')}<input name="button_url" dir="ltr" maxLength={500} required defaultValue={value('button_url')}/></label></>:null}
  {supportsOptionalMedia?<fieldset className={styles.mediaSlot}><legend>{l('رسانه این بخش','Section media')}</legend><p>{block.block_type==='hero'?l('تصویر افقی ۱۶:۹؛ پیشنهاد ۱۶۰۰ در ۹۰۰ پیکسل، حداکثر ۲ مگابایت.','Landscape 16:9 image; recommended 1600 by 900 pixels, up to 2 MB.'):l('تصویر افقی ۴:۳؛ پیشنهاد ۱۲۰۰ در ۹۰۰ پیکسل، حداکثر ۲ مگابایت.','Landscape 4:3 image; recommended 1200 by 900 pixels, up to 2 MB.')}</p><MediaPicker name="media_url" siteId={siteId} defaultValue={value('media_url')} maxBytes={2*1024*1024} onValueChange={dirty}/><label>{l('توضیح تصویر','Image description')}<input name="media_alt" maxLength={300} required={Boolean(value('media_url'))} defaultValue={value('media_alt')}/><small>{l('اگر تصویر انتخاب شده است، توضیح دقیق آن الزامی است.','An accurate description is required when an image is selected.')}</small></label></fieldset>:null}
  {block.block_type==='image'?<><label>{l('تصویر','Image')}<MediaPicker name="url" siteId={siteId} defaultValue={value('url')} onValueChange={dirty}/></label><label>{l('توضیح تصویر','Image description')}<input name="alt" maxLength={300} required defaultValue={value('alt')}/><small>{l('برای دسترس‌پذیری و جست‌وجو، محتوای تصویر را دقیق توضیح دهید.','Describe the image accurately for accessibility and search.')}</small></label><label>{l('زیرنویس','Caption')}<textarea name="caption" rows={3} maxLength={500} defaultValue={value('caption')}/></label></>:null}
  {block.block_type==='gallery'?<><label>{l('عنوان گالری','Gallery title')}<input name="title" maxLength={160} required defaultValue={value('title')}/></label><label>{l('تصویرهای گالری','Gallery images')}<MediaPicker name="images" siteId={siteId} multiple defaultValue={Array.isArray(data.images)?data.images.join('\n'):''} onValueChange={dirty}/><small>{l('بین ۱ تا ۲۴ تصویر انتخاب کنید.','Choose between 1 and 24 images.')}</small></label></>:null}
  {state.message?<p className={state.ok?styles.formSuccess:styles.formError} role={state.ok?'status':'alert'}>{state.message}</p>:null}
  <div className={styles.actions}><button type="button" onClick={onFullPreview}>{l('پیش‌نمایش کامل','Full preview')}</button><button type="submit" disabled={pending||demo}>{demo?l('نسخه نمایشی','Demo mode'):pending?l('در حال ذخیره…','Saving…'):l('ذخیره پیش‌نویس','Save draft')}</button></div>
 </form>
}
