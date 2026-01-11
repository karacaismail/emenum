'use client';

/**
 * Feature Overrides Client Component
 *
 * Admin ozellik override yonetimi icin client-side interactive component.
 * - Override listesi (arama, filtreleme)
 * - Override ekleme/duzenleme
 * - Override silme
 * - Gecici override'lar (expires_at)
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  FeatureOverrideWithDetails,
  OrganizationOption,
  FeatureOption,
  OverridesStats,
} from './page';

// =============================================================================
// TYPES
// =============================================================================

interface OverridesClientProps {
  initialOverrides: FeatureOverrideWithDetails[];
  organizations: OrganizationOption[];
  features: FeatureOption[];
  stats: OverridesStats;
}

interface OverrideFormData {
  organization_id: string;
  feature_key: string;
  override_value: boolean;
  override_limit: string;
  reason: string;
  expires_at: string;
}

type StatusFilter = 'all' | 'active' | 'expired';

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
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Spinner: () => (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Unlock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Az once';
  if (diffHours < 24) return `${diffHours} saat once`;
  if (diffDays === 1) return 'Dun';
  if (diffDays < 30) return `${diffDays} gun once`;
  return formatDate(dateStr);
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function getExpiryText(expiresAt: string | null): string {
  if (!expiresAt) return 'Suuresiz';
  const expDate = new Date(expiresAt);
  const now = new Date();
  if (expDate < now) return 'Suresi doldu';

  const diffMs = expDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Bugun sona eriyor';
  if (diffDays === 1) return 'Yarin sona eriyor';
  if (diffDays < 30) return `${diffDays} gun kaldi`;
  return formatDate(expiresAt);
}

function groupFeaturesByCategory(features: FeatureOption[]): Record<string, FeatureOption[]> {
  const groups: Record<string, FeatureOption[]> = {};
  features.forEach((feature) => {
    const category = feature.category || 'Diger';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(feature);
  });
  return groups;
}

const categoryLabels: Record<string, string> = {
  limits: 'Limitler',
  modules: 'Moduller',
  design: 'Tasarim',
  badges: 'Rozetler',
  premium: 'Premium',
  ui_features: 'Arayuz Ozellikleri',
  advanced: 'Gelismis',
  Diger: 'Diger',
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: number;
  isActive?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, isActive, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-lg border text-left transition-all w-full
        ${isActive
          ? 'bg-purple-900/50 border-purple-500 ring-2 ring-purple-500/50'
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </button>
  );
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function OverrideStatusBadge({ override }: { override: FeatureOverrideWithDetails }) {
  const expired = isExpired(override.expires_at);

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
        <Icons.Clock />
        Suresi Doldu
      </span>
    );
  }

  if (override.override_value) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-700/50">
        <Icons.Unlock />
        Izin Verildi
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-700/50">
      <Icons.Lock />
      Engellendi
    </span>
  );
}

// =============================================================================
// OVERRIDE ROW COMPONENT
// =============================================================================

interface OverrideRowProps {
  override: FeatureOverrideWithDetails;
  onEdit: (override: FeatureOverrideWithDetails) => void;
  onDelete: (override: FeatureOverrideWithDetails) => void;
  isDeleting: boolean;
}

function OverrideRow({ override, onEdit, onDelete, isDeleting }: OverrideRowProps) {
  const expired = isExpired(override.expires_at);

  return (
    <tr className={`border-b border-gray-700 hover:bg-gray-800/50 transition-colors ${expired ? 'opacity-60' : ''}`}>
      {/* Organization */}
      <td className="px-4 py-4">
        <div className="min-w-0">
          <div className="font-medium text-white truncate">{override.organization_name}</div>
          <div className="text-sm text-gray-400 truncate">/{override.organization_slug}</div>
        </div>
      </td>

      {/* Feature */}
      <td className="px-4 py-4">
        <div className="min-w-0">
          <div className="font-medium text-white truncate">{override.feature_name}</div>
          <div className="text-sm text-gray-500 truncate">{override.feature_key}</div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <OverrideStatusBadge override={override} />
        {override.override_limit !== null && override.feature_type === 'limit' && (
          <div className="mt-1 text-sm text-purple-400">
            Limit: {override.override_limit === -1 ? 'Sinirsiz' : override.override_limit}
          </div>
        )}
      </td>

      {/* Expiry */}
      <td className="px-4 py-4">
        <div className={`text-sm ${expired ? 'text-red-400' : 'text-gray-400'}`}>
          {getExpiryText(override.expires_at)}
        </div>
      </td>

      {/* Reason */}
      <td className="px-4 py-4">
        <div className="text-sm text-gray-400 truncate max-w-[200px]" title={override.reason || ''}>
          {override.reason || '-'}
        </div>
      </td>

      {/* Created */}
      <td className="px-4 py-4 text-sm text-gray-400">
        <div>{getTimeAgo(override.created_at)}</div>
        {override.created_by_email && (
          <div className="text-xs text-gray-500 truncate" title={override.created_by_email}>
            {override.created_by_name || override.created_by_email}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => onEdit(override)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Duzenle"
          >
            <Icons.Edit />
          </button>
          <button
            onClick={() => onDelete(override)}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="Sil"
          >
            {isDeleting ? <Icons.Spinner /> : <Icons.Trash />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="text-gray-400">{message}</p>
      </td>
    </tr>
  );
}

// =============================================================================
// PAGINATION COMPONENT
// =============================================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-700">
      <div className="text-sm text-gray-400">
        <span className="font-medium text-white">{totalItems}</span> kayittan{' '}
        <span className="font-medium text-white">{startItem}-{endItem}</span> gosteriliyor
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Icons.ChevronLeft />
        </button>
        <span className="text-sm text-gray-400">
          Sayfa {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Icons.ChevronRight />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// OVERRIDE FORM MODAL
// =============================================================================

interface OverrideFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  override?: FeatureOverrideWithDetails | null;
  organizations: OrganizationOption[];
  features: FeatureOption[];
  onSave: (data: OverrideFormData, overrideId?: string) => Promise<void>;
  isLoading: boolean;
}

function OverrideFormModal({
  isOpen,
  onClose,
  override,
  organizations,
  features,
  onSave,
  isLoading,
}: OverrideFormModalProps) {
  const isEditing = !!override;
  const groupedFeatures = useMemo(() => groupFeaturesByCategory(features), [features]);

  const [formData, setFormData] = useState<OverrideFormData>(() => ({
    organization_id: override?.organization_id || '',
    feature_key: override?.feature_key || '',
    override_value: override?.override_value ?? true,
    override_limit: override?.override_limit?.toString() || '',
    reason: override?.reason || '',
    expires_at: override?.expires_at ? override.expires_at.slice(0, 16) : '',
  }));
  const [error, setError] = useState<string | null>(null);

  // Get selected feature details
  const selectedFeature = useMemo(() => {
    return features.find((f) => f.key === formData.feature_key);
  }, [features, formData.feature_key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.organization_id) {
      setError('Organizasyon secimi gerekli');
      return;
    }

    if (!formData.feature_key) {
      setError('Ozellik secimi gerekli');
      return;
    }

    try {
      await onSave(formData, override?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Override Duzenle' : 'Yeni Override'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            >
              <Icons.X />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Organization Select */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Organizasyon</label>
              <select
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                disabled={isEditing}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
              >
                <option value="">Organizasyon secin...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.slug}) {org.plan_name ? `- ${org.plan_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Feature Select */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Ozellik</label>
              <select
                value={formData.feature_key}
                onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                disabled={isEditing}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
              >
                <option value="">Ozellik secin...</option>
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <optgroup key={category} label={categoryLabels[category] || category}>
                    {categoryFeatures.map((feature) => (
                      <option key={feature.key} value={feature.key}>
                        {feature.name} ({feature.feature_type === 'limit' ? 'Limit' : 'Boolean'})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedFeature?.description && (
                <p className="mt-1 text-xs text-gray-500">{selectedFeature.description}</p>
              )}
            </div>

            {/* Override Value */}
            <div className="p-4 bg-gray-800 rounded-lg space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Override Degeri</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.override_value === true}
                      onChange={() => setFormData({ ...formData, override_value: true })}
                      className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-green-400">Izin Ver (Ac)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.override_value === false}
                      onChange={() => setFormData({ ...formData, override_value: false })}
                      className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-red-400">Engelle (Kapat)</span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Bu deger, organizasyonun paketi ne olursa olsun gecerli olacak.
                </p>
              </div>

              {/* Limit Override (only for limit features) */}
              {selectedFeature?.feature_type === 'limit' && formData.override_value && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">
                    Limit Degeri (opsiyonel)
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.override_limit}
                    onChange={(e) => setFormData({ ...formData, override_limit: e.target.value })}
                    placeholder="-1 = Sinirsiz"
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    -1 girin sinirsiz icin, bos birakin plandaki limiti kullanmak icin.
                  </p>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Neden</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                placeholder="Override nedeni (opsiyonel)..."
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Expires At */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Bitis Tarihi (opsiyonel)</label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Bos birakilirsa override suresiz olarak kalir.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Iptal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? <Icons.Spinner /> : <Icons.Check />}
                {isEditing ? 'Kaydet' : 'Olustur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DELETE CONFIRMATION MODAL
// =============================================================================

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  override: FeatureOverrideWithDetails | null;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

function DeleteModal({ isOpen, onClose, override, onConfirm, isLoading }: DeleteModalProps) {
  if (!isOpen || !override) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-xl">
          <div className="p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-900/50 flex items-center justify-center">
              <Icons.Trash />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">
              Override Sil
            </h3>
            <p className="text-gray-400 text-center mb-6">
              <strong className="text-white">{override.organization_name}</strong> icin{' '}
              <strong className="text-white">{override.feature_name}</strong> override&apos;ini
              silmek istediginizden emin misiniz? Bu islem geri alinamaz.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? <Icons.Spinner /> : <Icons.Trash />}
                Sil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CLIENT COMPONENT
// =============================================================================

const ITEMS_PER_PAGE = 10;

export default function OverridesClient({
  initialOverrides,
  organizations,
  features,
  stats,
}: OverridesClientProps) {
  const router = useRouter();

  // State
  const [overrides, setOverrides] = useState(initialOverrides);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<FeatureOverrideWithDetails | null>(null);

  // Filter and search overrides
  const filteredOverrides = useMemo(() => {
    return overrides.filter((o) => {
      // Status filter
      const expired = isExpired(o.expires_at);
      if (statusFilter === 'active' && expired) return false;
      if (statusFilter === 'expired' && !expired) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOrg = o.organization_name.toLowerCase().includes(query);
        const matchesSlug = o.organization_slug.toLowerCase().includes(query);
        const matchesFeature = o.feature_name?.toLowerCase().includes(query) || false;
        const matchesKey = o.feature_key.toLowerCase().includes(query);
        const matchesReason = o.reason?.toLowerCase().includes(query) || false;

        if (!matchesOrg && !matchesSlug && !matchesFeature && !matchesKey && !matchesReason) {
          return false;
        }
      }

      return true;
    });
  }, [overrides, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredOverrides.length / ITEMS_PER_PAGE);
  const paginatedOverrides = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOverrides.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOverrides, currentPage]);

  // Reset page when filters change
  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Save override (create or update)
  const handleSaveOverride = useCallback(async (data: OverrideFormData, overrideId?: string) => {
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();

      const overrideData = {
        organization_id: data.organization_id,
        feature_key: data.feature_key,
        override_value: data.override_value,
        override_limit: data.override_limit ? parseInt(data.override_limit, 10) : null,
        reason: data.reason || null,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        created_by: user?.id || null,
      };

      if (overrideId) {
        // Update existing override
        const { error } = await supabase
          .from('organization_feature_overrides')
          .update({
            override_value: overrideData.override_value,
            override_limit: overrideData.override_limit,
            reason: overrideData.reason,
            expires_at: overrideData.expires_at,
          })
          .eq('id', overrideId);

        if (error) throw error;
      } else {
        // Create new override - check for existing
        const { data: existing } = await supabase
          .from('organization_feature_overrides')
          .select('id')
          .eq('organization_id', data.organization_id)
          .eq('feature_key', data.feature_key)
          .maybeSingle();

        if (existing) {
          throw new Error('Bu organizasyon ve ozellik icin zaten bir override var. Lutfen mevcut override\'i duzenleyin.');
        }

        const { error } = await supabase
          .from('organization_feature_overrides')
          .insert(overrideData);

        if (error) throw error;
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Delete override
  const handleDeleteOverride = useCallback(async () => {
    if (!selectedOverride) return;

    setDeletingId(selectedOverride.id);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('organization_feature_overrides')
        .delete()
        .eq('id', selectedOverride.id);

      if (error) throw error;

      // Update local state
      setOverrides((prev) => prev.filter((o) => o.id !== selectedOverride.id));
      setDeleteModalOpen(false);
      setSelectedOverride(null);
    } catch (error) {
      console.error('Error deleting override:', error);
      alert('Override silinirken bir hata olustu.');
    } finally {
      setDeletingId(null);
    }
  }, [selectedOverride]);

  // Open edit modal
  const handleEditOverride = useCallback((override: FeatureOverrideWithDetails) => {
    setSelectedOverride(override);
    setFormModalOpen(true);
  }, []);

  // Open delete modal
  const handleOpenDeleteModal = useCallback((override: FeatureOverrideWithDetails) => {
    setSelectedOverride(override);
    setDeleteModalOpen(true);
  }, []);

  // Open new override modal
  const handleNewOverride = useCallback(() => {
    setSelectedOverride(null);
    setFormModalOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ozellik Override</h1>
          <p className="text-gray-400 mt-1">
            Organizasyonlara plandaki ozelliklerden bagimsiz izin ver veya kapat
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isRefreshing ? <Icons.Spinner /> : <Icons.Refresh />}
            Yenile
          </button>
          <button
            onClick={handleNewOverride}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Icons.Plus />
            Yeni Override
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Override"
          value={stats.total_overrides}
          isActive={statusFilter === 'all'}
          onClick={() => handleStatusFilterChange('all')}
        />
        <StatCard
          label="Aktif"
          value={stats.active_overrides}
          isActive={statusFilter === 'active'}
          onClick={() => handleStatusFilterChange('active')}
        />
        <StatCard
          label="Suresi Dolmus"
          value={stats.expired_overrides}
          isActive={statusFilter === 'expired'}
          onClick={() => handleStatusFilterChange('expired')}
        />
        <StatCard
          label="Organizasyon"
          value={stats.orgs_with_overrides}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="Organizasyon, ozellik veya neden ile ara..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Results Summary */}
      {(searchQuery || statusFilter !== 'all') && (
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-gray-400">
            <span className="font-medium text-white">{filteredOverrides.length}</span> sonuc bulundu
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}

      {/* Overrides Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Organizasyon
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ozellik
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Gecerlilik
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Neden
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Olusturulma
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Islemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedOverrides.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery || statusFilter !== 'all'
                      ? 'Aramaniza uygun override bulunamadi.'
                      : 'Henuz override bulunmuyor.'
                  }
                />
              ) : (
                paginatedOverrides.map((override) => (
                  <OverrideRow
                    key={override.id}
                    override={override}
                    onEdit={handleEditOverride}
                    onDelete={handleOpenDeleteModal}
                    isDeleting={deletingId === override.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredOverrides.length > ITEMS_PER_PAGE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOverrides.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Override Form Modal */}
      <OverrideFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedOverride(null);
        }}
        override={selectedOverride}
        organizations={organizations}
        features={features}
        onSave={handleSaveOverride}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedOverride(null);
        }}
        override={selectedOverride}
        onConfirm={handleDeleteOverride}
        isLoading={deletingId !== null}
      />
    </div>
  );
}
