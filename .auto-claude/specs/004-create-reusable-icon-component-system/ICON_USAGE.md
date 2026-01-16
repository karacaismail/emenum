# Icon Component System - Usage Guide

## Overview

This icon component system provides a centralized, reusable solution for icons across the application. All icons are built on a consistent base component with standardized sizing, coloring, and accessibility features.

### Benefits

- **Consistency**: All icons follow the same size and color standards
- **Maintainability**: Update icon design in one place
- **Performance**: Potential for tree-shaking unused icons
- **Accessibility**: Built-in ARIA attributes and title support
- **Type Safety**: Full TypeScript support with typed props
- **Dark Mode**: Automatic color variants for dark mode

---

## Available Icons

The system currently includes 17 icon components:

### Actions
- `EditIcon` - Edit/modify item (pencil)
- `DeleteIcon` - Delete/remove item (trash can)
- `CheckIcon` - Success/completed/checkmark
- `PlusIcon` - Add/create new item
- `SearchIcon` - Search/filter (magnifying glass)
- `MenuIcon` - Mobile menu toggle (hamburger)
- `CloseIcon` - Close dialog/cancel (X)
- `EyeIcon` - Show/visible
- `EyeOffIcon` - Hide/invisible

### Navigation
- `ChevronDownIcon` - Expand downward
- `ChevronUpIcon` - Collapse upward
- `ChevronLeftIcon` - Navigate left
- `ChevronRightIcon` - Navigate right
- `ArrowLeftIcon` - Go back/return
- `ArrowRightIcon` - Next/continue

### Status
- `LoadingSpinnerIcon` - Loading state (animated)
- `ImagePlaceholderIcon` - Missing image placeholder

---

## Props API

All icon components share the same base props:

```typescript
interface BaseIconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  /** Icon size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'

  /** Icon color variant */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'current'

  /** Optional title for accessibility */
  title?: string

  /** Additional CSS classes */
  className?: string
}
```

### Size Variants

| Size | Tailwind Classes | Pixel Size |
|------|------------------|------------|
| `xs` | `h-3 w-3`       | 12x12px    |
| `sm` | `h-4 w-4`       | 16x16px    |
| `md` | `h-5 w-5`       | 20x20px *(default)* |
| `lg` | `h-6 w-6`       | 24x24px    |
| `xl` | `h-8 w-8`       | 32x32px    |

### Color Variants

| Color       | Light Mode              | Dark Mode               |
|-------------|-------------------------|-------------------------|
| `primary`   | `text-primary-600`      | `text-primary-400`      |
| `secondary` | `text-secondary-600`    | `text-secondary-400`    |
| `success`   | `text-green-600`        | `text-green-400`        |
| `warning`   | `text-yellow-600`       | `text-yellow-400`       |
| `danger`    | `text-red-600`          | `text-red-400`          |
| `current`   | `text-current` *(inherits from parent, default)* |

---

## Usage Examples

### Basic Usage

```tsx
import { EditIcon, DeleteIcon, CheckIcon } from '@/components/ui/icons'

export default function MyComponent() {
  return (
    <div>
      <EditIcon />
      <DeleteIcon />
      <CheckIcon />
    </div>
  )
}
```

### Size Variants

```tsx
import { PlusIcon } from '@/components/ui/icons'

export default function SizeExamples() {
  return (
    <div className="flex items-center gap-4">
      <PlusIcon size="xs" />
      <PlusIcon size="sm" />
      <PlusIcon size="md" /> {/* default */}
      <PlusIcon size="lg" />
      <PlusIcon size="xl" />
    </div>
  )
}
```

### Color Variants

```tsx
import { CheckIcon } from '@/components/ui/icons'

export default function ColorExamples() {
  return (
    <div className="flex items-center gap-4">
      <CheckIcon color="primary" />
      <CheckIcon color="secondary" />
      <CheckIcon color="success" />
      <CheckIcon color="warning" />
      <CheckIcon color="danger" />
      <CheckIcon color="current" /> {/* inherits text color */}
    </div>
  )
}
```

### Button Integration

