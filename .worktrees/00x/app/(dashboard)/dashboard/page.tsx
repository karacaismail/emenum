/**
 * Dashboard Home Page
 *
 * Ana dashboard sayfasi. Isletme istatistiklerini, son aktiviteleri ve
 * hizli eylemleri gosterir.
 *
 * Icerdikleri:
 * - Urun sayisi, kategori sayisi, fiyat degisiklikleri
 * - Masa ve servis istekleri istatistikleri
 * - Son fiyat degisiklikleri listesi
 * - Hizli eylemler (urun ekle, kategori ekle, vb.)
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import type { OrganizationStatsView, PriceHistoryView } from '@/types/database';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Isletme paneli - Genel bakis ve istatistikler',
};

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Products: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Categories: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  PriceTag: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Tables: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  Snapshot: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray';
  href?: string;
}

function StatCard({ title, value, subtitle, icon, color, href }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  const content = (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        {href && (
          <div className="text-gray-400">
            <Icons.ArrowRight />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// =============================================================================
// QUICK ACTION COMPONENT
// =============================================================================

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

function QuickAction({ title, description, href, icon, color }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Icons.ArrowRight />
    </Link>
  );
}

// =============================================================================
// PRICE CHANGE ITEM COMPONENT
// =============================================================================

interface PriceChangeItemProps {
  productName: string;
  categoryName: string | null;
  oldPrice: number | null;
  newPrice: number;
  currency: string;
  changedBy: string | null;
  changeReason: string | null;
  createdAt: string;
}

function PriceChangeItem({
  productName,
  categoryName,
  oldPrice,
  newPrice,
  currency,
  changedBy,
  changeReason,
  createdAt,
}: PriceChangeItemProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const isIncrease = oldPrice !== null && newPrice > oldPrice;
  const isDecrease = oldPrice !== null && newPrice < oldPrice;

  return (
    <div className="flex items-start py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{productName}</p>
          {categoryName && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {categoryName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {oldPrice !== null && (
            <>
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(oldPrice)}
              </span>
              <span className="text-gray-400">→</span>
            </>
          )}
          <span className={`text-sm font-medium ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-900'}`}>
            {formatPrice(newPrice)}
          </span>
          {isIncrease && <Icons.TrendUp />}
          {isDecrease && <Icons.TrendDown />}
        </div>
        {changeReason && (
          <p className="text-xs text-gray-500 mt-1 italic">&quot;{changeReason}&quot;</p>
        )}
      </div>
      <div className="ml-4 text-right">
        <div className="flex items-center text-xs text-gray-500">
          <Icons.Clock />
          <span className="ml-1">{formatDate(createdAt)}</span>
        </div>
        {changedBy && (
          <p className="text-xs text-gray-400 mt-1">{changedBy}</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Kullanici kontrolu
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login?redirectTo=/dashboard');
  }

  // Kullanicinin organizasyonunu bul
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .maybeSingle();

  const organizationId = membership?.organization_id;

  // Organizasyon yoksa empty state goster
  if (!organizationId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Hos geldiniz!</p>
        </div>

        <div className="card p-12">
          <EmptyState
            title="Henuz bir isletmeniz yok"
            description="Baslamak icin bir isletme olusturmaniz gerekiyor."
            action={
              <Link href="/register" className="btn-primary">
                Isletme Olustur
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // Organizasyon istatistiklerini al
  const { data: statsData } = await supabase
    .from('organization_stats')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  // Son fiyat degisikliklerini al (son 10 tanesi)
  const { data: recentPriceChanges } = await supabase
    .from('price_history_view')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Organizasyon bilgilerini al (menu linki icin)
  const { data: orgData } = await supabase
    .from('organizations')
    .select('name, slug')
    .eq('id', organizationId)
    .single();

  // Type assertion for stats
  const stats = statsData as OrganizationStatsView | null;
  const priceChanges = (recentPriceChanges || []) as PriceHistoryView[];

  // Format relative time
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Henuz yok';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Az once';
    if (diffMins < 60) return `${diffMins} dakika once`;
    if (diffHours < 24) return `${diffHours} saat once`;
    if (diffDays === 1) return 'Dun';
    if (diffDays < 7) return `${diffDays} gun once`;

    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Hos geldiniz! Isletmenizin genel durumuna buradan goz atabilirsiniz.
          </p>
        </div>
        {orgData?.slug && (
          <a
            href={`/menu/${orgData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <span>Menuyu Goruntule</span>
            <Icons.ExternalLink />
          </a>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Urun"
          value={stats?.active_products ?? 0}
          subtitle={stats?.total_products !== stats?.active_products
            ? `${stats?.total_products ?? 0} toplam (${(stats?.total_products ?? 0) - (stats?.active_products ?? 0)} pasif)`
            : undefined}
          icon={<Icons.Products />}
          color="blue"
          href="/products"
        />
        <StatCard
          title="Kategoriler"
          value={stats?.active_categories ?? 0}
          subtitle={stats?.total_categories !== stats?.active_categories
            ? `${stats?.total_categories ?? 0} toplam`
            : undefined}
          icon={<Icons.Categories />}
          color="green"
          href="/categories"
        />
        <StatCard
          title="Fiyat Degisiklikleri"
          value={stats?.price_changes_last_30_days ?? 0}
          subtitle="Son 30 gun"
          icon={<Icons.PriceTag />}
          color="yellow"
        />
        <StatCard
          title="Masalar"
          value={stats?.active_tables ?? 0}
          subtitle={stats?.service_requests_last_24h
            ? `${stats.service_requests_last_24h} istek (24s)`
            : undefined}
          icon={<Icons.Tables />}
          color="purple"
          href="/tables"
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hizli Islemler</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="Urun Ekle"
            description="Menuye yeni urun ekleyin"
            href="/products/new"
            icon={<Icons.Plus />}
            color="bg-blue-100 text-blue-600"
          />
          <QuickAction
            title="Kategori Ekle"
            description="Yeni kategori olusturun"
            href="/categories"
            icon={<Icons.Plus />}
            color="bg-green-100 text-green-600"
          />
          <QuickAction
            title="Masa Ekle"
            description="Yeni masa tanimlayin"
            href="/tables"
            icon={<Icons.Plus />}
            color="bg-purple-100 text-purple-600"
          />
          <QuickAction
            title="Denetim Kaydi"
            description="Fiyat gecmisini inceleyin"
            href="/audit"
            icon={<Icons.Snapshot />}
            color="bg-yellow-100 text-yellow-600"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Price Changes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Son Fiyat Degisiklikleri</h2>
            <Link href="/audit" className="text-sm text-primary-600 hover:text-primary-700">
              Tumu
            </Link>
          </div>
          {priceChanges.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {priceChanges.slice(0, 5).map((change, index) => {
                // Find previous price for comparison
                const previousChange = priceChanges.find(
                  (c, i) => i > index && c.product_id === change.product_id
                );

                return (
                  <PriceChangeItem
                    key={change.id}
                    productName={change.product_name}
                    categoryName={change.category_name}
                    oldPrice={previousChange?.price ?? null}
                    newPrice={change.price}
                    currency={change.currency}
                    changedBy={change.changed_by_name || change.changed_by_email}
                    changeReason={change.change_reason}
                    createdAt={change.created_at}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Henuz fiyat degisikligi yok"
              description="Urunlerinize fiyat ekledikce burada gorunecek."
            />
          )}
        </div>

        {/* Activity Summary */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktivite Ozeti</h2>
          <div className="space-y-4">
            {/* Last Product Update */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Icons.Products />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Son Urun Guncelleme</p>
                  <p className="text-xs text-gray-500">Urun bilgileri degistirildi</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {formatRelativeTime(stats?.last_product_update ?? null)}
              </span>
            </div>

            {/* Last Price Change */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                  <Icons.PriceTag />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Son Fiyat Degisikligi</p>
                  <p className="text-xs text-gray-500">Fiyat guncellendi</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {formatRelativeTime(stats?.last_price_change ?? null)}
              </span>
            </div>

            {/* Service Requests */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Icons.Bell />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Servis Istekleri</p>
                  <p className="text-xs text-gray-500">Son 24 saat</p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats?.service_requests_last_24h ?? 0}
              </span>
            </div>

            {/* Menu Snapshots */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-green-50 text-green-600">
                  <Icons.Snapshot />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Menu Kayitlari</p>
                  <p className="text-xs text-gray-500">Toplam snapshot sayisi</p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats?.total_snapshots ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="card p-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary-900">Yardima mi ihtiyaciniz var?</h3>
            <p className="text-sm text-primary-700 mt-1">
              Sorulariniz icin destek ekibimize ulasabilirsiniz.
            </p>
          </div>
          <a
            href="mailto:destek@ozamenu.com"
            className="btn-primary whitespace-nowrap"
          >
            Destek Talebi Olustur
          </a>
        </div>
      </div>
    </div>
  );
}
