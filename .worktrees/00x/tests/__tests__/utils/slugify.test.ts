/**
 * Slug Generation and Validation Tests
 *
 * Bu testler slug olusturma ve dogrulama islevlerinin dogru calistigini dogrular.
 *
 * Test Senaryolari:
 * 1. generateSlug - Metin slug'a donusturme
 * 2. validateSlug - Slug format dogrulamasi
 * 3. handleSlugCollision - Catisma yonetimi
 * 4. normalizeSlug - Slug normalizasyonu
 * 5. normalizeTurkishChars - Turkce karakter donusumu
 * 6. Utility functions - Yardimci fonksiyonlar
 */

import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  generateLocationSlug,
  generateOrganizationSlug,
  validateSlug,
  isValidSlug,
  handleSlugCollision,
  normalizeSlug,
  normalizeTurkishChars,
  normalizeExtendedChars,
  parseSlugNumber,
  areSlugsRelated,
  generateSlugVariants,
  SLUG_PATTERN,
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
  TURKISH_CHAR_MAP,
} from '@/lib/utils/slugify';

// =============================================================================
// generateSlug Tests
// =============================================================================

describe('generateSlug', () => {
  describe('Temel slug olusturma', () => {
    it('basit metni slug\'a donusturmeli', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('kucuk harfe donusturmeli', () => {
      expect(generateSlug('HELLO WORLD')).toBe('hello-world');
      expect(generateSlug('Mixed Case TEXT')).toBe('mixed-case-text');
    });

    it('bosluklari tire ile degistirmeli', () => {
      expect(generateSlug('multiple words here')).toBe('multiple-words-here');
    });

    it('birden fazla boslugu tek tireye donusturmeli', () => {
      expect(generateSlug('multiple   spaces   here')).toBe('multiple-spaces-here');
    });

    it('bas ve sondaki bosluklari temizlemeli', () => {
      expect(generateSlug('  trimmed  ')).toBe('trimmed');
      expect(generateSlug('   hello world   ')).toBe('hello-world');
    });

    it('bos string icin bos donmeli', () => {
      expect(generateSlug('')).toBe('');
      expect(generateSlug('   ')).toBe('');
    });

    it('null/undefined icin bos donmeli', () => {
      expect(generateSlug(null as unknown as string)).toBe('');
      expect(generateSlug(undefined as unknown as string)).toBe('');
    });
  });

  describe('Ozel karakter yonetimi', () => {
    it('ozel karakterleri temizlemeli', () => {
      expect(generateSlug('hello@world.com')).toBe('helloworldcom');
      expect(generateSlug('test#hash$dollar')).toBe('testhashdollar');
    });

    it('noktayi temizlemeli', () => {
      expect(generateSlug('cafe.istanbul')).toBe('cafeistanbul');
    });

    it('sayilari korumali', () => {
      expect(generateSlug('cafe123')).toBe('cafe123');
      expect(generateSlug('location 42')).toBe('location-42');
    });

    it('tire ile baslayan/biten sonuclari temizlemeli', () => {
      expect(generateSlug('@hello')).toBe('hello');
      expect(generateSlug('hello!')).toBe('hello');
      expect(generateSlug('!@#hello$%^')).toBe('hello');
    });

    it('birden fazla tireyi tek tireye indirmeli', () => {
      expect(generateSlug('hello---world')).toBe('hello-world');
      expect(generateSlug('a-----b')).toBe('a-b');
    });
  });

  describe('Turkce karakter donusumu', () => {
    it('buyuk Turkce karakterleri donusturmeli', () => {
      expect(generateSlug('Ç')).toBe('c');
      expect(generateSlug('Ğ')).toBe('g');
      expect(generateSlug('İ')).toBe('i');
      expect(generateSlug('Ö')).toBe('o');
      expect(generateSlug('Ş')).toBe('s');
      expect(generateSlug('Ü')).toBe('u');
    });

    it('kucuk Turkce karakterleri donusturmeli', () => {
      expect(generateSlug('ç')).toBe('c');
      expect(generateSlug('ğ')).toBe('g');
      expect(generateSlug('ı')).toBe('i');
      expect(generateSlug('ö')).toBe('o');
      expect(generateSlug('ş')).toBe('s');
      expect(generateSlug('ü')).toBe('u');
    });

    it('Turkce kelimeleri dogru donusturmeli', () => {
      expect(generateSlug('Şişli')).toBe('sisli');
      expect(generateSlug('Çarşı')).toBe('carsi');
      expect(generateSlug('İstanbul')).toBe('istanbul');
      expect(generateSlug('Ümraniye')).toBe('umraniye');
      expect(generateSlug('Öğretmen')).toBe('ogretmen');
    });

    it('karisik Turkce cumleleri donusturmeli', () => {
      expect(generateSlug('Şişli Çarşı Merkez')).toBe('sisli-carsi-merkez');
      expect(generateSlug('İstanbul Şube')).toBe('istanbul-sube');
      expect(generateSlug('Cafe Güneş')).toBe('cafe-gunes');
    });
  });

  describe('Diger dil karakterleri', () => {
    it('Almanca karakterleri donusturmeli', () => {
      expect(generateSlug('ß')).toBe('ss');
      expect(generateSlug('München')).toBe('munchen');
    });

    it('Fransizca karakterleri donusturmeli', () => {
      expect(generateSlug('café')).toBe('cafe');
      expect(generateSlug('Résumé')).toBe('resume');
    });

    it('Ispanyolca karakterleri donusturmeli', () => {
      expect(generateSlug('mañana')).toBe('manana');
      expect(generateSlug('señor')).toBe('senor');
    });
  });

  describe('Maksimum uzunluk secenegi', () => {
    it('uzun metni belirtilen maksimum uzunluga kesmeli', () => {
      const longText = 'this is a very long text that should be trimmed';
      const result = generateSlug(longText, { maxLength: 20 });
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('kelime sinirinda kesmeli', () => {
      const text = 'hello world foo bar';
      const result = generateSlug(text, { maxLength: 12 });
      // 'hello-world' = 11 karakter, 'hello-world-foo' = 15
      expect(result).toBe('hello-world');
    });

    it('varsayilan maksimum 100 karakter olmali', () => {
      const veryLongText = 'a'.repeat(150);
      const result = generateSlug(veryLongText);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Ozel secenek parametreleri', () => {
    it('customReplacements secenegini kullanmali', () => {
      const result = generateSlug('hello & world', {
        customReplacements: { '&': 'and' },
      });
      expect(result).toBe('hello-and-world');
    });
  });
});

// =============================================================================
// validateSlug Tests
// =============================================================================

describe('validateSlug', () => {
  describe('Gecerli slug\'lar', () => {
    it('basit slug gecerli olmali', () => {
      const result = validateSlug('my-location');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('tek kelime slug gecerli olmali', () => {
      expect(validateSlug('downtown').valid).toBe(true);
      expect(validateSlug('ab').valid).toBe(true);
    });

    it('sayi iceren slug gecerli olmali', () => {
      expect(validateSlug('location-1').valid).toBe(true);
      expect(validateSlug('cafe123').valid).toBe(true);
      expect(validateSlug('123abc').valid).toBe(true);
    });

    it('sadece sayilardan olusan slug gecerli olmali', () => {
      expect(validateSlug('123').valid).toBe(true);
      expect(validateSlug('12').valid).toBe(true);
    });

    it('tire ile ayrilan cok kelime gecerli olmali', () => {
      expect(validateSlug('my-long-slug-name').valid).toBe(true);
      expect(validateSlug('a-b-c-d-e').valid).toBe(true);
    });
  });

  describe('Gecersiz slug\'lar', () => {
    it('bos slug gecersiz olmali', () => {
      const result = validateSlug('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Slug bos olamaz');
    });

    it('sadece bosluk iceren slug gecersiz olmali', () => {
      const result = validateSlug('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Slug bos olamaz');
    });

    it('null/undefined gecersiz olmali', () => {
      expect(validateSlug(null as unknown as string).valid).toBe(false);
      expect(validateSlug(undefined as unknown as string).valid).toBe(false);
    });

    it('tek karakter slug gecersiz olmali', () => {
      const result = validateSlug('a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`en az ${MIN_SLUG_LENGTH} karakter`);
    });

    it('cok uzun slug gecersiz olmali', () => {
      const longSlug = 'a'.repeat(101);
      const result = validateSlug(longSlug);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`en fazla ${MAX_SLUG_LENGTH} karakter`);
    });

    it('buyuk harf iceren slug gecersiz olmali', () => {
      const result = validateSlug('My-Location');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kucuk harf');
    });

    it('tire ile baslayan slug gecersiz olmali', () => {
      const result = validateSlug('-location');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tire ile baslamamali');
    });

    it('tire ile biten slug gecersiz olmali', () => {
      const result = validateSlug('location-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tire ile baslamamali veya bitmemeli');
    });

    it('arka arkaya tire iceren slug gecersiz olmali', () => {
      const result = validateSlug('my--location');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('arka arkaya tire');
    });

    it('ozel karakter iceren slug gecersiz olmali', () => {
      expect(validateSlug('my_location').valid).toBe(false);
      expect(validateSlug('my@location').valid).toBe(false);
      expect(validateSlug('my.location').valid).toBe(false);
      expect(validateSlug('my location').valid).toBe(false);
    });

    it('Turkce karakter iceren slug gecersiz olmali', () => {
      expect(validateSlug('şişli').valid).toBe(false);
      expect(validateSlug('istanbül').valid).toBe(false);
    });
  });
});

// =============================================================================
// isValidSlug Tests
// =============================================================================

describe('isValidSlug', () => {
  it('gecerli slug icin true donmeli', () => {
    expect(isValidSlug('my-location')).toBe(true);
    expect(isValidSlug('downtown')).toBe(true);
    expect(isValidSlug('cafe-123')).toBe(true);
  });

  it('gecersiz slug icin false donmeli', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('My-Location')).toBe(false);
    expect(isValidSlug('-invalid')).toBe(false);
  });
});

// =============================================================================
// normalizeSlug Tests
// =============================================================================

describe('normalizeSlug', () => {
  it('buyuk harfleri kucuk harfe donusturmeli', () => {
    expect(normalizeSlug('My-Slug')).toBe('my-slug');
    expect(normalizeSlug('ALL-CAPS')).toBe('all-caps');
  });

  it('birden fazla tireyi tek tireye indirmeli', () => {
    expect(normalizeSlug('slug--with---extra-dashes')).toBe('slug-with-extra-dashes');
  });

  it('bas ve sondaki tireleri temizlemeli', () => {
    expect(normalizeSlug('-slug-')).toBe('slug');
    expect(normalizeSlug('---slug---')).toBe('slug');
  });

  it('gecersiz karakterleri temizlemeli', () => {
    expect(normalizeSlug('slug@name')).toBe('slugname');
    expect(normalizeSlug('slug_name')).toBe('slugname');
  });

  it('bos string icin bos donmeli', () => {
    expect(normalizeSlug('')).toBe('');
    expect(normalizeSlug(null as unknown as string)).toBe('');
  });
});

// =============================================================================
// handleSlugCollision Tests
// =============================================================================

describe('handleSlugCollision', () => {
  describe('Catisma olmayan durumlar', () => {
    it('catisma yoksa temel slug donmeli', () => {
      expect(handleSlugCollision('downtown', [])).toBe('downtown');
      expect(handleSlugCollision('downtown', ['uptown', 'midtown'])).toBe('downtown');
    });
  });

  describe('Temel catisma yonetimi', () => {
    it('ilk catismada -2 eklemeli', () => {
      expect(handleSlugCollision('downtown', ['downtown'])).toBe('downtown-2');
    });

    it('siradaki bos numarayi bulmali', () => {
      expect(handleSlugCollision('downtown', ['downtown', 'downtown-2'])).toBe('downtown-3');
      expect(handleSlugCollision('downtown', ['downtown', 'downtown-2', 'downtown-3'])).toBe(
        'downtown-4'
      );
    });

    it('bos numarayi kullanmali (ara numara)', () => {
      expect(handleSlugCollision('test', ['test', 'test-2', 'test-4', 'test-5'])).toBe('test-3');
    });
  });

  describe('Kenar durumlar', () => {
    it('farkli temel slug catismamali', () => {
      expect(handleSlugCollision('downtown', ['downtown-2'])).toBe('downtown');
      expect(handleSlugCollision('up', ['uptown', 'uptown-2'])).toBe('up');
    });

    it('buyuk numara araligini yonetmeli', () => {
      // Creates: ['test', 'test-2', 'test-3', ..., 'test-50']
      const existing = Array.from({ length: 50 }, (_, i) => (i === 0 ? 'test' : `test-${i + 1}`));
      // test through test-50 are taken, so next available is test-51
      expect(handleSlugCollision('test', existing)).toBe('test-51');
    });
  });

  describe('Maksimum deneme hatasi', () => {
    it('maksimum deneme sayisi asilinca hata donmeli', () => {
      const allSlugs = ['test', ...Array.from({ length: 100 }, (_, i) => `test-${i + 2}`)];

      expect(() => handleSlugCollision('test', allSlugs, { maxAttempts: 100 })).toThrow(
        'Maksimum slug deneme sayisi'
      );
    });
  });
});

// =============================================================================
// normalizeTurkishChars Tests
// =============================================================================

describe('normalizeTurkishChars', () => {
  it('tum Turkce buyuk harfleri donusturmeli', () => {
    expect(normalizeTurkishChars('Ç')).toBe('c');
    expect(normalizeTurkishChars('Ğ')).toBe('g');
    expect(normalizeTurkishChars('İ')).toBe('i');
    expect(normalizeTurkishChars('Ö')).toBe('o');
    expect(normalizeTurkishChars('Ş')).toBe('s');
    expect(normalizeTurkishChars('Ü')).toBe('u');
  });

  it('tum Turkce kucuk harfleri donusturmeli', () => {
    expect(normalizeTurkishChars('ç')).toBe('c');
    expect(normalizeTurkishChars('ğ')).toBe('g');
    expect(normalizeTurkishChars('ı')).toBe('i');
    expect(normalizeTurkishChars('ö')).toBe('o');
    expect(normalizeTurkishChars('ş')).toBe('s');
    expect(normalizeTurkishChars('ü')).toBe('u');
  });

  it('karisik metni donusturmeli', () => {
    // Ş->s, İ->i, Ş->s, L->L (unchanged), İ->i
    expect(normalizeTurkishChars('ŞİŞLİ')).toBe('sisLi');
    expect(normalizeTurkishChars('çarşı')).toBe('carsi');
  });

  it('Turkce olmayan karakterleri degistirmemeli', () => {
    expect(normalizeTurkishChars('Hello')).toBe('Hello');
    expect(normalizeTurkishChars('abc123')).toBe('abc123');
  });
});

// =============================================================================
// normalizeExtendedChars Tests
// =============================================================================

describe('normalizeExtendedChars', () => {
  it('Turkce karakterleri donusturmeli', () => {
    // Ş->s, i->i, ş->s, l->l, i->i - all Turkish chars become lowercase ASCII
    expect(normalizeExtendedChars('Şişli')).toBe('sisli');
  });

  it('Almanca karakterleri donusturmeli', () => {
    expect(normalizeExtendedChars('ß')).toBe('ss');
    expect(normalizeExtendedChars('ä')).toBe('ae');
  });

  it('Fransizca karakterleri donusturmeli', () => {
    expect(normalizeExtendedChars('é')).toBe('e');
    expect(normalizeExtendedChars('è')).toBe('e');
    expect(normalizeExtendedChars('ê')).toBe('e');
  });

  it('Ispanyolca karakterleri donusturmeli', () => {
    expect(normalizeExtendedChars('ñ')).toBe('n');
  });
});

// =============================================================================
// parseSlugNumber Tests
// =============================================================================

describe('parseSlugNumber', () => {
  it('numarali slug icin base slug ve numarayi donmeli', () => {
    const result = parseSlugNumber('downtown-3');
    expect(result.baseSlug).toBe('downtown');
    expect(result.number).toBe(3);
  });

  it('numarasiz slug icin sadece base slug donmeli', () => {
    const result = parseSlugNumber('downtown');
    expect(result.baseSlug).toBe('downtown');
    expect(result.number).toBeNull();
  });

  it('cok tireli slug icin dogru ayirmali', () => {
    const result = parseSlugNumber('my-long-slug-42');
    expect(result.baseSlug).toBe('my-long-slug');
    expect(result.number).toBe(42);
  });

  it('numara olmayan son kismi numara olarak alamamali', () => {
    const result = parseSlugNumber('cafe-istanbul');
    expect(result.baseSlug).toBe('cafe-istanbul');
    expect(result.number).toBeNull();
  });
});

// =============================================================================
// areSlugsRelated Tests
// =============================================================================

describe('areSlugsRelated', () => {
  it('iliskili slug\'lar icin true donmeli', () => {
    expect(areSlugsRelated('downtown', 'downtown-2')).toBe(true);
    expect(areSlugsRelated('downtown-2', 'downtown-3')).toBe(true);
    expect(areSlugsRelated('downtown', 'downtown')).toBe(true);
  });

  it('iliskisiz slug\'lar icin false donmeli', () => {
    expect(areSlugsRelated('downtown', 'uptown')).toBe(false);
    expect(areSlugsRelated('downtown-2', 'uptown-2')).toBe(false);
  });
});

// =============================================================================
// generateSlugVariants Tests
// =============================================================================

describe('generateSlugVariants', () => {
  it('belirtilen sayida variant olusturmali', () => {
    const variants = generateSlugVariants('downtown', 3);
    expect(variants).toEqual(['downtown', 'downtown-2', 'downtown-3']);
  });

  it('tek variant icin sadece base slug donmeli', () => {
    const variants = generateSlugVariants('downtown', 1);
    expect(variants).toEqual(['downtown']);
  });

  it('bos liste icin sadece base slug donmeli', () => {
    const variants = generateSlugVariants('downtown', 0);
    expect(variants).toEqual(['downtown']);
  });
});

// =============================================================================
// generateLocationSlug Tests
// =============================================================================

describe('generateLocationSlug', () => {
  it('generateSlug ile ayni sonucu donmeli', () => {
    expect(generateLocationSlug('Downtown Branch')).toBe('downtown-branch');
    expect(generateLocationSlug('Şişli Merkez')).toBe('sisli-merkez');
  });

  it('secenek parametrelerini kabul etmeli', () => {
    expect(generateLocationSlug('Very Long Location Name', { maxLength: 15 })).toBe('very-long');
  });
});

// =============================================================================
// generateOrganizationSlug Tests
// =============================================================================

describe('generateOrganizationSlug', () => {
  it('generateSlug ile ayni sonucu donmeli', () => {
    expect(generateOrganizationSlug('Cafe Istanbul')).toBe('cafe-istanbul');
    expect(generateOrganizationSlug('Şişli Restaurant')).toBe('sisli-restaurant');
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Constants', () => {
  it('SLUG_PATTERN dogru olmali', () => {
    expect(SLUG_PATTERN.test('valid-slug')).toBe(true);
    expect(SLUG_PATTERN.test('INVALID')).toBe(false);
    expect(SLUG_PATTERN.test('-invalid')).toBe(false);
  });

  it('MIN_SLUG_LENGTH 2 olmali', () => {
    expect(MIN_SLUG_LENGTH).toBe(2);
  });

  it('MAX_SLUG_LENGTH 100 olmali', () => {
    expect(MAX_SLUG_LENGTH).toBe(100);
  });

  it('TURKISH_CHAR_MAP tum Turkce karakterleri icermeli', () => {
    expect(Object.keys(TURKISH_CHAR_MAP)).toHaveLength(12);
  });
});
