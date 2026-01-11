/**
 * QR Code Generator Tests
 *
 * Bu testler QR kod olusturma ve URL uretme islevlerinin dogru calistigini dogrular.
 *
 * Test Senaryolari:
 * 1. generateMenuUrl - Menu URL olusturma (multi-location ve legacy)
 * 2. generateMenuUrlWithoutTable - Masa ID'siz menu URL olusturma
 * 3. extractOrgSlugFromUrl - URL'den organization slug cikarma
 * 4. extractLocationSlugFromUrl - URL'den location slug cikarma
 * 5. isMultiLocationUrl - Multi-location URL kontrolu
 * 6. generateTableQRCode - QR kod olusturma
 */

import { describe, it, expect } from 'vitest';
import {
  generateMenuUrl,
  generateMenuUrlWithoutTable,
  extractOrgSlugFromUrl,
  extractLocationSlugFromUrl,
  extractTableIdFromUrl,
  isMultiLocationUrl,
  isValidQRCodeUrl,
  isValidTableId,
  generateQRFilename,
} from '@/lib/services/qr-generator';

// =============================================================================
// generateMenuUrl Tests
// =============================================================================

describe('generateMenuUrl', () => {
  describe('Multi-location URL olusturma', () => {
    it('location slug ile multi-location URL olusturmali', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe-istanbul',
        'abc-123',
        'kadikoy'
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe-istanbul/kadikoy?table_id=abc-123');
    });

    it('location slug encode etmeli', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe',
        'abc-123',
        'sisli-merkez'
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe/sisli-merkez?table_id=abc-123');
    });

    it('ozel karakterli location slug encode etmeli', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe',
        'abc-123',
        'şişli' // Should be encoded
      );
      expect(url).toContain('%C5%9Fi%C5%9Fli'); // URL-encoded Turkish chars
    });
  });

  describe('Legacy (single-location) URL olusturma', () => {
    it('location slug olmadan legacy URL olusturmali', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe-istanbul',
        'abc-123'
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe-istanbul?table_id=abc-123');
    });

    it('undefined location slug ile legacy URL olusturmali', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe-istanbul',
        'abc-123',
        undefined
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe-istanbul?table_id=abc-123');
    });

    it('bos location slug ile legacy URL olusturmali', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe-istanbul',
        'abc-123',
        ''
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe-istanbul?table_id=abc-123');
    });
  });

  describe('URL temizleme', () => {
    it('base URL trailing slash temizlemeli', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com/',
        'cafe',
        'abc-123',
        'kadikoy'
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe/kadikoy?table_id=abc-123');
    });

    it('birden fazla trailing slash temizlemeli', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com///',
        'cafe',
        'abc-123'
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe?table_id=abc-123');
    });

    it('organization slug encode etmeli', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe istanbul', // space should be encoded
        'abc-123'
      );
      expect(url).toContain('cafe%20istanbul');
    });

    it('table ID encode etmeli', () => {
      const url = generateMenuUrl(
        'https://ozamenu.com',
        'cafe',
        'abc 123', // space should be encoded
        'kadikoy'
      );
      expect(url).toContain('table_id=abc%20123');
    });
  });
});

// =============================================================================
// generateMenuUrlWithoutTable Tests
// =============================================================================

