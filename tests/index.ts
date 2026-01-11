/**
 * Test Utilities Barrel Export
 *
 * Tum test yardimcilarini tek bir noktadan export eder.
 *
 * @example
 * import {
 *   renderWithProviders,
 *   createMockSupabaseClient,
 *   createMockUser,
 *   waitForAsync,
 * } from '@/tests';
 */

// Test utilities
export * from './test-utils';

// Supabase mocks
export * from './__mocks__/supabase';

// Setup utilities (ihtiyac halinde)
export {
  clearLocalStorage,
  clearSessionStorage,
  clearAllStorage,
  resetFetchMock,
} from './setup';

// Re-export vitest utilities
export { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
