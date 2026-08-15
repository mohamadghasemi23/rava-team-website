export type ThemeVariantArea='header'|'hero'|'portfolio'|'footer'|'button'
export type ThemeVariantDefinition={key:string;labelFa:string;labelEn:string;descriptionFa:string;descriptionEn:string;families?:string[]}
export const THEME_VARIANTS:Record<ThemeVariantArea,ThemeVariantDefinition[]>={
 header:[
  {key:'studio-01',labelFa:'استودیو شیشه‌ای',labelEn:'Glass Studio',descriptionFa:'هدر شناور شفاف برای برندهای خلاق.','descriptionEn':'Floating glass header for creative brands.',families:['creative']},
  {key:'minimal-01',labelFa:'مینیمال خطی',labelEn:'Minimal Line',descriptionFa:'هدر آرام و مینیمال برای خدمات و معماری.','descriptionEn':'Calm minimal header for services and architecture.',families:['service']},
  {key:'corporate-01',labelFa:'شرکتی ساختاریافته',labelEn:'Structured Corporate',descriptionFa:'هدر رسمی با سلسله‌مراتب واضح و CTA پررنگ.','descriptionEn':'Structured business header with clear hierarchy.',families:['corporate']},
  {key:'commerce-01',labelFa:'فروشگاهی جستجو محور',labelEn:'Search Commerce',descriptionFa:'هدر فروشگاهی آماده جستجو، دسته‌بندی، حساب و سبد خرید.','descriptionEn':'Commerce header prepared for search, categories, account and cart.',families:['commerce']}
 ],
 hero:[
  {key:'editorial-01',labelFa:'ادیتوریال بزرگ',labelEn:'Editorial Statement',descriptionFa:'تیتر بسیار بزرگ و تصویرمحور.','descriptionEn':'Oversized typography with strong imagery.',families:['creative']},
  {key:'split-01',labelFa:'دو ستونه متعادل',labelEn:'Balanced Split',descriptionFa:'تقسیم متن و مدیا برای برندهای خدماتی.','descriptionEn':'Balanced copy and media split.',families:['service']},
  {key:'proof-01',labelFa:'اعتماد و نتیجه',labelEn:'Proof Driven',descriptionFa:'Hero شرکتی با آمار، اعتماد و CTA مشخص.','descriptionEn':'Corporate hero centered on proof and conversion.',families:['corporate']},
  {key:'commerce-01',labelFa:'ویترین فروش',labelEn:'Commerce Showcase',descriptionFa:'Hero فروشگاهی برای کمپین، دسته‌بندی و پیشنهاد ویژه.','descriptionEn':'Retail hero for campaigns, categories and offers.',families:['commerce']}
 ],
 portfolio:[
  {key:'asymmetric-01',labelFa:'نامتقارن ادیتوریال',labelEn:'Asymmetric Editorial',descriptionFa:'چیدمان نامتقارن برای نمونه‌کار تصویری.','descriptionEn':'Asymmetric editorial visual work layout.',families:['creative']},
  {key:'grid-01',labelFa:'گرید منظم',labelEn:'Clean Grid',descriptionFa:'گرید خوانا برای پروژه‌ها و خدمات.','descriptionEn':'Structured grid for projects and services.',families:['service','corporate']},
  {key:'case-study-01',labelFa:'کیس‌استادی',labelEn:'Case Study',descriptionFa:'نمایش پروژه با نتیجه، شاخص و داستان پروژه.','descriptionEn':'Case-study presentation with proof and outcomes.',families:['corporate']},
  {key:'product-grid-01',labelFa:'گرید محصول',labelEn:'Product Grid',descriptionFa:'گرید محصول با فضای قیمت، تخفیف و وضعیت موجودی.','descriptionEn':'Product grid ready for price, discount and inventory states.',families:['commerce']}
 ],
 footer:[
  {key:'minimal-01',labelFa:'مینیمال',labelEn:'Minimal',descriptionFa:'فوتر ساده و تمیز.','descriptionEn':'Simple clean footer.'},
  {key:'statement-01',labelFa:'استیتمنت',labelEn:'Statement',descriptionFa:'فوتر بزرگ با CTA قوی.','descriptionEn':'Large footer with strong closing CTA.',families:['creative','service']},
  {key:'corporate-01',labelFa:'شرکتی چندستونه',labelEn:'Corporate Columns',descriptionFa:'اطلاعات، لینک‌ها و اعتماد در ساختار چندستونه.','descriptionEn':'Multi-column business footer.',families:['corporate']},
  {key:'commerce-01',labelFa:'فروشگاهی کامل',labelEn:'Commerce Footer',descriptionFa:'راهنما، خدمات مشتری، مجوزها و لینک‌های فروشگاه.','descriptionEn':'Retail footer for service, trust and navigation.',families:['commerce']}
 ],
 button:[
  {key:'pill-01',labelFa:'کپسولی',labelEn:'Pill',descriptionFa:'دکمه گرد و پرانرژی.','descriptionEn':'Rounded expressive button.',families:['creative']},
  {key:'soft-01',labelFa:'نرم',labelEn:'Soft',descriptionFa:'دکمه آرام با گوشه‌های نرم.','descriptionEn':'Restrained soft-corner button.',families:['service']},
  {key:'solid-01',labelFa:'سالید رسمی',labelEn:'Solid Business',descriptionFa:'CTA واضح و رسمی.','descriptionEn':'Clear high-confidence business CTA.',families:['corporate']},
  {key:'commerce-01',labelFa:'خرید',labelEn:'Commerce CTA',descriptionFa:'CTA پرکنتراست مناسب خرید و افزودن به سبد.','descriptionEn':'High-contrast retail conversion CTA.',families:['commerce']}
 ]
}
export function variantExists(area:ThemeVariantArea,key:string){return THEME_VARIANTS[area].some(x=>x.key===key)}
export function normalizeVariants(input:any,fallback:any={}){const out:any={};for(const area of Object.keys(THEME_VARIANTS) as ThemeVariantArea[]){const raw=String(input?.[area]||fallback?.[area]||THEME_VARIANTS[area][0].key);out[area]=variantExists(area,raw)?raw:THEME_VARIANTS[area][0].key}return out}
export function themeVariantData(variants:any={}){const v=normalizeVariants(variants);return {'data-header-variant':v.header,'data-hero-variant':v.hero,'data-portfolio-variant':v.portfolio,'data-footer-variant':v.footer,'data-button-variant':v.button}}
