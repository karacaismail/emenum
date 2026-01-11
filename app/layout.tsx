import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Root Layout - OzaMenu SaaS Platform
 *
 * Ana layout dosyası. HTML yapısı, metadata ve global provider'ları içerir.
 * Türkçe dil desteği (lang="tr") varsayılan olarak ayarlanmıştır.
 */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://ozamenu.com'
  ),
  title: {
    default: 'OzaMenu - QR Menü & Dijital Fiyat Defteri',
    template: '%s | OzaMenu',
  },
  description:
    'Restoranlar, kafeler ve işletmeler için Ticaret Bakanlığı uyumlu dijital fiyat defteri ve QR menü platformu. Yasal, denetlenebilir ve değişmez fiyat kaydı.',
  keywords: [
    'QR menü',
    'dijital menü',
    'fiyat defteri',
    'restoran menü',
    'kafe menü',
    'Ticaret Bakanlığı',
    'dijital fiyat defteri',
    'menü yazılımı',
  ],
  authors: [{ name: 'OzaMenu' }],
  creator: 'OzaMenu',
  publisher: 'OzaMenu',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://ozamenu.com',
    siteName: 'OzaMenu',
    title: 'OzaMenu - QR Menü & Dijital Fiyat Defteri',
    description:
      'Restoranlar ve kafeler için Ticaret Bakanlığı uyumlu dijital fiyat defteri ve QR menü platformu.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OzaMenu - Dijital Fiyat Defteri',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OzaMenu - QR Menü & Dijital Fiyat Defteri',
    description:
      'Restoranlar ve kafeler için Ticaret Bakanlığı uyumlu dijital fiyat defteri ve QR menü platformu.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
};

/**
 * GlobalProviders - Uygulama genelinde kullanılacak provider'ları sarar.
 *
 * Gelecekte eklenecekler:
 * - SupabaseProvider (auth context)
 * - FeatureProvider (özellik kontrol context)
 * - ThemeProvider (tema yönetimi)
 * - ToastProvider (bildirimler)
 */
function GlobalProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased">
        <GlobalProviders>{children}</GlobalProviders>
      </body>
    </html>
  );
}
