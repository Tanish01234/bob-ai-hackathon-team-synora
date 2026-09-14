import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'BOB — Supply Chain Intelligence | by Team Synora',
  description: 'Enterprise Maritime Supply Chain Intelligence Platform. Real-time fleet tracking, disruption mitigation, and cold-chain integrity monitoring by Team Synora.',
  applicationName: 'BOB Supply Chain Intelligence',
  icons: { icon: '/bob-icon.svg' },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0A0F1E',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
