/**
 * Organization Settings Page
 *
 * Isletme profil ayarlari sayfasi. Kullanicilarin isletme bilgilerini
 * duzenlemesine olanak tanir:
 * - Isletme adi
 * - Logo (resim yukleme)
 * - Kapak resmi (sayfanin ust %20'lik alani)
 * - Iletisim bilgileri (telefon, email, adres, website, sosyal medya)
 * - Menu slug (URL)
 *
 * NOT: Bu sayfa sadece admin ve owner rolleri icin erisime aciktir.
 * Middleware ve dashboard-shell.tsx'te bu kontrol yapilmaktadir.
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import SettingsForm from './settings-form';

export const metadata: Metadata = {
  title: 'Ayarlar',
  description: 'Isletme profil ayarlari - Logo, kapak resmi, iletisim bilgileri ve menu URL',
};

/**
 * Extended organization type with all fields needed for the form
 */
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

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/settings');
  }

  // Kullanicinin organizasyon uyeligini ve rolunu al
  const { data: membershipData } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization_id,
      organization:organizations(
        id,
        name,
        slug,
        description,
        logo_url,
        cover_image_url,
        background_color,
        phone,
        email,
        address,
        website,
        instagram_url,
        facebook_url,
        twitter_url,
        status
      )
    `)
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .maybeSingle();

  // Organizasyon yoksa dashboard'a yonlendir
  if (!membershipData?.organization_id) {
    redirect('/dashboard');
  }

  // Rol kontrolu - sadece owner ve admin erisebilir
  const allowedRoles = ['owner', 'admin'];
  if (!allowedRoles.includes(membershipData.role)) {
    redirect('/dashboard');
  }

  // Organizasyon verisini cikart
  type OrgQueryResult = {
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
  };

  const orgData = membershipData.organization as unknown;
  let organization: OrganizationSettings | null = null;

  if (orgData && typeof orgData === 'object') {
    if (Array.isArray(orgData)) {
      organization = (orgData as OrgQueryResult[])[0] ?? null;
    } else {
      organization = orgData as OrgQueryResult;
    }
  }

  if (!organization) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Isletme Ayarlari</h1>
        <p className="text-gray-500 mt-1">
          Isletmenizin profil bilgilerini, logo, kapak resmi ve iletisim ayarlarini buradan duzenleyebilirsiniz.
        </p>
      </div>

      {/* Settings Form */}
      <SettingsForm
        organization={organization}
        userRole={membershipData.role}
      />
    </div>
  );
}
