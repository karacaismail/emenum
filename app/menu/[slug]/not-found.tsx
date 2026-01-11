/**
 * Menu Not Found Page
 *
 * Next.js not-found.tsx file that displays when the menu slug
 * is invalid or the organization doesn't exist.
 *
 * This is triggered by calling notFound() in the page.tsx file.
 */

import { InvalidSlugError } from '@/components/menu';

export default function MenuNotFoundPage() {
  return (
    <InvalidSlugError
      title="Menu Bulunamadi"
      message="Aradiginiz menu mevcut degil veya aktif degil. Lutfen QR kodu tekrar tarayin veya isletme ile iletisime gecin."
    />
  );
}
