/**
 * Export/Import Service
 *
 * Provides functionality for exporting and importing data in CSV and JSON formats.
 * Supports categories, products, and price data.
 *
 * @module lib/services/export-import
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Category, Product } from '@/types/database'

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'json'

/**
 * Export data type
 */
export type ExportDataType = 'categories' | 'products' | 'menu'

/**
 * Product with price for export
 */
export interface ProductWithPrice extends Product {
  price?: number
  currency?: string
}

/**
 * Category with products for export
 */
export interface CategoryWithProducts extends Category {
  products?: ProductWithPrice[]
}

/**
 * Export result
 */
export interface ExportResult {
  data: string
  filename: string
  contentType: string
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  warnings: string[]
}

/**
 * CSV header mappings for Turkish localization
 */
const CSV_HEADERS = {
  categories: {
    id: 'ID',
    name: 'Kategori Adi',
    slug: 'URL Slug',
    parent_id: 'Ust Kategori ID',
    sort_order: 'Siralama',
    is_visible: 'Gorunur',
    created_at: 'Olusturulma Tarihi',
  },
  products: {
    id: 'ID',
    name: 'Urun Adi',
    description: 'Aciklama',
    category_id: 'Kategori ID',
    category_name: 'Kategori Adi',
    price: 'Fiyat',
    currency: 'Para Birimi',
    image_url: 'Gorsel URL',
    allergens: 'Alerjenler',
    is_visible: 'Gorunur',
    created_at: 'Olusturulma Tarihi',
  },
}

/**
 * Escapes a value for CSV output
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  const str = String(value)
  // If contains comma, newline, or quotes, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Parses a CSV line respecting quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else if (char === '"') {
        // End of quoted section
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        // Start of quoted section
        inQuotes = true
      } else if (char === ',') {
        // End of field
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  // Don't forget the last field
  result.push(current.trim())
  return result
}

/**
 * Export categories to specified format
 */
