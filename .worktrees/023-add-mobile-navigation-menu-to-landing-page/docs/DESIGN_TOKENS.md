# Design Tokens

This document defines the design tokens used throughout the ozaMenu platform. All components use Tailwind CSS with custom color tokens and consistent spacing scales.

## Table of Contents

- [Color Palette](#color-palette)
- [Size Scales](#size-scales)
- [Spacing System](#spacing-system)
- [Dark Mode](#dark-mode)

---

## Color Palette

### Primary Colors

Primary colors are used for main actions, links, and brand elements.

| Token | Tailwind Class | Usage | Dark Mode |
|-------|---------------|-------|-----------|
| Primary 500 | `bg-primary-500` / `text-primary-500` | Base primary color | `dark:bg-primary-500` |
| Primary 600 | `bg-primary-600` / `text-primary-600` | Hover states | `dark:bg-primary-600` |
| Primary 700 | `bg-primary-700` / `text-primary-700` | Active states | `dark:bg-primary-700` |
| Primary 800 | `bg-primary-800` / `text-primary-800` | Pressed states | `dark:bg-primary-800` |

**Example Usage:**
```tsx
<button className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800">
  Primary Button
</button>
```

### Secondary Colors

Secondary colors provide a softer alternative to primary colors, used for less prominent actions.

| Token | Tailwind Class | Usage | Dark Mode |
|-------|---------------|-------|-----------|
| Secondary 100 | `bg-secondary-100` / `text-secondary-100` | Lightest shade | `dark:bg-secondary-100` |
| Secondary 200 | `bg-secondary-200` / `text-secondary-200` | Very light | `dark:bg-secondary-200` |
| Secondary 300 | `bg-secondary-300` / `text-secondary-300` | Light | `dark:bg-secondary-300` |
| Secondary 400 | `bg-secondary-400` / `text-secondary-400` | Light medium | `dark:bg-secondary-400` |
| Secondary 500 | `bg-secondary-500` / `text-secondary-500` | Base secondary | `dark:bg-secondary-500` |
| Secondary 600 | `bg-secondary-600` / `text-secondary-600` | Medium dark | `dark:bg-secondary-600` |
| Secondary 700 | `bg-secondary-700` / `text-secondary-700` | Dark | `dark:bg-secondary-700` |
| Secondary 800 | `bg-secondary-800` / `text-secondary-800` | Very dark | `dark:bg-secondary-800` |
| Secondary 900 | `bg-secondary-900` / `text-secondary-900` | Darkest shade | `dark:bg-secondary-900` |

**Example Usage:**
```tsx
<button className="bg-secondary-600 hover:bg-secondary-700 text-white">
  Secondary Button
</button>
```

### Red Colors (Error & Danger States)

Red colors are used for error messages, destructive actions, and danger states.

| Token | Tailwind Class | Usage | Dark Mode |
|-------|---------------|-------|-----------|
| Red 400 | `bg-red-400` / `text-red-400` | Light error | `dark:bg-red-400` |
| Red 500 | `bg-red-500` / `text-red-500` | Base error | `dark:bg-red-500` |
| Red 600 | `bg-red-600` / `text-red-600` | Error messages | `dark:bg-red-600` |
| Red 700 | `bg-red-700` / `text-red-700` | Danger button hover | `dark:bg-red-700` |
| Red 800 | `bg-red-800` / `text-red-800` | Danger button active | `dark:bg-red-800` |
| Red 900 | `bg-red-900` / `text-red-900` | Dark error state | `dark:bg-red-900` |

**Example Usage:**
```tsx
<div className="text-red-600 dark:text-red-500">
  Error: Invalid input
</div>

<button className="bg-red-600 hover:bg-red-700 text-white">
  Delete
</button>
```

### Yellow Colors (Warning States)

Yellow colors are used for warning messages and cautionary states.

| Token | Tailwind Class | Usage | Dark Mode |
|-------|---------------|-------|-----------|
| Yellow 600 | `bg-yellow-600` / `text-yellow-600` | Base warning | `dark:bg-yellow-600` |
| Yellow 700 | `bg-yellow-700` / `text-yellow-700` | Warning hover state | `dark:bg-yellow-700` |

**Example Usage:**
```tsx
<div className="bg-yellow-600 text-white p-4 rounded">
  Warning: This action cannot be undone
</div>
```

---

## Size Scales

### Button Sizes

Button sizes define consistent padding and spacing for all button components.

| Size | Tailwind Classes | Usage | Height (approx) |
|------|-----------------|-------|-----------------|
| Small | `px-3 py-1.5 text-sm` | Compact UI, inline actions | ~32px |
| Medium | `px-4 py-2 text-base` | Default button size | ~40px |
| Large | `px-6 py-3 text-lg` | Prominent CTAs | ~48px |

**Example Usage:**
```tsx
{/* Small button */}
<button className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded">
  Small
</button>

{/* Medium button (default) */}
<button className="px-4 py-2 text-base bg-primary-600 text-white rounded">
  Medium
</button>

{/* Large button */}
<button className="px-6 py-3 text-lg bg-primary-600 text-white rounded">
  Large
</button>
```

### Text Sizes

Text sizes maintain consistent typography throughout the application.

| Size | Tailwind Class | Usage | Font Size |
|------|---------------|-------|-----------|
| Small | `text-sm` | Helper text, labels | 14px |
| Base | `text-base` | Body text, default | 16px |
| Large | `text-lg` | Headings, emphasis | 18px |
| XL | `text-xl` | Section headings | 20px |
| 2XL | `text-2xl` | Page headings | 24px |
| 3XL | `text-3xl` | Hero headings | 30px |

**Example Usage:**
```tsx
<h1 className="text-3xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<p className="text-base">Body paragraph text</p>
<span className="text-sm text-gray-600">Helper text</span>
```

---

## Spacing System

The platform uses Tailwind's standard spacing scale for consistent layouts.

### Spacing Scale Reference

| Value | Tailwind Class | Pixels | Usage |
|-------|---------------|--------|-------|
| 0 | `m-0` / `p-0` | 0px | Remove spacing |
| 1 | `m-1` / `p-1` | 4px | Very tight spacing |
| 2 | `m-2` / `p-2` | 8px | Tight spacing |
| 3 | `m-3` / `p-3` | 12px | Compact spacing |
| 4 | `m-4` / `p-4` | 16px | Default spacing |
| 5 | `m-5` / `p-5` | 20px | Comfortable spacing |
| 6 | `m-6` / `p-6` | 24px | Spacious |
| 8 | `m-8` / `p-8` | 32px | Section spacing |
| 10 | `m-10` / `p-10` | 40px | Large section spacing |
| 12 | `m-12` / `p-12` | 48px | Extra large spacing |
| 16 | `m-16` / `p-16` | 64px | Hero spacing |

### Common Spacing Patterns

**Card Padding:**
```tsx
<div className="p-6">
  {/* Card content with comfortable spacing */}
</div>
```

**Stack Spacing (vertical):**
```tsx
<div className="space-y-4">
  {/* Items with 16px vertical spacing */}
</div>
```

**Inline Spacing (horizontal):**
```tsx
<div className="space-x-2">
  {/* Items with 8px horizontal spacing */}
</div>
```

**Section Margins:**
```tsx
<section className="mb-8">
  {/* Section with 32px bottom margin */}
</section>
```

---

## Dark Mode

All components support dark mode using Tailwind's `dark:` prefix. Dark mode is automatically applied based on system preferences or user settings.

### Dark Mode Implementation

**Colors in Dark Mode:**
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  {/* Background and text adapt to dark mode */}
</div>
```

**Buttons in Dark Mode:**
```tsx
<button className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800">
  Adapts to Dark Mode
</button>
```

**Borders in Dark Mode:**
```tsx
<div className="border border-gray-200 dark:border-gray-700">
  {/* Border color adapts to dark mode */}
</div>
```

### Common Dark Mode Patterns

| Light Mode | Dark Mode | Usage |
|------------|-----------|-------|
| `bg-white` | `dark:bg-gray-900` | Main background |
| `bg-gray-50` | `dark:bg-gray-800` | Secondary background |
| `bg-gray-100` | `dark:bg-gray-700` | Tertiary background |
| `text-gray-900` | `dark:text-white` | Primary text |
| `text-gray-600` | `dark:text-gray-300` | Secondary text |
| `text-gray-500` | `dark:text-gray-400` | Muted text |
| `border-gray-200` | `dark:border-gray-700` | Borders |
| `border-gray-300` | `dark:border-gray-600` | Emphasized borders |

### Testing Dark Mode

To test dark mode in development:

**System Preference:**
```bash
# Toggle dark mode in your OS settings
# The app will automatically respond to system preference
```

**Using Browser DevTools:**
```javascript
// In Chrome DevTools Console
document.documentElement.classList.add('dark')
document.documentElement.classList.remove('dark')
```

---

## Best Practices

1. **Use Semantic Color Names**: Always use `primary`, `secondary`, `red`, `yellow` instead of generic color names
2. **Consistent Sizing**: Stick to the defined size scales for buttons and text
3. **Dark Mode Support**: Always provide dark mode variants for custom colors
4. **Spacing Consistency**: Use the spacing scale consistently across components
5. **Accessibility**: Ensure sufficient color contrast in both light and dark modes

---

## Related Documentation

- [UI Components](./UI_COMPONENTS.md) - Detailed component documentation
- [Components](./COMPONENTS.md) - Dashboard and provider components
- [Routes](./ROUTES.md) - Application routing structure

---

*Last updated: 2026-01-14*
