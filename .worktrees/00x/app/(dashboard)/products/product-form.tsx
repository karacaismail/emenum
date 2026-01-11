/**
 * Product Form Component
 *
 * Urun ekleme ve duzenleme icin kullanilan form componenti.
 * Image upload, kategori secimi, ve is_active toggle icin kullanilir.
 * Image upload feature-gated (has_images ozelligine gore).
 *
 * Ozellikler:
 * - Urun adi, aciklama, kategori
 * - Resim yukleme (feature-gated)
 * - Sef Ozel ve Gunun Yemegi badgeleri (feature-gated)
 * - Alerjen bilgisi, kalori, hazirlama suresi
 * - Aktif/Pasif durumu
 * - Yeni urun icin baslangic fiyati
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Badge } from '@/components/ui';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import type { Category, Product, ProductInsert, ProductUpdate, CurrencyCode } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface ProductFormData {
  name: string;
  description: string;
  category_id: string | null;
  image_url: string | null;
  allergens: string;
  calories: string;
  preparation_time_minutes: string;
  is_chef_special: boolean;
  is_daily_special: boolean;
  is_active: boolean;
  // For new products, initial price
  initial_price: string;
  price_currency: CurrencyCode;
}

interface FeatureFlags {
  has_images: boolean;
  has_chef_special: boolean;
  has_daily_special: boolean;
}

interface ProductFormProps {
  product?: Product & { current_price?: number | null; current_currency?: CurrencyCode | null };
  categories: Pick<Category, 'id' | 'name' | 'is_active'>[];
  organizationId: string;
  features: FeatureFlags;
  mode: 'new' | 'edit';
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
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Star: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  ),
  Image: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

// =============================================================================
// IMAGE UPLOAD COMPONENT
// =============================================================================

interface ImageUploadProps {
  currentImage: string | null;
  onImageChange: (url: string | null) => void;
  organizationId: string;
  disabled?: boolean;
  locked?: boolean;
}

function ImageUpload({
  currentImage,
  onImageChange,
  organizationId,
  disabled = false,
  locked = false,
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
      const fileName = `${organizationId}/products/product-${Date.now()}.${fileExt}`;

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
  }, [organizationId, onImageChange]);

  const handleRemove = useCallback(() => {
    onImageChange(null);
  }, [onImageChange]);

  if (locked) {
    return (
      <div className="relative">
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50 opacity-60">
          <div className="mx-auto w-12 h-12 text-gray-300 mb-2">
            <Icons.Image />
          </div>
          <p className="text-sm text-gray-400">Urun resimleri</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-lg">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
            <Icons.Lock />
            <span className="text-sm text-gray-600">Pro paketi gerekli</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Image Preview or Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg overflow-hidden
          ${currentImage ? 'border-gray-200' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary-400'}
          transition-colors aspect-square max-w-[200px]
        `}
      >
        {currentImage ? (
          <>
            <Image
              src={currentImage}
              alt="Urun resmi"
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

export function ProductForm({
  product,
  categories,
  organizationId,
  features,
  mode,
}: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || null,
    image_url: product?.image_url || null,
    allergens: product?.allergens || '',
    calories: product?.calories?.toString() || '',
    preparation_time_minutes: product?.preparation_time_minutes?.toString() || '',
    is_chef_special: product?.is_chef_special || false,
    is_daily_special: product?.is_daily_special || false,
    is_active: product?.is_active ?? true,
    initial_price: product?.current_price?.toString() || '',
    price_currency: product?.current_currency || 'TRY',
  });

  // Update form when product prop changes (for edit mode)
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category_id: product.category_id || null,
        image_url: product.image_url || null,
        allergens: product.allergens || '',
        calories: product.calories?.toString() || '',
        preparation_time_minutes: product.preparation_time_minutes?.toString() || '',
        is_chef_special: product.is_chef_special || false,
        is_daily_special: product.is_daily_special || false,
        is_active: product.is_active ?? true,
        initial_price: product.current_price?.toString() || '',
        price_currency: product.current_currency || 'TRY',
      });
    }
  }, [product]);

  // Handle input changes
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field
    if (errors[name as keyof ProductFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Reset saved state
    setSaved(false);
  }, [errors]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = 'Urun adi zorunludur';
    }

    // Price validation (only for new products)
    if (mode === 'new') {
      if (!formData.initial_price.trim()) {
        newErrors.initial_price = 'Fiyat zorunludur';
      } else {
        const price = parseFloat(formData.initial_price);
        if (isNaN(price) || price < 0) {
          newErrors.initial_price = 'Gecerli bir fiyat girin';
        }
      }
    }

    // Calories validation (optional but must be number if provided)
    if (formData.calories.trim()) {
      const calories = parseInt(formData.calories);
      if (isNaN(calories) || calories < 0) {
        newErrors.calories = 'Gecerli bir kalori degeri girin';
      }
    }

    // Preparation time validation (optional but must be number if provided)
    if (formData.preparation_time_minutes.trim()) {
      const prepTime = parseInt(formData.preparation_time_minutes);
      if (isNaN(prepTime) || prepTime < 0) {
        newErrors.preparation_time_minutes = 'Gecerli bir sure girin';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

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

      if (mode === 'new') {
        // Create new product
        const newProduct: ProductInsert = {
          organization_id: organizationId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category_id: formData.category_id || null,
          image_url: features.has_images ? formData.image_url : null,
          allergens: formData.allergens.trim() || null,
          calories: formData.calories.trim() ? parseInt(formData.calories) : null,
          preparation_time_minutes: formData.preparation_time_minutes.trim() ? parseInt(formData.preparation_time_minutes) : null,
          is_chef_special: features.has_chef_special ? formData.is_chef_special : false,
          is_daily_special: features.has_daily_special ? formData.is_daily_special : false,
          is_active: formData.is_active,
        };

        const { data: createdProduct, error: insertError } = await supabase
          .from('products')
          .insert(newProduct)
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Insert initial price into price_ledger
        const price = parseFloat(formData.initial_price);
        const { error: priceError } = await supabase
          .from('price_ledger')
          .insert({
            product_id: createdProduct.id,
            price: price,
            currency: formData.price_currency,
            change_reason: 'Baslangic fiyati',
          });

        if (priceError) {
          // Rollback product creation
          await supabase.from('products').delete().eq('id', createdProduct.id);
          throw new Error(priceError.message);
        }

        // Redirect to products list
        router.push('/products');
        router.refresh();
      } else if (product) {
        // Update existing product
        const updateData: ProductUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category_id: formData.category_id || null,
          image_url: features.has_images ? formData.image_url : product.image_url,
          allergens: formData.allergens.trim() || null,
          calories: formData.calories.trim() ? parseInt(formData.calories) : null,
          preparation_time_minutes: formData.preparation_time_minutes.trim() ? parseInt(formData.preparation_time_minutes) : null,
          is_chef_special: features.has_chef_special ? formData.is_chef_special : product.is_chef_special,
          is_daily_special: features.has_daily_special ? formData.is_daily_special : product.is_daily_special,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setSaved(true);
        router.refresh();

        // Auto-hide success message after 3 seconds
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Kaydedilirken bir hata olustu. Lutfen tekrar deneyin.');
      }
    } finally {
      setSaving(false);
    }
  }, [formData, mode, product, organizationId, features, router, validateForm]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <Icons.ArrowLeft />
          Urunlere Don
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'new' ? 'Yeni Urun' : 'Urunu Duzenle'}
          </h1>
          <p className="text-gray-500 mt-1">
            {mode === 'new'
              ? 'Menuye yeni bir urun ekleyin'
              : `"${product?.name}" urununu duzenleyin`}
          </p>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0 text-green-600">
            <Icons.Check />
          </div>
          <p className="text-sm text-green-700">Degisiklikler basariyla kaydedildi.</p>
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

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Temel Bilgiler</h2>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label htmlFor="name" className="label">
                  Urun Adi <span className="text-red-500">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ornegin: Filtre Kahve"
                  error={errors.name}
                />
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
                  className="input"
                  placeholder="Urun hakkinda kisa bir aciklama..."
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category_id" className="label">
                  Kategori
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    category_id: e.target.value || null
                  }))}
                  className="input"
                >
                  <option value="">Kategori secin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} {!category.is_active && '(Pasif)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Price Card (only for new products) */}
          {mode === 'new' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fiyat</h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label htmlFor="initial_price" className="label">
                    Fiyat <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="initial_price"
                    name="initial_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initial_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    error={errors.initial_price}
                  />
                </div>

                {/* Currency */}
                <div>
                  <label htmlFor="price_currency" className="label">
                    Para Birimi
                  </label>
                  <select
                    id="price_currency"
                    name="price_currency"
                    value={formData.price_currency}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="TRY">TRY (Turk Lirasi)</option>
                    <option value="USD">USD (Amerikan Dolari)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-2">
                Fiyat degisiklikleri icin urun detay sayfasini kullanin.
              </p>
            </div>
          )}

          {/* Additional Info Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ek Bilgiler</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Allergens */}
              <div className="md:col-span-2">
                <label htmlFor="allergens" className="label">
                  Alerjenler
                </label>
                <Input
                  id="allergens"
                  name="allergens"
                  value={formData.allergens}
                  onChange={handleChange}
                  placeholder="Ornegin: Gluten, Sut, Findik"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Virgul ile ayirarak birden fazla alerjen girebilirsiniz.
                </p>
              </div>

              {/* Calories */}
              <div>
                <label htmlFor="calories" className="label">
                  Kalori (kcal)
                </label>
                <Input
                  id="calories"
                  name="calories"
                  type="number"
                  min="0"
                  value={formData.calories}
                  onChange={handleChange}
                  placeholder="Ornegin: 250"
                  error={errors.calories}
                />
              </div>

              {/* Preparation Time */}
              <div>
                <label htmlFor="preparation_time_minutes" className="label">
                  Hazirlama Suresi (dakika)
                </label>
                <Input
                  id="preparation_time_minutes"
                  name="preparation_time_minutes"
                  type="number"
                  min="0"
                  value={formData.preparation_time_minutes}
                  onChange={handleChange}
                  placeholder="Ornegin: 15"
                  error={errors.preparation_time_minutes}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Image and Badges */}
        <div className="space-y-6">
          {/* Image Upload Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Urun Resmi</h2>

            <ImageUpload
              currentImage={formData.image_url}
              onImageChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
              organizationId={organizationId}
              disabled={saving}
              locked={!features.has_images}
            />

            <p className="text-xs text-gray-500 mt-3">
              Kare format onerilir. Maksimum 5MB.
            </p>
          </div>

          {/* Badges Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rozetler</h2>

            <div className="space-y-4">
              {/* Chef Special */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="flex items-center gap-1">
                    <Icons.Star />
                    Sef Ozel
                  </Badge>
                </div>
                {features.has_chef_special ? (
                  <input
                    type="checkbox"
                    id="is_chef_special"
                    name="is_chef_special"
                    checked={formData.is_chef_special}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                ) : (
                  <UpgradePrompt featureKey="module_chef_special" variant="minimal" />
                )}
              </div>

              {/* Daily Special */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="flex items-center gap-1">
                    <Icons.Sparkles />
                    Gunun Yemegi
                  </Badge>
                </div>
                {features.has_daily_special ? (
                  <input
                    type="checkbox"
                    id="is_daily_special"
                    name="is_daily_special"
                    checked={formData.is_daily_special}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                ) : (
                  <UpgradePrompt featureKey="module_daily_special" variant="minimal" />
                )}
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Durum</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Aktif</p>
                <p className="text-xs text-gray-500">Menude gorunsun</p>
              </div>
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t">
        <Link href="/products">
          <Button type="button" variant="secondary">
            Iptal
          </Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Icons.Spinner />
              Kaydediliyor...
            </>
          ) : mode === 'new' ? (
            'Urunu Ekle'
          ) : (
            'Degisiklikleri Kaydet'
          )}
        </Button>
      </div>
    </form>
  );
}
