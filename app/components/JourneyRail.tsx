'use client'

import {useEffect,useId,useRef,useState} from 'react'
import styles from '@/app/[slug]/public-page.module.css'

type RailItem={title:string;text:string}
function RailIcon({index}:{index:number}){const paths=['M4 18V9l8-5 8 5v9M8 20v-7h8v7','M4 17l5-5 4 4 7-8M16 8h4v4','M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4'];return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[index%paths.length]}/></svg>}
export default function JourneyRail({items,isFa,variant='light'}:{items:RailItem[];isFa:boolean;variant?:'light'|'dark'}){
  const rail=useRef<HTMLDivElement>(null)
  const id=useId()
  const [active,setActive]=useState(0)
  const [canPrevious,setCanPrevious]=useState(false)
  const [canNext,setCanNext]=useState(items.length>1)
  const itemRefs=useRef<Array<HTMLElement|null>>([])
  const update=()=>{
    const element=rail.current
    if(!element)return
    const viewport=element.getBoundingClientRect()
    const visibleWidths=itemRefs.current.map(item=>{if(!item)return 0;const bounds=item.getBoundingClientRect();return Math.max(0,Math.min(bounds.right,viewport.right)-Math.max(bounds.left,viewport.left))})
    const nextActive=visibleWidths.indexOf(Math.max(...visibleWidths))
    if(nextActive>=0){setActive(nextActive);setCanPrevious(nextActive>0);setCanNext(nextActive<items.length-1)}
  }
  useEffect(()=>{update();const element=rail.current;if(!element)return;const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect()},[items.length])
  const goTo=(index:number,focus=false)=>{
    const safe=Math.max(0,Math.min(items.length-1,index)),item=itemRefs.current[safe]
    item?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest',inline:'center'})
    if(focus)item?.focus({preventScroll:true})
    setActive(safe)
  }
  const onKeyDown=(event:React.KeyboardEvent<HTMLDivElement>)=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
    event.preventDefault()
    if(event.key==='Home')return goTo(0,true)
    if(event.key==='End')return goTo(items.length-1,true)
    const visualDirection=event.key==='ArrowRight'?1:-1
    goTo(active+(isFa?-visualDirection:visualDirection),true)
  }
  if(!items.length)return null
  return <div className={`${styles.railShell} ${variant==='dark'?styles.railDark:''}`}>
    <div className={styles.railToolbar}><div className={styles.railStatus} aria-live="polite" aria-atomic="true"><b>{isFa?new Intl.NumberFormat('fa-IR',{minimumIntegerDigits:2}).format(active+1):String(active+1).padStart(2,'0')}</b><span aria-hidden="true"/><small>{isFa?new Intl.NumberFormat('fa-IR',{minimumIntegerDigits:2}).format(items.length):String(items.length).padStart(2,'0')}</small><em className={styles.srOnly}>{isFa?`مورد ${active+1} از ${items.length}`:`Item ${active+1} of ${items.length}`}</em></div><div className={styles.railControls}><button type="button" disabled={!canPrevious} onClick={()=>goTo(active-1)} aria-label={isFa?'مورد قبلی':'Previous item'}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button><button type="button" disabled={!canNext} onClick={()=>goTo(active+1)} aria-label={isFa?'مورد بعدی':'Next item'}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button></div></div>
    <div id={id} className={styles.rail} ref={rail} role="region" aria-roledescription={isFa?'نوار محتوایی':'content carousel'} aria-label={isFa?'موارد قابل پیمایش':'Scrollable items'} tabIndex={0} onKeyDown={onKeyDown} onScroll={update}>{items.map((item,index)=><article ref={element=>{itemRefs.current[index]=element}} className={index===active?styles.railActive:undefined} tabIndex={index===active?0:-1} aria-current={index===active?'true':undefined} key={`${item.title}:${index}`}><span><RailIcon index={index}/></span><small>{isFa?new Intl.NumberFormat('fa-IR',{minimumIntegerDigits:2}).format(index+1):String(index+1).padStart(2,'0')}</small><h3>{item.title}</h3>{item.text?<p>{item.text}</p>:null}<i aria-hidden="true"/></article>)}</div>
    <div className={styles.railFooter}><div className={styles.railHint}>{isFa?'برای دیدن موارد بیشتر بکشید یا از کلیدهای جهت‌دار استفاده کنید':'Drag to explore or use the arrow keys'}</div><div className={styles.railDots} aria-label={isFa?'انتخاب مورد':'Choose an item'}>{items.map((item,index)=><button key={`${item.title}:dot`} type="button" className={index===active?styles.railDotActive:undefined} aria-label={isFa?`نمایش مورد ${index+1}`:`Show item ${index+1}`} aria-pressed={index===active} onClick={()=>goTo(index)}/>)}</div></div>
  </div>
}
