import type {ReactNode} from 'react'

export type AdminIconName='home'|'business'|'sites'|'add'|'billing'|'content'|'pages'|'media'|'learning'|'help'|'academy'|'settings'|'activity'|'errors'|'access'|'search'|'chevron'|'menu'|'close'|'language'|'check'|'clock'|'lock'|'arrow'

const paths:Record<AdminIconName,ReactNode>={
  home:<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6"/></>,
  business:<><path d="M4 20V7l8-3 8 3v13"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M9 20v-3h6v3"/></>,
  sites:<><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M8 21h8M12 18v3"/></>,
  add:<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
  billing:<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
  content:<><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></>,
  pages:<><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h4M10 12h6M10 16h6"/></>,
  media:<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m3 17 5-4 4 3 3-2 6 4"/></>,
  learning:<><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 13v4c3 2 7 2 10 0v-4M21 10v6"/></>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.1c-.9.5-1.3 1-1.3 1.9M12 17h.01"/></>,
  academy:<><path d="M5 4h14v16H5zM9 4v16M9 8h6M9 12h6M9 16h4"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  activity:<><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></>,
  errors:<><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  access:<><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 11l2 2 4-4"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  chevron:<path d="m9 18 6-6-6-6"/>,menu:<path d="M4 7h16M4 12h16M4 17h16"/>,close:<path d="m6 6 12 12M18 6 6 18"/>,
  language:<><path d="M4 5h10M9 3v2M6 9c2 3 5 5 8 6M13 5c-1 5-4 9-8 11M15 20l3-8 3 8M16 17h4"/></>,
  check:<path d="m5 12 4 4L19 6"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,arrow:<path d="M5 12h14m-5-5 5 5-5 5"/>,
}

export default function AdminIcon({name,size=20}:{name:AdminIconName;size?:number}){
  return <svg className="admin-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
