export type ResponsiveVisibility={desktop:boolean;tablet:boolean;mobile:boolean}
export type SectionDefinition={key:string;labelFa:string;labelEn:string;category:string;variants:string[];requiredFeature?:string;pageTypes:string[]}
export const SECTION_REGISTRY:SectionDefinition[]=[
{key:'hero',labelFa:'هیرو',labelEn:'Hero',category:'content',variants:['editorial','split','media','minimal'],pageTypes:['standard','service','case_study','product','collection','article','landing']},
{key:'services',labelFa:'خدمات',labelEn:'Services',category:'business',variants:['cards','editorial','list','spotlight'],pageTypes:['standard','service','landing']},
{key:'stats',labelFa:'آمار و اعداد',labelEn:'Stats',category:'proof',variants:['inline','cards','large-numbers'],pageTypes:['standard','service','case_study','landing']},
{key:'testimonials',labelFa:'نظرات مشتریان',labelEn:'Testimonials',category:'proof',variants:['cards','quote','carousel'],pageTypes:['standard','service','product','landing']},
{key:'faq',labelFa:'سوالات متداول',labelEn:'FAQ',category:'content',variants:['accordion','split'],pageTypes:['standard','service','product','collection','article','landing']},
{key:'gallery',labelFa:'گالری',labelEn:'Gallery',category:'media',variants:['grid','masonry','immersive'],pageTypes:['standard','service','case_study','product','article']},
{key:'video',labelFa:'ویدیو',labelEn:'Video',category:'media',variants:['cinematic','inline','full-bleed'],requiredFeature:'portfolio.video',pageTypes:['standard','service','case_study','product','article','landing']},
{key:'team',labelFa:'تیم',labelEn:'Team',category:'business',variants:['cards','editorial','compact'],pageTypes:['standard','service']},
{key:'pricing',labelFa:'قیمت‌گذاری',labelEn:'Pricing',category:'commerce',variants:['cards','comparison','featured'],pageTypes:['service','landing']},
{key:'product-grid',labelFa:'محصولات',labelEn:'Product Grid',category:'commerce',variants:['grid','editorial','compact'],requiredFeature:'commerce.core',pageTypes:['standard','collection','landing']},
{key:'cta',labelFa:'دعوت به اقدام',labelEn:'CTA',category:'conversion',variants:['clean','banner','immersive'],pageTypes:['standard','service','case_study','product','collection','article','landing']},
{key:'contact',labelFa:'تماس',labelEn:'Contact',category:'business',variants:['split','minimal','card'],pageTypes:['standard','service','landing']},
{key:'text',labelFa:'متن',labelEn:'Text',category:'content',variants:['editorial','wide','compact'],pageTypes:['standard','service','case_study','product','collection','article','landing']},
{key:'image',labelFa:'تصویر',labelEn:'Image',category:'media',variants:['contained','wide','full-bleed'],pageTypes:['standard','service','case_study','product','article']}
]
export const DEFAULT_RESPONSIVE:ResponsiveVisibility={desktop:true,tablet:true,mobile:true}
export function sectionDef(key:string){return SECTION_REGISTRY.find(x=>x.key===key)}
export function sectionAllowedForPage(key:string,pageType:string){const d=sectionDef(key);return !!d&&d.pageTypes.includes(pageType)}
export function normalizeVariant(key:string,variant:string){const d=sectionDef(key);return d?.variants.includes(variant)?variant:(d?.variants[0]||'default')}
export function responsiveFromForm(f:FormData):ResponsiveVisibility{return{desktop:f.get('show_desktop')==='on',tablet:f.get('show_tablet')==='on',mobile:f.get('show_mobile')==='on'}}
