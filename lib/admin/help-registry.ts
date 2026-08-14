export type AdminHelpImportance='standard'|'important'|'critical'
export type AdminHelpDefinition={key:string;area:string;importance:AdminHelpImportance;warningRequired?:boolean}

export const ADMIN_HELP_REGISTRY:AdminHelpDefinition[]=[
 {key:'projects.slug',area:'projects',importance:'standard'},
 {key:'projects.category',area:'projects',importance:'standard'},
 {key:'projects.status',area:'projects',importance:'important'},
 {key:'projects.schedule',area:'projects',importance:'important'},
 {key:'projects.featured',area:'projects',importance:'standard'},
 {key:'projects.services',area:'projects',importance:'standard'},
 {key:'projects.media',area:'projects',importance:'important'},
 {key:'projects.video',area:'projects',importance:'important'},
 {key:'projects.video.poster',area:'projects',importance:'important'},
 {key:'projects.video.thumbnail',area:'projects',importance:'standard'},
 {key:'media.upload',area:'media',importance:'important'},
 {key:'media.video.upload',area:'media',importance:'important'},
 {key:'media.folder',area:'media',importance:'standard'},
 {key:'media.delete',area:'media',importance:'critical',warningRequired:true},
 {key:'seo.basics',area:'seo',importance:'standard'},
 {key:'logs.search',area:'observability',importance:'standard'},
 {key:'users.sessions',area:'users',importance:'critical',warningRequired:true},
 {key:'security.permissions',area:'security',importance:'critical',warningRequired:true},
]

export const ADMIN_HELP_KEYS=new Set(ADMIN_HELP_REGISTRY.map(x=>x.key))
export function isRegisteredAdminHelpKey(key:string){return ADMIN_HELP_KEYS.has(key)}

/*
 RAVA admin UX rule:
 - Every non-obvious admin operation must register a Help Key here.
 - Destructive/security-sensitive operations must use importance=critical and warningRequired=true.
 - Every registered key must have Persian help copy; English copy is strongly required and falls back to Persian if missing.
 - New admin features are not considered UX-complete until their contextual help is registered and attached near the operation.
*/
