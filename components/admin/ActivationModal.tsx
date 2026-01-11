/**
 * Activation Modal Component
 *
 * Super Admin icin organizasyon aktivasyon modal'i.
 * EFT odeme sonrasi manuel aktivasyon icin kullanilir.
 *
 * Icerdikleri:
 * - Organizasyon detaylari gorunumu (isim, slug, sahip bilgileri)
 * - Plan secimi (Lite, Pro, Premium)
 * - Abonelik tarihleri (baslangic, bitis)
 * - Hesap aktivasyonu
 * - Merchant'a bildirim gonderme
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  created_at: string;
  owner_id: string | null;
  owner_email: string | null;
  owner_name: string | null;
}

export interface PlanOption {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number | null;
  description: string | null;
}

export interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationDetails;
  plans: PlanOption[];
  onActivationComplete?: (organizationId: string) => void;
}

interface ActivationFormData {
  planId: string;
  startDate: string;
  endDate: string;
  paymentMethod: 'eft' | 'credit_card' | 'bank_transfer';
  notes: string;
  sendNotification: boolean;
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
  Building: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Mail: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Success: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getDefaultEndDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  const parts = date.toISOString().split('T');
  return parts[0] ?? '';
}

function getToday(): string {
  const parts = new Date().toISOString().split('T');
  return parts[0] ?? '';
}

// =============================================================================
// PLAN CARD COMPONENT
// =============================================================================

interface PlanCardProps {
  plan: PlanOption;
  isSelected: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, isSelected, onSelect }: PlanCardProps) {
  const defaultColors = { bg: 'bg-gray-700', border: 'border-gray-600', badge: 'bg-gray-600 text-gray-200' };
  const planColors: Record<string, { bg: string; border: string; badge: string }> = {
    lite: defaultColors,
    pro: { bg: 'bg-purple-900/30', border: 'border-purple-600', badge: 'bg-purple-600 text-white' },
    premium: { bg: 'bg-yellow-900/30', border: 'border-yellow-600', badge: 'bg-yellow-600 text-white' },
  };

  const colors = planColors[plan.slug] ?? defaultColors;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg border-2 text-left transition-all w-full
        ${isSelected
          ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-offset-gray-900 ring-purple-500`
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
          <Icons.Check />
        </div>
      )}
      <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${colors.badge}`}>
        {plan.name}
      </div>
      <div className="text-lg font-bold text-white">
        {plan.price_monthly === 0 ? 'Ucretsiz' : formatPrice(plan.price_monthly)}
        {plan.price_monthly > 0 && <span className="text-sm font-normal text-gray-400">/ay</span>}
      </div>
      {plan.description && (
        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{plan.description}</p>
      )}
    </button>
  );
}

// =============================================================================
// ORGANIZATION DETAILS SECTION
// =============================================================================

interface OrganizationDetailsSectionProps {
  organization: OrganizationDetails;
}

function OrganizationDetailsSection({ organization }: OrganizationDetailsSectionProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Header with logo and name */}
      <div className="flex items-center gap-4">
        {organization.logo_url ? (
          <Image
            src={organization.logo_url}
            alt={organization.name}
            width={56}
            height={56}
            className="rounded-lg object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400">
            <Icons.Building />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-white truncate">{organization.name}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>/{organization.slug}</span>
            <a
              href={`/menu/${organization.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300"
            >
              <Icons.ExternalLink />
              Menu
            </a>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Owner info */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-700 rounded-lg text-gray-400">
            <Icons.User />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase">Sahip</div>
            <div className="text-sm text-white truncate">{organization.owner_name || 'Bilinmiyor'}</div>
            <div className="text-xs text-gray-400 truncate">{organization.owner_email || '-'}</div>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-700 rounded-lg text-gray-400">
            <Icons.Mail />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase">E-posta</div>
            <div className="text-sm text-white truncate">{organization.email || '-'}</div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-700 rounded-lg text-gray-400">
            <Icons.Phone />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase">Telefon</div>
            <div className="text-sm text-white truncate">{organization.phone || '-'}</div>
          </div>
        </div>

        {/* Registration date */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-700 rounded-lg text-gray-400">
            <Icons.Calendar />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase">Kayit Tarihi</div>
            <div className="text-sm text-white truncate">{formatDate(organization.created_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUCCESS STATE COMPONENT
// =============================================================================

interface SuccessStateProps {
  organization: OrganizationDetails;
  selectedPlan: PlanOption | null;
  onClose: () => void;
}

function SuccessState({ organization, selectedPlan, onClose }: SuccessStateProps) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-900/50 flex items-center justify-center text-green-400">
        <Icons.Success />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Aktivasyon Basarili!</h3>
      <p className="text-gray-400 mb-6">
        <span className="font-medium text-white">{organization.name}</span> hesabi
        {selectedPlan && <span className="font-medium text-purple-400"> {selectedPlan.name}</span>} paketi ile aktif edildi.
      </p>
      <div className="bg-gray-800 rounded-lg p-4 text-left text-sm mb-6">
        <p className="text-gray-300">
          Merchant&apos;a aktivasyon bildirimi gonderildi. Artik isletme paneline erisebilir ve
          menu yonetimini yapabilir.
        </p>
      </div>
      <button
        onClick={onClose}
        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
      >
        Tamam
      </button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ActivationModal({
  isOpen,
  onClose,
  organization,
  plans,
  onActivationComplete,
}: ActivationModalProps) {
  // Form state
  const [formData, setFormData] = useState<ActivationFormData>({
    planId: plans[0]?.id || '',
    startDate: getToday(),
    endDate: getDefaultEndDate(),
    paymentMethod: 'eft',
    notes: '',
    sendNotification: true,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        planId: plans[0]?.id || '',
        startDate: getToday(),
        endDate: getDefaultEndDate(),
        paymentMethod: 'eft',
        notes: '',
        sendNotification: true,
      });
      setError(null);
      setIsSuccess(false);
    }
  }, [isOpen, plans]);

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof ActivationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // Get selected plan details
  const selectedPlan = plans.find(p => p.id === formData.planId) || null;

  // Handle activation
  const handleActivate = async () => {
    if (!formData.planId) {
      setError('Lutfen bir paket secin.');
      return;
    }

    if (!formData.startDate) {
      setError('Lutfen baslangic tarihini girin.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user for activated_by field
      const { data: userData } = await supabase.auth.getUser();
      const activatedById = userData?.user?.id;

      // 1. Check for existing subscription and update or create
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('organization_id', organization.id)
        .in('status', ['pending', 'active', 'past_due'])
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: formData.planId,
            status: 'active',
            started_at: new Date(formData.startDate).toISOString(),
            expires_at: formData.endDate ? new Date(formData.endDate).toISOString() : null,
            payment_method: formData.paymentMethod,
            last_payment_at: new Date().toISOString(),
            next_payment_at: formData.endDate ? new Date(formData.endDate).toISOString() : null,
            notes: formData.notes || null,
            activated_by: activatedById,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);

        if (subError) throw subError;
      } else {
        // Create new subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            organization_id: organization.id,
            plan_id: formData.planId,
            status: 'active',
            started_at: new Date(formData.startDate).toISOString(),
            expires_at: formData.endDate ? new Date(formData.endDate).toISOString() : null,
            payment_method: formData.paymentMethod,
            last_payment_at: new Date().toISOString(),
            next_payment_at: formData.endDate ? new Date(formData.endDate).toISOString() : null,
            notes: formData.notes || null,
            activated_by: activatedById,
          });

        if (subError) throw subError;
      }

      // 2. Update organization status to active
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (orgError) throw orgError;

      // 3. Insert audit log for activation
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          organization_id: organization.id,
          user_id: activatedById,
          action: 'activation',
          entity_type: 'organization',
          entity_id: organization.id,
          new_value: {
            organization_name: organization.name,
            plan_id: formData.planId,
            plan_name: selectedPlan?.name,
            started_at: formData.startDate,
            expires_at: formData.endDate || null,
            payment_method: formData.paymentMethod,
            notes: formData.notes || null,
            notification_sent: formData.sendNotification,
          },
        });

      if (auditError) {
        // Non-critical error, log but don't fail
        console.error('Error inserting audit log:', auditError);
      }

      // 4. Send notification to merchant (if enabled)
      // In a real implementation, this would send an email via Resend, SendGrid, etc.
      // For MVP, the notification flag is stored in audit_logs.new_value.notification_sent
      // A background job or webhook could pick this up and send the actual email
      if (formData.sendNotification && organization.owner_email) {
        // Future: Call email service API here
        // await sendActivationEmail(organization.owner_email, selectedPlan?.name);
      }

      // Success!
      setIsSuccess(true);
      onActivationComplete?.(organization.id);

    } catch (err) {
      console.error('Activation error:', err);
      setError(err instanceof Error ? err.message : 'Aktivasyon sirasinda bir hata olustu. Lutfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  // Modal content
  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        aria-hidden="true"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal panel */}
        <div
          className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-gray-900 border border-gray-700 shadow-xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 id="activation-modal-title" className="text-lg font-semibold text-white">
                Hesap Aktivasyonu
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {organization.name} icin aktivasyon islemini tamamlayin
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Kapat"
            >
              <Icons.Close />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {isSuccess ? (
              <SuccessState
                organization={organization}
                selectedPlan={selectedPlan}
                onClose={onClose}
              />
            ) : (
              <div className="space-y-6">
                {/* Organization details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Isletme Bilgileri</h3>
                  <OrganizationDetailsSection organization={organization} />
                </div>

                {/* Plan selection */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Paket Secimi</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {plans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isSelected={formData.planId === plan.id}
                        onSelect={() => handleFieldChange('planId', plan.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Subscription dates */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Abonelik Tarihleri</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-sm text-gray-400 mb-1.5">
                        Baslangic Tarihi
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        value={formData.startDate}
                        onChange={(e) => handleFieldChange('startDate', e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-sm text-gray-400 mb-1.5">
                        Bitis Tarihi <span className="text-gray-500">(opsiyonel)</span>
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        value={formData.endDate}
                        onChange={(e) => handleFieldChange('endDate', e.target.value)}
                        min={formData.startDate}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Odeme Yontemi</h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'eft', label: 'EFT/Havale' },
                      { value: 'credit_card', label: 'Kredi Karti' },
                      { value: 'bank_transfer', label: 'Banka Transferi' },
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`
                          inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all
                          ${formData.paymentMethod === method.value
                            ? 'bg-purple-900/30 border-purple-600 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={formData.paymentMethod === method.value}
                          onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                          className="sr-only"
                        />
                        <Icons.CreditCard />
                        {method.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Notlari <span className="text-gray-500">(opsiyonel)</span>
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    rows={3}
                    placeholder="Ornegin: 3 ay ucretsiz deneme, Partner musteri, vb."
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Send notification toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-700 rounded-lg text-purple-400">
                      <Icons.Bell />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Aktivasyon Bildirimi</div>
                      <div className="text-xs text-gray-400">
                        Merchant&apos;a e-posta ile bildirim gonder
                        {organization.owner_email && (
                          <span className="ml-1 text-gray-500">({organization.owner_email})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sendNotification}
                      onChange={(e) => handleFieldChange('sendNotification', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
                    <Icons.Warning />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isSuccess && (
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-400">
                {selectedPlan && (
                  <>
                    Secilen: <span className="font-medium text-white">{selectedPlan.name}</span>
                    {selectedPlan.price_monthly > 0 && (
                      <span className="ml-2 text-purple-400">
                        {formatPrice(selectedPlan.price_monthly)}/ay
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Iptal
                </button>
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={isLoading || !formData.planId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Icons.Spinner />
                      Aktif Ediliyor...
                    </>
                  ) : (
                    <>
                      <Icons.Check />
                      Aktif Et
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render through portal
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Hook to manage activation modal state
 */
export function useActivationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);

  const openModal = useCallback((org: OrganizationDetails) => {
    setOrganization(org);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setOrganization(null);
  }, []);

  return {
    isOpen,
    organization,
    openModal,
    closeModal,
  };
}

/**
 * Activation Button - Opens activation modal for an organization
 */
export interface ActivationButtonProps {
  organization: OrganizationDetails;
  plans: PlanOption[];
  onActivationComplete?: (organizationId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function ActivationButton({
  organization,
  plans,
  onActivationComplete,
  className = '',
  children,
}: ActivationButtonProps) {
  const { isOpen, openModal, closeModal } = useActivationModal();

  return (
    <>
      <button
        type="button"
        onClick={() => openModal(organization)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors ${className}`}
      >
        {children || (
          <>
            <Icons.Check />
            Aktif Et
          </>
        )}
      </button>

      <ActivationModal
        isOpen={isOpen}
        onClose={closeModal}
        organization={organization}
        plans={plans}
        onActivationComplete={onActivationComplete}
      />
    </>
  );
}
