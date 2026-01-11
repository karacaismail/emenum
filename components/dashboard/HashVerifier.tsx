/**
 * Hash Verifier Component
 *
 * Snapshot'ların SHA-256 hash'inin saklanmış hash ile eşleştiğini doğrulayan
 * utility component. Bu doğrulama, snapshot'ın değiştirilmediğini kanıtlar
 * ve hukuki uyumluluk için kritik öneme sahiptir.
 *
 * @example
 * ```tsx
 * // Tek snapshot doğrulama
 * <HashVerifier snapshotId="snapshot-uuid" />
 *
 * // Tüm snapshot'ları doğrulama
 * <HashVerifier organizationId="org-uuid" mode="all" />
 *
 * // Modal içinde kullanım
 * <HashVerifierModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   snapshotId="snapshot-uuid"
 * />
 *
 * // Button olarak kullanım
 * <HashVerifierButton snapshotId="snapshot-uuid" />
 * ```
 */

'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UUID, MenuSnapshotData } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Verification result for a single snapshot
 */
export interface SingleVerificationResult {
  snapshotId: UUID;
  isValid: boolean;
  storedHash: string;
  computedHash: string;
  createdAt: Date;
  productCount: number;
}

/**
 * Verification result for all snapshots
 */
export interface BulkVerificationResult {
  total: number;
  valid: number;
  invalid: UUID[];
  verifiedAt: Date;
}

/**
 * Hash verification status
 */
export type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error' | 'tampered';

export interface HashVerifierProps {
  /** Snapshot UUID to verify (for single mode) */
  snapshotId?: UUID;
  /** Organization UUID (for bulk mode) */
  organizationId?: UUID;
  /** Verification mode: single snapshot or all snapshots */
  mode?: 'single' | 'all';
  /** Auto-verify on mount */
  autoVerify?: boolean;
  /** Show detailed result */
  showDetails?: boolean;
  /** Callback when verification completes */
  onVerify?: (result: SingleVerificationResult | BulkVerificationResult) => void;
  /** Callback when tampered snapshot is detected */
  onTamperDetected?: (snapshotIds: UUID[]) => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Shield: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  ShieldExclamation: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Compute SHA-256 hash of data (client-side using Web Crypto API)
 */
async function computeHash(data: MenuSnapshotData): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format date in Turkish locale
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


// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface HashDisplayProps {
  label: string;
  hash: string;
  isMatch?: boolean;
  showCopy?: boolean;
}

function HashDisplay({ label, hash, isMatch, showCopy = true }: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Icons.Hash />
        <span>{label}</span>
        {isMatch !== undefined && (
          <span className={isMatch ? 'text-green-600' : 'text-red-600'}>
            {isMatch ? <Icons.Check /> : <Icons.X />}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs font-mono text-gray-700 break-all">
          {hash}
        </code>
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Kopyala"
          >
            {copied ? <Icons.Check /> : <Icons.Copy />}
          </button>
        )}
      </div>
    </div>
  );
}

interface VerificationBadgeProps {
  status: VerificationStatus;
}

function VerificationBadge({ status }: VerificationBadgeProps) {
  switch (status) {
    case 'verifying':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
          <Icons.Spinner />
          Dogrulanıyor...
        </span>
      );
    case 'success':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
          <Icons.ShieldCheck />
          Dogrulandı
        </span>
      );
    case 'tampered':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-full">
          <Icons.ShieldExclamation />
          Degisiklik Tespit Edildi!
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
          <Icons.Info />
          Dogrulama Basarısız
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
          <Icons.Shield />
          Dogrulama Bekliyor
        </span>
      );
  }
}

// =============================================================================
// SINGLE VERIFICATION RESULT
// =============================================================================

interface SingleResultDisplayProps {
  result: SingleVerificationResult;
  showDetails: boolean;
}

