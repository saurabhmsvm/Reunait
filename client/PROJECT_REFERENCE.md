# 🎯 FindMe Project Reference

## 📋 Project Overview
**FindMe** - Missing person case management platform with AI-powered facial recognition.

**Tech Stack:** Next.js 15.4.5 + TypeScript + Tailwind CSS v4 + shadcn/ui

## 🏗️ Architecture

### File Structure
```
client/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with ThemeProvider
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles + gradient theme
├── components/
│   ├── ui/               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sheet.tsx
│   │   └── badge.tsx
│   ├── layout/
│   │   ├── header.tsx    # Header with logo, location, theme toggle
│   │   └── footer.tsx    # Footer with copyright
│   ├── shared/
│   │   ├── hero-section.tsx      # Main hero with CTA
│   │   ├── features-section.tsx  # Feature cards grid
│   │   └── location-display.tsx  # Location info display
│   ├── location-permission.tsx   # Location permission component
│   ├── theme-toggle.tsx          # Simple light/dark toggle
│   └── theme-provider.tsx        # Next-themes provider
├── lib/
│   ├── location.ts       # Location service with geolocation
│   ├── constants.ts      # App constants (features, stats)
│   └── utils.ts          # Utility functions
├── hooks/
│   └── use-location.ts   # Custom location hook
├── types/
│   └── index.ts          # TypeScript type definitions
└── public/               # Static assets
```

## 🎨 Design System

### Color Palette (Light Theme)
```css
/* Background Gradient */
body {
  background: linear-gradient(
    to bottom,
    oklch(0.98 0.02 85),  /* Light cream/yellow */
    oklch(0.96 0.03 90),  /* Middle warm */
    oklch(0.94 0.04 95)   /* Soft teal */
  );
}

/* Text Colors */
--foreground: oklch(0.145 0 0);        /* Dark muted teal */
--muted-foreground: oklch(0.556 0 0);  /* Medium gray */
--primary: oklch(0.205 0 0);           /* Dark text */

/* Component Colors */
--card: oklch(1 0 0);                  /* White cards */
--border: oklch(0.922 0 0);            /* Light borders */
--input: oklch(0.922 0 0);             /* Input backgrounds */
```

### Typography
- **Primary Font:** Geist Sans (clean, modern)
- **Code Font:** Geist Mono
- **Heading Weights:** Bold for titles, light for subtitles
- **Body Text:** Light weight for descriptions

### Theme Configuration
```typescript
// Theme Provider Setup
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
```

## ⚡ Key Features

### 1. Location System
```typescript
// LocationService Features:
- Automatic location detection on first visit
- Reverse geocoding (coordinates → city/state/country)
- Local storage persistence
- Error handling with fallbacks
- Permission management

// Usage:
const location = await LocationService.requestLocation();
// Returns: { city, state, country, latitude, longitude }
```

### 2. Theme Toggle
```typescript
// Simple button toggle (no dropdown)
- Light ↔ Dark only
- Smooth icon transitions
- No system theme option
```

### 3. Responsive Design
```css
/* Breakpoints */
sm: 640px   (Mobile landscape)
md: 768px   (Tablet)
lg: 1024px  (Desktop)
xl: 1280px  (Large desktop)
2xl: 1536px (Extra large)
```

## 🔧 Component Details

### Header Component
```typescript
interface HeaderProps {
  location?: LocationData | null
}

// Features:
- Logo with heart icon
- Location display (city, state)
- Theme toggle button
- Responsive (location hides on mobile)
```

### Location Permission Component
```typescript
interface LocationPermissionProps {
  onLocationSet: (location: LocationData) => void
}

// States:
- Loading: Shows spinner
- Success: Shows detected location
- Error: Shows retry options
- Auto-trigger: Requests permission on mount
```

### Hero Section Component
```typescript
interface HeroSectionProps {
  title: string
  subtitle: string
  description: string
  primaryAction?: { label: string, onClick: () => void }
  secondaryAction?: { label: string, onClick: () => void }
}
```

## 📱 Landing Page Structure

### Sections (in order):
1. **Header** - Logo, location, theme toggle
2. **Hero Section** - Main heading, description, CTA buttons
3. **Location Display** - Shows current location (if available)
4. **Location Permission** - Auto-triggers for new users
5. **Features Section** - 4 feature cards in grid
6. **Stats Section** - Impact statistics
7. **CTA Section** - Register case, search cases
8. **Footer** - Copyright information

## 🎯 User Flow

### New User (First Visit):
1. **Page loads** → Auto-trigger location permission
2. **User allows location** → Location detected and saved
3. **Location displayed** → Shows in header and landing page
4. **Theme toggle** → Simple light/dark switch

### Returning User:
1. **Page loads** → Uses saved location
2. **No permission request** → Location immediately available
3. **Seamless experience** → No interruptions

## 🚀 Development Status

### ✅ Completed:
- Landing page with gradient background
- Theme switching (light/dark only)
- Location permission and display
- Responsive design
- Component organization
- TypeScript types

### 🔄 Next Phase:
- Authentication system (login/register)
- Case registration forms
- Search functionality
- Dashboard pages
- API integration with backend

## 📁 Key Files Reference

### Core Files:
- `app/globals.css` - Theme and gradient configuration
- `app/layout.tsx` - Root layout with theme provider
- `app/page.tsx` - Main landing page
- `components/location-permission.tsx` - Location logic
- `lib/location.ts` - Location service
- `components/theme-toggle.tsx` - Theme switching

### Type Definitions:
```typescript
// Key Types
interface LocationData {
  country: string
  state: string
  city: string
  latitude: number
  longitude: number
}

interface User {
  id: string
  fullName: string
  email: string
  role: "individual" | "police" | "NGO"
  // ... other fields
}

interface Case {
  id: string
  fullName: string
  status: "missing" | "found" | "closed"
  // ... other fields
}
```

## 🎨 Design Decisions

### Reference Image Implementation:
- **Gradient Background:** Matches soft cream → teal gradient
- **Color Palette:** Warm, approachable colors
- **Typography:** Clean, professional fonts
- **Layout:** Centered, spacious design
- **Components:** Soft shadows, rounded corners

### Accessibility:
- **Color Contrast:** High contrast for readability
- **Keyboard Navigation:** Full keyboard support
- **Screen Readers:** Proper ARIA labels
- **Focus States:** Clear focus indicators

## 🔧 Technical Notes

### Tailwind CSS v4:
- Using new `@theme inline` syntax
- OKLCH color space for better color management
- Custom CSS variables for theme switching

### Next.js 15.4.5:
- App Router for modern routing
- Server Components by default
- Built-in TypeScript support
- Optimized for performance

### shadcn/ui:
- Radix UI primitives
- Consistent component API
- Customizable design system
- TypeScript support

---

**Last Updated:** Current session
**Version:** 1.0.0
**Status:** ✅ Landing page complete, ready for authentication phase 