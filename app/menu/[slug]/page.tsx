/**
 * Public Menu Page with ISR (Incremental Static Regeneration)
 *
 * This is the primary QR code target page - the core function of the platform.
 * Customer scans QR code and accesses this menu page.
 *
 * ISR Configuration:
 * - Pages are statically generated at build time via generateStaticParams
 * - Pages are revalidated every 60 seconds (or on-demand via revalidatePath)
 * - Non-existent slugs show 404 page
 *
 * @route GET /menu/[slug]
 */

import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createStaticSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getCurrentMenuSnapshotBySlug,
  type MenuSnapshotData,
} from '@/lib/services/snapshot'
import type { CurrentPrice } from '@/types/database'

/**
 * ISR revalidation interval in seconds
 * Pages will be regenerated at most once every 60 seconds
 */
export const revalidate = 60

/**
 * Allow dynamic params for all slugs
 * This ensures pages are generated on-demand even if not in generateStaticParams
 */
export const dynamicParams = true

interface MenuPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Generate static params for all organizations
 * This pre-generates menu pages at build time for performance
 * Uses static client because generateStaticParams runs outside request context
 * 
 * Note: Returns empty array to allow dynamic generation at runtime
 * This ensures all organizations (even inactive ones) can be accessed
 */
export async function generateStaticParams() {
  // Return empty array to enable dynamic generation for all slugs
  // This allows pages to be generated on-demand at runtime
  return []
}

/**
 * Generate dynamic metadata for SEO
 */
export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const { slug } = await params

  // Try to get snapshot first
  const result = await getCurrentMenuSnapshotBySlug(slug)
  
  let menuData: MenuSnapshotData | null = null

  if (result.success && result.data) {
    menuData = result.data.snapshot_data as unknown as MenuSnapshotData
  } else {
    // Fallback: fetch from database
    menuData = await fetchMenuDataFromDB(slug)
  }

  if (!menuData) {
    return {
      title: 'Menu Bulunamadı | ozaMenu',
      description: 'İstediğiniz menu bulunamadı.',
    }
  }

  const orgName = menuData.organization.name

  return {
    title: `${orgName} Menu | ozaMenu`,
    description: `${orgName} dijital menu - ${menuData.metadata.product_count} ürün, ${menuData.metadata.category_count} kategori`,
    openGraph: {
      title: `${orgName} Menu`,
      description: `${orgName} dijital menusunu görüntüleyin`,
      images: menuData.organization.cover_url
        ? [menuData.organization.cover_url]
        : undefined,
    },
  }
}

/**
 * Fetch menu data directly from database (fallback when no snapshot exists)
 */
async function fetchMenuDataFromDB(slug: string): Promise<MenuSnapshotData | null> {
  const supabase = await createServerSupabaseClient()

  // Fetch organization details (try with is_active first, then without)
  let { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, cover_url, settings')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  // If not found with is_active=true, try without is_active check
  if (orgError || !organization) {
    const { data: orgData, error: orgError2 } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url, cover_url, settings')
      .eq('slug', slug)
      .single()
    
    if (orgError2 || !orgData) {
      console.error('[Menu Page] Organization not found:', slug, orgError2)
      return null
    }
    organization = orgData
  }

  // Fetch all visible categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, sort_order')
    .eq('organization_id', organization.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  if (catError) {
    console.error('[Menu Page] Error fetching categories:', catError)
    // Don't return null, continue with empty categories
  }

  // Fetch all visible products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, description, category_id, image_url, allergens, nutrition')
    .eq('organization_id', organization.id)
    .eq('is_visible', true)

  if (prodError) {
    console.error('[Menu Page] Error fetching products:', prodError)
    // Don't return null, continue with empty products
  }

  // Fetch current prices for all products
  const productIds = products?.map((p) => p.id) || []
  let priceMap = new Map<string, CurrentPrice>()

  if (productIds.length > 0) {
    const { data: prices } = await supabase
      .from('current_prices')
      .select('product_id, price, currency')
      .in('product_id', productIds)

    if (prices) {
      priceMap = new Map(prices.map((p) => [p.product_id, p as CurrentPrice]))
    }
  }

  // Combine products with prices
  const productsWithPrices = (products || []).map((product) => {
    const price = priceMap.get(product.id)
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      image_url: product.image_url,
      allergens: product.allergens,
      nutrition: product.nutrition,
      price: price?.price ?? null,
      currency: price?.currency ?? 'TRY',
    }
  })

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo_url: organization.logo_url,
      cover_url: organization.cover_url,
      settings: organization.settings,
    },
    categories: (categories || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id,
      sort_order: cat.sort_order,
    })),
    products: productsWithPrices,
    metadata: {
      generated_at: new Date().toISOString(),
      product_count: productsWithPrices.length,
      category_count: (categories || []).length,
    },
  }
}

/**
 * Public Menu Page Component
 *
 * Displays the restaurant menu from the latest published snapshot.
 * If no snapshot exists, fetches data directly from database.
 * Uses ISR for optimal performance with fresh data.
 */