```tsx
import { EditIcon, DeleteIcon, PlusIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export default function ButtonExamples() {
  return (
    <div className="flex gap-2">
      <Button>
        <PlusIcon size="sm" />
        Add Item
      </Button>

      <Button variant="outline" size="icon">
        <EditIcon size="sm" />
      </Button>

      <Button variant="destructive" size="icon">
        <DeleteIcon size="sm" />
      </Button>
    </div>
  )
}
```

### Loading States

```tsx
import { LoadingSpinnerIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export default function LoadingExample() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button disabled={isLoading}>
      {isLoading ? (
        <>
          <LoadingSpinnerIcon size="sm" />
          Loading...
        </>
      ) : (
        'Submit'
      )}
    </Button>
  )
}
```

### Accessibility with Title

```tsx
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons'

export default function PasswordToggle() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <button onClick={() => setShowPassword(!showPassword)}>
      {showPassword ? (
        <EyeOffIcon size="sm" title="Hide password" />
      ) : (
        <EyeIcon size="sm" title="Show password" />
      )}
    </button>
  )
}
```

**Note**: When a `title` prop is provided, the icon will have `role="img"` and `aria-hidden="false"`. Without a title, it defaults to `aria-hidden="true"`.

### Custom Styling

```tsx
import { SearchIcon } from '@/components/ui/icons'

export default function CustomStyling() {
  return (
    <div>
      {/* Add custom classes */}
      <SearchIcon className="opacity-50 hover:opacity-100 transition-opacity" />

      {/* Combine with Tailwind utilities */}
      <SearchIcon
        size="md"
        color="current"
        className="text-blue-500 hover:text-blue-700"
      />

      {/* Override with inline styles */}
      <SearchIcon style={{ transform: 'rotate(45deg)' }} />
    </div>
  )
}
```

### Navigation Examples

```tsx
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowLeftIcon
} from '@/components/ui/icons'

export default function NavigationExamples() {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2">
        <a href="/dashboard">Dashboard</a>
        <ChevronRightIcon size="sm" color="secondary" />
        <a href="/products">Products</a>
      </nav>

      {/* Back button */}
      <button className="flex items-center gap-2">
        <ArrowLeftIcon size="sm" />
        Back to list
      </button>

      {/* Dropdown toggle */}
      <button className="flex items-center gap-2">
        Options
        <ChevronDownIcon size="sm" />
      </button>
    </div>
  )
}
```

---

## Migration Guide

### From Inline SVG to Icon Component

**Before:**
```tsx
// Inline SVG with duplicate code
<svg
  className="h-5 w-5 text-gray-600"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
  />
</svg>
```

**After:**
```tsx
import { EditIcon } from '@/components/ui/icons'

<EditIcon size="md" color="secondary" />
```

### Migration Checklist

1. **Identify the icon type** by examining the SVG path
2. **Import the corresponding icon component**
3. **Map the size classes**:
   - `h-4 w-4` → `size="sm"`
   - `h-5 w-5` → `size="md"`
   - `h-6 w-6` → `size="lg"`
4. **Map color classes**:
   - `text-gray-*` → `color="secondary"` or `color="current"`
   - `text-red-*` → `color="danger"`
   - `text-green-*` → `color="success"`
5. **Preserve any custom className** for hover states, transitions, etc.

---

## Best Practices

### ✅ Do

- Use semantic color variants (`success`, `danger`, `warning`) for meaningful icons
- Use `current` color when icons should inherit text color from parent
- Provide `title` prop for standalone icon buttons
- Use appropriate size for context (smaller in buttons, larger for empty states)
- Import only the icons you need

```tsx
// Good: Semantic color usage
<CheckIcon color="success" />
<DeleteIcon color="danger" />

// Good: Inherits text color from button
<Button className="text-blue-600">
  <PlusIcon color="current" />
  Add Item
</Button>

// Good: Accessible icon button
<button>
  <CloseIcon title="Close dialog" />
</button>
```

### ❌ Don't

- Don't use `primary` for all icons - it reduces visual hierarchy
- Don't skip `title` prop on standalone interactive icons
- Don't mix inline SVGs with icon components
- Don't override size with className when size prop works

