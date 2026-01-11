/**
 * Price Change Form Component
 *
 * Fiyat değişikliği için kullanılan form componenti.
 * INSERT-only Price Ledger pattern'ını takip eder - fiyatlar ASLA UPDATE edilmez.
 *
 * Özellikler:
 * - Değişiklik nedeni alanı (zorunlu)
 * - Onay modalı (eski vs yeni fiyat karşılaştırması)
 * - Lite paket limiti kontrolü (ayda 2 fiyat değişikliği)
 * - Para birimi seçimi
 *
 * @example
 * ```tsx
 * <PriceChangeForm
 *   productId="product-uuid"
 *   productName="Filtre Kahve"
 *   currentPrice={45.00}
 *   currentCurrency="TRY"
 *   organizationId="org-uuid"
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import UpgradePrompt, { LimitBanner } from '@/components/ui/UpgradePrompt';
import type { CurrencyCode, UUID } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

export interface PriceChangeFormProps {
  /** Product UUID */
  productId: UUID;
  /** Product name for display */
  productName: string;
  /** Current price (null if no price set) */
  currentPrice: number | null;
  /** Current currency */
  currentCurrency: CurrencyCode;
  /** Organization UUID for limit check */
  organizationId: UUID;
  /** Callback on successful price change */
  onSuccess?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Whether the form is in a modal context */
  isModal?: boolean;
  /** Limit check result from server */
  limitCheck?: {
    allowed: boolean;
    limit: number;
    currentCount: number;
    remaining: number;
    shouldUpgrade: boolean;
  };
  /** Additional class name */
  className?: string;
}

interface FormData {
  newPrice: string;
  changeReason: string;
  currency: CurrencyCode;
}

interface FormErrors {
  newPrice?: string;
  changeReason?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  ArrowRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  ),
  ArrowUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  ArrowDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Tag: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
};

// =============================================================================
// CURRENCY DISPLAY HELPERS
// =============================================================================

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
};

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  TRY: 'TRY (Türk Lirası)',
  USD: 'USD (Amerikan Doları)',
  EUR: 'EUR (Euro)',
};

/**
 * Format price with currency symbol
 */
