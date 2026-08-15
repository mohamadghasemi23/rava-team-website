export type StarterArchetype='portfolio'|'services'|'commerce'|'hybrid'|'custom'
export type StarterPack={headline:string;subhead:string;pages:{title:string;slug:string;blocks:{type:string;data:any}[]}[];projects:{title:string;slug:string;summary:string;category:string}[]}
const packs:Record<StarterArchetype,StarterPack[]>={
 portfolio:[
  {headline:'کارهایی که باید دیده شوند.',subhead:'یک شروع تمیز برای معرفی پروژه‌ها، خدمات و هویت برند.',pages:[{title:'درباره ما',slug:'about',blocks:[{type:'rich_text',data:{heading:'درباره این استودیو',body:'اینجا داستان برند، رویکرد و تفاوت اصلی مجموعه را معرفی کنید.'}}]},{title:'تماس',slug:'contact',blocks:[{type:'contact',data:{heading:'شروع همکاری',body:'راه‌های تماس، شبکه‌های اجتماعی و فرم درخواست پروژه را اینجا قرار دهید.'}}]}],projects:[{title:'پروژه هویت بصری',slug:'starter-brand-identity',summary:'نمونه‌ای برای نمایش پروژه برندسازی و سیستم بصری.',category:'Branding'},{title:'تجربه دیجیتال',slug:'starter-digital-experience',summary:'نمونه‌ای برای نمایش طراحی وب یا محصول دیجیتال.',category:'Web'}]},
  {headline:'انتخاب‌شده، نه شلوغ.',subhead:'پورتفولیوی مینیمال برای نمایش بهترین کارها و توانایی‌ها.',pages:[{title:'استودیو',slug:'studio',blocks:[{type:'rich_text',data:{heading:'چطور کار می‌کنیم؟',body:'فرآیند، نگاه خلاق و ارزش پیشنهادی برند را در این بخش توضیح دهید.'}}]},{title:'همکاری',slug:'work-with-us',blocks:[{type:'cta',data:{heading:'پروژه بعدی را شروع کنیم',body:'نوع همکاری، زمان پاسخ‌گویی و مسیر تماس را مشخص کنید.'}}]}],projects:[{title:'کمپین خلاق',slug:'starter-creative-campaign',summary:'نمونه برای یک کمپین یا پروژه محتوایی.',category:'Campaign'},{title:'سیستم محتوا',slug:'starter-content-system',summary:'نمونه برای نمایش تولید محتوا و طراحی سیستم انتشار.',category:'Content'}]}
 ],
 services:[
  {headline:'خدمات واضح، مسیر تصمیم ساده.',subhead:'ساختاری برای معرفی خدمات، مزیت‌ها و تبدیل بازدیدکننده به مشتری.',pages:[{title:'خدمات',slug:'services',blocks:[{type:'services',data:{heading:'چه کاری انجام می‌دهیم؟',items:['مشاوره و استراتژی','طراحی و اجرا','پشتیبانی و رشد']}}]},{title:'درباره ما',slug:'about',blocks:[{type:'rich_text',data:{heading:'چرا این مجموعه؟',body:'تجربه، تخصص و مزیت رقابتی را با زبان ساده و قابل اعتماد معرفی کنید.'}}]},{title:'تماس',slug:'contact',blocks:[{type:'contact',data:{heading:'مشاوره اولیه',body:'برای دریافت مشاوره یا استعلام، اطلاعات تماس و فرم را تکمیل کنید.'}}]}],projects:[{title:'نمونه پروژه خدماتی',slug:'starter-service-case',summary:'نمونه Case Study برای نمایش مسئله، راه‌حل و نتیجه.',category:'Case Study'}]}
 ],
 commerce:[
  {headline:'فروشگاه آماده نمایش محصول.',subhead:'ساختاری برای کاتالوگ، پیشنهاد ویژه، اعتمادسازی و خرید ساده.',pages:[{title:'راهنمای خرید',slug:'buying-guide',blocks:[{type:'rich_text',data:{heading:'خرید ساده و مطمئن',body:'روش سفارش، ارسال، پرداخت و پشتیبانی را اینجا توضیح دهید.'}}]},{title:'درباره فروشگاه',slug:'about',blocks:[{type:'rich_text',data:{heading:'داستان فروشگاه',body:'برند، کیفیت محصولات و دلیل اعتماد مشتری را معرفی کنید.'}}]}],projects:[]}
 ],
 hybrid:[
  {headline:'خدمات، پروژه و فروش؛ یکجا.',subhead:'شروع انعطاف‌پذیر برای کسب‌وکاری که چند مدل درآمدی دارد.',pages:[{title:'خدمات',slug:'services',blocks:[{type:'services',data:{heading:'خدمات اصلی',items:['خدمت اول','خدمت دوم','خدمت سوم']}}]},{title:'درباره ما',slug:'about',blocks:[{type:'rich_text',data:{heading:'درباره مجموعه',body:'داستان، تخصص و حوزه‌های فعالیت را معرفی کنید.'}}]}],projects:[{title:'نمونه پروژه منتخب',slug:'starter-featured-project',summary:'نمونه پروژه برای آشنایی با نحوه نمایش Case Study.',category:'Featured'}]}
 ],
 custom:[
  {headline:'از اینجا شروع کنید.',subhead:'یک ساختار تمیز و قابل تغییر برای ساخت تجربه اختصاصی.',pages:[{title:'درباره ما',slug:'about',blocks:[{type:'rich_text',data:{heading:'معرفی کسب‌وکار',body:'در این بخش معرفی کوتاه و ارزش پیشنهادی را قرار دهید.'}}]},{title:'تماس',slug:'contact',blocks:[{type:'contact',data:{heading:'در تماس باشید',body:'اطلاعات تماس و مسیر ارتباط را اضافه کنید.'}}]}],projects:[]}
 ]
}
function hashSeed(input:string){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
export function pickStarterPack(archetype:string,seed:string){const key=(archetype in packs?archetype:'custom')as StarterArchetype,list=packs[key],index=hashSeed(seed)%list.length;return{...list[index],archetype:key,index}}
export function starterMarker(seed:string,version='1.0.0'){return{enabled:true,seed,version,createdAt:new Date().toISOString()}}