describe('generateMenuUrlWithoutTable', () => {
  describe('Multi-location URL olusturma', () => {
    it('location slug ile multi-location URL olusturmali', () => {
      const url = generateMenuUrlWithoutTable(
        'https://ozamenu.com',
        'cafe-istanbul',
        'kadikoy'
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe-istanbul/kadikoy');
    });
  });

  describe('Legacy URL olusturma', () => {
    it('location slug olmadan legacy URL olusturmali', () => {
      const url = generateMenuUrlWithoutTable(
        'https://ozamenu.com',
        'cafe-istanbul'
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe-istanbul');
    });

    it('undefined location slug ile legacy URL olusturmali', () => {
      const url = generateMenuUrlWithoutTable(
        'https://ozamenu.com',
        'cafe-istanbul',
        undefined
      );
      expect(url).toBe('https://ozamenu.com/menu/cafe-istanbul');
    });
  });
});

// =============================================================================
// extractOrgSlugFromUrl Tests
// =============================================================================

describe('extractOrgSlugFromUrl', () => {
  describe('Multi-location URL\'den cikarma', () => {
    it('multi-location URL\'den organization slug cikarmali', () => {
      const slug = extractOrgSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul/kadikoy?table_id=abc-123'
      );
      expect(slug).toBe('cafe-istanbul');
    });

    it('table_id olmadan multi-location URL\'den cikarmali', () => {
      const slug = extractOrgSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul/kadikoy'
      );
      expect(slug).toBe('cafe-istanbul');
    });
  });

  describe('Legacy URL\'den cikarma', () => {
    it('legacy URL\'den organization slug cikarmali', () => {
      const slug = extractOrgSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul?table_id=abc-123'
      );
      expect(slug).toBe('cafe-istanbul');
    });

    it('table_id olmadan legacy URL\'den cikarmali', () => {
      const slug = extractOrgSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul'
      );
      expect(slug).toBe('cafe-istanbul');
    });
  });

  describe('Gecersiz URL\'ler', () => {
    it('menu path olmayan URL icin null donmeli', () => {
      const slug = extractOrgSlugFromUrl('https://ozamenu.com/other/cafe');
      expect(slug).toBeNull();
    });

    it('bos path icin null donmeli', () => {
      const slug = extractOrgSlugFromUrl('https://ozamenu.com/menu/');
      expect(slug).toBeNull();
    });

    it('gecersiz URL icin null donmeli', () => {
      const slug = extractOrgSlugFromUrl('not-a-valid-url');
      expect(slug).toBeNull();
    });
  });

  describe('Encoded URL\'ler', () => {
    it('encoded slug\'i decode etmeli', () => {
      const slug = extractOrgSlugFromUrl(
        'https://ozamenu.com/menu/cafe%20istanbul/kadikoy'
      );
      expect(slug).toBe('cafe istanbul');
    });
  });
});

// =============================================================================
// extractLocationSlugFromUrl Tests
// =============================================================================

describe('extractLocationSlugFromUrl', () => {
  describe('Multi-location URL\'den cikarma', () => {
    it('multi-location URL\'den location slug cikarmali', () => {
      const slug = extractLocationSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul/kadikoy?table_id=abc-123'
      );
      expect(slug).toBe('kadikoy');
    });

    it('table_id olmadan multi-location URL\'den cikarmali', () => {
      const slug = extractLocationSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul/kadikoy'
      );
      expect(slug).toBe('kadikoy');
    });

    it('encoded location slug\'i decode etmeli', () => {
      const slug = extractLocationSlugFromUrl(
        'https://ozamenu.com/menu/cafe/sisli%20merkez'
      );
      expect(slug).toBe('sisli merkez');
    });
  });

  describe('Legacy URL\'ler', () => {
    it('legacy URL icin null donmeli', () => {
      const slug = extractLocationSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul?table_id=abc-123'
      );
      expect(slug).toBeNull();
    });

    it('sadece org slug ile null donmeli', () => {
      const slug = extractLocationSlugFromUrl(
        'https://ozamenu.com/menu/cafe-istanbul'
      );
      expect(slug).toBeNull();
    });
  });

  describe('Gecersiz URL\'ler', () => {
    it('menu path olmayan URL icin null donmeli', () => {
      const slug = extractLocationSlugFromUrl('https://ozamenu.com/other/cafe/location');
      expect(slug).toBeNull();
    });

    it('gecersiz URL icin null donmeli', () => {
      const slug = extractLocationSlugFromUrl('not-a-valid-url');
      expect(slug).toBeNull();
    });
  });
});

// =============================================================================
// extractTableIdFromUrl Tests
// =============================================================================

describe('extractTableIdFromUrl', () => {
  it('URL\'den table_id cikarmali', () => {
    const tableId = extractTableIdFromUrl(
      'https://ozamenu.com/menu/cafe/kadikoy?table_id=abc-123'
    );
    expect(tableId).toBe('abc-123');
  });

  it('table_id olmayan URL icin null donmeli', () => {
    const tableId = extractTableIdFromUrl(
      'https://ozamenu.com/menu/cafe/kadikoy'
    );
    expect(tableId).toBeNull();
  });

  it('gecersiz URL icin null donmeli', () => {
    const tableId = extractTableIdFromUrl('not-a-valid-url');
    expect(tableId).toBeNull();
  });
});