```tsx
// Bad: Everything is primary
<EditIcon color="primary" />
<DeleteIcon color="primary" />
<SearchIcon color="primary" />

// Bad: Missing accessibility
<button>
  <CloseIcon /> {/* No title for screen readers */}
</button>

// Bad: Mixing approaches
<EditIcon />
<svg>...</svg> {/* Use icon component instead */}

// Bad: Unnecessary className
<SearchIcon className="h-6 w-6" /> {/* Use size="lg" instead */}
```

---

## Adding New Icons

To add a new icon to the system:

### 1. Create the Icon Component

Create a new file in `components/ui/icons/[icon-name].tsx`:

```tsx
import { forwardRef } from 'react'
import { Icon } from '../icon'
import type { BaseIconProps } from './types'

/**
 * [Icon Name] icon component.
 *
 * @example
 * ```tsx
 * <YourIconName size="md" color="primary" />
 * ```
 */
export const YourIconName = forwardRef<SVGSVGElement, BaseIconProps>((props, ref) => {
  return (
    <Icon ref={ref} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="YOUR_SVG_PATH_HERE"
      />
    </Icon>
  )
})

YourIconName.displayName = 'YourIconName'

export default YourIconName
```

### 2. Export from Index

Add the export to `components/ui/icons/index.ts`:

```tsx
export { YourIconName } from './your-icon-name'
```

### 3. Update Documentation

Add the icon to the "Available Icons" section in this file.

### Special Cases

For icons that need custom rendering (like `LoadingSpinnerIcon`), you can bypass the `Icon` wrapper and implement the base styles directly. See `loading-spinner.tsx` for an example.

---

## TypeScript Support

All icon components are fully typed with TypeScript:

```tsx
import type { BaseIconProps, IconSize, IconColor } from '@/components/ui/icons'

// Type-safe icon usage
const size: IconSize = 'md'
const color: IconColor = 'primary'

function IconWrapper(props: BaseIconProps) {
  return <EditIcon {...props} />
}
```

### Extending Icon Props

```tsx
import type { BaseIconProps } from '@/components/ui/icons'

interface CustomIconButtonProps extends BaseIconProps {
  onClick: () => void
  label: string
}

function IconButton({ onClick, label, ...iconProps }: CustomIconButtonProps) {
  return (
    <button onClick={onClick}>
      <EditIcon {...iconProps} />
      {label}
    </button>
  )
}
```

---

## Performance Considerations

### Tree Shaking

Import icons individually to enable tree shaking:

```tsx
// ✅ Good: Only imports what you need
import { EditIcon, DeleteIcon } from '@/components/ui/icons'

// ⚠️ Acceptable: Named imports still allow tree shaking
import * as Icons from '@/components/ui/icons'
const { EditIcon, DeleteIcon } = Icons
```

### Bundle Size

Each icon component adds minimal overhead:
- Base Icon component: ~0.5 KB
- Individual icon: ~0.2 KB each

The old inline SVG approach duplicated SVG code across files, while this system shares the base component logic.

---

## Troubleshooting

### Icon not displaying

1. **Check import path**: Ensure you're importing from `@/components/ui/icons`
2. **Verify component exists**: Check the "Available Icons" list above
3. **Check parent container**: Icons need visible dimensions from parent

### Icon color not working

1. **Verify color prop**: Use one of the valid color variants
2. **Check CSS specificity**: Ensure no higher-specificity rules override the color
3. **Dark mode**: Test in both light and dark mode

### Icon size not matching design

1. **Use size prop**: Don't rely on parent container sizing
2. **Check size variant**: Ensure you're using the correct variant (xs/sm/md/lg/xl)
3. **Consider custom className**: For non-standard sizes, use `className` with Tailwind utilities

---

## Summary

The icon component system provides:
- ✅ 17 commonly-used icons with consistent API
- ✅ 5 size variants (xs to xl)
- ✅ 6 color variants with dark mode support
- ✅ Full TypeScript support
- ✅ Accessibility features built-in
- ✅ Simple migration from inline SVGs

For questions or to request new icons, check the icon inventory at `.auto-claude/specs/004-create-reusable-icon-component-system/icon-inventory.json`.
