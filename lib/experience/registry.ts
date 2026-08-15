export const PAGE_TYPES=['standard','service','case_study','product','collection','article','landing'] as const
export type PageType=typeof PAGE_TYPES[number]
export type ExperiencePack={experience_key:string;family:string;page_type:string;label_fa:string;label_en:string;description_fa:string;description_en:string;required_feature:string|null;compatible_archetypes:string[];compatible_modules:string[];default_config:Record<string,unknown>;version:number;status:string}
export function pageTypeLabel(type:string){return({standard:'صفحه عمومی',service:'خدمات',case_study:'Case Study',product:'محصول',collection:'کالکشن/فروشگاه',article:'مقاله',landing:'Landing Page'}as Record<string,string>)[type]||type}
export function experienceIsCompatible(pack:ExperiencePack,archetype:string,pageType:string){return pack.status!=='archived'&&pack.page_type===pageType&&(!pack.compatible_archetypes?.length||pack.compatible_archetypes.includes(archetype))}
/* Experience packs never own global brand tokens. They consume the active Theme and only change page composition/layout behavior. */
