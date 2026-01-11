/**
 * Feature Override Manager Component
 *
 * Super Admin icin organizasyon bazli ozellik override yonetimi.
 * Plandaki ozelliklerden bagimsiz olarak organizasyonlara izin ver veya kapat.
 *
 * Icerdikleri:
 * - Override listesi (organizasyon bazli)
 * - Override ekleme/duzenleme modal'i
 * - Override silme
 * - Gecici override'lar (expires_at)
 *
 * Kullanim:
 * - Tam sayfa yonetimi icin FeatureOverrideManager
 * - Organizasyon detay sayfasinda FeatureOverrideCard
 * - Modal acmak icin FeatureOverrideButton
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export interface FeatureOption {
  id: string;
  key: string;
  name: string;
  description: string | null;
  feature_type: 'boolean' | 'limit';
  category: string | null;
}

export interface FeatureOverride {
  id: string;
  organization_id: string;
  feature_key: string;
  override_value: boolean;
  override_limit: number | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface FeatureOverrideWithDetails extends FeatureOverride {
  feature_name: string | null;
  feature_type: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
}

export interface OrganizationBasic {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_name?: string | null;
}

export interface FeatureOverrideFormData {
  feature_key: string;
  override_value: boolean;
  override_limit: string;
  reason: string;
  expires_at: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
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
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Spinner: () => (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
  if (!expiresAt) return 'Suresiz';
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
// OVERRIDE STATUS BADGE
// =============================================================================

function OverrideStatusBadge({ override }: { override: FeatureOverride }) {
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
  compact?: boolean;
}

function OverrideRow({ override, onEdit, onDelete, isDeleting, compact }: OverrideRowProps) {
  const expired = isExpired(override.expires_at);

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 bg-gray-800 rounded-lg ${expired ? 'opacity-60' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white truncate">{override.feature_name || override.feature_key}</div>
          <div className="flex items-center gap-2 mt-1">
            <OverrideStatusBadge override={override} />
            {override.override_limit !== null && override.feature_type === 'limit' && (
              <span className="text-xs text-purple-400">
                Limit: {override.override_limit === -1 ? 'Sinirsiz' : override.override_limit}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={() => onEdit(override)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Duzenle"
          >
            <Icons.Edit />
          </button>
          <button
            onClick={() => onDelete(override)}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
            title="Sil"
          >
            {isDeleting ? <Icons.Spinner /> : <Icons.Trash />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <tr className={`border-b border-gray-700 hover:bg-gray-800/50 transition-colors ${expired ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3">
        <div className="font-medium text-white truncate">{override.feature_name || override.feature_key}</div>
        <div className="text-sm text-gray-500">{override.feature_key}</div>
      </td>
      <td className="px-4 py-3">
        <OverrideStatusBadge override={override} />
        {override.override_limit !== null && override.feature_type === 'limit' && (
          <div className="mt-1 text-sm text-purple-400">
            Limit: {override.override_limit === -1 ? 'Sinirsiz' : override.override_limit}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className={`text-sm ${expired ? 'text-red-400' : 'text-gray-400'}`}>
          {getExpiryText(override.expires_at)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-[150px]" title={override.reason || ''}>
        {override.reason || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        <div>{getTimeAgo(override.created_at)}</div>
        {override.created_by_email && (
          <div className="text-xs text-gray-500 truncate" title={override.created_by_email}>
            {override.created_by_name || override.created_by_email}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
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
// OVERRIDE FORM MODAL
// =============================================================================

export interface FeatureOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationBasic;
  features: FeatureOption[];
  override?: FeatureOverrideWithDetails | null;
  onSaveComplete?: (organizationId: string, featureKey: string) => void;
}

export function FeatureOverrideModal({
  isOpen,
  onClose,
  organization,
  features,
  override,
  onSaveComplete,
}: FeatureOverrideModalProps) {
  const isEditing = !!override;
  const groupedFeatures = useMemo(() => groupFeaturesByCategory(features), [features]);

  const [formData, setFormData] = useState<FeatureOverrideFormData>({
    feature_key: override?.feature_key || '',
    override_value: override?.override_value ?? true,
    override_limit: override?.override_limit?.toString() || '',
    reason: override?.reason || '',
    expires_at: override?.expires_at ? override.expires_at.slice(0, 16) : '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when override or open state changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        feature_key: override?.feature_key || '',
        override_value: override?.override_value ?? true,
        override_limit: override?.override_limit?.toString() || '',
        reason: override?.reason || '',
        expires_at: override?.expires_at ? override.expires_at.slice(0, 16) : '',
      });
      setError(null);
    }
  }, [isOpen, override]);

  // Get selected feature details
  const selectedFeature = useMemo(() => {
    return features.find((f) => f.key === formData.feature_key);
  }, [features, formData.feature_key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.feature_key) {
      setError('Ozellik secimi gerekli');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();

      const overrideData = {
        organization_id: organization.id,
        feature_key: formData.feature_key,
        override_value: formData.override_value,
        override_limit: formData.override_limit ? parseInt(formData.override_limit, 10) : null,
        reason: formData.reason || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        created_by: user?.id || null,
      };

      if (override?.id) {
        // Update existing override
        const { error: updateError } = await supabase
          .from('organization_feature_overrides')
          .update({
            override_value: overrideData.override_value,
            override_limit: overrideData.override_limit,
            reason: overrideData.reason,
            expires_at: overrideData.expires_at,
          })
          .eq('id', override.id);

        if (updateError) throw updateError;
      } else {
        // Check for existing override
        const { data: existing } = await supabase
          .from('organization_feature_overrides')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('feature_key', formData.feature_key)
          .maybeSingle();

        if (existing) {
          throw new Error('Bu ozellik icin zaten bir override var. Lutfen mevcut override\'i duzenleyin.');
        }

        // Create new override
        const { error: insertError } = await supabase
          .from('organization_feature_overrides')
          .insert(overrideData);

        if (insertError) throw insertError;
      }

      onSaveComplete?.(organization.id, formData.feature_key);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 bg-black/70"
        aria-hidden="true"
        onClick={() => !isLoading && onClose()}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 id="override-modal-title" className="text-lg font-semibold text-white">
                {isEditing ? 'Override Duzenle' : 'Yeni Override'}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {organization.name}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Icons.Close />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
                placeholder="Override nedeni (opsiyonel)... Ornegin: Ozel anlasma, Partner musteri"
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
              <div className="flex items-center gap-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                <Icons.Warning />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Iptal
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.feature_key}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

// =============================================================================
// DELETE CONFIRMATION MODAL
// =============================================================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  override: FeatureOverrideWithDetails | null;
  organization: OrganizationBasic;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

function DeleteConfirmModal({ isOpen, onClose, override, organization, onConfirm, isLoading }: DeleteConfirmModalProps) {
  if (!isOpen || !override) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-xl">
          <div className="p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-900/50 flex items-center justify-center text-red-400">
              <Icons.Trash />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">
              Override Sil
            </h3>
            <p className="text-gray-400 text-center mb-6">
              <strong className="text-white">{organization.name}</strong> icin{' '}
              <strong className="text-white">{override.feature_name || override.feature_key}</strong> override&apos;ini
              silmek istediginizden emin misiniz? Bu islem geri alinamaz.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
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

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

// =============================================================================
// FEATURE OVERRIDE CARD (for embedding in organization pages)
// =============================================================================

export interface FeatureOverrideCardProps {
  organization: OrganizationBasic;
  features: FeatureOption[];
  initialOverrides?: FeatureOverrideWithDetails[];
  onOverrideChange?: (organizationId: string) => void;
  compact?: boolean;
}

export function FeatureOverrideCard({
  organization,
  features,
  initialOverrides,
  onOverrideChange,
  compact = false,
}: FeatureOverrideCardProps) {
  const [overrides, setOverrides] = useState<FeatureOverrideWithDetails[]>(initialOverrides || []);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(!initialOverrides);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<FeatureOverrideWithDetails | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create feature key to info map
  const featureKeyMap = useMemo(() => {
    const map: Record<string, { name: string; type: string }> = {};
    features.forEach((f) => {
      map[f.key] = { name: f.name, type: f.feature_type };
    });
    return map;
  }, [features]);

  // Load overrides if not provided
  useEffect(() => {
    if (initialOverrides) return;

    const loadOverrides = async () => {
      setIsLoadingOverrides(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('organization_feature_overrides')
          .select(`
            id,
            organization_id,
            feature_key,
            override_value,
            override_limit,
            reason,
            created_by,
            created_at,
            expires_at,
            users:created_by(email, full_name)
          `)
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        interface RawOverride {
          id: string;
          organization_id: string;
          feature_key: string;
          override_value: boolean;
          override_limit: number | null;
          reason: string | null;
          created_by: string | null;
          created_at: string;
          expires_at: string | null;
          users: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
        }

        const processedOverrides: FeatureOverrideWithDetails[] = ((data as RawOverride[]) || []).map((o) => {
          const user = Array.isArray(o.users) ? o.users[0] : o.users;
          const featureInfo = featureKeyMap[o.feature_key];

          return {
            id: o.id,
            organization_id: o.organization_id,
            feature_key: o.feature_key,
            override_value: o.override_value,
            override_limit: o.override_limit,
            reason: o.reason,
            created_by: o.created_by,
            created_at: o.created_at,
            expires_at: o.expires_at,
            feature_name: featureInfo?.name || o.feature_key,
            feature_type: featureInfo?.type || 'boolean',
            created_by_email: user?.email || null,
            created_by_name: user?.full_name || null,
          };
        });

        setOverrides(processedOverrides);
      } catch (err) {
        console.error('Error loading overrides:', err);
      } finally {
        setIsLoadingOverrides(false);
      }
    };

    loadOverrides();
  }, [organization.id, initialOverrides, featureKeyMap]);

  // Handle save complete
  const handleSaveComplete = useCallback(async () => {
    // Reload overrides
    const supabase = createClient();
    const { data } = await supabase
      .from('organization_feature_overrides')
      .select(`
        id,
        organization_id,
        feature_key,
        override_value,
        override_limit,
        reason,
        created_by,
        created_at,
        expires_at,
        users:created_by(email, full_name)
      `)
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    interface RawOverride {
      id: string;
      organization_id: string;
      feature_key: string;
      override_value: boolean;
      override_limit: number | null;
      reason: string | null;
      created_by: string | null;
      created_at: string;
      expires_at: string | null;
      users: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
    }

    if (data) {
      const processedOverrides: FeatureOverrideWithDetails[] = ((data as RawOverride[]) || []).map((o) => {
        const user = Array.isArray(o.users) ? o.users[0] : o.users;
        const featureInfo = featureKeyMap[o.feature_key];

        return {
          id: o.id,
          organization_id: o.organization_id,
          feature_key: o.feature_key,
          override_value: o.override_value,
          override_limit: o.override_limit,
          reason: o.reason,
          created_by: o.created_by,
          created_at: o.created_at,
          expires_at: o.expires_at,
          feature_name: featureInfo?.name || o.feature_key,
          feature_type: featureInfo?.type || 'boolean',
          created_by_email: user?.email || null,
          created_by_name: user?.full_name || null,
        };
      });
      setOverrides(processedOverrides);
    }

    onOverrideChange?.(organization.id);
  }, [organization.id, featureKeyMap, onOverrideChange]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!selectedOverride) return;

    setDeletingId(selectedOverride.id);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('organization_feature_overrides')
        .delete()
        .eq('id', selectedOverride.id);

      if (error) throw error;

      setOverrides((prev) => prev.filter((o) => o.id !== selectedOverride.id));
      setDeleteModalOpen(false);
      setSelectedOverride(null);
      onOverrideChange?.(organization.id);
    } catch (err) {
      console.error('Error deleting override:', err);
      alert('Override silinirken bir hata olustu.');
    } finally {
      setDeletingId(null);
    }
  }, [selectedOverride, organization.id, onOverrideChange]);

  // Edit override
  const handleEdit = useCallback((override: FeatureOverrideWithDetails) => {
    setSelectedOverride(override);
    setModalOpen(true);
  }, []);

  // Open delete modal
  const handleOpenDeleteModal = useCallback((override: FeatureOverrideWithDetails) => {
    setSelectedOverride(override);
    setDeleteModalOpen(true);
  }, []);

  // New override
  const handleNew = useCallback(() => {
    setSelectedOverride(null);
    setModalOpen(true);
  }, []);

  // Active overrides (non-expired)
  const activeOverrides = useMemo(() => {
    return overrides.filter((o) => !isExpired(o.expires_at));
  }, [overrides]);

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.Shield />
          <h3 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
            Ozellik Override
          </h3>
          {activeOverrides.length > 0 && (
            <span className="px-2 py-0.5 bg-purple-900/50 text-purple-400 text-xs rounded-full">
              {activeOverrides.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
        >
          <Icons.Plus />
          Ekle
        </button>
      </div>

      {/* Content */}
      {isLoadingOverrides ? (
        <div className="flex items-center justify-center py-8">
          <Icons.Spinner />
          <span className="ml-2 text-gray-400">Yukleniyor...</span>
        </div>
      ) : overrides.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center text-gray-500">
            <Icons.Shield />
          </div>
          <p className="text-gray-400 text-sm">Henuz override bulunmuyor.</p>
          <p className="text-gray-500 text-xs mt-1">
            Bu organizasyona ozel ozellik izinleri tanimlamak icin &quot;Ekle&quot; butonunu kullanin.
          </p>
        </div>
      ) : compact ? (
        <div className="space-y-2">
          {overrides.map((override) => (
            <OverrideRow
              key={override.id}
              override={override}
              onEdit={handleEdit}
              onDelete={handleOpenDeleteModal}
              isDeleting={deletingId === override.id}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Ozellik</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Durum</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Gecerlilik</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Neden</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Olusturulma</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {overrides.map((override) => (
                <OverrideRow
                  key={override.id}
                  override={override}
                  onEdit={handleEdit}
                  onDelete={handleOpenDeleteModal}
                  isDeleting={deletingId === override.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <FeatureOverrideModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOverride(null);
        }}
        organization={organization}
        features={features}
        override={selectedOverride}
        onSaveComplete={handleSaveComplete}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedOverride(null);
        }}
        override={selectedOverride}
        organization={organization}
        onConfirm={handleDelete}
        isLoading={deletingId !== null}
      />
    </div>
  );
}

// =============================================================================
// CONVENIENCE HOOK
// =============================================================================

export function useFeatureOverrideModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [override, setOverride] = useState<FeatureOverrideWithDetails | null>(null);

  const openModal = useCallback((existingOverride?: FeatureOverrideWithDetails) => {
    setOverride(existingOverride || null);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setOverride(null);
  }, []);

  return {
    isOpen,
    override,
    openModal,
    closeModal,
  };
}

// =============================================================================
// FEATURE OVERRIDE BUTTON
// =============================================================================

export interface FeatureOverrideButtonProps {
  organization: OrganizationBasic;
  features: FeatureOption[];
  onOverrideComplete?: (organizationId: string, featureKey: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function FeatureOverrideButton({
  organization,
  features,
  onOverrideComplete,
  className = '',
  children,
}: FeatureOverrideButtonProps) {
  const { isOpen, openModal, closeModal } = useFeatureOverrideModal();

  return (
    <>
      <button
        type="button"
        onClick={() => openModal()}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors ${className}`}
      >
        {children || (
          <>
            <Icons.Shield />
            Override Ekle
          </>
        )}
      </button>

      <FeatureOverrideModal
        isOpen={isOpen}
        onClose={closeModal}
        organization={organization}
        features={features}
        onSaveComplete={onOverrideComplete}
      />
    </>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default FeatureOverrideCard;
