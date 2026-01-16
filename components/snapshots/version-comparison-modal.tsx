'use client'

import React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

export interface VersionComparisonResult {
  addedProducts: string[]
  removedProducts: string[]
  addedCategories: string[]
  removedCategories: string[]
}

export interface VersionComparisonModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Comparison result data */
  comparisonResult: VersionComparisonResult | null
  /** The two versions being compared */
  selectedVersions: number[]
}

/**
 * Version comparison modal component
 *
 * Displays a side-by-side comparison of two menu snapshot versions,
 * showing which products and categories were added or removed between versions.
 *
 * @example
 * ```tsx
 * <VersionComparisonModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   comparisonResult={result}
 *   selectedVersions={[1, 2]}
 * />
 * ```
 */
export function VersionComparisonModal({
  isOpen,
  onClose,
  comparisonResult,
  selectedVersions,
}: VersionComparisonModalProps) {
  if (!comparisonResult) {
    return null
  }

  const olderVersion = Math.min(...selectedVersions)
  const newerVersion = Math.max(...selectedVersions)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Versiyon Karsilastirmasi"
      description={`Versiyon ${olderVersion} ve Versiyon ${newerVersion} arasindaki farklar`}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Comparison header */}
        <div className="rounded-lg bg-secondary-50 p-4 dark:bg-secondary-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Versiyon {olderVersion}
              </span>
              <svg className="h-4 w-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                Versiyon {newerVersion}
              </span>
            </div>
            <span className="text-secondary-600 dark:text-secondary-400">
              {comparisonResult.addedProducts.length + comparisonResult.removedProducts.length +
               comparisonResult.addedCategories.length + comparisonResult.removedCategories.length} degisiklik
            </span>
          </div>
        </div>

        {/* Products section */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-secondary-900 dark:text-secondary-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Urunler
          </h3>

          {/* Added Products */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Eklenen Urunler
              <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {comparisonResult.addedProducts.length}
              </span>
            </h4>
            {comparisonResult.addedProducts.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <ul className="space-y-1.5">
                  {comparisonResult.addedProducts.map((id) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300"
                    >
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      <span className="font-mono text-xs">{id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Eklenen urun yok
              </p>
            )}
          </div>

          {/* Removed Products */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
              Cikarilan Urunler
              <span className="ml-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {comparisonResult.removedProducts.length}
              </span>
            </h4>
            {comparisonResult.removedProducts.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <ul className="space-y-1.5">
                  {comparisonResult.removedProducts.map((id) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300"
                    >
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      <span className="font-mono text-xs">{id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Cikarilan urun yok
              </p>
            )}
          </div>
        </div>

        {/* Categories section */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-secondary-900 dark:text-secondary-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Kategoriler
          </h3>

          {/* Added Categories */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Eklenen Kategoriler
              <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {comparisonResult.addedCategories.length}
              </span>
            </h4>
            {comparisonResult.addedCategories.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <ul className="space-y-1.5">
                  {comparisonResult.addedCategories.map((id) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300"
                    >
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      <span className="font-mono text-xs">{id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Eklenen kategori yok
              </p>
            )}
          </div>

          {/* Removed Categories */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
              Cikarilan Kategoriler
              <span className="ml-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {comparisonResult.removedCategories.length}
              </span>
            </h4>
            {comparisonResult.removedCategories.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <ul className="space-y-1.5">
                  {comparisonResult.removedCategories.map((id) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300"
                    >
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      <span className="font-mono text-xs">{id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Cikarilan kategori yok
              </p>
            )}
          </div>
        </div>

        {/* No changes message */}
        {comparisonResult.addedProducts.length === 0 &&
          comparisonResult.removedProducts.length === 0 &&
          comparisonResult.addedCategories.length === 0 &&
          comparisonResult.removedCategories.length === 0 && (
            <div className="rounded-lg bg-secondary-50 p-6 text-center dark:bg-secondary-800/50">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Degisiklik Yok
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Bu iki versiyon arasinda hicbir fark bulunamadi
              </p>
            </div>
          )}
      </div>
    </Modal>
  )
}
