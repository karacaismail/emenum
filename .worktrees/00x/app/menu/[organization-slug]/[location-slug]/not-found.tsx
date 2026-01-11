/**
 * Location Menu Not Found Page
 *
 * Next.js not-found.tsx file that displays when the organization
 * or location slug is invalid or doesn't exist.
 *
 * This is triggered by calling notFound() in the page.tsx file.
 * Handles cases like:
 * - Invalid organization slug
 * - Invalid location slug
 * - Location not belonging to the organization
 * - Inactive organization or location
 */

import { InvalidSlugError } from '@/components/menu';

export default function LocationMenuNotFoundPage() {
  return (
    <InvalidSlugError
      title="Menu Bulunamadi"
      message="Aradiginiz konum veya isletme mevcut degil. Lutfen QR kodu tekrar tarayin veya isletme ile iletisime gecin."
    />
  );
}
