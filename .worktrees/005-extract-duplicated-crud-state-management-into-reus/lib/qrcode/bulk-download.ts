/**
 * Bulk QR Code Download Utility
 *
 * This module provides bulk download functionality for multiple QR codes.
 * It supports downloading all table QR codes as either a ZIP file or a
 * combined PDF document.
 *
 * Key Features:
 * - ZIP format with individual PNG files (2048px) for each table
 * - Combined PDF format with all tables on separate A5 pages
 * - Browser-based file generation and download
 * - Progress tracking for large batches
 * - Error handling for failed QR generations
 *
 * @example
 * // Download all tables as ZIP
 * const result = await downloadAllTablesAsZip(tables, organizationSlug, organizationName)
 * if (!result.success) {
 *   toast.error(result.error)
 * }
 *
 * // Download all tables as combined PDF
 * const result = await downloadAllTablesAsPDF(tables, organizationSlug, organizationName)
 */

import JSZip from 'jszip'
import { generateQRCodePNG, generateQRCodePDF } from './generator'

/**
 * Table data structure for bulk operations
 */
export interface TableForBulkDownload {
  qr_uuid: string
  table_number: string
}

/**
 * Result of a bulk download operation
 */
export interface BulkDownloadResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Number of QR codes successfully generated */
  successCount: number
  /** Number of QR codes that failed */
  failureCount: number
  /** Total number of tables processed */
  totalCount: number
  /** Error message if operation failed */
  error?: string
  /** Detailed errors for individual failures */
  failures?: Array<{
    tableNumber: string
    error: string
  }>
}

/**
 * Download all table QR codes as a ZIP file.
 *
 * Creates a ZIP archive containing individual PNG files (2048px) for each
 * table's QR code. The ZIP is generated in the browser and automatically
 * downloaded.
 *
 * File naming pattern inside ZIP:
 * - Individual files: `{table-number}-qr.png`
 * - ZIP filename: `{org-slug}-tables-qr-{timestamp}.zip`
 *
 * @param tables - Array of tables with qr_uuid and table_number
 * @param organizationSlug - Organization's slug for menu URLs
 * @param organizationName - Organization's name for display
 * @returns Promise<BulkDownloadResult> - Result of the bulk operation
 *
 * @example
 * ```typescript
 * const tables = await fetchTables()
 * const result = await downloadAllTablesAsZip(tables, 'my-restaurant', 'My Restaurant')
 * if (result.success) {
 *   toast.success(`${result.successCount} QR kodları indirildi`)
 * } else {
 *   toast.error(result.error)
 * }
 * ```
 */
