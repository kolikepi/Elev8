import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ScrollToTop } from '@/components/scroll-to-top';
import { CookieConsent } from '@/components/cookie-consent';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  
  return {
    metadataBase: new URL(baseUrl),
    title: 'ELEV8 | Performance Activewear',
    description: 'Performance-built activewear for those who move with purpose. Premium athletic wear designed to elevate your game.',
    keywords: ['activewear', 'sportswear', 'athletic', 'performance', 'gym', 'fitness', 'workout'],
    openGraph: {
      title: 'ELEV8 | Elevate Your Game',
      description: 'Performance-built activewear for those who move with purpose.',
      images: ['/og-image.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ELEV8 | Performance Activewear',
      description: 'Performance-built activewear for those who move with purpose.',
      images: ['/og-image.png'],
    },
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className}`}>
      <body className="bg-black text-white min-h-screen">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <ScrollToTop />
          <CookieConsent />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
