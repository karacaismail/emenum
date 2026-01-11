/**
 * Edit Product Page
 *
 * Urun duzenleme sayfasi. Urun adi, aciklama, kategori,
 * resim yukleme (feature-gated), ve is_active toggle icin form sunar.
 *
 * Ozellikler:
 * - Urun formu (temel bilgiler, ek bilgiler, resim, rozetler)
 * - Mevcut fiyat goruntuleme (duzenleme icin ayri sayfa/modal kullanilir)
 * - Feature-gated ozellikler (resim, sef ozel, gunun yemegi)
 * - Sadece manager+ roller duzenleyebilir
 */

import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/guards/permission';
import { ProductForm } from '../product-form';
import type { Metadata } from 'next';
import type { Category, Product, CurrencyCode } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', id)
    .single();

  return {
    title: product ? `${product.name} - Duzenle` : 'Urun Duzenle',
    description: product ? `"${product.name}" urununu duzenleyin` : 'Urunu duzenleyin',
  };
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect(`/login?redirectTo=/products/${id}`);
  }

  // Kullanicinin organizasyonunu bul
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .maybeSingle();

  const organizationId = membership?.organization_id;
  const userRole = membership?.role || 'viewer';

  // Organizasyon yoksa dashboard'a yonlendir
  if (!organizationId) {
    redirect('/dashboard');
  }

  // Rol kontrolu - sadece manager+ roller urun duzenleyebilir
  if (!['owner', 'admin', 'manager'].includes(userRole)) {
    redirect('/products');
  }

  // Urunu al (guncel fiyat ile birlikte)
  const { data: productData, error: productError } = await supabase
    .from('products_with_current_price')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (productError || !productData) {
    notFound();
  }

  // Kategorileri al
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, is_active')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });

  // Feature flags kontrol et
  const [hasImages, hasChefSpecial, hasDailySpecial] = await Promise.all([
    hasPermission(organizationId, 'module_images'),
    hasPermission(organizationId, 'module_chef_special'),
    hasPermission(organizationId, 'module_daily_special'),
  ]);

  // Urun verisini type-safe olarak donustur
  const product: Product & { current_price?: number | null; current_currency?: CurrencyCode | null } = {
    id: productData.id,
    organization_id: productData.organization_id,
    category_id: productData.category_id,
    name: productData.name,
    description: productData.description,
    image_url: productData.image_url,
    allergens: productData.allergens,
    calories: productData.calories,
    preparation_time_minutes: productData.preparation_time_minutes,
    is_chef_special: productData.is_chef_special,
    is_daily_special: productData.is_daily_special,
    is_active: productData.is_active,
    sort_order: productData.sort_order,
    created_at: productData.created_at,
    updated_at: productData.updated_at,
    current_price: productData.current_price,
    current_currency: productData.current_currency,
  };

  // Kategori verilerini type-safe olarak donustur
  const categoriesData: Pick<Category, 'id' | 'name' | 'is_active'>[] = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    is_active: cat.is_active,
  }));

  return (
    <ProductForm
      product={product}
      categories={categoriesData}
      organizationId={organizationId}
      features={{
        has_images: hasImages,
        has_chef_special: hasChefSpecial,
        has_daily_special: hasDailySpecial,
      }}
      mode="edit"
    />
  );
}
