/**
 * Test Utilities
 *
 * Custom render fonksiyonu ve test yardımcıları.
 * Provider'ları sarmalayarak bileşenleri test etmeyi kolaylaştırır.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect } from 'vitest';

// ============================================
// Provider Wrapper Types
// ============================================

export interface WrapperProviderOptions {
  // Feature context props
  features?: Record<string, boolean | number>;
  planName?: string;
  organizationId?: string;

  // Router state
  pathname?: string;
  searchParams?: Record<string, string>;
  params?: Record<string, string>;

  // Auth state
  isAuthenticated?: boolean;
  userId?: string;
}

// ============================================
// Mock Providers
// ============================================

// FeatureContext mock provider
interface MockFeatureProviderProps {
  features?: Record<string, boolean | number>;
  planName?: string;
  children: ReactNode;
}

function MockFeatureProvider({
  features = {},
  planName = 'lite',
  children,
}: MockFeatureProviderProps) {
  // Context'i mock etmek için basit bir wrapper
  // Gerçek FeatureProvider'dan bağımsız test yapabilmek için
  return <div data-testid="mock-feature-provider" data-plan={planName}>{children}</div>;
}

// Toast provider mock
function MockToastProvider({ children }: { children: ReactNode }) {
  return <div data-testid="mock-toast-provider">{children}</div>;
}

// ============================================
// All Providers Wrapper
// ============================================

interface AllProvidersProps extends WrapperProviderOptions {
  children: ReactNode;
}

function AllProviders({
  children,
  features = {},
  planName = 'lite',
}: AllProvidersProps) {
  return (
    <MockToastProvider>
      <MockFeatureProvider features={features} planName={planName}>
        {children}
      </MockFeatureProvider>
    </MockToastProvider>
  );
}

// ============================================
// Custom Render Function
// ============================================

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  providerOptions?: WrapperProviderOptions;
}

/**
 * Provider'ları içeren özel render fonksiyonu
 *
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   providerOptions: {
 *     features: { module_waiter_call: true },
 *     planName: 'pro',
 *   },
 * });
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { providerOptions = {}, ...renderOptions } = options;

  const user = userEvent.setup();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders {...providerOptions}>{children}</AllProviders>
  );

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// ============================================
// Convenience Re-exports
// ============================================

export * from '@testing-library/react';
export { userEvent };

// Default render'ı override etme - istenirse kullanılabilir
// export { render } from '@testing-library/react';

// ============================================
// Test Helpers
// ============================================

/**
 * Async işlem beklemek için yardımcı
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock fonksiyonun çağrılmasını bekle
 */
export async function waitForMockCall(
  mockFn: ReturnType<typeof vi.fn>,
  timeout = 1000
): Promise<void> {
  const startTime = Date.now();
  while (mockFn.mock.calls.length === 0) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Mock function was not called within ${timeout}ms`);
    }
    await waitForAsync(50);
  }
}

/**
 * Element'in görünür olmasını bekle
 */
export async function waitForElementToBeVisible(
  container: HTMLElement,
  testId: string,
  timeout = 1000
): Promise<HTMLElement> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = container.querySelector(`[data-testid="${testId}"]`);
    if (element && getComputedStyle(element).display !== 'none') {
      return element as HTMLElement;
    }
    await waitForAsync(50);
  }
  throw new Error(`Element with testId "${testId}" was not visible within ${timeout}ms`);
}

/**
 * Form değerlerini kontrol et
 */
export function expectFormValues(
  container: HTMLElement,
  expected: Record<string, string>
) {
  Object.entries(expected).forEach(([name, value]) => {
    const input = container.querySelector(`[name="${name}"]`) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe(value);
  });
}

/**
 * Form alanını doldur
 */
export async function fillFormField(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
  name: string,
  value: string
) {
  const input = container.querySelector(`[name="${name}"]`) as HTMLInputElement;
  if (!input) {
    throw new Error(`Input with name "${name}" not found`);
  }
  await user.clear(input);
  await user.type(input, value);
}

/**
 * Birden fazla form alanını doldur
 */
export async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
  values: Record<string, string>
) {
  for (const [name, value] of Object.entries(values)) {
    await fillFormField(user, container, name, value);
  }
}

// ============================================
// Mock Data Helpers
// ============================================

/**
 * Test için benzersiz ID oluştur
 */
let testIdCounter = 0;
export function createTestId(prefix = 'test'): string {
  return `${prefix}-${++testIdCounter}-${Date.now()}`;
}

/**
 * Test ID counter'ı sıfırla
 */
export function resetTestIdCounter(): void {
  testIdCounter = 0;
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Element'in class'ı içerip içermediğini kontrol et
 */
export function expectToHaveClass(
  element: HTMLElement,
  className: string
): void {
  expect(element.classList.contains(className)).toBe(true);
}

/**
 * Element'in disabled olup olmadığını kontrol et
 */
export function expectToBeDisabled(element: HTMLElement): void {
  expect(element).toHaveAttribute('disabled');
}

/**
 * Element'in enabled olup olmadığını kontrol et
 */
export function expectToBeEnabled(element: HTMLElement): void {
  expect(element).not.toHaveAttribute('disabled');
}

/**
 * Loading state'i kontrol et
 */
export function expectLoadingState(
  container: HTMLElement,
  isLoading: boolean
): void {
  const loadingIndicator = container.querySelector('[data-loading="true"]');
  if (isLoading) {
    expect(loadingIndicator).toBeInTheDocument();
  } else {
    expect(loadingIndicator).not.toBeInTheDocument();
  }
}

/**
 * Error state'i kontrol et
 */
export function expectErrorState(
  container: HTMLElement,
  errorMessage?: string
): void {
  const errorElement = container.querySelector('[role="alert"]');
  expect(errorElement).toBeInTheDocument();
  if (errorMessage) {
    expect(errorElement).toHaveTextContent(errorMessage);
  }
}