function SingleResultDisplay({ result, showDetails }: SingleResultDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`
          p-4 rounded-lg border
          ${result.isValid
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
          }
        `}
      >
        <div className="flex items-start gap-3">
          <div
            className={`
              flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full
              ${result.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
            `}
          >
            {result.isValid ? <Icons.ShieldCheck /> : <Icons.ShieldExclamation />}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold ${result.isValid ? 'text-green-800' : 'text-red-800'}`}>
              {result.isValid
                ? 'Snapshot Butunlugu Dogrulandı'
                : 'UYARI: Snapshot Degistirilmis Olabilir!'
              }
            </h4>
            <p className={`text-sm mt-1 ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {result.isValid
                ? 'Hesaplanan SHA-256 hash, saklanan hash ile eslesiyor. Bu snapshot olusturuldugu zamandan beri degistirilmemis.'
                : 'Hesaplanan SHA-256 hash, saklanan hash ile esleSMIyor. Bu snapshot degistirilmis olabilir veya veri bozulmasi yasanmis olabilir.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Snapshot ID:</span>
              <p className="font-mono text-xs text-gray-700 mt-1">{result.snapshotId}</p>
            </div>
            <div>
              <span className="text-gray-500">Olusturulma Tarihi:</span>
              <p className="text-gray-700 mt-1">{formatDateTime(result.createdAt)}</p>
            </div>
            <div>
              <span className="text-gray-500">Urun Sayısı:</span>
              <p className="text-gray-700 mt-1">{result.productCount} urun</p>
            </div>
            <div>
              <span className="text-gray-500">Durum:</span>
              <p className={`mt-1 font-medium ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {result.isValid ? 'Gecerli' : 'Gecersiz'}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-gray-200">
            <HashDisplay
              label="Saklanan Hash"
              hash={result.storedHash}
              isMatch={result.isValid}
            />
            <HashDisplay
              label="Hesaplanan Hash"
              hash={result.computedHash}
              isMatch={result.isValid}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BULK VERIFICATION RESULT
// =============================================================================

interface BulkResultDisplayProps {
  result: BulkVerificationResult;
  showDetails: boolean;
}

function BulkResultDisplay({ result, showDetails }: BulkResultDisplayProps) {
  const allValid = result.invalid.length === 0;
  const percentage = result.total > 0 ? Math.round((result.valid / result.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`
          p-4 rounded-lg border
          ${allValid
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
          }
        `}
      >
        <div className="flex items-start gap-3">
          <div
            className={`
              flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full
              ${allValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
            `}
          >
            {allValid ? <Icons.ShieldCheck /> : <Icons.ShieldExclamation />}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold ${allValid ? 'text-green-800' : 'text-red-800'}`}>
              {allValid
                ? 'Tum Snapshot\'lar Dogrulandı'
                : `${result.invalid.length} Snapshot'ta Sorun Tespit Edildi!`
              }
            </h4>
            <p className={`text-sm mt-1 ${allValid ? 'text-green-600' : 'text-red-600'}`}>
              {allValid
                ? `${result.total} snapshot incelendi, hepsi dogrulandi.`
                : `${result.total} snapshot incelendi, ${result.invalid.length} tanesinde tutarsızlık bulundu.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {showDetails && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{result.total}</p>
              <p className="text-xs text-gray-500 mt-1">Toplam Snapshot</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-600">{result.valid}</p>
              <p className="text-xs text-gray-500 mt-1">Gecerli</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-red-200">
              <p className="text-2xl font-bold text-red-600">{result.invalid.length}</p>
              <p className="text-xs text-gray-500 mt-1">Gecersiz</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Dogrulama Oranı</span>
              <span className={`font-medium ${allValid ? 'text-green-600' : 'text-red-600'}`}>
                %{percentage}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${allValid ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Invalid snapshot IDs */}
          {result.invalid.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-red-700 mb-2">
                Gecersiz Snapshot ID&apos;leri:
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.invalid.map((id) => (
                  <code key={id} className="block text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded">
                    {id}
                  </code>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
            <Icons.Info />
            <span className="ml-1">Dogrulama: {formatDateTime(result.verifiedAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HashVerifier({
  snapshotId,
  organizationId,
  mode = 'single',
  autoVerify = false,
  showDetails = true,
  onVerify,
  onTamperDetected,
  className = '',
}: HashVerifierProps) {
  // State
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<SingleVerificationResult | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkVerificationResult | null>(null);

  // Verify single snapshot
  const verifySingleSnapshot = useCallback(async () => {
    if (!snapshotId) {
      setError('Snapshot ID gerekli');
      setStatus('error');
      return;
    }

    setStatus('verifying');
    setError(null);
    setSingleResult(null);

    try {
      const supabase = createClient();

      // Fetch snapshot
      const { data: snapshot, error: fetchError } = await supabase
        .from('menu_snapshots')
        .select('id, sha256_hash, snapshot_json, created_at')
        .eq('id', snapshotId)
        .single();

      if (fetchError || !snapshot) {
        throw new Error('Snapshot bulunamadı');
      }

      // Compute hash from JSON data
      const snapshotData = snapshot.snapshot_json as MenuSnapshotData;
      const computedHash = await computeHash(snapshotData);
      const isValid = computedHash === snapshot.sha256_hash;

      const result: SingleVerificationResult = {
        snapshotId: snapshot.id,
        isValid,
        storedHash: snapshot.sha256_hash,
        computedHash,
        createdAt: new Date(snapshot.created_at),
        productCount: snapshotData.products?.length ?? 0,
      };

      setSingleResult(result);
      setStatus(isValid ? 'success' : 'tampered');

      if (onVerify) {
        onVerify(result);
      }

      if (!isValid && onTamperDetected) {
        onTamperDetected([snapshotId]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dogrulama sırasında hata olustu';
      setError(errorMessage);
      setStatus('error');
    }
  }, [snapshotId, onVerify, onTamperDetected]);

  // Verify all snapshots for organization
  const verifyAllSnapshots = useCallback(async () => {
    if (!organizationId) {
      setError('Organization ID gerekli');
      setStatus('error');
      return;
    }

    setStatus('verifying');
    setError(null);
    setBulkResult(null);

    try {
      const supabase = createClient();

      // Fetch all snapshots for organization
      const { data: snapshots, error: fetchError } = await supabase
        .from('menu_snapshots')
        .select('id, sha256_hash, snapshot_json')
        .eq('organization_id', organizationId);

      if (fetchError) {
        throw new Error('Snapshot\'lar yuklenemedi');
      }

      const invalid: UUID[] = [];
      let valid = 0;

      // Verify each snapshot
      for (const snapshot of snapshots || []) {
        const snapshotData = snapshot.snapshot_json as MenuSnapshotData;
        const computedHash = await computeHash(snapshotData);

        if (computedHash === snapshot.sha256_hash) {
          valid++;
        } else {
          invalid.push(snapshot.id);
        }
      }

      const result: BulkVerificationResult = {
        total: snapshots?.length ?? 0,
        valid,
        invalid,
        verifiedAt: new Date(),
      };

      setBulkResult(result);
      setStatus(invalid.length === 0 ? 'success' : 'tampered');

      if (onVerify) {
        onVerify(result);
      }

      if (invalid.length > 0 && onTamperDetected) {
        onTamperDetected(invalid);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dogrulama sırasında hata olustu';
      setError(errorMessage);
      setStatus('error');
    }
  }, [organizationId, onVerify, onTamperDetected]);

  // Auto-verify on mount if enabled
  // Note: We use autoVerify only on initial mount
  useState(() => {
    if (autoVerify) {
      if (mode === 'single' && snapshotId) {
        verifySingleSnapshot();
      } else if (mode === 'all' && organizationId) {
        verifyAllSnapshots();
      }
    }
  });

  // Handle verification trigger
  const handleVerify = () => {
    if (mode === 'single') {
      verifySingleSnapshot();
    } else {
      verifyAllSnapshots();
    }
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <Icons.Shield />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {mode === 'single' ? 'Hash Dogrulama' : 'Toplu Hash Dogrulama'}
            </h3>
            <p className="text-xs text-gray-500">
              {mode === 'single'
                ? 'Snapshot butunlugunu dogrula'
                : 'Tum snapshot\'ların butunlugunu dogrula'
              }
            </p>
          </div>
        </div>
        <VerificationBadge status={status} />
      </div>

      {/* Verify button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleVerify}
          disabled={status === 'verifying'}
          className={`
            inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
            ${status === 'verifying'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
            }
          `}
        >
          {status === 'verifying' ? (
            <>
              <Icons.Spinner />
              Dogrulanıyor...
            </>
          ) : (
            <>
              <Icons.Refresh />
              {mode === 'single' ? 'Dogrula' : 'Tumu Dogrula'}
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Icons.Info />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {mode === 'single' && singleResult && (
        <SingleResultDisplay result={singleResult} showDetails={showDetails} />
      )}

      {mode === 'all' && bulkResult && (
        <BulkResultDisplay result={bulkResult} showDetails={showDetails} />
      )}

      {/* Info text when idle */}
      {status === 'idle' && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Icons.Info />
            <div className="text-sm text-gray-600">
              <p>
                SHA-256 hash dogrulaması, snapshot verisinin olusturuldugu zamandan bu yana
                degistirilmedigini garantiler.
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-gray-500">
                <li>Saklanan JSON verisi hash&apos;lenir</li>
                <li>Hesaplanan hash, saklanan hash ile karsilastirilir</li>
                <li>Eslesen hash&apos;ler, veri butunlugunu dogrular</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Hash Verifier Modal wrapper
 */
export interface HashVerifierModalProps extends HashVerifierProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HashVerifierModal({
  isOpen,
  onClose,
  ...props
}: HashVerifierModalProps) {
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
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Hash Dogrulama</h2>
            <p className="text-sm text-gray-500">Snapshot butunlugunu dogrula</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            aria-label="Kapat"
          >
            <Icons.Close />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <HashVerifier {...props} />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Hash Verifier Card
 */
export type HashVerifierCardProps = Omit<HashVerifierProps, 'showDetails'>;

export function HashVerifierCard(props: HashVerifierCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <HashVerifier {...props} showDetails={false} />
    </div>
  );
}

/**
 * Hash Verifier Button - Opens modal on click
 */
export interface HashVerifierButtonProps extends Omit<HashVerifierProps, 'className'> {
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

export function HashVerifierButton({
  label = 'Hash Dogrula',
  variant = 'secondary',
  size = 'md',
  ...props
}: HashVerifierButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`
          inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
      >
        <Icons.Shield />
        {label}
      </button>

      <HashVerifierModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        {...props}
      />
    </>
  );
}

/**
 * Quick Hash Check - Inline badge that verifies on mount
 */
export interface QuickHashCheckProps {
  snapshotId: UUID;
  showLabel?: boolean;
}

export function QuickHashCheck({ snapshotId, showLabel = true }: QuickHashCheckProps) {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');

  // Verify on mount
  useState(() => {
    const verify = async () => {
      try {
        const supabase = createClient();

        const { data: snapshot } = await supabase
          .from('menu_snapshots')
          .select('sha256_hash, snapshot_json')
          .eq('id', snapshotId)
          .single();

        if (!snapshot) {
          setStatus('invalid');
          return;
        }

        const snapshotData = snapshot.snapshot_json as MenuSnapshotData;
        const computedHash = await computeHash(snapshotData);
        setStatus(computedHash === snapshot.sha256_hash ? 'valid' : 'invalid');
      } catch {
        setStatus('invalid');
      }
    };

    verify();
  });

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Icons.Spinner />
        {showLabel && 'Dogrulanıyor...'}
      </span>
    );
  }

  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <Icons.ShieldCheck />
        {showLabel && 'Dogrulandı'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600">
      <Icons.ShieldExclamation />
      {showLabel && 'Gecersiz'}
    </span>
  );
}
