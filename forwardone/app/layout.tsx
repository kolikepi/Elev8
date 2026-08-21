import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { Providers } from '@/components/providers'

export const dynamic = 'force-dynamic'
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: { default: 'ForwardOne | Smart logistics. One platform. Global reach.', template: '%s | ForwardOne' },
  description: 'Request quotes, compare service options, book shipments and track every milestone — international courier and freight coordinated on one business logistics platform.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: { title: 'ForwardOne', description: 'Smart logistics. One platform. Global reach.', images: ['/og-image.png'], type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script></head>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <Providers>{children}</Providers>
          <Toaster richColors />
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
