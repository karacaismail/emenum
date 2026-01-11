/**
 * Upgrade Prompt Component
 *
 * Kullanicinin ozelligi kullanamadigi durumlarda gosterilen upgrade prompt.
 * Butonlari gizlemek yerine "Gri ve Kilitli" gösterir + Upsell modal acar.
 *
 * Bu component, feature permission sisteminin kullanici arayuzundeki karsiligi.
 * Kullanici bir ozelligi kullanamiyorsa, neden kullanamadigi (plan kisitlamasi)
 * ve nasil erisebilecegi (plan yukleme) bilgisini gosterir.
 *
 * @example
 * ```tsx
 * // Inline banner gorunumu
 * <UpgradePrompt
 *   featureKey="module_waiter_call"
 *   variant="banner"
 * />
 *
 * // Kilitli buton gorunumu (overlay)
 * <UpgradePrompt
 *   featureKey="module_happy_hour"
 *   variant="locked"
 * >
 *   <button className="btn-primary">Happy Hour Ekle</button>
 * </UpgradePrompt>
 *
 * // Kart gorunumu
 * <UpgradePrompt
 *   featureKey="has_images"
 *   variant="card"
 *   currentPlan="Lite"
 * />
 *
 * // Limit asimi icin
 * <UpgradePrompt
 *   featureKey="limit_menu_items"
 *   variant="banner"
 *   limitInfo={{ current: 20, limit: 20 }}
 * />
 * ```
 */

'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { useFeatureContext } from '@/contexts/FeatureContext';
import type { FeatureKey } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Display variants for the upgrade prompt
 */
export type UpgradePromptVariant = 'banner' | 'card' | 'locked' | 'inline' | 'minimal';

/**
 * Limit information for limit features
 */
export interface LimitInfo {
  current: number;
  limit: number;
}

/**
 * Props for the UpgradePrompt component
 */
export interface UpgradePromptProps {
  /** Feature key that is being restricted */
  featureKey: FeatureKey;
  /** Display variant */
  variant?: UpgradePromptVariant;
  /** Optional custom message (overrides default) */
  message?: string;
  /** Optional limit info for limit features */
  limitInfo?: LimitInfo;
  /** Current plan name (optional, fetched from context if not provided) */
  currentPlan?: string;
  /** Children to wrap with locked overlay (for 'locked' variant) */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the upgrade modal on click */
  showModal?: boolean;
  /** Callback when upgrade is clicked */
  onUpgradeClick?: () => void;
  /** Custom CTA text */
  ctaText?: string;
  /** Hide the dismiss button */
  hideDismiss?: boolean;
  /** Suggested plan to upgrade to */
  suggestedPlan?: 'Pro' | 'Premium';
}

/**
 * Props for the Upgrade Modal
 */
export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey: FeatureKey;
  currentPlan: string | null;
  suggestedPlan?: 'Pro' | 'Premium';
  limitInfo?: LimitInfo;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Feature labels in Turkish
 */
const FEATURE_LABELS: Record<string, string> = {
  // Limit features
  limit_categories: 'Kategori',
  limit_menu_items: 'Ürün',
  limit_price_changes: 'Aylık Fiyat Değişikliği',
  limit_tables: 'Masa',
  limit_languages: 'Ek Dil',
  limit_users: 'Kullanıcı',
  // Module features
  module_waiter_call: 'Garson Çağır',
  module_table_management: 'Masa Yönetimi',
  module_multilang: 'Çoklu Dil Desteği',
  module_priority_support: 'Öncelikli Destek',
  module_happy_hour: 'Happy Hour',
  module_cross_sell: 'Çapraz Satış Önerileri',
  module_nutrition_info: 'Besin Değeri Bilgisi',
  module_allergen_info: 'Alerjen Bilgisi',
  module_social_share: 'Sosyal Medya Paylaşımı',
  module_google_business: 'Google Business Entegrasyonu',
  module_whatsapp_support: 'WhatsApp Destek',
  module_whatsapp_revise: 'WhatsApp ile Fiyat Revizyon Talebi',
  // Design features
  module_images: 'Ürün Görselleri',
  module_logo: 'Logo',
  module_background_color: 'Özel Arkaplan Rengi',
  module_cover_image: 'Kapak Görseli',
  // Badge features
  module_chef_special: 'Şef\'in Önerisi Rozeti',
  module_daily_special: 'Günün Özel Menüsü Rozeti',
  // UI features
  module_custom_theme: 'Özel Tema',
  module_product_badges: 'Ürün Rozetleri',
  module_portion_sizes: 'Porsiyon Seçenekleri',
  // Advanced features
  module_analytics: 'Analitik Raporları',
  module_export: 'Veri Dışa Aktarma',
  module_api_access: 'API Erişimi',
  module_audit_log: 'Denetim Günlüğü',
};

