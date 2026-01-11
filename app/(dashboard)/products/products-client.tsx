/**
 * Products Client Component
 *
 * Urun listesi, kategori filtresi, arama ve sayfalama icin client-side component.
 *
 * Ozellikler:
 * - Urun listesi goruntuleme (guncel fiyatlarla)
 * - Kategori filtresi
 * - Arama (isim ve aciklama)
 * - Sayfalama
 * - Limit uyarisi (Lite plan icin 20 urun)
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Badge, SearchInput } from '@/components/ui';
import { LimitBanner } from '@/components/ui/UpgradePrompt';
import type { Category, ProductWithCurrentPriceView, CurrencyCode } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface LimitCheckInfo {
  canAdd: boolean;
  limit: number;
  currentCount: number;
  remaining: number;
  shouldUpgrade: boolean;
  message: string;
}

interface ProductsClientProps {
  initialProducts: ProductWithCurrentPriceView[];
  categories: Pick<Category, 'id' | 'name' | 'sort_order' | 'is_active'>[];
  limitCheck: LimitCheckInfo;
  userRole: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ITEMS_PER_PAGE = 10;

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Empty: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Star: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  ),
  Image: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with currency
 */
function formatPrice(price: number | null, currency: CurrencyCode | null): string {
  if (price === null) return 'Fiyat yok';

  const currencySymbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${currencySymbol}${price.toFixed(2)}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProductsClient({
  initialProducts,
  categories,
  limitCheck,
  userRole,
}: ProductsClientProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  // Check if user can edit (manager+ roles)
  const canEdit = ['owner', 'admin', 'manager'].includes(userRole);

  // =============================================================================
  // FILTERING & PAGINATION
  // =============================================================================

  // Filter products based on search, category, and active status
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = product.name.toLowerCase().includes(query);
        const descMatch = product.description?.toLowerCase().includes(query) || false;
        if (!nameMatch && !descMatch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'uncategorized') {
          if (product.category_id !== null) return false;
        } else {
          if (product.category_id !== selectedCategory) return false;
        }
      }

      // Active status filter
      if (showOnlyActive && !product.is_active) return false;

      return true;
    });
  }, [initialProducts, searchQuery, selectedCategory, showOnlyActive]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset to first page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  }, []);

  const handleActiveFilterChange = useCallback((checked: boolean) => {
    setShowOnlyActive(checked);
    setCurrentPage(1);
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Urunler</h1>
          <p className="text-gray-500 mt-1">
            Menunuzdeki urunleri yonetin ve fiyatlandirin.
          </p>
        </div>
        {canEdit && (
          <Link href="/products/new">
            <Button
              disabled={!limitCheck.canAdd && limitCheck.limit !== -1}
              className="flex items-center gap-2"
            >
              <Icons.Plus />
              Urun Ekle
            </Button>
          </Link>
        )}
      </div>

      {/* Limit Warning Banner */}
      {limitCheck.shouldUpgrade && limitCheck.limit > 0 && (
        <LimitBanner
          featureKey="limit_menu_items"
          current={limitCheck.currentCount}
          limit={limitCheck.limit}
        />
      )}

      {/* Limit Info */}
      {limitCheck.limit > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            Urun kullanimi: {limitCheck.currentCount} / {limitCheck.limit}
          </span>
          {limitCheck.remaining > 0 && limitCheck.limit !== -1 && (
            <Badge variant="info" size="sm">
              {limitCheck.remaining} kalan
            </Badge>
          )}
          {limitCheck.limit !== -1 && limitCheck.remaining === 0 && (
            <Badge variant="warning" size="sm">
              Limit doldu
            </Badge>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Urun ara (isim veya aciklama)..."
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="input w-full"
              aria-label="Kategori filtresi"
            >
              <option value="all">Tum Kategoriler</option>
              <option value="uncategorized">Kategorisiz</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Only Filter */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showOnlyActive"
              checked={showOnlyActive}
              onChange={(e) => handleActiveFilterChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="showOnlyActive" className="text-sm text-gray-700 whitespace-nowrap">
              Sadece aktif
            </label>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-3 text-sm text-gray-500">
          {filteredProducts.length} urun bulundu
          {searchQuery && ` • "${searchQuery}" icin arama`}
          {selectedCategory !== 'all' && ` • ${selectedCategory === 'uncategorized' ? 'Kategorisiz' : categories.find(c => c.id === selectedCategory)?.name || ''}`}
          {showOnlyActive && ' • Sadece aktif'}
        </div>
      </div>

      {/* Products List */}
      {paginatedProducts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Icons.Empty />
          </div>
          {initialProducts.length === 0 ? (
            <>
              <h3 className="text-lg font-medium text-gray-900">Henuz urun yok</h3>
              <p className="text-gray-500 mt-1 mb-4">
                Menuye urun ekleyerek baslayin.
              </p>
              {canEdit && limitCheck.canAdd && (
                <Link href="/products/new">
                  <Button>
                    <Icons.Plus />
                    Ilk Urunu Ekle
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900">Urun bulunamadi</h3>
              <p className="text-gray-500 mt-1">
                Arama kriterlerinize uygun urun bulunmuyor.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setShowOnlyActive(false);
                  setCurrentPage(1);
                }}
              >
                Filtreleri Temizle
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Products Grid/List */}
          <div className="grid gap-4">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                canEdit={canEdit}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between card p-4">
              <div className="text-sm text-gray-500">
                Sayfa {currentPage} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <Icons.ChevronLeft />
                  Onceki
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sonraki
                  <Icons.ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ProductCardProps {
  product: ProductWithCurrentPriceView;
  canEdit: boolean;
}

function ProductCard({ product, canEdit }: ProductCardProps) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400">
              <Icons.Image />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-medium text-gray-900 truncate">
                  {product.name}
                </h3>
                {!product.is_active && (
                  <Badge variant="secondary" size="sm">
                    Pasif
                  </Badge>
                )}
                {product.is_chef_special && (
                  <Badge variant="warning" size="sm" className="flex items-center gap-1">
                    <Icons.Star />
                    Sef Ozel
                  </Badge>
                )}
                {product.is_daily_special && (
                  <Badge variant="info" size="sm" className="flex items-center gap-1">
                    <Icons.Sparkles />
                    Gunun
                  </Badge>
                )}
              </div>

              {/* Category */}
              <p className="text-sm text-gray-500 mt-0.5">
                {product.category_name || 'Kategorisiz'}
              </p>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex-shrink-0 text-right">
              <div className="text-lg font-semibold text-primary-600">
                {formatPrice(product.current_price, product.current_currency)}
              </div>
              {product.price_valid_until && (
                <div className="text-xs text-orange-600 mt-0.5">
                  Gecici fiyat
                </div>
              )}
            </div>
          </div>

          {/* Additional Info & Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {product.calories && (
                <span>{product.calories} kcal</span>
              )}
              {product.preparation_time_minutes && (
                <span>{product.preparation_time_minutes} dk</span>
              )}
              {product.allergens && (
                <span className="text-red-500" title={product.allergens}>
                  Alerjen
                </span>
              )}
            </div>

            {/* Edit Button */}
            {canEdit && (
              <Link href={`/products/${product.id}`}>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  <Icons.Edit />
                  Duzenle
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
