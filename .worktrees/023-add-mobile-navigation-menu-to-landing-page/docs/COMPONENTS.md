# Dashboard & Provider Components

This document provides comprehensive documentation for dashboard layout components and application providers in the ozaMenu platform. These components handle the main application structure, navigation, and global state management.

## Table of Contents

- [Dashboard Components](#dashboard-components)
  - [Header](#header)
  - [Sidebar](#sidebar)
- [Provider Components](#provider-components)
  - [AuthProvider](#authprovider)
  - [Providers](#providers)

---

## Dashboard Components

Dashboard components provide the main layout structure for the application, including navigation, headers, and responsive mobile menus.

### Header

The Header component provides the top navigation bar with user actions, mobile menu toggle, and application branding.

#### Component Overview

Located at `components/dashboard/header.tsx`, the Header component is a responsive navigation bar that adapts to mobile and desktop viewports.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `User \| null` | - | Current authenticated user object |
| `onMenuToggle` | `() => void` | - | Handler for mobile menu toggle |
| `showMobileMenu` | `boolean` | `false` | Controls mobile menu visibility |
| `actions` | `HeaderAction[]` | `[]` | Custom action buttons for header |
| `className` | `string` | - | Additional CSS classes |

#### HeaderAction Type

```tsx
interface HeaderAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  badge?: number | string;
}
```

#### Features

**Desktop Header:**
- Application logo/branding on the left
- Navigation links in center
- User profile dropdown on the right
- Notification icon with badge
- Dark mode toggle

**Mobile Header:**
- Hamburger menu button
- Centered logo
- User avatar
- Collapsible navigation drawer

#### Base Styling

```tsx
// Header container
className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm"

// Desktop layout
className="hidden md:flex items-center justify-between px-6 h-16"

// Mobile layout
className="flex md:hidden items-center justify-between px-4 h-14"
```

#### Usage Examples

**Basic Header:**
```tsx
import { Header } from '@/components/dashboard/header';
import { useAuth } from '@/components/providers/auth-provider';

function DashboardLayout() {
  const { user } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div>
      <Header
        user={user}
        onMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
        showMobileMenu={showMobileMenu}
      />
      {/* Main content */}
    </div>
  );
}
```

**Header with Custom Actions:**
```tsx
import { Header } from '@/components/dashboard/header';
import { BellIcon, PlusIcon } from '@/components/icons';

const headerActions: HeaderAction[] = [
  {
    label: 'Notifications',
    icon: <BellIcon />,
    onClick: () => openNotifications(),
    badge: 3,
    variant: 'ghost'
  },
  {
    label: 'New Menu',
    icon: <PlusIcon />,
    onClick: () => createNewMenu(),
    variant: 'primary'
  }
];

<Header
  user={user}
  actions={headerActions}
  onMenuToggle={toggleMobileMenu}
/>
```

**Header with User Dropdown:**
```tsx
import { Header } from '@/components/dashboard/header';

function App() {
  const { user, logout } = useAuth();

  // Header automatically shows user dropdown with:
  // - Profile link
  // - Settings link
  // - Logout button

  return <Header user={user} />;
}
```

**Sticky Header with Shadow on Scroll:**
```tsx
import { Header } from '@/components/dashboard/header';
import { useEffect, useState } from 'react';

function DashboardLayout() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Header
      user={user}
      className={scrolled ? 'shadow-md' : ''}
    />
  );
}
```

#### Mobile Menu

The mobile menu is automatically handled by the Header component when `showMobileMenu` is true.

**Mobile Menu Features:**
- Slide-in drawer from left
- Full-height navigation
- User profile at top
- Navigation links
- Logout button at bottom
- Backdrop overlay
- Swipe to close gesture

**Mobile Menu Example:**
```tsx
function MobileLayout() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      <Header
        user={user}
        showMobileMenu={showMobileMenu}
        onMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
      />

      {/* Mobile menu backdrop */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
    </>
  );
}
```

#### Accessibility

- Semantic `<header>` element
- Hamburger menu button has `aria-label="Toggle menu"`
- Mobile menu has `role="navigation"` and `aria-expanded` state
- Keyboard navigation with Tab and Enter
- Focus trap in mobile menu when open
- ESC key closes mobile menu
- Screen reader announces menu state changes

---

### Sidebar

The Sidebar component provides the main navigation menu for the dashboard with support for nested routes and active state indication.

#### Component Overview

Located at `components/dashboard/sidebar.tsx`, the Sidebar component is a vertical navigation menu displayed on desktop viewports and hidden on mobile (where Header's mobile menu is used).

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `routes` | `SidebarRoute[]` | `[]` | Navigation routes to display |
| `collapsed` | `boolean` | `false` | Collapsed state (icons only) |
| `onCollapse` | `() => void` | - | Handler for collapse toggle |
| `className` | `string` | - | Additional CSS classes |
| `footer` | `ReactNode` | - | Footer content (e.g., version info) |

#### SidebarRoute Type

```tsx
interface SidebarRoute {
  path: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
  children?: SidebarRoute[];
  roles?: string[]; // Optional role-based access
}
```

#### Features

- Active route highlighting
- Icon + label display
- Collapsible for more space
- Nested route support
- Badge indicators
- Role-based visibility
- Smooth transitions

#### Base Styling

```tsx
// Sidebar container
className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0"

// Collapsed state
className="w-16"

// Nav item
className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"

// Active nav item
className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
```

#### Usage Examples

**Basic Sidebar:**
```tsx
import { Sidebar } from '@/components/dashboard/sidebar';
import { HomeIcon, MenuIcon, UsersIcon, SettingsIcon } from '@/components/icons';

const routes: SidebarRoute[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <HomeIcon />
  },
  {
    path: '/menus',
    label: 'Menus',
    icon: <MenuIcon />,
    badge: 3
  },
  {
    path: '/customers',
    label: 'Customers',
    icon: <UsersIcon />
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: <SettingsIcon />
  }
];

function DashboardLayout() {
  return (
    <div className="flex">
      <Sidebar routes={routes} />
      <main className="flex-1">
        {/* Main content */}
      </main>
    </div>
  );
}
```

**Collapsible Sidebar:**
```tsx
import { Sidebar } from '@/components/dashboard/sidebar';
import { useState } from 'react';

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex">
      <Sidebar
        routes={routes}
        collapsed={collapsed}
        onCollapse={() => setCollapsed(!collapsed)}
      />
      <main className={collapsed ? 'ml-16' : 'ml-64'}>
        {/* Main content adjusts based on sidebar width */}
      </main>
    </div>
  );
}
```

**Nested Routes:**
```tsx
const routes: SidebarRoute[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <HomeIcon />
  },
  {
    path: '/menus',
    label: 'Menus',
    icon: <MenuIcon />,
    children: [
      {
        path: '/menus/food',
        label: 'Food Menu',
        icon: <FoodIcon />
      },
      {
        path: '/menus/drinks',
        label: 'Drink Menu',
        icon: <DrinkIcon />
      }
    ]
  }
];

<Sidebar routes={routes} />
```

**Sidebar with Role-Based Access:**
```tsx
import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/components/providers/auth-provider';

function DashboardLayout() {
  const { user } = useAuth();

  const routes: SidebarRoute[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <HomeIcon />
    },
    {
      path: '/admin',
      label: 'Admin Panel',
      icon: <AdminIcon />,
      roles: ['admin'] // Only visible to admins
    }
  ];

  return <Sidebar routes={routes} />;
}
```

**Sidebar with Footer:**
```tsx
<Sidebar
  routes={routes}
  footer={
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Version 1.0.0
      </p>
    </div>
  }
/>
```

#### Accessibility

- Semantic `<nav>` element with `aria-label="Main navigation"`
- Active route indicated with `aria-current="page"`
- Collapse button has descriptive `aria-label`
- Keyboard navigation with Tab, Enter, and Arrow keys
- Nested routes accessible via keyboard
- Focus visible indicators
- Screen reader announces active route

---

## Provider Components

Provider components wrap the application to provide global state, context, and functionality to all child components.

### AuthProvider

The AuthProvider component provides authentication state and methods throughout the application using React Context.

#### Component Overview

Located at `components/providers/auth-provider.tsx`, the AuthProvider manages user authentication state, login/logout functionality, and protected route access.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Child components to wrap |
| `initialUser` | `User \| null` | `null` | Initial user state (SSR) |
| `onAuthChange` | `(user: User \| null) => void` | - | Auth state change callback |

#### Context API

```tsx
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshAuth: () => Promise<void>;
}
```

#### User Type

```tsx
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  avatar?: string;
  restaurantId?: string;
}
```

#### LoginCredentials Type

```tsx
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

#### Features

- Persistent authentication state
- Automatic token refresh
- Protected route handling
- User profile updates
- Login/logout methods
- Loading states
- Error handling

#### Usage Examples

**Basic Setup:**
```tsx
import { AuthProvider } from '@/components/providers/auth-provider';
import { App } from './App';

function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
```

**Using Auth Context:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';

function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <Button onClick={logout}>Logout</Button>
    </div>
  );
}
```

**Login Form:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      // Redirect handled automatically by AuthProvider
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-red-600">{error}</p>}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={isLoading}
      >
        Login
      </Button>
    </form>
  );
}
```

**Protected Route Component:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}

// Usage
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>
```

**Update User Profile:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';

function ProfileEdit() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');

  const handleSave = async () => {
    updateUser({ name });
    // Show success message
  };

  return (
    <div>
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
}
```

**Logout with Confirmation:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';
import { ConfirmModal } from '@/components/ui/modal';

function LogoutButton() {
  const { logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setShowConfirm(true)}
      >
        Logout
      </Button>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={async () => {
          await logout();
          setShowConfirm(false);
        }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        variant="primary"
      />
    </>
  );
}
```

**Conditional Rendering by Role:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Show admin panel only to admins */}
      {user?.role === 'admin' && (
        <AdminPanel />
      )}

      {/* Show manager features to managers and admins */}
      {['admin', 'manager'].includes(user?.role) && (
        <ManagerTools />
      )}

      {/* Show to all authenticated users */}
      <UserContent />
    </div>
  );
}
```

#### Hook API

**useAuth Hook:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';

// Returns AuthContextValue with all auth methods and state
const {
  user,              // Current user object or null
  isAuthenticated,   // Boolean - true if user is logged in
  isLoading,         // Boolean - true during auth operations
  login,             // Function to login user
  logout,            // Function to logout user
  updateUser,        // Function to update user profile
  refreshAuth        // Function to refresh auth token
} = useAuth();
```

#### Error Handling

```tsx
import { useAuth } from '@/components/providers/auth-provider';

function LoginComponent() {
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email, password });
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        // Handle invalid credentials
      } else if (error.code === 'NETWORK_ERROR') {
        // Handle network error
      } else {
        // Handle other errors
      }
    }
  };
}
```

#### Accessibility

- Loading states announced to screen readers
- Error messages properly associated with form fields
- Login/logout actions keyboard accessible
- Auth state changes don't cause focus loss
- Protected routes redirect gracefully

---

### Providers

The Providers component wraps all global providers in a single convenient component for clean application setup.

#### Component Overview

Located at `components/providers/providers.tsx`, this component combines all application providers (Auth, Theme, Toast, etc.) into a single wrapper component.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Application components |
| `authConfig` | `AuthConfig` | - | Auth provider configuration |
| `themeConfig` | `ThemeConfig` | - | Theme provider configuration |

#### Features

- Single provider wrapper
- Organized provider hierarchy
- Centralized configuration
- Easy to maintain
- Clean app setup

#### Usage Examples

**Basic App Setup:**
```tsx
import { Providers } from '@/components/providers/providers';
import { App } from './App';

function Root() {
  return (
    <Providers>
      <App />
    </Providers>
  );
}

export default Root;
```

**With Configuration:**
```tsx
import { Providers } from '@/components/providers/providers';

function Root() {
  const authConfig = {
    apiUrl: process.env.REACT_APP_API_URL,
    tokenKey: 'auth_token'
  };

  const themeConfig = {
    defaultTheme: 'light',
    enableSystemTheme: true
  };

  return (
    <Providers
      authConfig={authConfig}
      themeConfig={themeConfig}
    >
      <App />
    </Providers>
  );
}
```

**Full Application Structure:**
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/components/providers/providers';
import { App } from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Accessing Multiple Contexts:**
```tsx
import { useAuth } from '@/components/providers/auth-provider';
import { useTheme } from '@/components/providers/theme-provider';
import { useToast } from '@/components/providers/toast-provider';

function MyComponent() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const handleAction = () => {
    showToast({
      message: `Welcome ${user.name}!`,
      type: 'success'
    });
  };

  return (
    <div>
      <Button onClick={handleAction}>Say Hello</Button>
      <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </Button>
    </div>
  );
}
```

#### Provider Order

The Providers component wraps providers in this order (outside to inside):

1. **AuthProvider** - Authentication state (outermost)
2. **ThemeProvider** - Theme/dark mode
3. **ToastProvider** - Toast notifications
4. **QueryClientProvider** - React Query for data fetching
5. **Your App** - Application components (innermost)

This order ensures that:
- Auth is available to all components first
- Theme can be accessed by all UI components
- Toasts work across the entire app
- Data fetching has access to auth tokens

---

## Integration Example

Here's a complete example showing how all components work together:

```tsx
// main.tsx - Application entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/components/providers/providers';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </React.StrictMode>
);

// App.tsx - Main app structure
import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// layouts/DashboardLayout.tsx - Dashboard structure
import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/components/providers/auth-provider';
import { Routes, Route } from 'react-router-dom';

const sidebarRoutes = [
  { path: '/dashboard', label: 'Dashboard', icon: <HomeIcon /> },
  { path: '/menus', label: 'Menus', icon: <MenuIcon /> },
  { path: '/orders', label: 'Orders', icon: <OrderIcon />, badge: 5 },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> }
];

function DashboardLayout() {
  const { user } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Desktop only */}
      <Sidebar
        routes={sidebarRoutes}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          user={user}
          showMobileMenu={showMobileMenu}
          onMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/menus" element={<MenusPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
```

---

## Best Practices

### Dashboard Layout

1. **Responsive Design**: Use Sidebar for desktop, Header mobile menu for mobile
2. **Consistent Spacing**: Maintain consistent padding and margins across dashboard pages
3. **Active States**: Always highlight the current route in navigation
4. **Loading States**: Show loading indicators during navigation
5. **Sticky Header**: Keep header visible while scrolling

### Authentication

1. **Protected Routes**: Always wrap protected content with auth checks
2. **Role-Based Access**: Implement role checks for admin features
3. **Token Refresh**: Handle automatic token refresh for better UX
4. **Error Handling**: Provide clear error messages for auth failures
5. **Logout Confirmation**: Confirm before logging out to prevent accidents

### Provider Setup

1. **Provider Order**: Maintain correct provider hierarchy
2. **Single Wrapper**: Use the Providers component for clean setup
3. **Configuration**: Centralize provider configuration
4. **Context Usage**: Only use contexts in components wrapped by their provider
5. **Performance**: Memoize context values to prevent unnecessary re-renders

---

## Common Patterns

### Protected Admin Page

```tsx
import { useAuth } from '@/components/providers/auth-provider';
import { Navigate } from 'react-router-dom';

function AdminPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin content */}
    </div>
  );
}
```

### Dashboard with Breadcrumbs

```tsx
import { Header } from '@/components/dashboard/header';
import { useLocation } from 'react-router-dom';

function DashboardLayout() {
  const location = useLocation();

  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <>
      <Header user={user} />
      <div className="px-6 py-3 border-b">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <main>{/* Content */}</main>
    </>
  );
}
```

### Conditional Sidebar Items

```tsx
import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/components/providers/auth-provider';

function DashboardLayout() {
  const { user } = useAuth();

  const routes = [
    { path: '/dashboard', label: 'Dashboard', icon: <HomeIcon /> },
    { path: '/menus', label: 'Menus', icon: <MenuIcon /> },
    // Conditionally add admin route
    ...(user?.role === 'admin' ? [{
      path: '/admin',
      label: 'Admin',
      icon: <AdminIcon />
    }] : [])
  ];

  return <Sidebar routes={routes} />;
}
```

---

## Related Documentation

- [UI Components](./UI_COMPONENTS.md) - Button, Card, Input, Modal components
- [Design Tokens](./DESIGN_TOKENS.md) - Color palette, spacing, and sizing system
- [Routes](./ROUTES.md) - Application routing structure

---

## Component Checklist

When building with dashboard and provider components, ensure:

- [ ] AuthProvider wraps entire application
- [ ] Protected routes check authentication
- [ ] Header shows current user information
- [ ] Sidebar highlights active route
- [ ] Mobile menu works on small screens
- [ ] Logout functionality works correctly
- [ ] Role-based access control implemented
- [ ] Loading states handled during auth operations
- [ ] Error messages displayed clearly
- [ ] Dark mode works in all components

---

*Last updated: 2026-01-14*