/**
 * Feature descriptions in Turkish
 */
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  limit_categories: 'Menünüze daha fazla kategori ekleyin',
  limit_menu_items: 'Menünüze daha fazla ürün ekleyin',
  limit_price_changes: 'Ayda daha fazla fiyat değişikliği yapın',
  limit_tables: 'Daha fazla masa yönetin',
  module_waiter_call: 'Müşterileriniz tek tuşla garson çağırabilsin',
  module_happy_hour: 'Belirli saatlerde otomatik indirimli fiyatlar uygulayın',
  module_cross_sell: 'Ürünlerle birlikte öneriler gösterin',
  module_nutrition_info: 'Ürünlerin kalori ve besin değerlerini gösterin',
  module_social_share: 'Menünüzü sosyal medyada paylaşılabilir hale getirin',
  module_images: 'Ürünlerinize görseller ekleyerek daha çekici hale getirin',
  module_logo: 'Menünüze logonuzu ekleyin',
  module_chef_special: 'Özel ürünleri şef önerisi rozetiyle vurgulayın',
  module_daily_special: 'Günün menüsünü özel rozetle belirtin',
  module_analytics: 'Detaylı analitik raporlarla menü performansınızı takip edin',
};

/**
 * Plan features for upselling
 */
const PLAN_FEATURES: Record<string, string[]> = {
  Pro: [
    'Sınırsız ürün ve kategori',
    'Ürün görselleri',
    'Logo ve kapak görseli',
    'Garson çağır özelliği',
    'Şef önerisi ve günün menüsü rozetleri',
    'Özel arkaplan rengi',
  ],
  Premium: [
    'Pro paketindeki tüm özellikler',
    'Happy Hour (zamanlı fiyatlar)',
    'Çapraz satış önerileri',
    'Besin ve alerjen bilgisi',
    'Sosyal medya entegrasyonu',
    'Google Business entegrasyonu',
    'WhatsApp destek',
    'Öncelikli destek',
  ],
};

/**
 * Plan prices
 */
const PLAN_PRICES: Record<string, string> = {
  Pro: '₺299/ay',
  Premium: '₺599/ay',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get feature label in Turkish
 */
function getFeatureLabel(featureKey: FeatureKey): string {
  return FEATURE_LABELS[featureKey] || 'Bu özellik';
}

/**
 * Get feature description in Turkish
 */
function getFeatureDescription(featureKey: FeatureKey): string {
  return FEATURE_DESCRIPTIONS[featureKey] || 'Bu özelliği kullanmak için paketinizi yükseltin.';
}

/**
 * Suggest which plan to upgrade to based on feature
 */
function suggestPlanForFeature(featureKey: FeatureKey): 'Pro' | 'Premium' {
  const premiumFeatures = [
    'module_happy_hour',
    'module_cross_sell',
    'module_nutrition_info',
    'module_allergen_info',
    'module_social_share',
    'module_google_business',
    'module_whatsapp_support',
    'module_whatsapp_revise',
    'module_analytics',
    'module_export',
    'module_api_access',
    'module_audit_log',
  ];

  return premiumFeatures.includes(featureKey) ? 'Premium' : 'Pro';
}

// =============================================================================
// ICONS
// =============================================================================

/**
 * Lock icon SVG
 */
function LockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

/**
 * Sparkle/Star icon for premium features
 */
function SparkleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

/**
 * Close icon SVG
 */
function CloseIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Check icon SVG
 */
function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * Arrow right icon SVG
 */
function ArrowRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
  );
}

// =============================================================================
// UPGRADE MODAL COMPONENT
// =============================================================================

/**
 * Upgrade Modal
 *
 * Modal that shows plan comparison and upgrade options
 */
