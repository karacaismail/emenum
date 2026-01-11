/**
 * Price History Component
 *
 * Bir urun icin tum fiyat gecmisini gosteren component.
 * price_ledger tablosundan degismez kayitlari goruntuleyen,
 * kimin degistirdigini (created_by), ne zaman degistirdigini
 * ve neden degistirdigini (change_reason) gosteren component.
 *
 * @example
 * ```tsx
 * // Server-side data ile
 * <PriceHistory
 *   productId="product-uuid"
 *   productName="Filtre Kahve"
 *   initialHistory={serverFetchedHistory}
 * />
 *
 * // Client-side fetch ile
 * <PriceHistory
 *   productId="product-uuid"
 *   productName="Filtre Kahve"
 * />
 *
 * // Timeline gorunumu
 * <PriceHistory
 *   productId="product-uuid"
 *   productName="Filtre Kahve"
 *   variant="timeline"
 * />
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CurrencyCode, UUID, PriceHistoryView } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Price history entry type for component
 */
export interface PriceHistoryEntry {
  id: UUID;
  productId: UUID;
  productName: string;
  price: number;
  currency: CurrencyCode;
  validFrom: Date;
  validUntil: Date | null;
  changeReason: string | null;
  createdAt: Date;
  createdBy: UUID | null;
  changedByEmail: string | null;
  changedByName: string | null;
  isCurrentPrice: boolean;
  daysSinceChange: number;
  categoryName: string | null;
}