function formatPrice(price: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '₺';
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Calculate price change percentage
 */
function calculatePriceChangePercent(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 100;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

// =============================================================================
// COMMON CHANGE REASONS
// =============================================================================

const COMMON_CHANGE_REASONS = [
  'Malzeme maliyeti artışı',
  'Malzeme maliyeti düşüşü',
  'Sezonsal fiyat ayarlaması',
  'Promosyon/kampanya fiyatı',
  'Rakip fiyatlarına uyum',
  'Maliyet optimizasyonu',
  'Enflasyon düzeltmesi',
  'Porsiyon değişikliği',
];

// =============================================================================
// PRICE COMPARISON COMPONENT
// =============================================================================

interface PriceComparisonProps {
  oldPrice: number | null;
  newPrice: number;
  currency: CurrencyCode;
}

function PriceComparison({ oldPrice, newPrice, currency }: PriceComparisonProps) {
  const hasOldPrice = oldPrice !== null && oldPrice > 0;
  const priceDiff = hasOldPrice ? newPrice - oldPrice : newPrice;
  const priceChangePercent = hasOldPrice ? calculatePriceChangePercent(oldPrice, newPrice) : 0;
  const isIncrease = priceDiff > 0;
  const isDecrease = priceDiff < 0;

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <div className="flex items-center justify-center gap-4">
        {/* Old Price */}
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Mevcut Fiyat</p>
          <p className="text-2xl font-bold text-gray-400 line-through">
            {hasOldPrice ? formatPrice(oldPrice, currency) : '-'}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center">
          <div
            className={`
              flex h-10 w-10 items-center justify-center rounded-full
              ${isIncrease ? 'bg-red-100 text-red-600' : isDecrease ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}
            `}
          >
            <Icons.ArrowRight />
          </div>
          {hasOldPrice && priceDiff !== 0 && (
            <p
              className={`
                mt-1 text-xs font-medium
                ${isIncrease ? 'text-red-600' : 'text-green-600'}
              `}
            >
              {isIncrease ? '+' : ''}{priceChangePercent.toFixed(1)}%
            </p>
          )}
        </div>

        {/* New Price */}
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Yeni Fiyat</p>
          <p
            className={`
              text-2xl font-bold
              ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-900'}
            `}
          >
            {formatPrice(newPrice, currency)}
          </p>
        </div>
      </div>

      {/* Price difference summary */}
      {hasOldPrice && priceDiff !== 0 && (
        <div
          className={`
            mt-4 flex items-center justify-center gap-2 rounded-lg py-2 px-4
            ${isIncrease ? 'bg-red-50' : 'bg-green-50'}
          `}
        >
          {isIncrease ? (
            <Icons.ArrowUp />
          ) : (
            <Icons.ArrowDown />
          )}
          <span
            className={`text-sm font-medium ${isIncrease ? 'text-red-700' : 'text-green-700'}`}
          >
            {isIncrease ? 'Fiyat artışı' : 'Fiyat indirimi'}:{' '}
            {formatPrice(Math.abs(priceDiff), currency)}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CONFIRMATION MODAL COMPONENT
// =============================================================================

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  oldPrice: number | null;
  newPrice: number;
  currency: CurrencyCode;
  changeReason: string;
  isLoading: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  oldPrice,
  newPrice,
  currency,
  changeReason,
  isLoading,
}: ConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fiyat Değişikliğini Onayla"
      description="Bu işlem geri alınamaz. Fiyat geçmişi kayıt altına alınacaktır."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Icons.Spinner />
                Kaydediliyor...
              </>
            ) : (
              'Fiyatı Değiştir'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Product name */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <Icons.Tag />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ürün</p>
            <p className="font-semibold text-gray-900">{productName}</p>
          </div>
        </div>

        {/* Price comparison */}
        <PriceComparison
          oldPrice={oldPrice}
          newPrice={newPrice}
          currency={currency}
        />

        {/* Change reason */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">
            Değişiklik Nedeni
          </p>
          <p className="text-sm text-blue-900">{changeReason}</p>
        </div>

        {/* Warning notice */}
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3">
          <Icons.Warning />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Bu işlem geri alınamaz
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Fiyat değişikliği kayıt defterine (Price Ledger) eklenir.
              Tüm fiyat geçmişi yasal uyumluluk için saklanır.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PriceChangeForm({
  productId,
  productName,
  currentPrice,
  currentCurrency,
  organizationId,
  onSuccess,
  onCancel,
  isModal = false,
  limitCheck,
  className = '',
}: PriceChangeFormProps) {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    newPrice: currentPrice?.toString() || '',
    changeReason: '',
    currency: currentCurrency || 'TRY',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // UI state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limit state (fetched from client if not provided)
  const [clientLimitCheck, setClientLimitCheck] = useState<typeof limitCheck | null>(null);
  const [loadingLimit, setLoadingLimit] = useState(false);

  // Use provided limit check or fetch from client
  const effectiveLimitCheck = limitCheck || clientLimitCheck;

  // Fetch limit check on client side if not provided by server
  useEffect(() => {
    if (limitCheck || clientLimitCheck) return;

    const fetchLimitCheck = async () => {
      setLoadingLimit(true);
      try {
        const supabase = createClient();

        // Get products for this organization to count price changes
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('organization_id', organizationId);

        if (!products || products.length === 0) {
          setClientLimitCheck({
            allowed: true,
            limit: -1,
            currentCount: 0,
            remaining: -1,
            shouldUpgrade: false,
          });
          return;
        }

        // Get start of current month
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const startOfMonthISO = startOfMonth.toISOString();

        // Count price changes this month for this organization's products
        const productIds = products.map(p => p.id);
        const { count } = await supabase
          .from('price_ledger')
          .select('*', { count: 'exact', head: true })
          .in('product_id', productIds)
          .gte('created_at', startOfMonthISO);

        const currentCount = count || 0;

        // Note: We can't get the actual limit from client side without calling an API
        // For now, assume Lite plan (2 changes) as the most restrictive
        // The actual limit check should be provided by the server
        setClientLimitCheck({
          allowed: currentCount < 2, // Lite plan limit
          limit: 2, // Assuming Lite plan
          currentCount,
          remaining: Math.max(0, 2 - currentCount),
          shouldUpgrade: currentCount >= 1, // Warn at 50% usage
        });
      } catch {
        // On error, allow the change (server will do final validation)
        setClientLimitCheck({
          allowed: true,
          limit: -1,
          currentCount: 0,
          remaining: -1,
          shouldUpgrade: false,
        });
      } finally {
        setLoadingLimit(false);
      }
    };

    fetchLimitCheck();
  }, [organizationId, limitCheck, clientLimitCheck]);

  /**
   * Handle input changes
   */
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Reset saved state
    setSaved(false);
    setError(null);
  }, [errors]);

  /**
   * Handle quick reason selection
   */
  const handleQuickReasonSelect = useCallback((reason: string) => {
    setFormData(prev => ({ ...prev, changeReason: reason }));
    if (errors.changeReason) {
      setErrors(prev => ({ ...prev, changeReason: undefined }));
    }
  }, [errors.changeReason]);

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Price validation
    if (!formData.newPrice.trim()) {
      newErrors.newPrice = 'Yeni fiyat zorunludur';
    } else {
      const price = parseFloat(formData.newPrice);
      if (isNaN(price)) {
        newErrors.newPrice = 'Geçerli bir fiyat girin';
      } else if (price < 0) {
        newErrors.newPrice = 'Fiyat negatif olamaz';
      } else if (price === currentPrice) {
        newErrors.newPrice = 'Yeni fiyat mevcut fiyattan farklı olmalıdır';
      }
    }

    // Change reason validation (REQUIRED)
    if (!formData.changeReason.trim()) {
      newErrors.changeReason = 'Değişiklik nedeni zorunludur';
    } else if (formData.changeReason.trim().length < 3) {
      newErrors.changeReason = 'Değişiklik nedeni en az 3 karakter olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, currentPrice]);

  /**
   * Handle form submission (shows confirmation modal)
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check limit
    if (effectiveLimitCheck && !effectiveLimitCheck.allowed) {
      setError('Bu ay için fiyat değişikliği limitinize ulaştınız. Paketinizi yükseltin.');
      return;
    }

    // Show confirmation modal
    setIsConfirmModalOpen(true);
  }, [validateForm, effectiveLimitCheck]);

  /**
   * Confirm and save price change
   */
  const handleConfirm = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const newPrice = parseFloat(formData.newPrice);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      // Close current price by calling the RPC function
      // This uses SECURITY DEFINER to bypass immutability trigger
      if (currentPrice !== null) {
        const { error: closeError } = await supabase.rpc('close_current_price', {
          p_product_id: productId,
          p_close_at: new Date().toISOString(),
        });

        if (closeError) {
          // Non-fatal: log but continue
          console.warn('Could not close previous price:', closeError.message);
        }
      }

      // Insert new price into price_ledger (INSERT-only pattern)
      const { error: insertError } = await supabase
        .from('price_ledger')
        .insert({
          product_id: productId,
          price: newPrice,
          currency: formData.currency,
          change_reason: formData.changeReason.trim(),
          created_by: user.id,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Success!
      setSaved(true);
      setIsConfirmModalOpen(false);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Fiyat değiştirilirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setSaving(false);
    }
  }, [formData, productId, currentPrice, onSuccess]);

  // Check if form can be submitted
  const canSubmit = effectiveLimitCheck?.allowed !== false && !saving && !saved;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Limit warning banner */}
      {effectiveLimitCheck && effectiveLimitCheck.limit > 0 && effectiveLimitCheck.shouldUpgrade && (
        <LimitBanner
          featureKey="limit_price_changes"
          current={effectiveLimitCheck.currentCount}
          limit={effectiveLimitCheck.limit}
        />
      )}

      {/* Limit exceeded - show upgrade prompt */}
      {effectiveLimitCheck && !effectiveLimitCheck.allowed && (
        <UpgradePrompt
          featureKey="limit_price_changes"
          variant="card"
          limitInfo={{
            current: effectiveLimitCheck.currentCount,
            limit: effectiveLimitCheck.limit,
          }}
        />
      )}

      {/* Loading state for limit check */}
      {loadingLimit && (
        <div className="flex items-center justify-center py-4">
          <Icons.Spinner />
          <span className="ml-2 text-sm text-gray-500">Limit kontrol ediliyor...</span>
        </div>
      )}

      {/* Success message */}
      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0 text-green-600">
            <Icons.Check />
          </div>
          <p className="text-sm text-green-700">Fiyat başarıyla değiştirildi.</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0 text-red-600">
            <Icons.Warning />
          </div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current price display */}
        {currentPrice !== null && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Mevcut Fiyat
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(currentPrice, currentCurrency)}
            </p>
          </div>
        )}

        {/* New price and currency */}
        <div className="grid grid-cols-3 gap-4">
          {/* New Price */}
          <div className="col-span-2">
            <label htmlFor="newPrice" className="label">
              Yeni Fiyat <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {CURRENCY_SYMBOLS[formData.currency]}
              </span>
              <input
                id="newPrice"
                name="newPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.newPrice}
                onChange={handleChange}
                placeholder="0.00"
                disabled={!canSubmit}
                className={`
                  input pl-8
                  ${errors.newPrice ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                `}
              />
            </div>
            {errors.newPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.newPrice}</p>
            )}
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="label">
              Para Birimi
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              disabled={!canSubmit}
              className="input"
            >
              {Object.entries(CURRENCY_LABELS).map(([code]) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Change reason */}
        <div>
          <label htmlFor="changeReason" className="label">
            Değişiklik Nedeni <span className="text-red-500">*</span>
          </label>
          <textarea
            id="changeReason"
            name="changeReason"
            value={formData.changeReason}
            onChange={handleChange}
            rows={3}
            placeholder="Fiyat değişikliğinin nedenini açıklayın..."
            disabled={!canSubmit}
            className={`
              input
              ${errors.changeReason ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            `}
          />
          {errors.changeReason && (
            <p className="mt-1 text-sm text-red-600">{errors.changeReason}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Bu bilgi yasal uyumluluk için kayıt altına alınır.
          </p>
        </div>

        {/* Quick reason buttons */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Hızlı Seçim:</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_CHANGE_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => handleQuickReasonSelect(reason)}
                disabled={!canSubmit}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                  ${formData.changeReason === reason
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Info notice */}
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 px-4 py-3">
          <div className="flex-shrink-0 text-blue-600">
            <Icons.Info />
          </div>
          <div>
            <p className="text-sm text-blue-800">
              Fiyat değişiklikleri geri alınamaz. Tüm değişiklikler kayıt defterinde saklanır.
            </p>
          </div>
        </div>

        {/* Form buttons */}
        <div className={`flex items-center gap-4 ${isModal ? '' : 'pt-4 border-t'}`}>
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving}
            >
              İptal
            </Button>
          )}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="flex-1"
          >
            {saving ? (
              <>
                <Icons.Spinner />
                Kaydediliyor...
              </>
            ) : saved ? (
              <>
                <Icons.Check />
                Kaydedildi
              </>
            ) : (
              'Fiyatı Değiştir'
            )}
          </Button>
        </div>

        {/* Limit usage display */}
        {effectiveLimitCheck && effectiveLimitCheck.limit > 0 && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Bu ay kalan fiyat değişikliği hakkınız:{' '}
              <span className={`font-medium ${effectiveLimitCheck.remaining === 0 ? 'text-red-600' : 'text-gray-700'}`}>
                {effectiveLimitCheck.remaining}/{effectiveLimitCheck.limit}
              </span>
            </p>
          </div>
        )}
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirm}
        productName={productName}
        oldPrice={currentPrice}
        newPrice={parseFloat(formData.newPrice) || 0}
        currency={formData.currency}
        changeReason={formData.changeReason}
        isLoading={saving}
      />
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Price Change Modal wrapper
 *
 * @example
 * ```tsx
 * <PriceChangeModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   productId="uuid"
 *   productName="Filtre Kahve"
 *   currentPrice={45.00}
 *   currentCurrency="TRY"
 *   organizationId="org-uuid"
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function PriceChangeModal({
  isOpen,
  onClose,
  onSuccess,
  ...formProps
}: PriceChangeFormProps & {
  isOpen: boolean;
  onClose: () => void;
}) {
  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess();
    }
    // Don't close immediately - let user see success message
    setTimeout(onClose, 1500);
  }, [onSuccess, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fiyat Değiştir"
      description={`${formProps.productName} ürününün fiyatını değiştirin`}
      size="lg"
    >
      <PriceChangeForm
        {...formProps}
        onSuccess={handleSuccess}
        onCancel={onClose}
        isModal
      />
    </Modal>
  );
}

/**
 * Inline price change button with modal
 *
 * @example
 * ```tsx
 * <PriceChangeButton
 *   productId="uuid"
 *   productName="Filtre Kahve"
 *   currentPrice={45.00}
 *   currentCurrency="TRY"
 *   organizationId="org-uuid"
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function PriceChangeButton({
  className = '',
  buttonText = 'Fiyatı Değiştir',
  ...formProps
}: PriceChangeFormProps & {
  buttonText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Icons.Tag />
        {buttonText}
      </Button>
      <PriceChangeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        {...formProps}
      />
    </>
  );
}