// =============================================================================
// isMultiLocationUrl Tests
// =============================================================================

describe('isMultiLocationUrl', () => {
  it('multi-location URL icin true donmeli', () => {
    expect(isMultiLocationUrl('https://ozamenu.com/menu/cafe/kadikoy')).toBe(true);
    expect(isMultiLocationUrl('https://ozamenu.com/menu/cafe/kadikoy?table_id=123')).toBe(true);
  });

  it('legacy URL icin false donmeli', () => {
    expect(isMultiLocationUrl('https://ozamenu.com/menu/cafe')).toBe(false);
    expect(isMultiLocationUrl('https://ozamenu.com/menu/cafe?table_id=123')).toBe(false);
  });

  it('gecersiz URL icin false donmeli', () => {
    expect(isMultiLocationUrl('not-a-valid-url')).toBe(false);
  });
});

// =============================================================================
// URL Validation Tests
// =============================================================================

describe('isValidQRCodeUrl', () => {
  it('https URL gecerli olmali', () => {
    expect(isValidQRCodeUrl('https://ozamenu.com/menu/cafe')).toBe(true);
  });

  it('http URL gecerli olmali', () => {
    expect(isValidQRCodeUrl('http://ozamenu.com/menu/cafe')).toBe(true);
  });

  it('protocol olmayan URL gecersiz olmali', () => {
    expect(isValidQRCodeUrl('ozamenu.com/menu/cafe')).toBe(false);
  });

  it('gecersiz URL gecersiz olmali', () => {
    expect(isValidQRCodeUrl('not-a-url')).toBe(false);
  });
});

describe('isValidTableId', () => {
  it('gecerli UUID gecerli olmali', () => {
    expect(isValidTableId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('gecersiz format gecersiz olmali', () => {
    expect(isValidTableId('not-a-uuid')).toBe(false);
    expect(isValidTableId('123')).toBe(false);
  });
});

// =============================================================================
// generateQRFilename Tests
// =============================================================================

describe('generateQRFilename', () => {
  it('masa numarasi ile dosya adi olusturmali', () => {
    expect(generateQRFilename('1')).toBe('QR_Masa_1.png');
    expect(generateQRFilename('A1')).toBe('QR_Masa_A1.png');
  });

  it('masa ismi ile dosya adi olusturmali', () => {
    expect(generateQRFilename('1', 'VIP')).toBe('QR_Masa_1_VIP.png');
  });

  it('ozel prefix ile dosya adi olusturmali', () => {
    expect(generateQRFilename('1', null, 'Menu')).toBe('Menu_1.png');
  });

  it('ozel karakterleri temizlemeli', () => {
    expect(generateQRFilename('1/2')).toBe('QR_Masa_1_2.png');
    expect(generateQRFilename('1', 'Pencere Kenarı')).toBe('QR_Masa_1_Pencere_Kenar_.png');
  });
});

// =============================================================================
// Integration Tests - URL Round-trip
// =============================================================================

describe('URL Round-trip', () => {
  it('multi-location URL bilgilerini korumali', () => {
    const baseUrl = 'https://ozamenu.com';
    const orgSlug = 'cafe-istanbul';
    const locationSlug = 'kadikoy';
    const tableId = 'abc-123-uuid';

    const url = generateMenuUrl(baseUrl, orgSlug, tableId, locationSlug);

    expect(extractOrgSlugFromUrl(url)).toBe(orgSlug);
    expect(extractLocationSlugFromUrl(url)).toBe(locationSlug);
    expect(extractTableIdFromUrl(url)).toBe(tableId);
    expect(isMultiLocationUrl(url)).toBe(true);
  });

  it('legacy URL bilgilerini korumali', () => {
    const baseUrl = 'https://ozamenu.com';
    const orgSlug = 'cafe-istanbul';
    const tableId = 'abc-123-uuid';

    const url = generateMenuUrl(baseUrl, orgSlug, tableId);

    expect(extractOrgSlugFromUrl(url)).toBe(orgSlug);
    expect(extractLocationSlugFromUrl(url)).toBeNull();
    expect(extractTableIdFromUrl(url)).toBe(tableId);
    expect(isMultiLocationUrl(url)).toBe(false);
  });
});