export interface PriceHistoryProps {
  /** Product UUID */
  productId: UUID;
  /** Product name for display */
  productName: string;
  /** Initial history data (from server) */
  initialHistory?: PriceHistoryEntry[];
  /** Display variant */
  variant?: 'table' | 'timeline' | 'compact';
  /** Maximum items to display (0 = all) */
  limit?: number;
  /** Show product name header */
  showHeader?: boolean;
  /** Show empty state message */
  showEmptyState?: boolean;
  /** Callback when history is loaded */
  onLoad?: (history: PriceHistoryEntry[]) => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
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
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Tag: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  History: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Empty: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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

/**
 * Format price with currency symbol
 */
function formatPrice(price: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '₺';
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Format date in Turkish locale
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format date and time in Turkish locale
 */
function formatDateTime(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(days: number): string {
  if (days === 0) return 'Bugun';
  if (days === 1) return 'Dun';
  if (days < 7) return `${days} gun once`;
  if (days < 30) return `${Math.floor(days / 7)} hafta once`;
  if (days < 365) return `${Math.floor(days / 30)} ay once`;
  return `${Math.floor(days / 365)} yil once`;
}

/**
 * Calculate price change percentage
 */
function calculatePriceChange(oldPrice: number | null, newPrice: number): {
  diff: number;
  percent: number;
  direction: 'up' | 'down' | 'same';
} {
  if (oldPrice === null || oldPrice === 0) {
    return { diff: newPrice, percent: 0, direction: 'same' };
  }
  const diff = newPrice - oldPrice;
  const percent = (diff / oldPrice) * 100;
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
  return { diff, percent, direction };
}

// =============================================================================
// DATA TRANSFORMER
// =============================================================================

/**
 * Transform PriceHistoryView to PriceHistoryEntry
 */
function transformPriceHistoryView(data: PriceHistoryView): PriceHistoryEntry {
  return {
    id: data.id,
    productId: data.product_id,
    productName: data.product_name,
    price: data.price,
    currency: data.currency,
    validFrom: new Date(data.valid_from),
    validUntil: data.valid_until ? new Date(data.valid_until) : null,
    changeReason: data.change_reason,
    createdAt: new Date(data.created_at),
    createdBy: data.created_by,
    changedByEmail: data.changed_by_email,
    changedByName: data.changed_by_name,
    isCurrentPrice: data.is_current_price,
    daysSinceChange: data.days_since_change,
    categoryName: data.category_name,
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PriceChangeIndicatorProps {
  oldPrice: number | null;
  newPrice: number;
  showPercent?: boolean;
}

function PriceChangeIndicator({
  oldPrice,
  newPrice,
  showPercent = true,
}: PriceChangeIndicatorProps) {
  const { direction, percent } = calculatePriceChange(oldPrice, newPrice);

  if (direction === 'same') {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
        ${direction === 'up' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
      `}
    >
      {direction === 'up' ? <Icons.ArrowUp /> : <Icons.ArrowDown />}
      {showPercent && `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`}
    </span>
  );
}

interface ChangedByInfoProps {
  email: string | null;
  name: string | null;
}

function ChangedByInfo({ email, name }: ChangedByInfoProps) {
  const displayName = name || email || 'Bilinmiyor';

  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
      <Icons.User />
      <span>{displayName}</span>
    </span>
  );
}

interface ChangeReasonBadgeProps {
  reason: string | null;
}

function ChangeReasonBadge({ reason }: ChangeReasonBadgeProps) {
  if (!reason) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 italic">
        <Icons.Info />
        Neden belirtilmemis
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-700">
      <Icons.Tag />
      <span>{reason}</span>
    </span>
  );
}

interface CurrentPriceBadgeProps {
  isCurrent: boolean;
}

function CurrentPriceBadge({ isCurrent }: CurrentPriceBadgeProps) {
  if (!isCurrent) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
      <Icons.Check />
      Guncel Fiyat
    </span>
  );
}

interface ValidityPeriodProps {
  validFrom: Date;
  validUntil: Date | null;
}

function ValidityPeriod({ validFrom, validUntil }: ValidityPeriodProps) {
  if (!validUntil) {
    return (
      <span className="text-xs text-gray-500">
        {formatDate(validFrom)} - Devam ediyor
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-500">
      {formatDate(validFrom)} - {formatDate(validUntil)}
    </span>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">
        <Icons.Empty />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">Fiyat Gecmisi Yok</h3>
      <p className="text-sm text-gray-500">
        Bu urun icin henuz fiyat degisikligi kaydedilmemis.
      </p>
    </div>
  );
}

// =============================================================================
// TABLE VARIANT
// =============================================================================

interface TableVariantProps {
  history: PriceHistoryEntry[];
}

function TableVariant({ history }: TableVariantProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fiyat
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Degisiklik
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gecerlilik
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Neden
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Degistiren
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tarih
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map((entry, index) => {
            const prevEntry = history[index + 1];
            const prevPrice = prevEntry?.price ?? null;

            return (
              <tr
                key={entry.id}
                className={entry.isCurrentPrice ? 'bg-green-50' : ''}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold ${entry.isCurrentPrice ? 'text-green-700' : 'text-gray-900'}`}>
                      {formatPrice(entry.price, entry.currency)}
                    </span>
                    <CurrentPriceBadge isCurrent={entry.isCurrentPrice} />
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <PriceChangeIndicator
                    oldPrice={prevPrice}
                    newPrice={entry.price}
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <ValidityPeriod validFrom={entry.validFrom} validUntil={entry.validUntil} />
                </td>
                <td className="px-4 py-4">
                  <ChangeReasonBadge reason={entry.changeReason} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <ChangedByInfo email={entry.changedByEmail} name={entry.changedByName} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900">{formatDateTime(entry.createdAt)}</span>
                    <span className="text-xs text-gray-500">{formatRelativeTime(entry.daysSinceChange)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// TIMELINE VARIANT
// =============================================================================

interface TimelineVariantProps {
  history: PriceHistoryEntry[];
}

function TimelineVariant({ history }: TimelineVariantProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-gray-200" />

      {/* Timeline items */}
      <div className="space-y-6">
        {history.map((entry, index) => {
          const prevEntry = history[index + 1];
          const prevPrice = prevEntry?.price ?? null;
          const { direction } = calculatePriceChange(prevPrice, entry.price);

          return (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={`
                  relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-4 border-white
                  ${entry.isCurrentPrice
                    ? 'bg-green-500 text-white'
                    : direction === 'up'
                      ? 'bg-red-100 text-red-600'
                      : direction === 'down'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {entry.isCurrentPrice ? (
                  <Icons.Check />
                ) : direction === 'up' ? (
                  <Icons.ArrowUp />
                ) : direction === 'down' ? (
                  <Icons.ArrowDown />
                ) : (
                  <Icons.Tag />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 rounded-lg border p-4 ${entry.isCurrentPrice ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${entry.isCurrentPrice ? 'text-green-700' : 'text-gray-900'}`}>
                        {formatPrice(entry.price, entry.currency)}
                      </span>
                      <PriceChangeIndicator
                        oldPrice={prevPrice}
                        newPrice={entry.price}
                      />
                      <CurrentPriceBadge isCurrent={entry.isCurrentPrice} />
                    </div>
                    <ValidityPeriod validFrom={entry.validFrom} validUntil={entry.validUntil} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatDateTime(entry.createdAt)}</span>
                    <br />
                    <span className="text-xs text-gray-500">{formatRelativeTime(entry.daysSinceChange)}</span>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-3">
                  <ChangeReasonBadge reason={entry.changeReason} />
                </div>

                {/* Changed by */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <ChangedByInfo email={entry.changedByEmail} name={entry.changedByName} />
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
// COMPACT VARIANT
// =============================================================================

interface CompactVariantProps {
  history: PriceHistoryEntry[];
}

function CompactVariant({ history }: CompactVariantProps) {
  return (
    <div className="divide-y divide-gray-100">
      {history.map((entry, index) => {
        const prevEntry = history[index + 1];
        const prevPrice = prevEntry?.price ?? null;

        return (
          <div
            key={entry.id}
            className={`py-3 px-2 ${entry.isCurrentPrice ? 'bg-green-50 rounded-lg' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${entry.isCurrentPrice ? 'text-green-700' : 'text-gray-900'}`}>
                  {formatPrice(entry.price, entry.currency)}
                </span>
                <PriceChangeIndicator
                  oldPrice={prevPrice}
                  newPrice={entry.price}
                />
                {entry.isCurrentPrice && (
                  <span className="text-xs font-medium text-green-600">Guncel</span>
                )}
              </div>
              <span className="text-xs text-gray-500">{formatRelativeTime(entry.daysSinceChange)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{entry.changeReason || 'Neden belirtilmemis'}</span>
              <span>{entry.changedByName || entry.changedByEmail || 'Bilinmiyor'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Icons.Spinner />
      <span className="ml-2 text-sm text-gray-500">Fiyat gecmisi yukleniyor...</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PriceHistory({
  productId,
  productName,
  initialHistory,
  variant = 'table',
  limit = 0,
  showHeader = true,
  showEmptyState = true,
  onLoad,
  className = '',
}: PriceHistoryProps) {
  // State
  const [history, setHistory] = useState<PriceHistoryEntry[]>(initialHistory || []);
  const [loading, setLoading] = useState(!initialHistory);
  const [error, setError] = useState<string | null>(null);

  // Fetch history from client side if not provided
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const query = supabase
        .from('price_history_view')
        .select('*')
        .eq('product_id', productId)
        .order('valid_from', { ascending: false });

      if (limit > 0) {
        query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const transformedHistory = (data || []).map(transformPriceHistoryView);
      setHistory(transformedHistory);

      if (onLoad) {
        onLoad(transformedHistory);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Fiyat gecmisi yuklenirken bir hata olustu.');
      }
    } finally {
      setLoading(false);
    }
  }, [productId, limit, onLoad]);

  // Fetch on mount if no initial data
  useEffect(() => {
    if (!initialHistory) {
      fetchHistory();
    }
  }, [fetchHistory, initialHistory]);

  // Apply limit if needed
  const displayHistory = limit > 0 ? history.slice(0, limit) : history;

  // Render variant
  const renderVariant = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      );
    }

    if (displayHistory.length === 0) {
      return showEmptyState ? <EmptyState /> : null;
    }

    switch (variant) {
      case 'timeline':
        return <TimelineVariant history={displayHistory} />;
      case 'compact':
        return <CompactVariant history={displayHistory} />;
      case 'table':
      default:
        return <TableVariant history={displayHistory} />;
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Icons.History />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Fiyat Gecmisi</h3>
              <p className="text-xs text-gray-500">{productName}</p>
            </div>
          </div>
          {displayHistory.length > 0 && (
            <span className="text-xs text-gray-500">
              {displayHistory.length} kayit
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {renderVariant()}

      {/* More items indicator */}
      {limit > 0 && history.length > limit && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            {history.length - limit} kayit daha mevcut
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Price History Modal wrapper (for use with Modal component)
 */
export interface PriceHistoryModalProps extends PriceHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PriceHistoryModal({
  isOpen,
  onClose,
  ...props
}: PriceHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Fiyat Gecmisi</h2>
            <p className="text-sm text-gray-500">{props.productName} icin tum fiyat degisiklikleri</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            aria-label="Kapat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <PriceHistory {...props} showHeader={false} variant="timeline" />
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Price History Card
 */
export interface PriceHistoryCardProps extends Omit<PriceHistoryProps, 'variant'> {
  /** Whether to show expand button */
  expandable?: boolean;
  /** Callback when expand is clicked */
  onExpand?: () => void;
}

export function PriceHistoryCard({
  expandable = false,
  onExpand,
  limit = 3,
  ...props
}: PriceHistoryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <PriceHistory
        {...props}
        variant="compact"
        limit={limit}
      />
      {expandable && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onExpand}
            className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Tum Gecmisi Gor
          </button>
        </div>
      )}
    </div>
  );
}
