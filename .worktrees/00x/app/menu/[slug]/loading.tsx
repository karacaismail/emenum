/**
 * Menu Loading State
 *
 * Next.js loading.tsx file that displays a skeleton loader
 * while the menu page data is being fetched.
 *
 * This provides a smooth loading experience with streaming SSR.
 */

import { MenuPageSkeleton } from '@/components/menu';

export default function MenuLoading() {
  return (
    <MenuPageSkeleton
      categorySections={3}
      productsPerCategory={4}
      showImages={true}
      showFloatingButton={true}
      showContactInfo={true}
      showFooter={true}
    />
  );
}
