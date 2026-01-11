import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'OzaMenu hesabınıza giriş yapın.',
};

/**
 * Login Page - Kullanıcı Giriş Sayfası
 *
 * Bu sayfa email/password ile giriş işlemlerini yönetir.
 * - Email ve şifre form alanları
 * - Supabase Auth entegrasyonu
 * - Error handling ve kullanıcı bildirimleri
 * - redirectTo parametresi desteği (middleware'den gelen)
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

/**
 * Login form skeleton for loading state
 */
function LoginFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Başlık */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-28" />
        </div>
        <div className="h-11 bg-gray-200 rounded w-full" />
      </div>
    </div>
  );
}