export default async function MenuPage({ params }: MenuPageProps) {
  const { slug } = await params

  console.log('[Menu Page] Fetching menu for slug:', slug)

  // Try to get the latest published menu snapshot first
  const result = await getCurrentMenuSnapshotBySlug(slug)
  console.log('[Menu Page] Snapshot result:', result.success ? 'Found' : 'Not found', result.error)

  let menuData: MenuSnapshotData

  if (result.success && result.data) {
    // Use snapshot data if available
    menuData = result.data.snapshot_data as unknown as MenuSnapshotData
    console.log('[Menu Page] Using snapshot data')
  } else {
    // Fallback: fetch data directly from database
    console.log('[Menu Page] Fetching from database...')
    const dbData = await fetchMenuDataFromDB(slug)
    if (!dbData) {
      console.error('[Menu Page] No data found for slug:', slug)
      notFound()
    }
    menuData = dbData
    console.log('[Menu Page] Using database data, products:', menuData.products.length, 'categories:', menuData.categories.length)
  }

  const { organization, categories, products } = menuData

  // Group products by category
  const productsByCategory = new Map<string | null, typeof products>()

  // Initialize with empty arrays for each category
  categories.forEach((cat) => {
    productsByCategory.set(cat.id, [])
  })
  productsByCategory.set(null, []) // For uncategorized products

  // Populate products into categories
  products.forEach((product) => {
    const categoryId = product.category_id
    const existing = productsByCategory.get(categoryId) || []
    productsByCategory.set(categoryId, [...existing, product])
  })

  // Sort categories by sort_order
  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  return (
    <main className="min-h-screen bg-secondary-50">
      {/* Header with organization info */}
      <header className="relative">
        {/* Cover Image */}
        {organization.cover_url && (
          <div className="relative h-48 w-full overflow-hidden sm:h-64">
            <Image
              src={organization.cover_url}
              alt={`${organization.name} kapak görseli`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Organization Info */}
        <div
          className={`bg-white px-4 py-6 shadow-sm ${
            organization.cover_url ? '-mt-12 relative mx-4 rounded-lg sm:mx-auto sm:max-w-2xl' : ''
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Logo */}
            {organization.logo_url && (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-secondary-200 sm:h-20 sm:w-20">
                <Image
                  src={organization.logo_url}
                  alt={`${organization.name} logo`}
                  fill
                  sizes="(max-width: 640px) 64px, 80px"
                  className="object-cover"
                />
              </div>
            )}

            {/* Name */}
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 sm:text-3xl">
                {organization.name}
              </h1>
              <p className="mt-1 text-sm text-secondary-500">
                {menuData.metadata.product_count} ürün
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Categories */}
        {sortedCategories.length === 0 && products.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="text-secondary-500">
              Bu menude henüz ürün bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Render categories with their products */}
            {sortedCategories.map((category) => {
              const categoryProducts = productsByCategory.get(category.id) || []

              if (categoryProducts.length === 0) return null

              return (
                <section key={category.id} className="space-y-4">
                  {/* Category Header */}
                  <h2 className="border-b-2 border-primary-500 pb-2 text-xl font-semibold text-secondary-900">
                    {category.name}
                  </h2>

                  {/* Products in this category */}
                  <div className="space-y-3">
                    {categoryProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            })}

            {/* Uncategorized products */}
            {(() => {
              const uncategorized = productsByCategory.get(null) || []
              if (uncategorized.length === 0) return null

              return (
                <section className="space-y-4">
                  <h2 className="border-b-2 border-secondary-300 pb-2 text-xl font-semibold text-secondary-900">
                    Diğer
                  </h2>
                  <div className="space-y-3">
                    {uncategorized.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto bg-white py-6 text-center shadow-inner">
        <p className="text-sm text-secondary-400">
          Powered by{' '}
          <Link
            href="/"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            ozaMenu
          </Link>
        </p>
        <p className="mt-1 text-xs text-secondary-300">
          Son güncelleme:{' '}
          {new Date(menuData.metadata.generated_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </footer>
    </main>
  )
}

/**
 * Product Card Component
 * Displays a single product with image, name, description, and price
 */
function ProductCard({
  product,
}: {
  product: MenuSnapshotData['products'][number]
}) {
  const hasImage = !!product.image_url
  const hasAllergens = product.allergens && product.allergens.length > 0

  return (
    <article className="flex gap-4 rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Product Image */}
      {hasImage && (
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-24">
          <Image
            src={product.image_url!}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover"
          />
        </div>
      )}

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="font-medium text-secondary-900">{product.name}</h3>
          {product.description && (
            <p className="mt-1 text-sm text-secondary-500 line-clamp-2">
              {product.description}
            </p>
          )}
          {/* Allergens */}
          {hasAllergens && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.allergens!.map((allergen) => (
                <span
                  key={allergen}
                  className="rounded bg-warning-100 px-1.5 py-0.5 text-xs text-warning-800"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mt-2 text-right">
          {product.price !== null ? (
            <span className="text-lg font-semibold text-primary-600">
              {formatPrice(product.price, product.currency)}
            </span>
          ) : (
            <span className="text-sm text-secondary-400">Fiyat yok</span>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * Format price with currency symbol
 */
function formatPrice(price: number, currency: string): string {
  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(price)
}
