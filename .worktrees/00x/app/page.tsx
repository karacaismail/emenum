import Link from 'next/link';

/**
 * Landing Page - OzaMenu SaaS Platform
 *
 * Ana sayfa. Ürün tanıtımı, özellikler ve CTA bölümlerini içerir.
 * Mobil öncelikli tasarım ile tüm cihazlara uyumludur.
 */

// Hero Section Icons
function QRCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function BellAlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5"
      />
    </svg>
  );
}

function BuildingStorefrontIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// Feature data
const features = [
  {
    title: 'QR Menü',
    description:
      'Masa bazlı QR kodlarla müşterileriniz anında menünüze ulaşır. Uygulama indirme gerektirmez.',
    icon: QRCodeIcon,
  },
  {
    title: 'Dijital Fiyat Defteri',
    description:
      'Ticaret Bakanlığı regülasyonlarına uyumlu, değiştirilemez fiyat kaydı. Her değişiklik SHA-256 ile korunur.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Anlık Garson Çağırma',
    description:
      'Müşterileriniz tek tuşla garson çağırabilir. Gerçek zamanlı bildirimlerle hiçbir isteği kaçırmayın.',
    icon: BellAlertIcon,
  },
  {
    title: 'Happy Hour Desteği',
    description:
      'Zamanlı fiyatlandırma ile belirli saatlerde otomatik indirimler tanımlayın.',
    icon: ClockIcon,
  },
  {
    title: 'İşletme Paneli',
    description:
      'Ürünlerinizi, kategorilerinizi ve fiyatlarınızı kolayca yönetin. Mobil uyumlu panel.',
    icon: BuildingStorefrontIcon,
  },
  {
    title: 'Detaylı Raporlar',
    description:
      'Fiyat değişiklik geçmişi, menü snapshot\'ları ve denetim kayıtlarına anında erişin.',
    icon: ChartBarIcon,
  },
];

// Pricing plans
const plans = [
  {
    name: 'Lite',
    price: '₺199',
    period: '/ay',
    description: 'Küçük işletmeler için ideal başlangıç paketi.',
    features: [
      '20 ürün limiti',
      '3 kategori',
      'Temel QR menü',
      'Fiyat geçmişi',
      'E-posta desteği',
    ],
    cta: 'Başla',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '₺399',
    period: '/ay',
    description: 'Büyüyen işletmeler için kapsamlı çözüm.',
    features: [
      'Sınırsız ürün',
      'Sınırsız kategori',
      'Ürün görselleri',
      'Logo ve kapak resmi',
      'Garson çağırma',
      'Öncelikli destek',
    ],
    cta: 'Başla',
    highlighted: true,
  },
  {
    name: 'Premium',
    price: '₺699',
    period: '/ay',
    description: 'Tüm özellikler dahil enterprise çözüm.',
    features: [
      'Pro planının tüm özellikleri',
      'Happy Hour zamanlama',
      'Çapraz satış önerileri',
      'Besin değerleri bilgisi',
      'Sosyal medya paylaşım',
      '7/24 destek',
    ],
    cta: 'Başla',
    highlighted: false,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <nav className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <QRCodeIcon className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">OzaMenu</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Giriş Yap
            </Link>
            <Link href="/register" className="btn-primary">
              Ücretsiz Dene
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white py-16 sm:py-24">
          <div className="container-app">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                Dijital Fiyat Defteri ve{' '}
                <span className="text-gradient">QR Menü</span> Platformu
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
                Ticaret Bakanlığı regülasyonlarına uyumlu, yasal olarak geçerli ve
                değiştirilemez fiyat kaydı tutan modern SaaS çözümü.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register" className="btn-primary px-8 py-3 text-base">
                  Hemen Başla
                </Link>
                <Link
                  href="#features"
                  className="btn-secondary px-8 py-3 text-base"
                >
                  Özellikleri Keşfet
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
              {[
                { value: '500+', label: 'İşletme' },
                { value: '50K+', label: 'Menü Görüntüleme' },
                { value: '%99.9', label: 'Uptime' },
                { value: '7/24', label: 'Destek' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-primary-600 sm:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Neden OzaMenu?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                İşletmenizi dijitalleştirin, müşteri deneyimini iyileştirin ve yasal
                gerekliliklere uyumlu kalın.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="card p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                    <feature.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance Banner */}
        <section className="bg-primary-600 py-12">
          <div className="container-app">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <ShieldCheckIcon className="h-12 w-12 text-primary-100" />
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Ticaret Bakanlığı Uyumlu
                  </h3>
                  <p className="text-primary-100">
                    Dijital fiyat defteri regülasyonlarına tam uyum
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50"
              >
                Detaylı Bilgi Al
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 sm:py-24">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Paketler ve Fiyatlar
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                İşletmenizin büyüklüğüne uygun paketi seçin. Tüm paketlerde 14 gün
                ücretsiz deneme.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`card relative p-8 ${
                    plan.highlighted
                      ? 'border-2 border-primary-500 shadow-lg'
                      : ''
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-sm font-medium text-white">
                      Popüler
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                  <div className="mt-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <CheckIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-8 block w-full text-center ${
                      plan.highlighted ? 'btn-primary' : 'btn-secondary'
                    } py-3`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gray-900 py-16 sm:py-24">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                İşletmenizi Dijitalleştirin
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                14 gün ücretsiz deneme ile OzaMenu&apos;nün tüm özelliklerini keşfedin.
                Kredi kartı gerektirmez.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="btn-primary px-8 py-3 text-base"
                >
                  Ücretsiz Deneyin
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-white hover:text-primary-300"
                >
                  Zaten hesabınız var mı? Giriş yapın →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container-app">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <QRCodeIcon className="h-6 w-6 text-primary-600" />
              <span className="font-semibold text-gray-900">OzaMenu</span>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} OzaMenu. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Gizlilik Politikası
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Kullanım Koşulları
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
