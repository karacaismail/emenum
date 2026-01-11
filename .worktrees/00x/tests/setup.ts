/**
 * Test Setup File
 *
 * Bu dosya her test dosyasından önce çalışır.
 * DOM matchers, global mocks ve cleanup işlemlerini içerir.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Her testten sonra DOM'u temizle
afterEach(() => {
  cleanup();
});

// ============================================
// Browser API Mocks
// ============================================

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// sessionStorage mock
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver mock
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// IntersectionObserver mock
class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// scrollTo mock
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// fetch mock - varsayilan olarak bos bir response dondurur
// Her test kendi mock'unu yazabilir
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  status: 200,
  statusText: 'OK',
});

// URL.createObjectURL mock
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn().mockReturnValue('blob:mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// crypto.randomUUID mock
Object.defineProperty(crypto, 'randomUUID', {
  writable: true,
  value: vi.fn().mockReturnValue('test-uuid-1234-5678-9012-345678901234'),
});

// ============================================
// Next.js Specific Mocks
// ============================================

// next/navigation mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// next/headers mocks - Server Component icin
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(() => false),
  })),
  headers: vi.fn(() => new Map()),
}));

// next/image mock
vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, ...props }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return `<img src="${src}" alt="${alt}" data-testid="next-image" />`;
  }),
}));

// ============================================
// Console warnings/errors handling
// ============================================

// Test sirasinda belirli uyarilari gizle (gerekirse)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // React act() uyarilarini filtrele
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render is no longer supported') ||
        message.includes('Warning: An update to') ||
        message.includes('act(...)'))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      message.includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// ============================================
// Test Utilities Export
// ============================================

// LocalStorage'i temizle
export function clearLocalStorage() {
  localStorageMock.clear();
  vi.mocked(localStorageMock.getItem).mockClear();
  vi.mocked(localStorageMock.setItem).mockClear();
  vi.mocked(localStorageMock.removeItem).mockClear();
}

// SessionStorage'i temizle
export function clearSessionStorage() {
  sessionStorageMock.clear();
  vi.mocked(sessionStorageMock.getItem).mockClear();
  vi.mocked(sessionStorageMock.setItem).mockClear();
  vi.mocked(sessionStorageMock.removeItem).mockClear();
}

// Tum storage'lari temizle
export function clearAllStorage() {
  clearLocalStorage();
  clearSessionStorage();
}

// Fetch mock'unu sifirla
export function resetFetchMock() {
  vi.mocked(global.fetch).mockReset();
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    status: 200,
    statusText: 'OK',
  } as unknown as Response);
}
