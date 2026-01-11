'use client';

/**
 * Register Form Component
 *
 * Client component that handles the registration form logic.
 * Separated from page.tsx to properly handle useSearchParams with Suspense.
 *
 * Features:
 * - Multi-step form (Personal info -> Organization info)
 * - Email/password registration with Supabase Auth
 * - Organization creation flow
 * - Slug auto-generation from organization name
 * - Email verification support
 * - Turkish error messages
 * - Form validation
 */

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * Steps in the registration flow
 */
type Step = 'personal' | 'organization' | 'verification';

/**
 * Error mesajlarını Türkçeleştirir
 */
function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'User already registered':
      'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.',
    'Password should be at least 6 characters':
      'Şifre en az 6 karakter olmalıdır.',
    'Unable to validate email address':
      'Geçersiz e-posta adresi. Lütfen kontrol edin.',
    'Email rate limit exceeded':
      'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.',
    'Network error':
      'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
    'Signup requires a valid password':
      'Geçerli bir şifre giriniz.',
    duplicate: 'Bu işletme adı veya URL zaten kullanımda.',
    'unique constraint': 'Bu işletme adı veya URL zaten kullanımda.',
  };

  // Exact match önce kontrol et
  if (errorMessages[error]) {
    return errorMessages[error];
  }

  // Partial match kontrol et
  for (const [key, value] of Object.entries(errorMessages)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

/**
 * Slugify - İşletme adından URL-uyumlu slug oluşturur
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Turkish characters
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    // Remove special characters
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace spaces with dashes
    .replace(/\s+/g, '-')
    // Remove multiple dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, '');
}

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Current step
  const [step, setStep] = useState<Step>('personal');

  // Personal info state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Organization info state
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [isSlugEdited, setIsSlugEdited] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // redirectTo parametresini al
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  /**
   * Auto-generate slug when organization name changes
   */
  const handleOrganizationNameChange = useCallback(
    (value: string) => {
      setOrganizationName(value);
      if (!isSlugEdited) {
        setOrganizationSlug(slugify(value));
      }
    },
    [isSlugEdited]
  );

  /**
   * Handle manual slug edit
   */
  const handleSlugChange = useCallback((value: string) => {
    setIsSlugEdited(true);
    setOrganizationSlug(slugify(value));
  }, []);

  /**
   * Validate personal info step
   */
  function validatePersonalInfo(): boolean {
    if (!fullName.trim()) {
      setError('Ad Soyad gereklidir.');
      return false;
    }

    if (!email.trim()) {
      setError('E-posta adresi gereklidir.');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Geçerli bir e-posta adresi giriniz.');
      return false;
    }

    if (!password) {
      setError('Şifre gereklidir.');
      return false;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return false;
    }

    return true;
  }

  /**
   * Validate organization info step
   */
  function validateOrganizationInfo(): boolean {
    if (!organizationName.trim()) {
      setError('İşletme adı gereklidir.');
      return false;
    }

    if (organizationName.trim().length < 2) {
      setError('İşletme adı en az 2 karakter olmalıdır.');
      return false;
    }

    if (!organizationSlug.trim()) {
      setError('Menü URL adresi gereklidir.');
      return false;
    }

    if (organizationSlug.length < 3) {
      setError('Menü URL adresi en az 3 karakter olmalıdır.');
      return false;
    }

    // Slug validation - only lowercase letters, numbers, dashes
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(organizationSlug)) {
      setError(
        'Menü URL adresi sadece küçük harf, rakam ve tire içerebilir.'
      );
      return false;
    }

    if (!acceptTerms) {
      setError('Kullanım koşullarını kabul etmelisiniz.');
      return false;
    }

    return true;
  }

  /**
   * Handle personal info step submit
   */
  function handlePersonalInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (validatePersonalInfo()) {
      setStep('organization');
    }
  }

  /**
   * Handle back to personal info
   */
  function handleBackToPersonal() {
    setError(null);
    setStep('personal');
  }

  /**
   * Handle final registration submit
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateOrganizationInfo()) {
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // 1. Create user account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (authError) {
        setError(getErrorMessage(authError.message));
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Hesap oluşturulamadı. Lütfen tekrar deneyin.');
        setIsLoading(false);
        return;
      }

      // 2. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName.trim(),
          slug: organizationSlug.trim(),
          email: email.trim(),
          status: 'pending', // Will be activated by admin after payment
        })
        .select('id')
        .single();

      if (orgError) {
        // If organization creation fails, the user is still created
        // They can try to create organization later
        setError(getErrorMessage(orgError.message));
        setIsLoading(false);
        return;
      }

      // 3. Create organization membership (owner role)
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          role: 'owner',
          is_active: true,
        });

      if (memberError) {
        // Membership creation failed - clean up if possible
        setError(getErrorMessage(memberError.message));
        setIsLoading(false);
        return;
      }

      // 4. Check if email confirmation is required
      // If user is not confirmed, show verification step
      if (authData.user.identities && authData.user.identities.length === 0) {
        // Email confirmation required but user already exists
        setError('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.');
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is needed
      const needsEmailConfirmation =
        authData.user && !authData.session;

      if (needsEmailConfirmation) {
        // Show verification step
        setStep('verification');
        setIsLoading(false);
      } else {
        // Email confirmation not required, redirect to dashboard
        startTransition(() => {
          router.push(redirectTo);
          router.refresh();
        });
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      setIsLoading(false);
    }
  }

  // Render verification step
  if (step === 'verification') {
    return (
      <div className="space-y-6">
        {/* Başlık */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            E-posta adresinizi doğrulayın
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium">{email}</span> adresine bir doğrulama
            bağlantısı gönderdik.
          </p>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <div className="flex">
            <div className="shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Sonraki adımlar
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-1">
                  <li>E-posta gelen kutunuzu kontrol edin</li>
                  <li>Doğrulama bağlantısına tıklayın</li>
                  <li>Hesabınıza giriş yapın</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/login" className="btn-primary w-full py-2.5 text-center block">
            Giriş Sayfasına Git
          </Link>
          <p className="text-center text-sm text-gray-500">
            E-posta gelmedi mi?{' '}
            <button
              type="button"
              onClick={() => {
                // TODO: Implement resend functionality
                setError('Yeniden gönderme özelliği yakında aktif olacak.');
              }}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Tekrar gönder
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Hesap oluşturun
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">
          Zaten hesabınız var mı?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Giriş yapın
          </Link>
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {/* Step 1 */}
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === 'personal'
                  ? 'bg-primary-600 text-white'
                  : 'bg-green-500 text-white'
              }`}
            >
              {step === 'personal' ? '1' : '✓'}
            </div>
            <span className="ml-2 text-sm text-gray-600">Kişisel Bilgiler</span>
          </div>

          {/* Connector */}
          <div
            className={`h-0.5 w-12 ${
              step === 'organization' ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          />

          {/* Step 2 */}
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === 'organization'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              2
            </div>
            <span className="ml-2 text-sm text-gray-600">İşletme Bilgileri</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => setError(null)}
                className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                <span className="sr-only">Kapat</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personal Info Step */}
      {step === 'personal' && (
        <form onSubmit={handlePersonalInfoSubmit} className="space-y-5">
          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="label">
              Ad Soyad
            </label>
            <div className="mt-1">
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="input"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="label">
              E-posta adresi
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@isletme.com"
                className="input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="label">
              Şifre
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
                <span className="sr-only">
                  {showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                </span>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              En az 6 karakter olmalıdır
            </p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="label">
              Şifre Tekrar
            </label>
            <div className="mt-1 relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi tekrar girin"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
              >
                {showConfirmPassword ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
                <span className="sr-only">
                  {showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                </span>
              </button>
            </div>
          </div>

          {/* Next Button */}
          <div>
            <button type="submit" className="btn-primary w-full py-2.5">
              Devam Et
            </button>
          </div>
        </form>
      )}

      {/* Organization Info Step */}
      {step === 'organization' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Organization Name Field */}
          <div>
            <label htmlFor="organizationName" className="label">
              İşletme Adı
            </label>
            <div className="mt-1">
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                value={organizationName}
                onChange={(e) => handleOrganizationNameChange(e.target.value)}
                disabled={isLoading || isPending}
                placeholder="Örnek: Lezzet Cafe"
                className="input"
              />
            </div>
          </div>

          {/* Organization Slug Field */}
          <div>
            <label htmlFor="organizationSlug" className="label">
              Menü URL Adresi
            </label>
            <div className="mt-1">
              <div className="flex rounded-lg shadow-sm">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  ozamenu.com/menu/
                </span>
                <input
                  id="organizationSlug"
                  name="organizationSlug"
                  type="text"
                  required
                  value={organizationSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  disabled={isLoading || isPending}
                  placeholder="lezzet-cafe"
                  className="block w-full min-w-0 flex-1 rounded-none rounded-r-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Müşterileriniz bu adres üzerinden menünüze ulaşacak
            </p>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={isLoading || isPending}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-gray-700">
                <Link
                  href="/terms"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  target="_blank"
                >
                  Kullanım Koşulları
                </Link>
                &apos;nı ve{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  target="_blank"
                >
                  Gizlilik Politikası
                </Link>
                &apos;nı okudum ve kabul ediyorum.
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleBackToPersonal}
              disabled={isLoading || isPending}
              className="btn-secondary flex-1 py-2.5"
            >
              Geri
            </button>
            <button
              type="submit"
              disabled={isLoading || isPending}
              className="btn-primary flex-1 py-2.5"
            >
              {isLoading || isPending ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Kaydediliyor...
                </span>
              ) : (
                'Hesap Oluştur'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Login Link (Mobile-friendly) */}
      <p className="mt-6 text-center text-sm text-gray-500 sm:hidden">
        Zaten hesabınız var mı?{' '}
        <Link
          href="/login"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
