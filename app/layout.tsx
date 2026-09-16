import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn'
import './globals.css'
import AnalyticsTracker from './components/AnalyticsTracker'
import { createClient } from '@/lib/supabase/server'

const fallback = {
  title: 'RAVA TEAM — طراحی و توسعه وب و محصولات دیجیتال',
  description: 'راوا یک تیم مستقل برای طراحی و توسعه وب، فروشگاه اینترنتی، محصولات دیجیتال، برندینگ، محتوا و راهکارهای هوش مصنوعی است.',
  og_image_url: '',
  twitter_handle: '',
  search_console_verification: '',
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let seo = fallback

  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'seo').maybeSingle()
    if (data?.value && typeof data.value === 'object') seo = { ...fallback, ...data.value } as typeof fallback
  } catch {
    seo = fallback
  }

  return {
    metadataBase: new URL(baseUrl),
    title: { default: seo.title, template: `%s | RAVA TEAM` },
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: 'website',
      siteName: 'RAVA TEAM',
      locale: 'fa_IR',
      images: seo.og_image_url ? [{ url: seo.og_image_url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      creator: seo.twitter_handle || undefined,
      images: seo.og_image_url ? [seo.og_image_url] : undefined,
    },
    verification: seo.search_console_verification ? { google: seo.search_console_verification } : undefined,
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  )
}
