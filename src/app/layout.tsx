import type { Metadata } from 'next'
import { Roboto_Mono, Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { MarketProvider } from '@/context/MarketContext'
import { ThemeProvider } from '@/context/ThemeContext'
import ThemeScript from '@/components/ThemeScript'
import Nav from '@/components/Nav'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TFC — Crypto Trading Simulator',
  description: 'Simulated crypto trading + risk monitoring dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className="min-h-screen bg-bg text-text"
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      >
        <ThemeProvider>
          <AuthProvider>
            <MarketProvider>
              <Nav />
              <main>{children}</main>
            </MarketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
