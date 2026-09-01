import {notFound} from 'next/navigation'
import RavaLivingSystemPage from '@/app/components/RavaLivingSystemPage'

export const dynamic='force-dynamic'

export default function LivingSystemDesignPreview(){
  if(process.env.RAVA_DESIGN_PREVIEW!=='1')notFound()
  const payload={site:{id:'design-preview',name:'RAVA TEAM',locale:'fa',theme:{},templateKey:'rava-service-living-system',templateVersion:1},page:{id:'home',title:'خانه',slug:'home',seo:{},published_at:null},blocks:[{id:'hero',type:'hero',position:0,data:{title:'سایت حرفه‌ای؛ با یک سیستم واقعی پشت آن',text:'راوا یک سیستم کامل برای ساخت، مدیریت و رشد سایت‌های حرفه‌ای است؛ سریع، منظم و قابل اعتماد.'}}]}
  return <RavaLivingSystemPage payload={payload} navigation={[]} showMenuPreview/>
}
