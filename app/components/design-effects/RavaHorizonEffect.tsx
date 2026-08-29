'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import styles from './rava-horizon-effect.module.css'

const EmeraldHorizonBackground=dynamic(
  ()=>import('@designcodeio/threeui/components/EmeraldHorizonBackground').then(module=>module.EmeraldHorizonBackground),
  {ssr:false},
)

function canRenderWebGL(){
  try{const canvas=document.createElement('canvas');return Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl'))}
  catch{return false}
}

export default function RavaHorizonEffect(){
  const[active,setActive]=useState(false)
  useEffect(()=>{
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)')
    const update=()=>setActive(!motion.matches&&!document.hidden&&canRenderWebGL())
    update();motion.addEventListener('change',update);document.addEventListener('visibilitychange',update)
    return()=>{motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',update)}
  },[])
  return <div className={styles.effect} aria-hidden="true" data-motion={active?'active':'fallback'}>{active?<EmeraldHorizonBackground className={styles.canvas} speed={0.34} waveScale={0.82} variation={0.72} glow={0.78} vignette={0.64} hue={112}/>:null}</div>
}
