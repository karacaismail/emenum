/**
 * Dashboard Layout - Merchant Panel
 *
 * Bu layout, merchant dashboard sayfalarini sarar.
 * - Auth kontrolu (kullanici giris yapmis olmali)
 * - Organization context (kullanicinin organizasyonu)
 * - Sidebar navigation
 * - FeatureProvider ile ozellik kontrolu
 * - Responsive design (mobil menu)
 *
 * NOT: Middleware zaten protected route kontrolu yapiyor,
 * burada ek olarak organization ve membership bilgilerini aliyoruz.
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import DashboardShell from './dashboard-shell';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | Dashboard | OzaMenu',
  },
  description: 'OzaMenu isletme paneli - Urunler, kategoriler, masalar ve daha fazlasini yonetin.',
};

/**
 * Organization data type for client
 */
export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
}

/**
 * User data type for client
 */
export interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
}

/**
 * Membership data type for client
 */
export interface MembershipData {
  role: 'owner' | 'admin' | 'manager' | 'waiter' | 'viewer';
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu - getUser() kullanarak guvenli dogrulama
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  // Kullanici yoksa login'e yonlendir
  if (authError || !authUser) {
    redirect('/login?redirectTo=/dashboard');
  }

  // Kullanici profil bilgilerini al
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, is_super_admin')
    .eq('id', authUser.id)
    .single();

  // Kullanicinin organizasyon uyeligini al
  const { data: membershipData } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations(
        id,
        name,
        slug,
        logo_url,
        status
      )
    `)
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .maybeSingle();

  // Organizasyon bilgilerini cikart
  // Supabase nested select'te foreign key relation tek bir obje dondurur
  // ancak TypeScript bunu array olarak tip'lendiriyor, bu yuzden tip donusumu gerekiyor
  type OrgQueryResult = {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    status: 'pending' | 'active' | 'suspended' | 'cancelled';
  };

  // organizasyon verisi tek bir obje veya null olabilir
  const orgData = membershipData?.organization as unknown;
  let organization: OrganizationData | null = null;

  if (orgData && typeof orgData === 'object') {
    if (Array.isArray(orgData)) {
      // Array olarak gelirse ilk elemani al
      organization = (orgData as OrgQueryResult[])[0] ?? null;
    } else {
      // Obje olarak gelirse direkt kullan
      organization = orgData as OrgQueryResult;
    }
  }

  const membership = membershipData ? { role: membershipData.role } as MembershipData : null;

  // Kullanici bilgilerini hazirla
  const user: UserData = {
    id: authUser.id,
    email: authUser.email || '',
    full_name: userData?.full_name ?? null,
    avatar_url: userData?.avatar_url ?? null,
    is_super_admin: userData?.is_super_admin ?? false,
  };

  return (
    <DashboardShell
      user={user}
      organization={organization}
      membership={membership}
    >
      {children}
    </DashboardShell>
  );
}