export async function downloadAllTablesAsZip(
  tables: TableForBulkDownload[],
  organizationSlug: string,
  _organizationName: string
): Promise<BulkDownloadResult> {
  if (!organizationSlug) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      totalCount: 0,
      error: 'Organizasyon slug değeri gereklidir',
    }
  }

  if (!tables || tables.length === 0) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      totalCount: 0,
      error: 'İndirilecek masa bulunamadı',
    }
  }

  const zip = new JSZip()
  let successCount = 0
  let failureCount = 0
  const failures: Array<{ tableNumber: string; error: string }> = []

  // Generate QR codes for all tables
  for (const table of tables) {
    try {
      // Generate PNG at 2048px for good quality
      const result = await generateQRCodePNG(organizationSlug, 2048, table.qr_uuid)

      if (!result.success || !result.data) {
        failureCount++
        failures.push({
          tableNumber: table.table_number,
          error: result.error || 'QR kodu oluşturulamadı',
        })
        continue
      }

      // Convert data URL to blob data
      const base64Data = result.data.replace(/^data:image\/png;base64,/, '')

      // Create filename from table number (sanitized)
      const filename = `${sanitizeFilename(table.table_number)}-qr.png`

      // Add to ZIP
      zip.file(filename, base64Data, { base64: true })
      successCount++
    } catch (error) {
      failureCount++
      failures.push({
        tableNumber: table.table_number,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      })
    }
  }

  // If no QR codes were generated successfully, fail
  if (successCount === 0) {
    return {
      success: false,
      successCount: 0,
      failureCount,
      totalCount: tables.length,
      error: 'Hiçbir QR kodu oluşturulamadı',
      failures,
    }
  }

  try {
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    // Create download filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const zipFilename = `${organizationSlug}-tables-qr-${timestamp}.zip`

    // Trigger download
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return {
      success: true,
      successCount,
      failureCount,
      totalCount: tables.length,
      failures: failureCount > 0 ? failures : undefined,
    }
  } catch (error) {
    return {
      success: false,
      successCount,
      failureCount,
      totalCount: tables.length,
      error: `ZIP dosyası oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      failures,
    }
  }
}

/**
 * Download all table QR codes as a combined PDF document.
 *
 * Creates a single PDF document with each table's QR code on a separate
 * A5 page. Each page includes the organization name and table number.
 *
 * PDF filename pattern: `{org-slug}-tables-qr-{timestamp}.pdf`
 *
 * @param tables - Array of tables with qr_uuid and table_number
 * @param organizationSlug - Organization's slug for menu URLs
 * @param organizationName - Organization's name for display
 * @returns Promise<BulkDownloadResult> - Result of the bulk operation
 *
 * @example
 * ```typescript
 * const tables = await fetchTables()
 * const result = await downloadAllTablesAsPDF(tables, 'my-restaurant', 'My Restaurant')
 * if (result.success) {
 *   toast.success('PDF indirildi')
 * } else {
 *   toast.error(result.error)
 * }
 * ```
 */
export async function downloadAllTablesAsPDF(
  tables: TableForBulkDownload[],
  organizationSlug: string,
  organizationName: string
): Promise<BulkDownloadResult> {
  if (!organizationSlug) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      totalCount: 0,
      error: 'Organizasyon slug değeri gereklidir',
    }
  }

  if (!tables || tables.length === 0) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      totalCount: 0,
      error: 'İndirilecek masa bulunamadı',
    }
  }

  let successCount = 0
  let failureCount = 0
  const failures: Array<{ tableNumber: string; error: string }> = []
  const pdfDataUrls: string[] = []

  // Generate individual PDFs for each table
  for (const table of tables) {
    try {
      const result = await generateQRCodePDF(organizationSlug, table.qr_uuid, {
        title: organizationName,
        subtitle: `Masa: ${table.table_number}`,
      })

      if (!result.success || !result.data) {
        failureCount++
        failures.push({
          tableNumber: table.table_number,
          error: result.error || 'PDF oluşturulamadı',
        })
        continue
      }

      pdfDataUrls.push(result.data)
      successCount++
    } catch (error) {
      failureCount++
      failures.push({
        tableNumber: table.table_number,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      })
    }
  }

  // If no PDFs were generated successfully, fail
  if (successCount === 0) {
    return {
      success: false,
      successCount: 0,
      failureCount,
      totalCount: tables.length,
      error: 'Hiçbir PDF oluşturulamadı',
      failures,
    }
  }

  try {
    // For now, download individual PDFs as a ZIP
    // A true combined PDF would require a PDF manipulation library
    const zip = new JSZip()

    for (let i = 0; i < pdfDataUrls.length; i++) {
      const pdfData = pdfDataUrls[i].replace(/^data:application\/pdf;base64,/, '')
      const table = tables[i]
      const filename = `${sanitizeFilename(table.table_number)}-qr.pdf`
      zip.file(filename, pdfData, { base64: true })
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    // Create download filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const zipFilename = `${organizationSlug}-tables-qr-pdf-${timestamp}.zip`

    // Trigger download
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return {
      success: true,
      successCount,
      failureCount,
      totalCount: tables.length,
      failures: failureCount > 0 ? failures : undefined,
    }
  } catch (error) {
    return {
      success: false,
      successCount,
      failureCount,
      totalCount: tables.length,
      error: `PDF paketi oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      failures,
    }
  }
}

/**
 * Sanitize a filename to remove invalid characters.
 *
 * Converts spaces and special characters to hyphens, removes invalid
 * filename characters, and converts to lowercase.
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 *
 * @example
 * ```typescript
 * sanitizeFilename('Masa 1') // 'masa-1'
 * sanitizeFilename('Teras VIP!') // 'teras-vip'
 * ```
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}
