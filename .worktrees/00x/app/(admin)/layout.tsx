/**
 * Admin Layout - Super Admin Panel
 *
 * Bu layout, super admin panelini sarar ve yalnizca
 * is_super_admin=true olan kullanicilara erisim saglar.
 *
 * - Auth kontrolu (kullanici giris yapmis olmali)
 * - Super admin kontrolu (is_super_admin=true olmali)
 * - Non-admin kullanicilari /dashboard'a yonlendirir
 * - Platform istatistikleri ve organizasyon yonetimi
 *
 * NOT: Middleware zaten admin route kontrolu yapiyor,
 * burada ek guvenlik katmani olarak tekrar kontrol ediyoruz.
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import AdminShell from './admin-shell';

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel',
    template: '%s | Admin | OzaMenu',
  },
  description: 'OzaMenu super admin paneli - Platform yonetimi, organizasyon aktivasyonu ve paket yonetimi.',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Admin user data type for client
 */
export interface AdminUserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
}

/**
 * Platform stats type for admin dashboard
 */
export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  pendingActivations: number;
  suspendedOrganizations: number;
  totalUsers: number;
}

export default async function AdminLayout({
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
    redirect('/login?redirectTo=/admin');
  }

  // Kullanici profil bilgilerini al - is_super_admin kontrolu icin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, is_super_admin')
    .eq('id', authUser.id)
    .single();

  // Kullanici verisi alinamadiysa veya super admin degilse
  // dashboard'a yonlendir
  if (userError || !userData) {
    console.error('Admin layout: User data fetch error:', userError);
    redirect('/dashboard');
  }

  // CRITICAL: Super admin kontrolu
  // is_super_admin=false olan kullanicilar admin paneline erisemez
  if (!userData.is_super_admin) {
    redirect('/dashboard');
  }

  // Platform istatistiklerini al (admin dashboard icin)
  const [
    { count: totalOrganizations },
    { count: activeOrganizations },
    { count: pendingActivations },
    { count: suspendedOrganizations },
    { count: totalUsers },
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true }),
  ]);

  // Admin kullanici bilgilerini hazirla
  const user: AdminUserData = {
    id: authUser.id,
    email: authUser.email || '',
    full_name: userData.full_name,
    avatar_url: userData.avatar_url,
    is_super_admin: userData.is_super_admin,
  };

  // Platform istatistiklerini hazirla
  const stats: PlatformStats = {
    totalOrganizations: totalOrganizations ?? 0,
    activeOrganizations: activeOrganizations ?? 0,
    pendingActivations: pendingActivations ?? 0,
    suspendedOrganizations: suspendedOrganizations ?? 0,
    totalUsers: totalUsers ?? 0,
  };

  return (
    <AdminShell user={user} stats={stats}>
      {children}
    </AdminShell>
  );
}
