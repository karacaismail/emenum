# UI Components

This document provides comprehensive documentation for all reusable UI components in the `components/ui/` directory. These components form the foundation of the ozaMenu platform's user interface.

## Table of Contents

- [Button](#button)
- [Card](#card)
- [Input](#input)
- [Modal](#modal)

---

## Button

The Button component is a versatile, accessible button with multiple variants and sizes for different use cases.

### Component Overview

Located at `components/ui/button.tsx`, the Button component provides consistent styling and behavior for all interactive button elements across the platform.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'outline' \| 'ghost'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `disabled` | `boolean` | `false` | Disables button interaction |
| `loading` | `boolean` | `false` | Shows loading state with spinner |
| `fullWidth` | `boolean` | `false` | Makes button take full width of container |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `onClick` | `(e: MouseEvent) => void` | - | Click handler function |
| `children` | `ReactNode` | - | Button content |
| `className` | `string` | - | Additional CSS classes |
| `icon` | `ReactNode` | - | Icon to display before text |
| `iconRight` | `ReactNode` | - | Icon to display after text |

### Variants

#### Primary Variant
Used for main call-to-action buttons.

```tsx
import { Button } from '@/components/ui/button';

<Button variant="primary" onClick={handleSubmit}>
  Save Changes
</Button>
```

**Styling:**
- Background: `bg-primary-600 hover:bg-primary-700 active:bg-primary-800`
- Text: `text-white`
- Dark mode: `dark:bg-primary-700 dark:hover:bg-primary-800`

#### Secondary Variant
Used for less prominent actions.

```tsx
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>
```

**Styling:**
- Background: `bg-secondary-600 hover:bg-secondary-700 active:bg-secondary-800`
- Text: `text-white`
- Dark mode: `dark:bg-secondary-700 dark:hover:bg-secondary-800`

#### Danger Variant
Used for destructive actions (delete, remove, etc.).

```tsx
<Button variant="danger" onClick={handleDelete}>
  Delete Item
</Button>
```

**Styling:**
- Background: `bg-red-600 hover:bg-red-700 active:bg-red-800`
- Text: `text-white`
- Dark mode: `dark:bg-red-700 dark:hover:bg-red-800`

#### Outline Variant
Used for secondary actions with minimal visual weight.

```tsx
<Button variant="outline" onClick={handleEdit}>
  Edit
</Button>
```

**Styling:**
- Background: `bg-transparent hover:bg-gray-50`
- Border: `border border-gray-300 dark:border-gray-600`
- Text: `text-gray-700 dark:text-gray-300`
- Dark mode hover: `dark:hover:bg-gray-800`

#### Ghost Variant
Used for minimal, text-only actions.

```tsx
<Button variant="ghost" onClick={handleView}>
  View Details
</Button>
```

**Styling:**
- Background: `bg-transparent hover:bg-gray-100`
- Text: `text-gray-700 dark:text-gray-300`
- Dark mode hover: `dark:hover:bg-gray-800`

### Sizes

#### Small
Compact size for inline actions and tight spaces.

```tsx
<Button size="sm">Small Button</Button>
```

**Styling:** `px-3 py-1.5 text-sm` (~32px height)

#### Medium (Default)
Standard button size for most use cases.

```tsx
<Button size="md">Medium Button</Button>
```

**Styling:** `px-4 py-2 text-base` (~40px height)

#### Large
Prominent size for primary CTAs and hero sections.

```tsx
<Button size="lg">Large Button</Button>
```

**Styling:** `px-6 py-3 text-lg` (~48px height)

### Usage Examples

**Basic Button:**
```tsx
import { Button } from '@/components/ui/button';

function MyComponent() {
  const handleClick = () => {
    console.log('Button clicked');
  };

  return (
    <Button variant="primary" onClick={handleClick}>
      Click Me
    </Button>
  );
}
```

**Button with Loading State:**
```tsx
const [isLoading, setIsLoading] = useState(false);

<Button
  variant="primary"
  loading={isLoading}
  onClick={handleSubmit}
>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**Button with Icon:**
```tsx
import { PlusIcon } from '@/components/icons';

<Button variant="primary" icon={<PlusIcon />}>
  Add Item
</Button>

{/* Icon on the right */}
<Button variant="outline" iconRight={<ArrowRightIcon />}>
  Continue
</Button>
```

**Full Width Button:**
```tsx
<Button variant="primary" fullWidth>
  Submit Form
</Button>
```

**Button Group:**
```tsx
<div className="flex space-x-2">
  <Button variant="outline" onClick={handleCancel}>
    Cancel
  </Button>
  <Button variant="primary" onClick={handleConfirm}>
    Confirm
  </Button>
</div>
```

### Accessibility

- Uses semantic `<button>` element
- Includes `disabled` attribute when disabled
- Proper keyboard navigation (Enter/Space to activate)
- Loading state announced to screen readers with `aria-busy="true"`
- Focus visible with outline for keyboard users
- Sufficient color contrast (WCAG AA compliant)

---

## Card

The Card component provides a consistent container for grouping related content with optional header, body, and footer sections.

### Component Overview

Located at `components/ui/card.tsx`, the Card component is a composition-based component with sub-components for flexible layouts.

### Main Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Card content |
| `className` | `string` | - | Additional CSS classes |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Internal padding size |
| `shadow` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Shadow depth |
| `border` | `boolean` | `true` | Shows border |
| `hoverable` | `boolean` | `false` | Adds hover effect |

### Sub-Components

#### CardHeader
Container for card title and actions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Card title text |
| `subtitle` | `string` | - | Optional subtitle |
| `action` | `ReactNode` | - | Action buttons/elements |
| `className` | `string` | - | Additional CSS classes |

#### CardBody
Main content area of the card.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Body content |
| `className` | `string` | - | Additional CSS classes |

#### CardFooter
Footer section for actions or additional info.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Footer content |
| `className` | `string` | - | Additional CSS classes |
| `align` | `'left' \| 'center' \| 'right'` | `'right'` | Content alignment |

### Base Styling

```tsx
// Default card styling
className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md"
```

### Usage Examples

**Basic Card:**
```tsx
import { Card } from '@/components/ui/card';

<Card>
  <p>Simple card content</p>
</Card>
```

**Card with Header, Body, and Footer:**
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

<Card>
  <CardHeader
    title="User Profile"
    subtitle="Manage your account settings"
  />
  <CardBody>
    <p>Profile information goes here...</p>
  </CardBody>
  <CardFooter>
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>
```

**Card with Action in Header:**
```tsx
<Card>
  <CardHeader
    title="Recent Orders"
    action={
      <Button variant="ghost" size="sm">
        View All
      </Button>
    }
  />
  <CardBody>
    {/* Order list */}
  </CardBody>
</Card>
```

**Hoverable Card (for links/clickable cards):**
```tsx
<Card hoverable className="cursor-pointer" onClick={handleCardClick}>
  <CardBody>
    <h3 className="text-lg font-semibold">Menu Item</h3>
    <p className="text-gray-600">Click to view details</p>
  </CardBody>
</Card>
```

**Card with Custom Padding:**
```tsx
{/* No padding - useful for images */}
<Card padding="none">
  <img src="/banner.jpg" alt="Banner" className="w-full rounded-t-lg" />
  <CardBody>
    <p>Content with default padding</p>
  </CardBody>
</Card>

{/* Large padding */}
<Card padding="lg">
  <h2>Spacious content</h2>
</Card>
```

**Card Grid Layout:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>
    <CardHeader title="Card 1" />
    <CardBody>Content</CardBody>
  </Card>
  <Card>
    <CardHeader title="Card 2" />
    <CardBody>Content</CardBody>
  </Card>
  <Card>
    <CardHeader title="Card 3" />
    <CardBody>Content</CardBody>
  </Card>
</div>
```

### Accessibility

- Uses semantic HTML structure
- Proper heading hierarchy in CardHeader
- Focus management for interactive cards
- ARIA labels for action buttons
- Keyboard accessible when hoverable

---

## Input

The Input component provides text input fields with label, error states, and various types for form handling.

### Component Overview

Located at `components/ui/input.tsx`, this component handles both single-line (`<input>`) and multi-line (`<textarea>`) text inputs with consistent styling and validation states.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url' \| 'search'` | `'text'` | Input type |
| `label` | `string` | - | Input label text |
| `placeholder` | `string` | - | Placeholder text |
| `value` | `string` | - | Input value (controlled) |
| `defaultValue` | `string` | - | Default value (uncontrolled) |
| `onChange` | `(e: ChangeEvent) => void` | - | Change handler |
| `onBlur` | `(e: FocusEvent) => void` | - | Blur handler |
| `onFocus` | `(e: FocusEvent) => void` | - | Focus handler |
| `error` | `string` | - | Error message to display |
| `helperText` | `string` | - | Helper text below input |
| `required` | `boolean` | `false` | Marks field as required |
| `disabled` | `boolean` | `false` | Disables input |
| `readOnly` | `boolean` | `false` | Makes input read-only |
| `fullWidth` | `boolean` | `false` | Full width of container |
| `className` | `string` | - | Additional CSS classes |
| `icon` | `ReactNode` | - | Icon before input |
| `iconRight` | `ReactNode` | - | Icon after input |
| `multiline` | `boolean` | `false` | Renders as textarea |
| `rows` | `number` | `3` | Number of rows (multiline only) |
| `maxLength` | `number` | - | Maximum character length |

### States

#### Default State
Normal input state with no validation.

```tsx
<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
/>
```

**Styling:**
- Border: `border-gray-300 dark:border-gray-600`
- Focus: `focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50`
- Background: `bg-white dark:bg-gray-800`

#### Error State
Displayed when validation fails.

```tsx
<Input
  label="Email Address"
  type="email"
  value={email}
  error="Please enter a valid email address"
/>
```

**Styling:**
- Border: `border-red-500 dark:border-red-600`
- Focus: `focus:border-red-500 focus:ring-red-500`
- Error text: `text-red-600 dark:text-red-500 text-sm mt-1`

#### Disabled State
Input is non-interactive.

```tsx
<Input
  label="Username"
  value="johndoe"
  disabled
/>
```

**Styling:**
- Background: `bg-gray-100 dark:bg-gray-700`
- Text: `text-gray-500 dark:text-gray-400`
- Cursor: `cursor-not-allowed`

#### Read-Only State
Value is visible but not editable.

```tsx
<Input
  label="Order ID"
  value="ORD-12345"
  readOnly
/>
```

### Usage Examples

**Basic Text Input:**
```tsx
import { Input } from '@/components/ui/input';

const [name, setName] = useState('');

<Input
  label="Full Name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter your full name"
  required
/>
```

**Input with Helper Text:**
```tsx
<Input
  label="Password"
  type="password"
  helperText="Must be at least 8 characters"
  required
/>
```

**Input with Icon:**
```tsx
import { SearchIcon } from '@/components/icons';

<Input
  type="search"
  placeholder="Search..."
  icon={<SearchIcon />}
/>
```

**Input with Error Validation:**
```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

const validateEmail = (value: string) => {
  if (!value.includes('@')) {
    setError('Please enter a valid email');
  } else {
    setError('');
  }
};

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    validateEmail(e.target.value);
  }}
  error={error}
  required
/>
```

**Textarea (Multiline):**
```tsx
<Input
  label="Description"
  multiline
  rows={5}
  placeholder="Enter description..."
  maxLength={500}
/>
```

**Full Form Example:**
```tsx
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validation and submission logic
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
      />
      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        required
      />
      <Input
        label="Message"
        multiline
        rows={4}
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        error={errors.message}
        required
      />
      <Button type="submit" variant="primary" fullWidth>
        Submit
      </Button>
    </form>
  );
}
```

### Accessibility

- Associated `<label>` for each input using `htmlFor`
- Required fields marked with `*` and `aria-required="true"`
- Error messages linked with `aria-describedby`
- Proper `aria-invalid` attribute when errors present
- Focus visible with clear outline
- Placeholder text doesn't replace labels
- Sufficient color contrast for all states
- Screen reader announces error messages

---

## Modal

The Modal component provides overlay dialogs for focused user interactions, with support for confirmation dialogs.

### Component Overview

Located at `components/ui/modal.tsx`, the Modal component creates accessible overlay dialogs with backdrop, animation, and focus management.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Controls modal visibility |
| `onClose` | `() => void` | - | Close handler function |
| `title` | `string` | - | Modal title |
| `children` | `ReactNode` | - | Modal content |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Modal width |
| `closeOnBackdrop` | `boolean` | `true` | Close on backdrop click |
| `closeOnEscape` | `boolean` | `true` | Close on ESC key press |
| `showCloseButton` | `boolean` | `true` | Show X close button |
| `footer` | `ReactNode` | - | Footer content |
| `className` | `string` | - | Additional CSS classes |
| `centered` | `boolean` | `true` | Vertically center modal |

### Sizes

| Size | Max Width | Usage |
|------|-----------|-------|
| `sm` | 384px (24rem) | Small dialogs, confirmations |
| `md` | 512px (32rem) | Default size, forms |
| `lg` | 768px (48rem) | Large forms, content |
| `xl` | 1024px (64rem) | Wide content, tables |
| `full` | 90% viewport | Maximum content |

### Base Styling

```tsx
// Backdrop
className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50"

// Modal container
className="fixed inset-0 z-50 overflow-y-auto"

// Modal content
className="bg-white dark:bg-gray-800 rounded-lg shadow-xl"
```

### Usage Examples

**Basic Modal:**
```tsx
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Modal Title"
      >
        <p>Modal content goes here...</p>
      </Modal>
    </>
  );
}
```

**Modal with Footer Actions:**
```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Edit Profile"
  footer={
    <div className="flex justify-end space-x-2">
      <Button variant="outline" onClick={handleClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  }
>
  <div className="space-y-4">
    <Input label="Name" value={name} onChange={handleNameChange} />
    <Input label="Email" type="email" value={email} onChange={handleEmailChange} />
  </div>
</Modal>
```

**Large Modal:**
```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="User Details"
  size="lg"
>
  {/* Large content */}
</Modal>
```

**Modal Without Backdrop Close:**
```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Important Action"
  closeOnBackdrop={false}
  closeOnEscape={false}
>
  <p>This action requires explicit confirmation.</p>
  <Button variant="primary" onClick={handleConfirm}>
    Confirm
  </Button>
</Modal>
```

### ConfirmModal

A specialized modal for confirmation dialogs with simplified API.

#### ConfirmModal Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Controls modal visibility |
| `onClose` | `() => void` | - | Cancel handler |
| `onConfirm` | `() => void` | - | Confirm handler |
| `title` | `string` | - | Confirmation title |
| `message` | `string \| ReactNode` | - | Confirmation message |
| `confirmText` | `string` | `'Confirm'` | Confirm button text |
| `cancelText` | `string` | `'Cancel'` | Cancel button text |
| `variant` | `'danger' \| 'primary'` | `'primary'` | Confirmation type |
| `loading` | `boolean` | `false` | Shows loading state |

#### ConfirmModal Usage

**Delete Confirmation:**
```tsx
import { ConfirmModal } from '@/components/ui/modal';

const [showConfirm, setShowConfirm] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);

const handleDelete = async () => {
  setIsDeleting(true);
  await deleteItem(itemId);
  setIsDeleting(false);
  setShowConfirm(false);
};

<>
  <Button variant="danger" onClick={() => setShowConfirm(true)}>
    Delete Item
  </Button>

  <ConfirmModal
    isOpen={showConfirm}
    onClose={() => setShowConfirm(false)}
    onConfirm={handleDelete}
    title="Delete Item?"
    message="Are you sure you want to delete this item? This action cannot be undone."
    confirmText="Delete"
    cancelText="Cancel"
    variant="danger"
    loading={isDeleting}
  />
</>
```

**Primary Confirmation:**
```tsx
<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handlePublish}
  title="Publish Changes?"
  message="This will make your changes visible to all users."
  confirmText="Publish"
  variant="primary"
/>
```

**Confirmation with Custom Message:**
```tsx
<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleAction}
  title="Transfer Ownership"
  message={
    <div className="space-y-2">
      <p>You are about to transfer ownership to:</p>
      <p className="font-semibold">{newOwner.name}</p>
      <p className="text-sm text-gray-600">
        You will lose admin access to this resource.
      </p>
    </div>
  }
  confirmText="Transfer"
  variant="danger"
/>
```

### Accessibility

- Focus trapped within modal when open
- ESC key closes modal (when enabled)
- Focus returns to trigger element on close
- Backdrop click closes modal (when enabled)
- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` for title
- `aria-describedby` for content
- Keyboard navigation between interactive elements
- Proper focus indicators
- Screen reader announces modal opening

### Animation

Modals use smooth enter/exit animations:

- **Enter:** Fade in backdrop + scale up modal (200ms)
- **Exit:** Fade out backdrop + scale down modal (150ms)
- Uses CSS transitions for smooth animation

---

## Best Practices

### General Guidelines

1. **Consistent Variants**: Use the same variant naming across components (`primary`, `secondary`, `danger`, etc.)
2. **Size Consistency**: Maintain size scale alignment between Button, Input, and other components
3. **Dark Mode**: Always test components in both light and dark modes
4. **Accessibility**: Ensure keyboard navigation, screen reader support, and WCAG compliance
5. **Error Handling**: Provide clear, actionable error messages

### Component Composition

**Good:**
```tsx
<Card>
  <CardHeader title="User Form" />
  <CardBody>
    <form className="space-y-4">
      <Input label="Name" required />
      <Input label="Email" type="email" required />
      <Button type="submit" variant="primary" fullWidth>
        Submit
      </Button>
    </form>
  </CardBody>
</Card>
```

**Avoid:**
```tsx
{/* Don't mix inconsistent styling */}
<button className="bg-blue-500">Custom Button</button>
<Input className="border-2 border-red-500" />

{/* Use the Button and Input components instead */}
<Button variant="primary">Consistent Button</Button>
<Input error="Error message here" />
```

### Form Validation

Always validate on blur and submit, show errors clearly:

```tsx
const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  if (!name) newErrors.name = 'Name is required';
  if (!email.includes('@')) newErrors.email = 'Invalid email';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

<form onSubmit={(e) => {
  e.preventDefault();
  if (validateForm()) handleSubmit();
}}>
  <Input
    label="Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    onBlur={() => validateForm()}
    error={errors.name}
  />
  {/* More inputs */}
</form>
```

---

## Related Documentation

- [Design Tokens](./DESIGN_TOKENS.md) - Color palette, spacing, and sizing system
- [Components](./COMPONENTS.md) - Dashboard and provider components
- [Routes](./ROUTES.md) - Application routing structure

---

## Component Checklist

When building with these components, ensure:

- [ ] Proper variant and size selection
- [ ] Error states handled for inputs
- [ ] Loading states for async actions
- [ ] Accessibility attributes present
- [ ] Dark mode tested and working
- [ ] Keyboard navigation functional
- [ ] Responsive on all screen sizes
- [ ] Proper TypeScript types used

---

*Last updated: 2026-01-14*
