import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn'
import '@fontsource-variable/estedad'
import '@fontsource-variable/manrope'
import '@fontsource-variable/inter'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'RAVA TEAM', template: '%s | RAVA TEAM' },
  description: 'RAVA TEAM — طراحی، محتوا و تکنولوژی برای ساخت وب‌سایت و زیرساخت رشد دیجیتال کسب‌وکارها.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  other: {
    enamad: '۴۰۹۷۸۳۱۶',
  },
  openGraph: {
    title: 'RAVA TEAM',
    description: 'Design, content and technology for professional websites and scalable digital growth.',
    type: 'website',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
