'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { getSnapshotHistory, compareSnapshots } from '@/lib/services/snapshot'
import { VersionComparisonModal } from '@/components/snapshots/version-comparison-modal'
import type { MenuSnapshot } from '@/types/database'

/**
 * Format date for display in Turkish locale
 */
function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Az once'
  if (diffMins < 60) return `${diffMins} dakika once`
  if (diffHours < 24) return `${diffHours} saat once`
  if (diffDays < 7) return `${diffDays} gun once`
  return formatDate(dateString)
}

/**
 * Snapshots page - Menu version history and comparison
 *
 * Displays a list of all menu snapshots with version numbers and dates.
 * Allows selecting two snapshots to compare what changed between versions.
 */
export default function SnapshotsPage() {
  const { organization } = useAuth()
  const [snapshots, setSnapshots] = useState<MenuSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selection state for comparison
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<{
    addedProducts: string[]
    removedProducts: string[]
    addedCategories: string[]
    removedCategories: string[]
  } | null>(null)

  /**
   * Fetch snapshot history from the database
   */
  const fetchSnapshots = useCallback(async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getSnapshotHistory(organization.id, {
        limit: 100,
        offset: 0,
      })

      if (result.success && result.data) {
        setSnapshots(result.data)
      } else {
        setError(result.error || 'Snapshot gecmisi yuklenemedi')
      }
    } catch {
      setError('Snapshot gecmisi yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  /**
   * Toggle version selection for comparison
   */
  const toggleVersionSelection = (version: number) => {
    setSelectedVersions((prev) => {
      if (prev.includes(version)) {
        return prev.filter((v) => v !== version)
      } else if (prev.length < 2) {
        return [...prev, version]
      } else {
        // Replace the first selected version
        return [prev[1], version]
      }
    })
  }

  /**
   * Compare two selected versions
   */
  const handleCompare = async () => {
    if (!organization?.id || selectedVersions.length !== 2) return

    setIsComparing(true)
    setError(null)

    try {
      const [versionA, versionB] = selectedVersions.sort((a, b) => a - b)
      const result = await compareSnapshots(organization.id, versionA, versionB)

      if (result.success) {
        setComparisonResult({
          addedProducts: result.addedProducts,
          removedProducts: result.removedProducts,
          addedCategories: result.addedCategories,
          removedCategories: result.removedCategories,
        })
      } else {
        setError(result.error || 'Karsilastirma yapilamadi')
      }
    } catch {
      setError('Karsilastirma sirasinda bir hata olustu.')
    } finally {
      setIsComparing(false)
    }
  }

  /**
   * Close comparison modal
   */
  const closeComparisonModal = () => {
    setComparisonResult(null)
  }

  /**
   * Clear selection
   */
  const clearSelection = () => {
    setSelectedVersions([])
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Menu Snapshot'lari
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Menu yayinlama gecmisinizi gorun ve versiyonlari karsilastirin
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchSnapshots}
          leftIcon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          Yenile
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          role="alert"
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Comparison controls */}
      {selectedVersions.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-secondary-700 dark:text-secondary-300">
                  {selectedVersions.length === 1
                    ? '1 versiyon secildi'
                    : `${selectedVersions.length} versiyon secildi`}
                </span>
                {selectedVersions.length === 2 && (
                  <span className="text-secondary-500 dark:text-secondary-400">
                    (Versiyon {Math.min(...selectedVersions)} ve {Math.max(...selectedVersions)})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearSelection}
                >
                  Secimi Temizle
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCompare}
                  disabled={selectedVersions.length !== 2}
                  isLoading={isComparing}
                >
                  Karsilastir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snapshots list */}
      <Card>
        <CardHeader
          title="Snapshot Gecmisi"
          subtitle={`Toplam ${snapshots.length} snapshot`}
        />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Henuz snapshot yok
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Menu yayinladiginizda otomatik olarak snapshot olusturulur
              </p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {snapshots.map((snapshot) => {
                const isSelected = selectedVersions.includes(snapshot.version)
                return (
                  <button
                    key={snapshot.id}
                    type="button"
                    onClick={() => toggleVersionSelection(snapshot.version)}
                    className={`group flex w-full items-start gap-4 px-2 py-4 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-secondary-50 dark:hover:bg-secondary-800/50'
                    }`}
                  >
                    {/* Selection checkbox */}
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          isSelected
                            ? 'border-primary-600 bg-primary-600 dark:border-primary-500 dark:bg-primary-500'
                            : 'border-secondary-300 bg-white dark:border-secondary-600 dark:bg-secondary-800'
                        }`}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Snapshot icon */}
                    <div className="mt-0.5 shrink-0 rounded-lg bg-secondary-100 p-2 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>

                    {/* Snapshot details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Version badge */}
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Versiyon {snapshot.version}
                        </span>
                      </div>

                      {/* Hash preview */}
                      <p className="mt-1 truncate text-sm text-secondary-900 dark:text-secondary-100">
                        <span className="font-mono text-xs text-secondary-600 dark:text-secondary-400">
                          Hash: {snapshot.hash.slice(0, 16)}...
                        </span>
                      </p>

                      {/* Timestamp */}
                      <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                        {formatRelativeTime(snapshot.created_at)}
                      </p>
                    </div>

                    {/* Arrow icon */}
                    <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                      <svg className="h-5 w-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary statistics */}
      {snapshots.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Toplam Snapshot
              </p>
              <p className="mt-1 text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {snapshots.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Son Yayinlama
              </p>
              <p className="mt-1 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                {formatRelativeTime(snapshots[0]?.created_at || '')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Guncel Versiyon
              </p>
              <p className="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
                {snapshots[0]?.version || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Modal */}
      <VersionComparisonModal
        isOpen={!!comparisonResult}
        onClose={closeComparisonModal}
        comparisonResult={comparisonResult}
        selectedVersions={selectedVersions}
      />
    </div>
  )
}
