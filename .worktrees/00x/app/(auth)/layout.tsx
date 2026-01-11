/**
 * Auth Layout - Giriş ve Kayıt Sayfaları İçin Layout
 *
 * Bu layout auth sayfalarını sarar (login, register).
 * - Merkezi hizalanmış form alanı
 * - Logo ve branding
 * - Arka plan gradyan
 * - Mobil uyumlu tasarım
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'OzaMenu hesabınıza giriş yapın.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Logo ve Başlık */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <div className="flex items-center space-x-2">
            {/* Logo SVG */}
            <svg
              className="h-12 w-12 text-primary-600"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect x="7" y="7" width="4" height="4" fill="currentColor" />
              <rect x="13" y="7" width="4" height="4" fill="currentColor" />
              <rect x="7" y="13" width="4" height="4" fill="currentColor" />
              <rect x="13" y="13" width="4" height="4" fill="currentColor" />
            </svg>
            <span className="text-2xl font-bold text-gray-900">OzaMenu</span>
          </div>
        </Link>
        <p className="mt-3 text-center text-sm text-gray-600">
          QR Menü & Dijital Fiyat Defteri
        </p>
      </div>

      {/* Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card py-8 px-4 sm:px-10">{children}</div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} OzaMenu. Tum hakları saklıdır.
        </p>
        <div className="mt-2 flex justify-center space-x-4 text-xs text-gray-500">
          <Link href="/privacy" className="hover:text-gray-700">
            Gizlilik Politikası
          </Link>
          <span>&middot;</span>
          <Link href="/terms" className="hover:text-gray-700">
            Kullanım Koşulları
          </Link>
        </div>
      </div>
    </div>
  );
}
