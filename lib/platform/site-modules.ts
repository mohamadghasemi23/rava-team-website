export type SiteArchetype='portfolio'|'services'|'commerce'|'hybrid'|'custom'
export type SiteModuleKey='portfolio'|'services'|'blog'|'catalog'|'cart'|'checkout'|'orders'|'payments'|'booking'
export type ModuleDefinition={key:SiteModuleKey;titleFa:string;titleEn:string;descriptionFa:string;descriptionEn:string;dependsOn:SiteModuleKey[];sensitive?:boolean}

export const SITE_MODULES:Record<SiteModuleKey,ModuleDefinition>={
 portfolio:{key:'portfolio',titleFa:'نمونه‌کار',titleEn:'Portfolio',descriptionFa:'پروژه‌ها، Case Study، تصویر و ویدیو.',descriptionEn:'Projects, case studies, images and video.',dependsOn:[]},
 services:{key:'services',titleFa:'خدمات',titleEn:'Services',descriptionFa:'معرفی و مدیریت خدمات قابل ارائه.',descriptionEn:'Service presentation and management.',dependsOn:[]},
 blog:{key:'blog',titleFa:'مجله / بلاگ',titleEn:'Blog',descriptionFa:'محتوای مقاله‌ای و آموزشی.',descriptionEn:'Editorial and educational content.',dependsOn:[]},
 catalog:{key:'catalog',titleFa:'کاتالوگ محصول',titleEn:'Product Catalog',descriptionFa:'محصول، دسته‌بندی، قیمت و موجودی.',descriptionEn:'Products, categories, pricing and inventory.',dependsOn:[]},
 cart:{key:'cart',titleFa:'سبد خرید',titleEn:'Cart',descriptionFa:'سبد خرید مشتری.',descriptionEn:'Customer shopping cart.',dependsOn:['catalog']},
 checkout:{key:'checkout',titleFa:'تسویه حساب',titleEn:'Checkout',descriptionFa:'آدرس، ارسال، تخفیف و نهایی‌سازی سفارش.',descriptionEn:'Address, shipping, discounts and order confirmation.',dependsOn:['catalog','cart','orders']},
 orders:{key:'orders',titleFa:'سفارش‌ها',titleEn:'Orders',descriptionFa:'چرخه عمر سفارش و وضعیت‌ها.',descriptionEn:'Order lifecycle and statuses.',dependsOn:['catalog']},
 payments:{key:'payments',titleFa:'پرداخت',titleEn:'Payments',descriptionFa:'اتصال امن به درگاه‌های پرداخت.',descriptionEn:'Secure payment-provider integration.',dependsOn:['checkout','orders'],sensitive:true},
 booking:{key:'booking',titleFa:'رزرو / نوبت',titleEn:'Booking',descriptionFa:'رزرو زمان برای کسب‌وکارهای خدماتی.',descriptionEn:'Appointment and time-slot booking for service businesses.',dependsOn:['services']},
}

export const ARCHETYPE_PRESETS:Record<SiteArchetype,SiteModuleKey[]>={
 portfolio:['portfolio','services'],
 services:['services','portfolio','booking'],
 commerce:['catalog','cart','orders','checkout','payments'],
 hybrid:['portfolio','services','catalog','cart','orders','checkout','payments'],
 custom:[],
}

export function resolveDependencies(input:SiteModuleKey[]){const out=new Set<SiteModuleKey>();const add=(key:SiteModuleKey)=>{if(out.has(key))return;SITE_MODULES[key].dependsOn.forEach(add);out.add(key)};input.forEach(add);return[...out]}
