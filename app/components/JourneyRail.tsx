'use client'

import {useRef} from 'react'
import styles from '@/app/[slug]/public-page.module.css'

type RailItem={title:string;text:string}
function RailIcon({index}:{index:number}){const paths=['M4 18V9l8-5 8 5v9M8 20v-7h8v7','M4 17l5-5 4 4 7-8M16 8h4v4','M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4'];return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[index%paths.length]}/></svg>}
export default function JourneyRail({items,isFa,variant='light'}:{items:RailItem[];isFa:boolean;variant?:'light'|'dark'}){
  const rail=useRef<HTMLDivElement>(null)
  const move=(direction:number)=>rail.current?.scrollBy({left:direction*rail.current.clientWidth*.72,behavior:'smooth'})
  return <div className={`${styles.railShell} ${variant==='dark'?styles.railDark:''}`}>
    <div className={styles.railControls}><button type="button" onClick={()=>move(isFa?1:-1)} aria-label={isFa?'اسلاید قبلی':'Previous slide'}>‹</button><button type="button" onClick={()=>move(isFa?-1:1)} aria-label={isFa?'اسلاید بعدی':'Next slide'}>›</button></div>
    <div className={styles.rail} ref={rail}>{items.map((item,index)=><article key={`${item.title}:${index}`}><span><RailIcon index={index}/></span><small>{isFa?new Intl.NumberFormat('fa-IR').format(index+1):String(index+1).padStart(2,'0')}</small><h3>{item.title}</h3>{item.text?<p>{item.text}</p>:null}</article>)}</div>
    <div className={styles.railHint}>{isFa?'برای دیدن موارد بیشتر بکشید':'Drag to explore'}<i/></div>
  </div>
}
