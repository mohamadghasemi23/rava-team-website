export type ThemeVariantArea='header'|'hero'|'portfolio'|'footer'|'button'
export type ThemeVariantDefinition={key:string;labelFa:string;labelEn:string;descriptionFa:string;descriptionEn:string}
export const THEME_VARIANTS:Record<ThemeVariantArea,ThemeVariantDefinition[]>={
 header:[
  {key:'studio-01',labelFa:'استودیو شیشه‌ای',labelEn:'Glass Studio',descriptionFa:'هدر شناور با حس استودیویی و بک‌دراپ شفاف.','descriptionEn':'Floating glass header for creative studio experiences.'},
  {key:'minimal-01',labelFa:'مینیمال خطی',labelEn:'Minimal Line',descriptionFa:'هدر آرام و مینیمال با مرزهای ظریف.','descriptionEn':'Calm minimal header with restrained borders.'}
 ],
 hero:[
  {key:'editorial-01',labelFa:'ادیتوریال بزرگ',labelEn:'Editorial Statement',descriptionFa:'تیتر بسیار بزرگ و فضای بصری قدرتمند.','descriptionEn':'Oversized typography with a strong visual statement.'},
  {key:'split-01',labelFa:'دو ستونه متعادل',labelEn:'Balanced Split',descriptionFa:'تقسیم متعادل متن و مدیا برای برندهای خدماتی.','descriptionEn':'Balanced copy and media split for service brands.'}
 ],
 portfolio:[
  {key:'asymmetric-01',labelFa:'نامتقارن ادیتوریال',labelEn:'Asymmetric Editorial',descriptionFa:'چیدمان نامتقارن مناسب نمونه‌کارهای تصویری.','descriptionEn':'Asymmetric editorial layout for visual portfolios.'},
  {key:'grid-01',labelFa:'گرید منظم',labelEn:'Clean Grid',descriptionFa:'گرید منظم و خوانا برای پروژه‌ها و محصولات.','descriptionEn':'Structured grid for projects and products.'}
 ],
 footer:[
  {key:'minimal-01',labelFa:'مینیمال',labelEn:'Minimal',descriptionFa:'فوتر ساده و تمیز.','descriptionEn':'Simple, clean footer.'},
  {key:'statement-01',labelFa:'استیتمنت',labelEn:'Statement',descriptionFa:'فوتر بزرگ‌تر با CTA پررنگ.','descriptionEn':'Larger footer with a strong closing CTA.'}
 ],
 button:[
  {key:'pill-01',labelFa:'کپسولی',labelEn:'Pill',descriptionFa:'دکمه گرد و پرانرژی.','descriptionEn':'Rounded expressive button.'},
  {key:'soft-01',labelFa:'نرم',labelEn:'Soft',descriptionFa:'دکمه آرام با گوشه‌های نرم.','descriptionEn':'Restrained button with softer corners.'}
 ]
}
export function variantExists(area:ThemeVariantArea,key:string){return THEME_VARIANTS[area].some(x=>x.key===key)}
export function normalizeVariants(input:any,fallback:any={}){const out:any={};for(const area of Object.keys(THEME_VARIANTS) as ThemeVariantArea[]){const raw=String(input?.[area]||fallback?.[area]||THEME_VARIANTS[area][0].key);out[area]=variantExists(area,raw)?raw:THEME_VARIANTS[area][0].key}return out}
export function themeVariantData(variants:any={}){const v=normalizeVariants(variants);return {'data-header-variant':v.header,'data-hero-variant':v.hero,'data-portfolio-variant':v.portfolio,'data-footer-variant':v.footer,'data-button-variant':v.button}}
