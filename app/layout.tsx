import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import TopHeader from '@/components/TopHeader'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LeadDial — Real Estate Voice Agent',
  description: 'Manage real estate leads and trigger AI voice calls for Horizon Developers',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} h-full`}>
      <body className="min-h-full bg-[#f8f9ff] font-[var(--font-inter)] antialiased">
        {/* Fixed sidebar */}
        <Sidebar />
        {/* Fixed top header (offset by sidebar width) */}
        <TopHeader />
        {/* Main content area: offset from sidebar (ml-64) and header (mt-16) */}
        <main className="ml-64 mt-16 min-h-screen bg-[#f8f9ff]">
          {children}
        </main>
      </body>
    </html>
  )
}
