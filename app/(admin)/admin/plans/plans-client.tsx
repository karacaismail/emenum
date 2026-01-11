'use client';

/**
 * Plans Client Component
 *
 * Admin paket yonetimi icin client-side interactive component.
 * - Paket ekleme/duzenleme
 * - Ozellik atama (plan_features)
 * - Limit ayarlama
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PlanWithFeatures, FeatureData, PlansStats } from './page';

// =============================================================================
// TYPES
// =============================================================================

interface PlansClientProps {
  initialPlans: PlanWithFeatures[];
  allFeatures: FeatureData[];
  stats: PlansStats;
}

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  currency: string;
  is_featured: boolean;
  badge_text: string;
  is_active: boolean;
  sort_order: string;
}

interface FeatureAssignment {
  feature_id: string;
  value_boolean: boolean;
  value_limit: number | null;
}

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
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Infinity: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12c-1.5-1.5-3-2-4.5-2C5 10 3 12 3 14s2 4 4.5 4c1.5 0 3-.5 4.5-2s3-2 4.5-2c2.5 0 4.5 2 4.5 4s-2 4-4.5 4c-1.5 0-3-.5-4.5-2z" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function groupFeaturesByCategory(features: FeatureData[]): Record<string, FeatureData[]> {
  const groups: Record<string, FeatureData[]> = {};
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
  icon?: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">{label}</div>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

// =============================================================================
// PLAN CARD COMPONENT
// =============================================================================

interface PlanCardProps {
  plan: PlanWithFeatures;
  onEdit: (plan: PlanWithFeatures) => void;
  onManageFeatures: (plan: PlanWithFeatures) => void;
}

function PlanCard({ plan, onEdit, onManageFeatures }: PlanCardProps) {
  const defaultColors = { bg: 'bg-gray-800', border: 'border-gray-600', badge: 'bg-gray-600 text-gray-200' };
  const planColors: Record<string, { bg: string; border: string; badge: string }> = {
    lite: defaultColors,
    pro: { bg: 'bg-purple-900/20', border: 'border-purple-600', badge: 'bg-purple-600 text-white' },
    premium: { bg: 'bg-yellow-900/20', border: 'border-yellow-600', badge: 'bg-yellow-600 text-white' },
  };

  const colors = planColors[plan.slug] ?? defaultColors;

  // Group features by type
  const booleanFeatures = plan.features.filter((f) => f.feature.feature_type === 'boolean' && f.value_boolean);
  const limitFeatures = plan.features.filter((f) => f.feature.feature_type === 'limit');

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6 relative`}>
      {/* Featured badge */}
      {plan.is_featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full">
            <Icons.Star />
            {plan.badge_text || 'Onerilen'}
          </span>
        </div>
      )}

      {/* Status indicator */}
      {!plan.is_active && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded">
            Pasif
          </span>
        </div>
      )}

      {/* Plan name and badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2.5 py-1 rounded text-sm font-medium ${colors.badge}`}>
          {plan.name}
        </span>
      </div>

      {/* Pricing */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-white">
          {plan.price_monthly === 0 ? 'Ucretsiz' : formatPrice(plan.price_monthly)}
        </div>
        {plan.price_monthly > 0 && (
          <div className="text-sm text-gray-400">/ay</div>
        )}
        {plan.price_yearly && plan.price_yearly > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            veya {formatPrice(plan.price_yearly)}/yil
          </div>
        )}
      </div>

      {/* Description */}
      {plan.description && (
        <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
      )}

      {/* Subscription count */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 pb-4 border-b border-gray-700">
        <Icons.Users />
        <span>{plan.subscription_count} aktif abone</span>
      </div>

      {/* Limits */}
      {limitFeatures.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Limitler</h4>
          <div className="space-y-1">
            {limitFeatures.slice(0, 5).map((pf) => (
              <div key={pf.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{pf.feature.name}</span>
                <span className="text-white font-medium">
                  {pf.value_limit === null || pf.value_limit === -1 ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <Icons.Infinity />
                      Sinirsiz
                    </span>
                  ) : pf.value_limit === 0 ? (
                    <span className="text-red-400">-</span>
                  ) : (
                    pf.value_limit
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boolean features */}
      {booleanFeatures.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Ozellikler</h4>
          <div className="space-y-1">
            {booleanFeatures.slice(0, 5).map((pf) => (
              <div key={pf.id} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-green-400">✓</span>
                {pf.feature.name}
              </div>
            ))}
            {booleanFeatures.length > 5 && (
              <div className="text-xs text-gray-500">
                +{booleanFeatures.length - 5} daha fazla
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={() => onEdit(plan)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          <Icons.Edit />
          Duzenle
        </button>
        <button
          onClick={() => onManageFeatures(plan)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
        >
          <Icons.Settings />
          Ozellikler
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// PLAN FORM MODAL
// =============================================================================

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: PlanWithFeatures | null;
  onSave: (planId: string | null, data: PlanFormData) => Promise<void>;
  isLoading: boolean;
}

function PlanFormModal({ isOpen, onClose, plan, onSave, isLoading }: PlanFormModalProps) {
  const [formData, setFormData] = useState<PlanFormData>({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    price_monthly: plan?.price_monthly?.toString() || '0',
    price_yearly: plan?.price_yearly?.toString() || '',
    currency: plan?.currency || 'TRY',
    is_featured: plan?.is_featured || false,
    badge_text: plan?.badge_text || '',
    is_active: plan?.is_active ?? true,
    sort_order: plan?.sort_order?.toString() || '0',
  });

  const [error, setError] = useState<string | null>(null);

  // Reset form when plan changes
  useState(() => {
    setFormData({
      name: plan?.name || '',
      slug: plan?.slug || '',
      description: plan?.description || '',
      price_monthly: plan?.price_monthly?.toString() || '0',
      price_yearly: plan?.price_yearly?.toString() || '',
      currency: plan?.currency || 'TRY',
      is_featured: plan?.is_featured || false,
      badge_text: plan?.badge_text || '',
      is_active: plan?.is_active ?? true,
      sort_order: plan?.sort_order?.toString() || '0',
    });
    setError(null);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Paket adi gerekli');
      return;
    }

    if (!formData.slug.trim()) {
      setError('Paket slug gerekli');
      return;
    }

    try {
      await onSave(plan?.id || null, formData);
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
              {plan ? 'Paketi Duzenle' : 'Yeni Paket'}
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
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Paket Adi</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: plan ? formData.slug : slugify(e.target.value),
                  });
                }}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ornegin: Pro"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="ornegin: pro"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Aciklama</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Paket aciklamasi..."
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Aylik Fiyat (TRY)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Yillik Fiyat (TRY)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Opsiyonel"
                />
              </div>
            </div>

            {/* Featured and Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="is_featured" className="text-sm text-gray-300">
                  Onerilen Paket
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={formData.badge_text}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Rozet metni"
                  disabled={!formData.is_featured}
                />
              </div>
            </div>

            {/* Active and Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-300">
                  Aktif
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Siralama</label>
                <input
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
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
                {plan ? 'Kaydet' : 'Olustur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FEATURE ASSIGNMENT MODAL
// =============================================================================

interface FeatureAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanWithFeatures | null;
  allFeatures: FeatureData[];
  onSave: (planId: string, assignments: FeatureAssignment[]) => Promise<void>;
  isLoading: boolean;
}

function FeatureAssignmentModal({
  isOpen,
  onClose,
  plan,
  allFeatures,
  onSave,
  isLoading,
}: FeatureAssignmentModalProps) {
  // Create initial assignments from plan features
  const initialAssignments = useMemo(() => {
    if (!plan) return {};
    const map: Record<string, FeatureAssignment> = {};
    plan.features.forEach((pf) => {
      map[pf.feature_id] = {
        feature_id: pf.feature_id,
        value_boolean: pf.value_boolean ?? false,
        value_limit: pf.value_limit,
      };
    });
    return map;
  }, [plan]);

  const [assignments, setAssignments] = useState<Record<string, FeatureAssignment>>(initialAssignments);
  const [error, setError] = useState<string | null>(null);

  // Reset when plan changes
  useState(() => {
    setAssignments(initialAssignments);
    setError(null);
  });

  const groupedFeatures = useMemo(() => groupFeaturesByCategory(allFeatures), [allFeatures]);

  const handleToggleFeature = (feature: FeatureData) => {
    setAssignments((prev) => {
      const existing = prev[feature.id];
      if (existing) {
        // Toggle off - remove from assignments
        const newAssignments = { ...prev };
        delete newAssignments[feature.id];
        return newAssignments;
      } else {
        // Toggle on - add to assignments
        return {
          ...prev,
          [feature.id]: {
            feature_id: feature.id,
            value_boolean: feature.feature_type === 'boolean' ? true : false,
            value_limit: feature.feature_type === 'limit' ? null : null,
          },
        };
      }
    });
  };

  const handleLimitChange = (featureId: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setAssignments((prev) => {
      const existing = prev[featureId];
      if (!existing) return prev;
      return {
        ...prev,
        [featureId]: {
          feature_id: existing.feature_id,
          value_boolean: existing.value_boolean,
          value_limit: numValue,
        },
      };
    });
  };

  const handleBooleanChange = (featureId: string, value: boolean) => {
    setAssignments((prev) => {
      const existing = prev[featureId];
      if (!existing) return prev;
      return {
        ...prev,
        [featureId]: {
          feature_id: existing.feature_id,
          value_boolean: value,
          value_limit: existing.value_limit,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!plan) return;

    try {
      await onSave(plan.id, Object.values(assignments));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu');
    }
  };

  if (!isOpen || !plan) return null;

  const defaultBorder = { border: 'border-gray-600' };
  const planColors: Record<string, { border: string }> = {
    lite: defaultBorder,
    pro: { border: 'border-purple-600' },
    premium: { border: 'border-yellow-600' },
  };
  const colors = planColors[plan.slug] ?? defaultBorder;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full max-w-2xl bg-gray-900 border ${colors.border} rounded-xl shadow-xl`}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {plan.name} - Ozellik Yonetimi
              </h2>
              <p className="text-sm text-gray-400">
                Pakete dahil ozellikleri ve limitleri ayarlayin
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            >
              <Icons.X />
            </button>
          </div>

          {/* Features List */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-6">
              {Object.entries(groupedFeatures).map(([category, features]) => (
                <div key={category}>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="space-y-2">
                    {features.map((feature) => {
                      const assignment = assignments[feature.id];
                      const isAssigned = !!assignment;

                      return (
                        <div
                          key={feature.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            isAssigned
                              ? 'bg-gray-800 border-purple-600/50'
                              : 'bg-gray-800/50 border-gray-700 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            {/* Feature name and toggle */}
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                id={`feature-${feature.id}`}
                                checked={isAssigned}
                                onChange={() => handleToggleFeature(feature)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                              />
                              <label
                                htmlFor={`feature-${feature.id}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="text-sm text-white">{feature.name}</div>
                                {feature.description && (
                                  <div className="text-xs text-gray-500">{feature.description}</div>
                                )}
                              </label>
                            </div>

                            {/* Value input */}
                            {isAssigned && (
                              <div className="flex-shrink-0">
                                {feature.feature_type === 'limit' ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="-1"
                                      value={assignment.value_limit === null ? '' : assignment.value_limit}
                                      onChange={(e) => handleLimitChange(feature.id, e.target.value)}
                                      placeholder="Sinirsiz"
                                      className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                    <span className="text-xs text-gray-500">
                                      {assignment.value_limit === null || assignment.value_limit === -1 ? '∞' : ''}
                                    </span>
                                  </div>
                                ) : (
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={assignment.value_boolean ?? false}
                                      onChange={(e) => handleBooleanChange(feature.id, e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {Object.keys(assignments).length} ozellik secildi
              </div>
              <div className="flex items-center gap-3">
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
                  Kaydet
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CLIENT COMPONENT
// =============================================================================

export default function PlansClient({
  initialPlans,
  allFeatures,
  stats,
}: PlansClientProps) {
  const router = useRouter();

  // State
  const [plans, setPlans] = useState(initialPlans);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithFeatures | null>(null);

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Save plan
  const handleSavePlan = useCallback(async (planId: string | null, data: PlanFormData) => {
    setIsLoading(true);

    try {
      const supabase = createClient();

      const planData = {
        name: data.name.trim(),
        slug: data.slug.trim(),
        description: data.description.trim() || null,
        price_monthly: parseFloat(data.price_monthly) || 0,
        price_yearly: data.price_yearly ? parseFloat(data.price_yearly) : null,
        currency: data.currency,
        is_featured: data.is_featured,
        badge_text: data.badge_text.trim() || null,
        is_active: data.is_active,
        sort_order: parseInt(data.sort_order) || 0,
        updated_at: new Date().toISOString(),
      };

      if (planId) {
        // Update existing plan
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', planId);

        if (error) throw error;

        // Update local state
        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId
              ? { ...p, ...planData }
              : p
          )
        );
      } else {
        // Create new plan
        const { data: newPlan, error } = await supabase
          .from('plans')
          .insert(planData)
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        setPlans((prev) => [
          ...prev,
          { ...newPlan, features: [], subscription_count: 0 } as PlanWithFeatures,
        ]);
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Save feature assignments
  const handleSaveFeatures = useCallback(async (planId: string, assignments: FeatureAssignment[]) => {
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Delete existing plan_features for this plan
      const { error: deleteError } = await supabase
        .from('plan_features')
        .delete()
        .eq('plan_id', planId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (assignments.length > 0) {
        const insertData = assignments.map((a) => ({
          plan_id: planId,
          feature_id: a.feature_id,
          value_boolean: a.value_boolean,
          value_limit: a.value_limit,
        }));

        const { error: insertError } = await supabase
          .from('plan_features')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Open edit modal
  const handleEditPlan = useCallback((plan: PlanWithFeatures) => {
    setSelectedPlan(plan);
    setPlanFormOpen(true);
  }, []);

  // Open feature modal
  const handleManageFeatures = useCallback((plan: PlanWithFeatures) => {
    setSelectedPlan(plan);
    setFeatureModalOpen(true);
  }, []);

  // Open new plan modal
  const handleNewPlan = useCallback(() => {
    setSelectedPlan(null);
    setPlanFormOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Paketler</h1>
          <p className="text-gray-400 mt-1">
            Abonelik paketlerini ve ozellik atamalarini yonetin
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
            onClick={handleNewPlan}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Icons.Plus />
            Yeni Paket
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Toplam Paket" value={stats.total_plans} />
        <StatCard label="Aktif Paket" value={stats.active_plans} />
        <StatCard label="Toplam Ozellik" value={stats.total_features} />
        <StatCard
          label="Aktif Abone"
          value={stats.total_subscriptions}
          icon={<Icons.Users />}
        />
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={handleEditPlan}
            onManageFeatures={handleManageFeatures}
          />
        ))}

        {/* Empty state */}
        {plans.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-400">Henuz paket bulunmuyor.</p>
              <button
                onClick={handleNewPlan}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Icons.Plus />
                Ilk Paketi Olustur
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plan Form Modal */}
      <PlanFormModal
        isOpen={planFormOpen}
        onClose={() => {
          setPlanFormOpen(false);
          setSelectedPlan(null);
        }}
        plan={selectedPlan}
        onSave={handleSavePlan}
        isLoading={isLoading}
      />

      {/* Feature Assignment Modal */}
      <FeatureAssignmentModal
        isOpen={featureModalOpen}
        onClose={() => {
          setFeatureModalOpen(false);
          setSelectedPlan(null);
        }}
        plan={selectedPlan}
        allFeatures={allFeatures}
        onSave={handleSaveFeatures}
        isLoading={isLoading}
      />
    </div>
  );
}
