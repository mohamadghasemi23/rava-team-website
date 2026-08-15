export const THEME_LIBRARY={
 'rava-creative-noir':{family:'Creative Portfolio',audienceFa:'استودیو، فشن، موزیک و پورتفولیوهای تصویرمحور',toneFa:'دارک، سینمایی، جسور',premium:false,feature:null,previewClass:'theme-card-noir'},
 'rava-service-calm':{family:'Service / Agency',audienceFa:'خدمات، معماری، مشاوره و آژانس',toneFa:'روشن، آرام، مینیمال',premium:false,feature:null,previewClass:'theme-card-calm'},
 'rava-corporate-axis':{family:'Corporate',audienceFa:'شرکت‌ها، B2B و کسب‌وکارهای رسمی',toneFa:'ساختاریافته، حرفه‌ای، قابل اعتماد',premium:false,feature:null,previewClass:'theme-card-axis'},
 'rava-commerce-flow':{family:'Commerce',audienceFa:'فروشگاه، Brand Store و Commerce',toneFa:'محصول‌محور، سریع، Conversion-focused',premium:true,feature:'theme.commerce',previewClass:'theme-card-commerce'}
}as const
export function themeLibraryMeta(key:string){return THEME_LIBRARY[key as keyof typeof THEME_LIBRARY]||{family:'RAVA Theme',audienceFa:'قالب عمومی',toneFa:'قابل شخصی‌سازی',premium:false,feature:null,previewClass:'theme-card-generic'}}