export async function exportCategories(
  organizationId: string,
  format: ExportFormat
): Promise<ExportResult> {
  const supabase = await createServerSupabaseClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Kategoriler yuklenirken hata: ${error.message}`)
  }

  const timestamp = new Date().toISOString().split('T')[0]

  if (format === 'json') {
    return {
      data: JSON.stringify(categories, null, 2),
      filename: `kategoriler_${timestamp}.json`,
      contentType: 'application/json',
    }
  }

  // CSV format
  const headers = Object.values(CSV_HEADERS.categories)
  const rows = (categories || []).map((cat) => [
    escapeCSV(cat.id),
    escapeCSV(cat.name),
    escapeCSV(cat.slug),
    escapeCSV(cat.parent_id),
    escapeCSV(cat.sort_order),
    escapeCSV(cat.is_visible ? 'Evet' : 'Hayir'),
    escapeCSV(cat.created_at),
  ])

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  return {
    data: csv,
    filename: `kategoriler_${timestamp}.csv`,
    contentType: 'text/csv;charset=utf-8',
  }
}

/**
 * Export products with prices to specified format
 */
export async function exportProducts(
  organizationId: string,
  format: ExportFormat
): Promise<ExportResult> {
  const supabase = await createServerSupabaseClient()

  // Fetch products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (productsError) {
    throw new Error(`Urunler yuklenirken hata: ${productsError.message}`)
  }

  // Fetch current prices
  const { data: prices, error: pricesError } = await supabase
    .from('current_prices')
    .select('*')

  if (pricesError) {
    throw new Error(`Fiyatlar yuklenirken hata: ${pricesError.message}`)
  }

  // Create price map
  const priceMap = new Map<string, { price: number; currency: string }>()
  prices?.forEach((p) => {
    priceMap.set(p.product_id, { price: p.price, currency: p.currency })
  })

  // Combine data
  const productsWithPrices: ProductWithPrice[] = (products || []).map((p) => {
    const priceInfo = priceMap.get(p.id)
    return {
      ...p,
      price: priceInfo?.price,
      currency: priceInfo?.currency,
    }
  })

  const timestamp = new Date().toISOString().split('T')[0]

  if (format === 'json') {
    return {
      data: JSON.stringify(productsWithPrices, null, 2),
      filename: `urunler_${timestamp}.json`,
      contentType: 'application/json',
    }
  }

  // CSV format
  const headers = Object.values(CSV_HEADERS.products)
  const rows = productsWithPrices.map((prod) => {
    const catName = (prod as unknown as { categories?: { name: string } }).categories?.name || ''
    return [
      escapeCSV(prod.id),
      escapeCSV(prod.name),
      escapeCSV(prod.description),
      escapeCSV(prod.category_id),
      escapeCSV(catName),
      escapeCSV(prod.price),
      escapeCSV(prod.currency || 'TRY'),
      escapeCSV(prod.image_url),
      escapeCSV(Array.isArray(prod.allergens) ? prod.allergens.join(', ') : ''),
      escapeCSV(prod.is_visible ? 'Evet' : 'Hayir'),
      escapeCSV(prod.created_at),
    ]
  })

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  return {
    data: csv,
    filename: `urunler_${timestamp}.csv`,
    contentType: 'text/csv;charset=utf-8',
  }
}

/**
 * Export complete menu (categories + products) to specified format
 */
export async function exportMenu(
  organizationId: string,
  format: ExportFormat
): Promise<ExportResult> {
  const supabase = await createServerSupabaseClient()

  // Fetch categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })

  if (catError) {
    throw new Error(`Kategoriler yuklenirken hata: ${catError.message}`)
  }

  // Fetch products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (prodError) {
    throw new Error(`Urunler yuklenirken hata: ${prodError.message}`)
  }

  // Fetch current prices
  const { data: prices, error: pricesError } = await supabase
    .from('current_prices')
    .select('*')

  if (pricesError) {
    throw new Error(`Fiyatlar yuklenirken hata: ${pricesError.message}`)
  }

  // Create price map
  const priceMap = new Map<string, { price: number; currency: string }>()
  prices?.forEach((p) => {
    priceMap.set(p.product_id, { price: p.price, currency: p.currency })
  })

  // Build menu structure
  const categoriesWithProducts: CategoryWithProducts[] = (categories || []).map((cat) => {
    const categoryProducts = (products || [])
      .filter((p) => p.category_id === cat.id)
      .map((p) => {
        const priceInfo = priceMap.get(p.id)
        return {
          ...p,
          price: priceInfo?.price,
          currency: priceInfo?.currency,
        }
      })

    return {
      ...cat,
      products: categoryProducts,
    }
  })

  const timestamp = new Date().toISOString().split('T')[0]

  if (format === 'json') {
    const menuData = {
      exported_at: new Date().toISOString(),
      organization_id: organizationId,
      categories: categoriesWithProducts,
    }

    return {
      data: JSON.stringify(menuData, null, 2),
      filename: `menu_${timestamp}.json`,
      contentType: 'application/json',
    }
  }

  // For CSV, we create a flat structure with category info included
  const headers = [
    'Kategori Adi',
    'Kategori Siralama',
    'Urun ID',
    'Urun Adi',
    'Aciklama',
    'Fiyat',
    'Para Birimi',
    'Gorsel URL',
    'Alerjenler',
    'Urun Gorunur',
  ]

  const rows: string[][] = []
  categoriesWithProducts.forEach((cat) => {
    if (!cat.products?.length) {
      // Empty category
      rows.push([
        escapeCSV(cat.name),
        escapeCSV(cat.sort_order),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ])
    } else {
      cat.products.forEach((prod) => {
        rows.push([
          escapeCSV(cat.name),
          escapeCSV(cat.sort_order),
          escapeCSV(prod.id),
          escapeCSV(prod.name),
          escapeCSV(prod.description),
          escapeCSV(prod.price),
          escapeCSV(prod.currency || 'TRY'),
          escapeCSV(prod.image_url),
          escapeCSV(Array.isArray(prod.allergens) ? prod.allergens.join(', ') : ''),
          escapeCSV(prod.is_visible ? 'Evet' : 'Hayir'),
        ])
      })
    }
  })

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  return {
    data: csv,
    filename: `menu_${timestamp}.csv`,
    contentType: 'text/csv;charset=utf-8',
  }
}

/**
 * Import categories from CSV or JSON
 */
export async function importCategories(
  organizationId: string,
  data: string,
  format: ExportFormat
): Promise<ImportResult> {
  const supabase = await createServerSupabaseClient()
  const result: ImportResult = {
    success: true,
    imported: 0,
    errors: [],
    warnings: [],
  }

  try {
    let categories: Partial<Category>[] = []

    if (format === 'json') {
      const parsed = JSON.parse(data)
      categories = Array.isArray(parsed) ? parsed : parsed.categories || []
    } else {
      // Parse CSV
      const lines = data.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        throw new Error('CSV dosyasi bos veya baslik satiri eksik')
      }

      const headers = parseCSVLine(lines[0])
      const nameIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('kategori adi') || h.toLowerCase() === 'name'
      )
      const slugIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('slug')
      )
      const sortIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('siralama') || h.toLowerCase().includes('sort')
      )
      const visibleIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('gorunur') || h.toLowerCase().includes('visible')
      )

      if (nameIndex === -1) {
        throw new Error('Kategori adi sutunu bulunamadi')
      }

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.length <= nameIndex || !values[nameIndex]) {
          result.warnings.push(`Satir ${i + 1}: Kategori adi bos, atlandi`)
          continue
        }

        categories.push({
          name: values[nameIndex],
          slug: slugIndex !== -1 ? values[slugIndex] : values[nameIndex].toLowerCase().replace(/\s+/g, '-'),
          sort_order: sortIndex !== -1 ? parseInt(values[sortIndex]) || 0 : 0,
          is_visible: visibleIndex !== -1 ? values[visibleIndex]?.toLowerCase() !== 'hayir' : true,
        })
      }
    }

    // Insert categories
    for (const cat of categories) {
      const { error } = await supabase.from('categories').insert({
        organization_id: organizationId,
        name: cat.name,
        slug: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-'),
        sort_order: cat.sort_order || 0,
        is_visible: cat.is_visible !== false,
      })

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - try upsert
          const { error: upsertError } = await supabase
            .from('categories')
            .update({
              name: cat.name,
              sort_order: cat.sort_order,
              is_visible: cat.is_visible,
            })
            .eq('organization_id', organizationId)
            .eq('slug', cat.slug)

          if (upsertError) {
            result.errors.push(`Kategori "${cat.name}": ${upsertError.message}`)
          } else {
            result.imported++
            result.warnings.push(`Kategori "${cat.name}": mevcut kayit guncellendi`)
          }
        } else {
          result.errors.push(`Kategori "${cat.name}": ${error.message}`)
        }
      } else {
        result.imported++
      }
    }

    if (result.errors.length > 0) {
      result.success = result.imported > 0
    }
  } catch (err) {
    result.success = false
    result.errors.push(err instanceof Error ? err.message : 'Bilinmeyen hata')
  }

  return result
}

/**
 * Import products from CSV or JSON
 */
export async function importProducts(
  organizationId: string,
  data: string,
  format: ExportFormat,
  userId: string
): Promise<ImportResult> {
  const supabase = await createServerSupabaseClient()
  const result: ImportResult = {
    success: true,
    imported: 0,
    errors: [],
    warnings: [],
  }

  try {
    // Get existing categories for mapping
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('organization_id', organizationId)

    const categoryMap = new Map<string, string>()
    existingCategories?.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
      categoryMap.set(cat.slug.toLowerCase(), cat.id)
    })

    interface ProductImportData {
      name?: string
      description?: string
      category_id?: string
      category_name?: string
      price?: number
      currency?: string
      image_url?: string
      allergens?: string[]
      is_visible?: boolean
    }

    let products: ProductImportData[] = []

    if (format === 'json') {
      const parsed = JSON.parse(data)
      products = Array.isArray(parsed) ? parsed : parsed.products || []
    } else {
      // Parse CSV
      const lines = data.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        throw new Error('CSV dosyasi bos veya baslik satiri eksik')
      }

      const headers = parseCSVLine(lines[0])
      const nameIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('urun adi') || h.toLowerCase() === 'name'
      )
      const descIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('aciklama') || h.toLowerCase().includes('description')
      )
      const catNameIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('kategori adi') || h.toLowerCase().includes('category')
      )
      const priceIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('fiyat') || h.toLowerCase() === 'price'
      )
      const currencyIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('para birimi') || h.toLowerCase() === 'currency'
      )
      const imageIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('gorsel') || h.toLowerCase().includes('image')
      )
      const allergensIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('alerjen') || h.toLowerCase().includes('allergen')
      )
      const visibleIndex = headers.findIndex((h) =>
        h.toLowerCase().includes('gorunur') || h.toLowerCase().includes('visible')
      )

      if (nameIndex === -1) {
        throw new Error('Urun adi sutunu bulunamadi')
      }

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.length <= nameIndex || !values[nameIndex]) {
          result.warnings.push(`Satir ${i + 1}: Urun adi bos, atlandi`)
          continue
        }

        const allergenStr = allergensIndex !== -1 ? values[allergensIndex] : ''
        const allergens = allergenStr
          ? allergenStr.split(',').map((a) => a.trim()).filter(Boolean)
          : []

        products.push({
          name: values[nameIndex],
          description: descIndex !== -1 ? values[descIndex] : undefined,
          category_name: catNameIndex !== -1 ? values[catNameIndex] : undefined,
          price: priceIndex !== -1 ? parseFloat(values[priceIndex]) || undefined : undefined,
          currency: currencyIndex !== -1 ? values[currencyIndex] || 'TRY' : 'TRY',
          image_url: imageIndex !== -1 ? values[imageIndex] : undefined,
          allergens: allergens.length > 0 ? allergens : undefined,
          is_visible: visibleIndex !== -1 ? values[visibleIndex]?.toLowerCase() !== 'hayir' : true,
        })
      }
    }

    // Insert products
    for (const prod of products) {
      // Resolve category
      let categoryId = prod.category_id
      if (!categoryId && prod.category_name) {
        categoryId = categoryMap.get(prod.category_name.toLowerCase())
        if (!categoryId) {
          result.warnings.push(`Urun "${prod.name}": Kategori "${prod.category_name}" bulunamadi`)
        }
      }

      const { data: insertedProduct, error } = await supabase
        .from('products')
        .insert({
          organization_id: organizationId,
          name: prod.name,
          description: prod.description,
          category_id: categoryId,
          image_url: prod.image_url,
          allergens: prod.allergens,
          is_visible: prod.is_visible !== false,
        })
        .select('id')
        .single()

      if (error) {
        result.errors.push(`Urun "${prod.name}": ${error.message}`)
        continue
      }

      result.imported++

      // Add price entry if price is provided
      if (prod.price !== undefined && prod.price > 0) {
        const { error: priceError } = await supabase.from('price_ledger').insert({
          product_id: insertedProduct.id,
          price: prod.price,
          currency: prod.currency || 'TRY',
          change_reason: 'Import ile eklendi',
          changed_by: userId,
        })

        if (priceError) {
          result.warnings.push(`Urun "${prod.name}": Fiyat eklenemedi - ${priceError.message}`)
        }
      }
    }

    if (result.errors.length > 0) {
      result.success = result.imported > 0
    }
  } catch (err) {
    result.success = false
    result.errors.push(err instanceof Error ? err.message : 'Bilinmeyen hata')
  }

  return result
}

/**
 * Generate sample CSV template for categories
 */
export function getCategoriesTemplate(): string {
  const headers = Object.values(CSV_HEADERS.categories)
  const sampleData = [
    ['', 'Icecekler', 'icecekler', '', '1', 'Evet', ''],
    ['', 'Sicak Icecekler', 'sicak-icecekler', '', '2', 'Evet', ''],
    ['', 'Soguk Icecekler', 'soguk-icecekler', '', '3', 'Evet', ''],
    ['', 'Tatlilar', 'tatlilar', '', '4', 'Evet', ''],
    ['', 'Ana Yemekler', 'ana-yemekler', '', '5', 'Evet', ''],
  ]

  return [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n')
}

/**
 * Generate sample CSV template for products
 */
export function getProductsTemplate(): string {
  const headers = Object.values(CSV_HEADERS.products)
  const sampleData = [
    ['', 'Turk Kahvesi', 'Geleneksel Turk kahvesi', '', 'Sicak Icecekler', '35', 'TRY', '', '', 'Evet', ''],
    ['', 'Latte', 'Sutlu espresso', '', 'Sicak Icecekler', '45', 'TRY', '', 'sut', 'Evet', ''],
    ['', 'Limonata', 'Ev yapimi taze limonata', '', 'Soguk Icecekler', '30', 'TRY', '', '', 'Evet', ''],
    ['', 'Cheesecake', 'New York usulu', '', 'Tatlilar', '55', 'TRY', '', 'sut, gluten', 'Evet', ''],
    ['', 'Izgara Kofte', 'El yapimi kofte', '', 'Ana Yemekler', '120', 'TRY', '', '', 'Evet', ''],
  ]

  return [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n')
}
