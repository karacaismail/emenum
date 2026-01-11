/**
 * Settings Form - Client Component
 *
 * Isletme ayarlarini duzenlemek icin kullanilan form componenti.
 * Resim yukleme, form validasyonu ve guncelleme islemlerini yonetir.
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  background_color: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
}

interface SettingsFormProps {
  organization: OrganizationSettings;
  /** User role - reserved for future feature-gated functionality */
  userRole?: string;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  background_color: string;
}

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Upload: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Instagram: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  Facebook: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  Twitter: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Turkish character safe slug generator
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[g\u011F]/g, 'g')
    .replace(/[u\u00FC]/g, 'u')
    .replace(/[s\u015F]/g, 's')
    .replace(/[i\u0131]/g, 'i')
    .replace(/[o\u00F6]/g, 'o')
    .replace(/[c\u00E7]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  if (!url) return true; // Empty is valid
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  if (!email) return true; // Empty is valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (basic)
 */
function isValidPhone(phone: string): boolean {
  if (!phone) return true; // Empty is valid
  // Allow digits, spaces, +, -, (, )
  const phoneRegex = /^[\d\s+\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// =============================================================================
// IMAGE UPLOAD COMPONENT
// =============================================================================

interface ImageUploadProps {
  label: string;
  helpText: string;
  currentImage: string | null;
  onImageChange: (url: string | null) => void;
  aspectRatio?: 'square' | 'cover';
  organizationId: string;
  imageType: 'logo' | 'cover';
  disabled?: boolean;
}

function ImageUpload({
  label,
  helpText,
  currentImage,
  onImageChange,
  aspectRatio = 'square',
  organizationId,
  imageType,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Lutfen gecerli bir resim dosyasi secin (PNG, JPG, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Dosya boyutu 5MB\'dan kucuk olmalidir');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/${imageType}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName);

      onImageChange(publicUrl);
    } catch {
      setError('Resim yuklenirken bir hata olustu. Lutfen tekrar deneyin.');
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [organizationId, imageType, onImageChange]);

  const handleRemove = useCallback(() => {
    onImageChange(null);
  }, [onImageChange]);

  return (
    <div>
      <label className="label mb-2">{label}</label>
      <p className="text-sm text-gray-500 mb-3">{helpText}</p>

      {/* Image Preview or Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg overflow-hidden
          ${currentImage ? 'border-gray-200' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary-400'}
          transition-colors
        `}
        style={{
          aspectRatio: aspectRatio === 'cover' ? '16/5' : '1/1',
          maxWidth: aspectRatio === 'cover' ? '100%' : '200px',
        }}
      >
        {currentImage ? (
          <>
            <Image
              src={currentImage}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
            {/* Overlay with remove button */}
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                  title="Resmi degistir"
                >
                  <Icons.Upload />
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50"
                  title="Resmi kaldir"
                >
                  <Icons.Trash />
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled || uploading}
            className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 hover:text-gray-500"
          >
            {uploading ? (
              <Icons.Spinner />
            ) : (
              <>
                <Icons.Upload />
                <span className="text-sm mt-2">Resim yukle</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
          <Icons.Warning />
          {error}
        </p>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <p className="text-sm text-primary-600 mt-2 flex items-center gap-1">
          <Icons.Spinner />
          Yukleniyor...
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MAIN FORM COMPONENT
// =============================================================================

export default function SettingsForm({ organization }: SettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: organization.name,
    slug: organization.slug,
    description: organization.description || '',
    phone: organization.phone || '',
    email: organization.email || '',
    address: organization.address || '',
    website: organization.website || '',
    instagram_url: organization.instagram_url || '',
    facebook_url: organization.facebook_url || '',
    twitter_url: organization.twitter_url || '',
    background_color: organization.background_color || '#ffffff',
  });

  // Image state
  const [logoUrl, setLogoUrl] = useState<string | null>(organization.logo_url);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(organization.cover_image_url);

  // Slug editing mode
  const [editingSlug, setEditingSlug] = useState(false);

  // Handle input changes
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Reset saved state
    setSaved(false);
  }, [errors]);

  // Handle slug auto-generation from name
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      name: value,
      // Only auto-generate slug if not manually editing
      slug: editingSlug ? prev.slug : slugify(value),
    }));
    setSaved(false);
  }, [editingSlug]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = 'Isletme adi zorunludur';
    }

    // Slug is required and must be valid
    if (!formData.slug.trim()) {
      newErrors.slug = 'Menu URL zorunludur';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Menu URL sadece kucuk harf, rakam ve tire (-) icermelidir';
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Menu URL en az 3 karakter olmalidir';
    }

    // Email validation
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Gecerli bir e-posta adresi girin';
    }

    // Phone validation
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Gecerli bir telefon numarasi girin';
    }

    // URL validations
    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'Gecerli bir URL girin (https://...)';
    }
    if (formData.instagram_url && !isValidUrl(formData.instagram_url)) {
      newErrors.instagram_url = 'Gecerli bir URL girin';
    }
    if (formData.facebook_url && !isValidUrl(formData.facebook_url)) {
      newErrors.facebook_url = 'Gecerli bir URL girin';
    }
    if (formData.twitter_url && !isValidUrl(formData.twitter_url)) {
      newErrors.twitter_url = 'Gecerli bir URL girin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          website: formData.website.trim() || null,
          instagram_url: formData.instagram_url.trim() || null,
          facebook_url: formData.facebook_url.trim() || null,
          twitter_url: formData.twitter_url.trim() || null,
          background_color: formData.background_color || null,
          logo_url: logoUrl,
          cover_image_url: coverImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (updateError) {
        // Check for unique constraint violation on slug
        if (updateError.message?.includes('duplicate') || updateError.message?.includes('unique')) {
          setErrors({ slug: 'Bu menu URL zaten kullaniliyor. Baska bir URL secin.' });
          throw new Error('Slug zaten kullaniliyor');
        }
        throw updateError;
      }

      setSaved(true);

      // Refresh the page to get updated data
      router.refresh();

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ayarlar kaydedilirken bir hata olustu. Lutfen tekrar deneyin.');
      }
    } finally {
      setSaving(false);
    }
  }, [formData, logoUrl, coverImageUrl, organization.id, router, validateForm]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Success Message */}
      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0 text-green-600">
            <Icons.Check />
          </div>
          <p className="text-sm text-green-700">Ayarlar basariyla kaydedildi.</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0 text-red-600">
            <Icons.Warning />
          </div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Cover Image Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Kapak Resmi</h2>
        <p className="text-sm text-gray-500 mb-4">
          Kapak resmi, menunuzun ust kisminda (%20&apos;lik alan) gorunecektir.
          Yatay bir resim secmeniz onerilir.
        </p>

        {/* Cover Image Preview */}
        {coverImageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden" style={{ height: '20vh', minHeight: '120px' }}>
            <div className="relative w-full h-full">
              <Image
                src={coverImageUrl}
                alt="Kapak resmi onizleme"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-sm opacity-75">Onizleme - Kapak resmi gorunumu</p>
              </div>
            </div>
          </div>
        )}

        <ImageUpload
          label="Kapak Resmi"
          helpText="Onerim: 1920x400 piksel veya 16:5 oraninda yatay bir resim"
          currentImage={coverImageUrl}
          onImageChange={setCoverImageUrl}
          aspectRatio="cover"
          organizationId={organization.id}
          imageType="cover"
        />
      </div>

      {/* Logo & Basic Info Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Isletme Bilgileri</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Logo Upload */}
          <div className="md:col-span-1">
            <ImageUpload
              label="Logo"
              helpText="Kare format onerilir (1:1)"
              currentImage={logoUrl}
              onImageChange={setLogoUrl}
              aspectRatio="square"
              organizationId={organization.id}
              imageType="logo"
            />
          </div>

          {/* Name & Slug */}
          <div className="md:col-span-2 space-y-4">
            {/* Organization Name */}
            <div>
              <label htmlFor="name" className="label">
                Isletme Adi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                className={`input mt-1 ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Ornek: Lezzet Cafe"
                required
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Menu Slug */}
            <div>
              <label htmlFor="slug" className="label">
                Menu URL <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  ozamenu.com/menu/
                </span>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setEditingSlug(true);
                    setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
                    if (errors.slug) {
                      setErrors((prev) => ({ ...prev, slug: undefined }));
                    }
                    setSaved(false);
                  }}
                  className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${errors.slug ? 'border-red-500' : ''}`}
                  placeholder="lezzet-cafe"
                  required
                />
              </div>
              {errors.slug ? (
                <p className="text-sm text-red-600 mt-1">{errors.slug}</p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  Musterileriniz bu URL&apos;den menunuze ulasacak
                </p>
              )}
              <a
                href={`/menu/${formData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
              >
                Menuyu goruntule
                <Icons.ExternalLink />
              </a>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="label">
                Aciklama
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input mt-1"
                placeholder="Isletmeniz hakkinda kisa bir aciklama..."
              />
            </div>

            {/* Background Color */}
            <div>
              <label htmlFor="background_color" className="label">
                Arka Plan Rengi
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  id="background_color"
                  name="background_color"
                  value={formData.background_color}
                  onChange={handleChange}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.background_color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, background_color: e.target.value }))}
                  className="input flex-1"
                  placeholder="#ffffff"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Menunuzun arka plan rengi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Iletisim Bilgileri</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="label">
              Telefon
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`input mt-1 ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="+90 555 123 4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="label">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`input mt-1 ${errors.email ? 'border-red-500' : ''}`}
              placeholder="iletisim@isletme.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label htmlFor="address" className="label">
              Adres
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="input mt-1"
              placeholder="Isletmenizin adresi..."
            />
          </div>

          {/* Website */}
          <div className="md:col-span-2">
            <label htmlFor="website" className="label">
              Web Sitesi
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className={`input mt-1 ${errors.website ? 'border-red-500' : ''}`}
              placeholder="https://www.isletme.com"
            />
            {errors.website && (
              <p className="text-sm text-red-600 mt-1">{errors.website}</p>
            )}
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sosyal Medya</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Instagram */}
          <div>
            <label htmlFor="instagram_url" className="label flex items-center gap-2">
              <Icons.Instagram />
              Instagram
            </label>
            <input
              type="url"
              id="instagram_url"
              name="instagram_url"
              value={formData.instagram_url}
              onChange={handleChange}
              className={`input mt-1 ${errors.instagram_url ? 'border-red-500' : ''}`}
              placeholder="https://instagram.com/isletme"
            />
            {errors.instagram_url && (
              <p className="text-sm text-red-600 mt-1">{errors.instagram_url}</p>
            )}
          </div>

          {/* Facebook */}
          <div>
            <label htmlFor="facebook_url" className="label flex items-center gap-2">
              <Icons.Facebook />
              Facebook
            </label>
            <input
              type="url"
              id="facebook_url"
              name="facebook_url"
              value={formData.facebook_url}
              onChange={handleChange}
              className={`input mt-1 ${errors.facebook_url ? 'border-red-500' : ''}`}
              placeholder="https://facebook.com/isletme"
            />
            {errors.facebook_url && (
              <p className="text-sm text-red-600 mt-1">{errors.facebook_url}</p>
            )}
          </div>

          {/* Twitter/X */}
          <div>
            <label htmlFor="twitter_url" className="label flex items-center gap-2">
              <Icons.Twitter />
              X (Twitter)
            </label>
            <input
              type="url"
              id="twitter_url"
              name="twitter_url"
              value={formData.twitter_url}
              onChange={handleChange}
              className={`input mt-1 ${errors.twitter_url ? 'border-red-500' : ''}`}
              placeholder="https://x.com/isletme"
            />
            {errors.twitter_url && (
              <p className="text-sm text-red-600 mt-1">{errors.twitter_url}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {organization.status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-yellow-600">
              <Icons.Warning />
              Isletmeniz onay bekliyor
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/menu/${formData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            Onizle
            <Icons.ExternalLink />
          </a>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <Icons.Spinner />
                Kaydediliyor...
              </>
            ) : (
              'Degisiklikleri Kaydet'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
