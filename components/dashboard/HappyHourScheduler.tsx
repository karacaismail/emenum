/**
 * Happy Hour Scheduler Component
 *
 * Premium plan ozelligine ozgu, zamana dayali fiyat degisiklikleri icin
 * planlama arayuzu. valid_from ve valid_until degerlerini kullanarak
 * belirli zaman dilimlerinde gecerli olacak fiyatlar tanimlar.
 *
 * FEATURE GATED: Bu ozellik SADECE Premium pakette mevcuttur.
 * Diger paketlerde UpgradePrompt gosterilir.
 *
 * @example
 * ```tsx
 * // Basit kullanim
 * <HappyHourScheduler
 *   productId="product-uuid"
 *   productName="Filtre Kahve"
 *   currentPrice={45.00}
 *   organizationId="org-uuid"
 *   onSuccess={() => router.refresh()}
 * />
 *
 * // Modal icinde kullanim
 * <HappyHourModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   productId="product-uuid"
 *   productName="Filtre Kahve"
 *   currentPrice={45.00}
 *   organizationId="org-uuid"
 * />
 * ```
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useFeature } from '@/hooks/useFeature';
import type { CurrencyCode, UUID } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

export interface HappyHourSchedulerProps {
  /** Product UUID */
  productId: UUID;
  /** Product name for display */
  productName: string;
  /** Current regular price */
  currentPrice: number | null;
  /** Current currency */
  currentCurrency?: CurrencyCode;
  /** Organization UUID */
  organizationId: UUID;
  /** Callback on successful scheduling */
  onSuccess?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Whether the form is in a modal context */
  isModal?: boolean;
  /** Additional class name */
  className?: string;
}

interface ScheduledPrice {
  id: UUID;
  price: number;
  currency: CurrencyCode;
  validFrom: Date;
  validUntil: Date | null;
  changeReason: string | null;
  createdAt: Date;
  isActive: boolean;
  isUpcoming: boolean;
}

interface FormData {
  happyHourPrice: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
  currency: CurrencyCode;
}

interface FormErrors {
  happyHourPrice?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  reason?: string;
  dateRange?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Tag: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Sun: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  ArrowDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
};

// =============================================================================
// CURRENCY HELPERS
// =============================================================================

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
};

