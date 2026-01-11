import { Suspense } from 'react';
import type { Metadata } from 'next';
import RegisterForm from './register-form';

export const metadata: Metadata = {
  title: 'Kayıt Ol',
  description: 'OzaMenu hesabı oluşturun ve işletmenizi dijitalleştirin.',
};

/**
 * Register Page - Kullanıcı Kayıt ve İşletme Oluşturma Sayfası
 *
 * Bu sayfa yeni kullanıcı kaydı ve işletme oluşturma işlemlerini yönetir.
 * - Kişisel bilgiler (ad, e-posta, şifre)
 * - İşletme bilgileri (ad, slug)
 * - E-posta doğrulama desteği
 * - Supabase Auth entegrasyonu
 */
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}

/**
 * Register form skeleton for loading state
 */
function RegisterFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Başlık */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center space-x-4">
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-28 mb-2" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div className="h-11 bg-gray-200 rounded w-full" />
      </div>
    </div>
  );
}
