import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'RAVA TEAM', template: '%s | RAVA TEAM' },
  description: 'RAVA TEAM — Creative studio for strategy, branding and content production.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'RAVA TEAM',
    description: 'Creative studio for strategy, branding and content production.',
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
