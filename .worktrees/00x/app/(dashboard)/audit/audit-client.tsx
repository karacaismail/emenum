/**
 * Audit Client Component
 *
 * Menu snapshot listesi, hash dogrulama ve JSON indirme islemleri
 * icin client-side component.
 *
 * Ozellikler:
 * - Snapshot listesi goruntuleme
 * - Hash dogrulama (data integrity check)
 * - JSON olarak indirme
 * - Sayfalama
 * - Fiyat degisikligiyle tetiklenen snapshot'larin isaretlenmesi
 */

'use client';

import { useState, useCallback } from 'react';
import { Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import type { SnapshotSummary } from '@/lib/services/snapshot';
import type { MenuSnapshot, MenuSnapshotData } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface AuditClientProps {
  initialSnapshots: SnapshotSummary[];
  totalCount: number;
  itemsPerPage: number;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userRole: string;
}

interface VerificationStatus {
  snapshotId: string;
  status: 'pending' | 'verifying' | 'valid' | 'invalid' | 'error';
  message?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Empty: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
  Loader: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  PriceTag: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Hash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format date in Turkish locale
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format relative time in Turkish
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az once';
  if (diffMins < 60) return `${diffMins} dakika once`;
  if (diffHours < 24) return `${diffHours} saat once`;
  if (diffDays < 7) return `${diffDays} gun once`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta once`;

  return formatDate(date);
}

/**
 * Truncate hash for display
 */
function truncateHash(hash: string, length = 16): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length / 2)}...${hash.slice(-length / 2)}`;
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 hash in browser
 */
async function computeHashInBrowser(data: MenuSnapshotData): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AuditClient({
  initialSnapshots,
  totalCount,
  itemsPerPage,
  organizationId,
  organizationName,
  organizationSlug,
}: AuditClientProps) {
  // State
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>(initialSnapshots);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({});
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const supabase = createClient();
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchSnapshots = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * itemsPerPage;

      const { data, error } = await supabase
        .from('menu_snapshots')
        .select('id, created_at, sha256_hash, triggered_by_price_ledger_id, snapshot_json')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      if (error) throw error;

      const newSnapshots: SnapshotSummary[] = (data || []).map((s) => {
        const snapshotJson = s.snapshot_json as MenuSnapshotData;
        return {
          id: s.id,
          createdAt: new Date(s.created_at),
          productCount: snapshotJson?.products?.length ?? 0,
          hash: s.sha256_hash,
          triggeredByPriceChange: s.triggered_by_price_ledger_id !== null,
        };
      });

      setSnapshots(newSnapshots);
      setCurrentPage(page);
    } catch {
      // Error handling - silently fail and keep current state
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, itemsPerPage, supabase]);

  // =============================================================================
  // DOWNLOAD HANDLER
  // =============================================================================

  const handleDownload = useCallback(async (snapshotId: string) => {
    setDownloadingIds((prev) => new Set(prev).add(snapshotId));

    try {
      const { data, error } = await supabase
        .from('menu_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (error || !data) {
        throw new Error('Snapshot bulunamadi');
      }

      const snapshot = data as MenuSnapshot;
      const snapshotData = {
        id: snapshot.id,
        organization_id: snapshot.organization_id,
        sha256_hash: snapshot.sha256_hash,
        created_at: snapshot.created_at,
        triggered_by_price_ledger_id: snapshot.triggered_by_price_ledger_id,
        snapshot_json: snapshot.snapshot_json,
      };

      // Create downloadable JSON file
      const jsonString = JSON.stringify(snapshotData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date(snapshot.created_at).toISOString().split('T')[0];
      link.download = `menu-snapshot-${organizationSlug}-${dateStr}-${snapshotId.slice(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Error handling - could show toast here
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(snapshotId);
        return next;
      });
    }
  }, [organizationSlug, supabase]);

  // =============================================================================
  // VERIFY HANDLER
  // =============================================================================

  const handleVerify = useCallback(async (snapshotId: string, storedHash: string) => {
    setVerificationStatuses((prev) => ({
      ...prev,
      [snapshotId]: { snapshotId, status: 'verifying' },
    }));

    try {
      const { data, error } = await supabase
        .from('menu_snapshots')
        .select('snapshot_json')
        .eq('id', snapshotId)
        .single();

      if (error || !data) {
        throw new Error('Snapshot bulunamadi');
      }

      // Compute hash client-side
      const snapshotJson = data.snapshot_json as MenuSnapshotData;
      const computedHash = await computeHashInBrowser(snapshotJson);

      const isValid = computedHash === storedHash;

      setVerificationStatuses((prev) => ({
        ...prev,
        [snapshotId]: {
          snapshotId,
          status: isValid ? 'valid' : 'invalid',
          message: isValid
            ? 'Hash dogrulandi - Veri bozulmamis'
            : 'UYARI: Hash eslesmedi - Veri degistirilmis olabilir!',
        },
      }));
    } catch {
      setVerificationStatuses((prev) => ({
        ...prev,
        [snapshotId]: {
          snapshotId,
          status: 'error',
          message: 'Dogrulama sirasinda hata olustu',
        },
      }));
    }
  }, [supabase]);

  // =============================================================================
  // COPY HASH HANDLER
  // =============================================================================

  const handleCopyHash = useCallback(async (hash: string) => {
    const success = await copyToClipboard(hash);
    if (success) {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Denetim Kaydi</h1>
          <p className="text-gray-500 mt-1">
            Menu snapshot gecmisi ve hash dogrulama
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => fetchSnapshots(currentPage)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Icons.Refresh />
            Yenile
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg text-blue-600">
            <Icons.Shield />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">SHA-256 Hash ile Veri Butunlugu</h3>
            <p className="text-sm text-blue-700 mt-1">
              Her menu snapshot&apos;i SHA-256 hash ile imzalanir. Bu hash degerini kullanarak
              verinin degistirilip degistirilmedigini dogrulayabilirsiniz. Yasal uyumluluk
              icin bu kayitlar degistirilemez (immutable).
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <Icons.Calendar />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Snapshot</p>
              <p className="text-xl font-semibold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <Icons.Check />
            </div>
            <div>
              <p className="text-sm text-gray-500">Isletme</p>
              <p className="text-xl font-semibold text-gray-900">{organizationName}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <Icons.Hash />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hash Algoritmasi</p>
              <p className="text-xl font-semibold text-gray-900">SHA-256</p>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshots List */}
      {isLoading ? (
        <div className="card p-12 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Icons.Loader />
            <span>Yukleniyor...</span>
          </div>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Icons.Empty />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Henuz snapshot yok</h3>
          <p className="text-gray-500 mt-1">
            Fiyat degisiklikleri otomatik olarak snapshot olusturur.
          </p>
        </div>
      ) : (
        <>
          {/* Snapshots Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Urun Sayisi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SHA-256 Hash
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tetikleyen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Islemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {snapshots.map((snapshot) => {
                    const verification = verificationStatuses[snapshot.id];
                    const isDownloading = downloadingIds.has(snapshot.id);

                    return (
                      <tr key={snapshot.id} className="hover:bg-gray-50">
                        {/* Date */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-gray-400">
                              <Icons.Calendar />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatRelativeTime(snapshot.createdAt)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(snapshot.createdAt)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Product Count */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant="secondary" size="sm">
                            {snapshot.productCount} urun
                          </Badge>
                        </td>

                        {/* Hash */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                              {truncateHash(snapshot.hash)}
                            </code>
                            <button
                              onClick={() => handleCopyHash(snapshot.hash)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                              title="Hash'i kopyala"
                            >
                              {copiedHash === snapshot.hash ? (
                                <Icons.Check />
                              ) : (
                                <Icons.Copy />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Trigger */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {snapshot.triggeredByPriceChange ? (
                            <Badge variant="warning" size="sm" className="flex items-center gap-1 w-fit">
                              <Icons.PriceTag />
                              Fiyat Degisimi
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm">
                              Manuel
                            </Badge>
                          )}
                        </td>

                        {/* Verification Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {verification?.status === 'verifying' ? (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Icons.Loader />
                              <span className="text-xs">Dogrulaniyor...</span>
                            </div>
                          ) : verification?.status === 'valid' ? (
                            <Badge variant="success" size="sm" className="flex items-center gap-1 w-fit">
                              <Icons.Check />
                              Gecerli
                            </Badge>
                          ) : verification?.status === 'invalid' ? (
                            <Badge variant="error" size="sm" className="flex items-center gap-1 w-fit">
                              <Icons.Warning />
                              Gecersiz
                            </Badge>
                          ) : verification?.status === 'error' ? (
                            <Badge variant="error" size="sm">
                              Hata
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">Dogrulanmadi</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerify(snapshot.id, snapshot.hash)}
                              disabled={verification?.status === 'verifying'}
                              className="flex items-center gap-1"
                              title="Hash dogrula"
                            >
                              <Icons.Shield />
                              Dogrula
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDownload(snapshot.id)}
                              disabled={isDownloading}
                              className="flex items-center gap-1"
                              title="JSON indir"
                            >
                              {isDownloading ? <Icons.Loader /> : <Icons.Download />}
                              Indir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between card p-4">
              <div className="text-sm text-gray-500">
                Sayfa {currentPage} / {totalPages} ({totalCount} kayit)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchSnapshots(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <Icons.ChevronLeft />
                  Onceki
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchSnapshots(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Sonraki
                  <Icons.ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Verification Details Section */}
      {Object.values(verificationStatuses).some(v => v.status === 'valid' || v.status === 'invalid') && (
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-3">Dogrulama Sonuclari</h3>
          <div className="space-y-2">
            {Object.values(verificationStatuses)
              .filter(v => v.status === 'valid' || v.status === 'invalid')
              .map((v) => (
                <div
                  key={v.snapshotId}
                  className={`p-3 rounded-lg ${
                    v.status === 'valid' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {v.status === 'valid' ? <Icons.Check /> : <Icons.Warning />}
                    <span className="font-medium">
                      Snapshot {v.snapshotId.slice(0, 8)}...
                    </span>
                    <span className="text-sm">{v.message}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