function formatPrice(price: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '₺';
  return `${symbol}${price.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// =============================================================================
// PRESET TIME SLOTS
// =============================================================================

interface TimePreset {
  label: string;
  startTime: string;
  endTime: string;
  icon: keyof typeof Icons;
}

const TIME_PRESETS: TimePreset[] = [
  { label: 'Ogle Molasi', startTime: '12:00', endTime: '14:00', icon: 'Sun' },
  { label: 'Happy Hour', startTime: '17:00', endTime: '19:00', icon: 'Clock' },
  { label: 'Gece Indirimi', startTime: '21:00', endTime: '23:00', icon: 'Clock' },
];

const COMMON_REASONS = [
  'Happy Hour indirimi',
  'Ogle molasi kampanyasi',
  'Erken rezervasyon indirimi',
  'Hafta sonu ozel fiyati',
  'Sezon sonu indirimi',
  'Ozel gun kampanyasi',
];

// =============================================================================
// SCHEDULED PRICES LIST COMPONENT
// =============================================================================

interface ScheduledPricesListProps {
  productId: UUID;
  currentPrice: number | null;
  currency: CurrencyCode;
  onRefresh?: () => void;
}

function ScheduledPricesList({
  productId,
  currentPrice,
  currency: _currency,
  onRefresh,
}: ScheduledPricesListProps) {
  // _currency is available for future use (e.g., displaying in preferred currency)
  void _currency;
  const [scheduledPrices, setScheduledPrices] = useState<ScheduledPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduledPrices = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Get all prices with valid_until set (scheduled/time-limited prices)
      const { data, error } = await supabase
        .from('price_ledger')
        .select('id, price, currency, valid_from, valid_until, change_reason, created_at')
        .eq('product_id', productId)
        .not('valid_until', 'is', null)
        .order('valid_from', { ascending: true });

      if (error) throw error;

      const prices: ScheduledPrice[] = (data || []).map((entry) => {
        const validFrom = new Date(entry.valid_from);
        const validUntil = entry.valid_until ? new Date(entry.valid_until) : null;
        const nowDate = new Date(now);

        return {
          id: entry.id,
          price: entry.price,
          currency: entry.currency as CurrencyCode,
          validFrom,
          validUntil,
          changeReason: entry.change_reason,
          createdAt: new Date(entry.created_at),
          isActive: validFrom <= nowDate && (validUntil === null || validUntil > nowDate),
          isUpcoming: validFrom > nowDate,
        };
      });

      // Filter to only show active and upcoming
      const relevantPrices = prices.filter((p) => p.isActive || p.isUpcoming);
      setScheduledPrices(relevantPrices);
    } catch {
      setScheduledPrices([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchScheduledPrices();
  }, [fetchScheduledPrices]);

  // Refresh when onRefresh changes
  useEffect(() => {
    if (onRefresh) {
      fetchScheduledPrices();
    }
  }, [onRefresh, fetchScheduledPrices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icons.Spinner />
        <span className="ml-2 text-sm text-gray-500">Zamanli fiyatlar yukleniyor...</span>
      </div>
    );
  }

  if (scheduledPrices.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <div className="flex justify-center mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Icons.Calendar />
          </div>
        </div>
        <p className="text-sm text-gray-600">Henuz zamanli fiyat tanimlanmamis</p>
        <p className="text-xs text-gray-500 mt-1">
          Asagidan yeni bir Happy Hour fiyati ekleyebilirsiniz
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <Icons.Calendar />
        Zamanli Fiyatlar ({scheduledPrices.length})
      </h4>
      <div className="space-y-2">
        {scheduledPrices.map((scheduled) => {
          const discount = currentPrice
            ? Math.round(((currentPrice - scheduled.price) / currentPrice) * 100)
            : 0;

          return (
            <div
              key={scheduled.id}
              className={`
                p-3 rounded-lg border
                ${scheduled.isActive
                  ? 'border-green-200 bg-green-50'
                  : scheduled.isUpcoming
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {formatPrice(scheduled.price, scheduled.currency)}
                    </span>
                    {discount > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        <Icons.ArrowDown />
                        {discount}% indirim
                      </span>
                    )}
                    {scheduled.isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded-full">
                        Aktif
                      </span>
                    )}
                    {scheduled.isUpcoming && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                        Yakinda
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Baslangic:</span> {formatDateTime(scheduled.validFrom)}
                  </div>
                  {scheduled.validUntil && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Bitis:</span> {formatDateTime(scheduled.validUntil)}
                    </div>
                  )}
                  {scheduled.changeReason && (
                    <div className="text-xs text-gray-500 mt-1">
                      {scheduled.changeReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HappyHourScheduler({
  productId,
  productName,
  currentPrice,
  currentCurrency = 'TRY',
  organizationId: _organizationId,
  onSuccess,
  onCancel,
  isModal = false,
  className = '',
}: HappyHourSchedulerProps) {
  // organizationId is available for future features like org-specific settings
  void _organizationId;

  // Feature check - PREMIUM ONLY
  const { hasFeature, isLoading: featureLoading } = useFeature('module_happy_hour');

  // Form state - compute today date once
  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0] as string;
  }, []);

  const [formData, setFormData] = useState<FormData>(() => {
    const dateStr = new Date().toISOString().split('T')[0] ?? '';
    return {
      happyHourPrice: '',
      startDate: dateStr,
      startTime: '17:00',
      endDate: dateStr,
      endTime: '19:00',
      reason: 'Happy Hour indirimi',
      currency: currentCurrency,
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculate discount percentage - moved here to be before any conditional returns
  const discountPercent = useMemo(() => {
    if (!currentPrice || !formData.happyHourPrice) return null;
    const newPrice = parseFloat(formData.happyHourPrice);
    if (isNaN(newPrice) || newPrice >= currentPrice) return null;
    return Math.round(((currentPrice - newPrice) / currentPrice) * 100);
  }, [currentPrice, formData.happyHourPrice]);

  // ==========================================================================
  // FEATURE GATE CHECK
  // ==========================================================================

  if (featureLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Icons.Spinner />
        <span className="ml-2 text-sm text-gray-500">Ozellik kontrol ediliyor...</span>
      </div>
    );
  }

  // Show upgrade prompt if feature not available
  if (!hasFeature) {
    return (
      <div className={className}>
        <UpgradePrompt
          featureKey="module_happy_hour"
          variant="card"
          suggestedPlan="Premium"
          message="Happy Hour ozelligi ile belirli saatlerde otomatik indirimli fiyatlar uygulayabilirsiniz."
        />
      </div>
    );
  }

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Reset states
    setSaved(false);
    setError(null);
  };

  const handlePresetSelect = (preset: TimePreset) => {
    setFormData((prev) => ({
      ...prev,
      startTime: preset.startTime,
      endTime: preset.endTime,
    }));
    setErrors((prev) => ({
      ...prev,
      startTime: undefined,
      endTime: undefined,
      dateRange: undefined,
    }));
  };

  const handleReasonSelect = (reason: string) => {
    setFormData((prev) => ({ ...prev, reason }));
    if (errors.reason) {
      setErrors((prev) => ({ ...prev, reason: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Price validation
    if (!formData.happyHourPrice.trim()) {
      newErrors.happyHourPrice = 'Indirimli fiyat zorunludur';
    } else {
      const price = parseFloat(formData.happyHourPrice);
      if (isNaN(price)) {
        newErrors.happyHourPrice = 'Gecerli bir fiyat girin';
      } else if (price < 0) {
        newErrors.happyHourPrice = 'Fiyat negatif olamaz';
      } else if (currentPrice && price >= currentPrice) {
        newErrors.happyHourPrice = 'Happy Hour fiyati normal fiyattan dusuk olmali';
      }
    }

    // Date validation
    if (!formData.startDate) {
      newErrors.startDate = 'Baslangic tarihi zorunludur';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'Bitis tarihi zorunludur';
    }

    // Time validation
    if (!formData.startTime) {
      newErrors.startTime = 'Baslangic saati zorunludur';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'Bitis saati zorunludur';
    }

    // Reason validation
    if (!formData.reason.trim()) {
      newErrors.reason = 'Aciklama zorunludur';
    }

    // Date range validation
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        newErrors.dateRange = 'Bitis zamani baslangic zamanindan sonra olmalidir';
      }

      const now = new Date();
      if (startDateTime < now) {
        newErrors.dateRange = 'Baslangic zamani gelecekte olmalidir';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const happyHourPrice = parseFloat(formData.happyHourPrice);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Oturum suresi dolmus. Lutfen tekrar giris yapin.');
      }

      // Create date objects
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      // Insert Happy Hour price into price_ledger
      // This uses valid_from and valid_until to create a time-limited price
      const { error: insertError } = await supabase.from('price_ledger').insert({
        product_id: productId,
        price: happyHourPrice,
        currency: formData.currency,
        valid_from: startDateTime.toISOString(),
        valid_until: endDateTime.toISOString(),
        change_reason: formData.reason.trim(),
        created_by: user.id,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Success!
      setSaved(true);
      setShowForm(false);
      setRefreshKey((prev) => prev + 1);

      // Reset form
      const resetDate = new Date().toISOString().split('T')[0] ?? '';
      setFormData({
        happyHourPrice: '',
        startDate: resetDate,
        startTime: '17:00',
        endDate: resetDate,
        endTime: '19:00',
        reason: 'Happy Hour indirimi',
        currency: currentCurrency,
      });

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Happy Hour fiyati eklenirken bir hata olustu. Lutfen tekrar deneyin.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with product info */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
          <Icons.Sun />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Happy Hour Zamanlayici</h3>
          <p className="text-sm text-gray-500">
            {productName} - Mevcut fiyat: {currentPrice ? formatPrice(currentPrice, currentCurrency) : 'Belirlenmemis'}
          </p>
        </div>
      </div>

      {/* Scheduled prices list */}
      <ScheduledPricesList
        key={refreshKey}
        productId={productId}
        currentPrice={currentPrice}
        currency={currentCurrency}
      />

      {/* Success message */}
      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0 text-green-600">
            <Icons.Check />
          </div>
          <p className="text-sm text-green-700">Happy Hour fiyati basariyla eklendi.</p>
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

      {/* Add new button or form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Icons.Plus />
          <span>Yeni Happy Hour Ekle</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 rounded-xl p-6">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Icons.Plus />
            Yeni Happy Hour Fiyati
          </h4>

          {/* Price input with discount preview */}
          <div>
            <label htmlFor="happyHourPrice" className="label">
              Indirimli Fiyat <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {CURRENCY_SYMBOLS[formData.currency]}
                </span>
                <input
                  id="happyHourPrice"
                  name="happyHourPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.happyHourPrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`input pl-8 ${errors.happyHourPrice ? 'border-red-500' : ''}`}
                />
              </div>
              {discountPercent !== null && (
                <div className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
                  <Icons.ArrowDown />
                  <span className="font-semibold">{discountPercent}%</span>
                </div>
              )}
            </div>
            {errors.happyHourPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.happyHourPrice}</p>
            )}
            {currentPrice && (
              <p className="mt-1 text-xs text-gray-500">
                Normal fiyat: {formatPrice(currentPrice, currentCurrency)}
              </p>
            )}
          </div>

          {/* Time presets */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Hazir Sablonlar:</p>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((preset) => {
                const Icon = Icons[preset.icon];
                const isSelected =
                  formData.startTime === preset.startTime && formData.endTime === preset.endTime;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isSelected
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon />
                    {preset.label}
                    <span className="text-xs text-gray-500">
                      ({preset.startTime}-{preset.endTime})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and time inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start date */}
            <div>
              <label htmlFor="startDate" className="label">
                Baslangic Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                min={today}
                className={`input ${errors.startDate ? 'border-red-500' : ''}`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            {/* Start time */}
            <div>
              <label htmlFor="startTime" className="label">
                Baslangic Saati <span className="text-red-500">*</span>
              </label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleChange}
                className={`input ${errors.startTime ? 'border-red-500' : ''}`}
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
              )}
            </div>

            {/* End date */}
            <div>
              <label htmlFor="endDate" className="label">
                Bitis Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate}
                className={`input ${errors.endDate ? 'border-red-500' : ''}`}
              />
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
            </div>

            {/* End time */}
            <div>
              <label htmlFor="endTime" className="label">
                Bitis Saati <span className="text-red-500">*</span>
              </label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleChange}
                className={`input ${errors.endTime ? 'border-red-500' : ''}`}
              />
              {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>}
            </div>
          </div>

          {/* Date range error */}
          {errors.dateRange && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.dateRange}</p>
            </div>
          )}

          {/* Reason selection */}
          <div>
            <label htmlFor="reason" className="label">
              Aciklama <span className="text-red-500">*</span>
            </label>
            <input
              id="reason"
              name="reason"
              type="text"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Indirim nedenini yazin..."
              className={`input ${errors.reason ? 'border-red-500' : ''}`}
            />
            {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {COMMON_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleReasonSelect(reason)}
                  className={`
                    px-2 py-1 text-xs rounded-full transition-colors
                    ${formData.reason === reason
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
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
                Happy Hour fiyati, belirtilen zaman araliginda otomatik olarak aktif olacaktir.
                Normal fiyat bu surenin disinda gecerli olmaya devam eder.
              </p>
            </div>
          </div>

          {/* Form buttons */}
          <div className={`flex items-center gap-4 ${isModal ? '' : 'pt-4 border-t'}`}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                onCancel?.();
              }}
              disabled={saving}
            >
              Iptal
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Icons.Spinner />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Icons.Check />
                  Happy Hour Kaydet
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Happy Hour Modal wrapper
 */
export function HappyHourModal({
  isOpen,
  onClose,
  onSuccess,
  ...props
}: HappyHourSchedulerProps & {
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
      title="Happy Hour Zamanlayici"
      description={`${props.productName} icin zamanli fiyat ayarlayin`}
      size="lg"
    >
      <HappyHourScheduler {...props} onSuccess={handleSuccess} onCancel={onClose} isModal />
    </Modal>
  );
}

/**
 * Happy Hour Button with modal
 */
export function HappyHourButton({
  className = '',
  buttonText = 'Happy Hour',
  ...props
}: HappyHourSchedulerProps & {
  buttonText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { hasFeature } = useFeature('module_happy_hour');

  // If feature not available, show locked button with upgrade prompt
  if (!hasFeature) {
    return (
      <UpgradePrompt featureKey="module_happy_hour" variant="locked" suggestedPlan="Premium">
        <Button type="button" variant="secondary" className={className}>
          <Icons.Clock />
          {buttonText}
        </Button>
      </UpgradePrompt>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Icons.Clock />
        {buttonText}
      </Button>
      <HappyHourModal isOpen={isOpen} onClose={() => setIsOpen(false)} {...props} />
    </>
  );
}