export function UpgradeModal({
  isOpen,
  onClose,
  featureKey,
  currentPlan,
  suggestedPlan,
  limitInfo,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const targetPlan = suggestedPlan || suggestPlanForFeature(featureKey);
  const featureLabel = getFeatureLabel(featureKey);
  const featureDesc = getFeatureDescription(featureKey);
  const planFeatures = PLAN_FEATURES[targetPlan] || [];
  const planPrice = PLAN_PRICES[targetPlan] || '';

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="upgrade-modal-title"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />

      {/* Modal panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
          {/* Close button */}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={onClose}
            aria-label="Kapat"
          >
            <CloseIcon className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <SparkleIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                {targetPlan} Paket
              </span>
            </div>
            <h3 id="upgrade-modal-title" className="text-2xl font-bold">
              {featureLabel} Özelliğini Açın
            </h3>
            <p className="mt-2 text-white/90">
              {featureDesc}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Current plan indicator */}
            {currentPlan && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm">
                <span className="text-gray-600">Mevcut Paket:</span>
                <span className="font-medium text-gray-900">{currentPlan}</span>
              </div>
            )}

            {/* Limit info if applicable */}
            {limitInfo && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm">
                <span className="text-amber-800">
                  <strong>{featureLabel}</strong> limitine ulaştınız
                </span>
                <span className="font-medium text-amber-900">
                  {limitInfo.current}/{limitInfo.limit}
                </span>
              </div>
            )}

            {/* Features list */}
            <h4 className="mb-3 font-semibold text-gray-900">
              {targetPlan} Paket Özellikleri:
            </h4>
            <ul className="mb-6 space-y-2">
              {planFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckIcon className="mt-0.5 flex-shrink-0 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* Price */}
            <div className="mb-6 text-center">
              <span className="text-3xl font-bold text-gray-900">{planPrice}</span>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-3">
              <a
                href="/pricing"
                className="btn-primary w-full py-3 text-center"
              >
                <span className="flex items-center justify-center gap-2">
                  {targetPlan} Pakete Geç
                  <ArrowRightIcon className="w-4 h-4" />
                </span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary w-full"
              >
                Daha Sonra
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Upgrade Prompt Component
 *
 * Kullanicinin ozelligi kullanamadigi durumlarda gosterilen prompt.
 * Butonlari gizlemek yerine "Gri ve Kilitli" gosterir + Upsell modal acar.
 */
export default function UpgradePrompt({
  featureKey,
  variant = 'banner',
  message,
  limitInfo,
  currentPlan: currentPlanProp,
  children,
  className = '',
  showModal = true,
  onUpgradeClick,
  ctaText,
  hideDismiss = false,
  suggestedPlan,
}: UpgradePromptProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Get plan from context if not provided
  const featureContext = useFeatureContext();
  const currentPlan = currentPlanProp || featureContext.plan?.name || null;

  const featureLabel = getFeatureLabel(featureKey);
  const targetPlan = suggestedPlan || suggestPlanForFeature(featureKey);
  const defaultCtaText = ctaText || `${targetPlan} Pakete Geç`;

  // Generate message
  const displayMessage = message || (
    limitInfo
      ? `${featureLabel} limitine ulaştınız (${limitInfo.current}/${limitInfo.limit}). Daha fazlası için paketinizi yükseltin.`
      : `${featureLabel} özelliği mevcut paketinizde bulunmuyor.`
  );

  /**
   * Handle upgrade click
   */
  const handleUpgradeClick = useCallback(() => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
    if (showModal) {
      setIsModalOpen(true);
    }
  }, [onUpgradeClick, showModal]);

  /**
   * Handle dismiss
   */
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Don't render if dismissed
  if (isDismissed) return null;

  // ==========================================================================
  // VARIANT RENDERERS
  // ==========================================================================

  /**
   * Banner variant - horizontal banner with message and CTA
   */
  if (variant === 'banner') {
    return (
      <>
        <div
          className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}
          role="alert"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <LockIcon className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-sm text-amber-800">{displayMessage}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpgradeClick}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
              >
                <SparkleIcon className="w-4 h-4" />
                {defaultCtaText}
              </button>
              {!hideDismiss && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg p-1 text-amber-600 hover:bg-amber-100"
                  aria-label="Kapat"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        <UpgradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          featureKey={featureKey}
          currentPlan={currentPlan}
          suggestedPlan={suggestedPlan}
          limitInfo={limitInfo}
        />
      </>
    );
  }

  /**
   * Card variant - full card with feature highlight
   */
  if (variant === 'card') {
    return (
      <>
        <div
          className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                <LockIcon className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{featureLabel}</h4>
                <p className="text-sm text-gray-500">
                  {currentPlan ? `${currentPlan} paketinde mevcut değil` : 'Paket yükseltmesi gerekli'}
                </p>
              </div>
            </div>
          </div>
          {/* Body */}
          <div className="px-6 py-4">
            <p className="mb-4 text-sm text-gray-600">
              {getFeatureDescription(featureKey)}
            </p>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="btn-primary w-full"
            >
              <SparkleIcon className="mr-2 w-4 h-4" />
              {defaultCtaText}
            </button>
          </div>
        </div>
        <UpgradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          featureKey={featureKey}
          currentPlan={currentPlan}
          suggestedPlan={suggestedPlan}
          limitInfo={limitInfo}
        />
      </>
    );
  }

  /**
   * Locked variant - wraps children with locked overlay
   * Shows children as grayed/disabled with a lock icon overlay
   */
  if (variant === 'locked') {
    return (
      <>
        <div className={`relative ${className}`}>
          {/* Children with grayscale filter */}
          <div className="pointer-events-none select-none opacity-50 grayscale">
            {children}
          </div>
          {/* Lock overlay */}
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg bg-gray-900/10 transition-colors hover:bg-gray-900/20"
            aria-label={`${featureLabel} - ${targetPlan} pakette mevcut`}
          >
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-lg">
              <LockIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {targetPlan}
              </span>
            </div>
          </button>
        </div>
        <UpgradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          featureKey={featureKey}
          currentPlan={currentPlan}
          suggestedPlan={suggestedPlan}
          limitInfo={limitInfo}
        />
      </>
    );
  }

  /**
   * Inline variant - minimal inline text with link
   */
  if (variant === 'inline') {
    return (
      <>
        <span className={`inline-flex items-center gap-1 text-sm text-gray-500 ${className}`}>
          <LockIcon className="w-3.5 h-3.5" />
          <span>{featureLabel}</span>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="ml-1 font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            ({targetPlan})
          </button>
        </span>
        <UpgradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          featureKey={featureKey}
          currentPlan={currentPlan}
          suggestedPlan={suggestedPlan}
          limitInfo={limitInfo}
        />
      </>
    );
  }

  /**
   * Minimal variant - just icon with tooltip-like label
   */
  if (variant === 'minimal') {
    return (
      <>
        <button
          type="button"
          onClick={handleUpgradeClick}
          className={`group relative inline-flex items-center justify-center rounded-full bg-gray-100 p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 ${className}`}
          title={`${featureLabel} - ${targetPlan} pakette mevcut`}
          aria-label={`${featureLabel} - Yükseltmek için tıklayın`}
        >
          <LockIcon className="w-4 h-4" />
          {/* Tooltip */}
          <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            {targetPlan} pakette mevcut
          </span>
        </button>
        <UpgradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          featureKey={featureKey}
          currentPlan={currentPlan}
          suggestedPlan={suggestedPlan}
          limitInfo={limitInfo}
        />
      </>
    );
  }

  // Default fallback to banner
  return (
    <>
      <div
        className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}
        role="alert"
      >
        <div className="flex items-center gap-3">
          <LockIcon className="w-5 h-5 text-amber-600" />
          <p className="flex-1 text-sm text-amber-800">{displayMessage}</p>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="btn-primary"
          >
            {defaultCtaText}
          </button>
        </div>
      </div>
      <UpgradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        featureKey={featureKey}
        currentPlan={currentPlan}
        suggestedPlan={suggestedPlan}
        limitInfo={limitInfo}
      />
    </>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Locked Button wrapper for quick use
 *
 * @example
 * ```tsx
 * <LockedButton featureKey="module_happy_hour">
 *   <button className="btn-primary">Happy Hour Ekle</button>
 * </LockedButton>
 * ```
 */
export function LockedButton({
  featureKey,
  children,
  className,
  suggestedPlan,
}: {
  featureKey: FeatureKey;
  children: ReactNode;
  className?: string;
  suggestedPlan?: 'Pro' | 'Premium';
}) {
  return (
    <UpgradePrompt
      featureKey={featureKey}
      variant="locked"
      className={className}
      suggestedPlan={suggestedPlan}
    >
      {children}
    </UpgradePrompt>
  );
}

/**
 * Limit Banner for quick limit warnings
 *
 * @example
 * ```tsx
 * <LimitBanner
 *   featureKey="limit_menu_items"
 *   current={20}
 *   limit={20}
 * />
 * ```
 */
export function LimitBanner({
  featureKey,
  current,
  limit,
  className,
}: {
  featureKey: FeatureKey;
  current: number;
  limit: number;
  className?: string;
}) {
  return (
    <UpgradePrompt
      featureKey={featureKey}
      variant="banner"
      limitInfo={{ current, limit }}
      className={className}
    />
  );
}
