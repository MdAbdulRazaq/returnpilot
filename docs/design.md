# ReturnPilot Design System

## Overview
This document reverse-engineers the existing UI, components, Tailwind conventions, typography, colors, spacing, and design system from the ReturnPilot codebase. The design is intentionally minimal and focused, reflecting the product's single-purpose nature.

## Design Philosophy
ReturnPilot employs a clean, utilitarian design focused on clarity and actionability. The interface prioritizes:
- Rapid comprehension of financial risk (money at risk)
- Clear status visualization
- Minimal cognitive load for merchant users
- Consistent, predictable interactions
- Accessibility-first approach

## Color System

### Brand Colors
Defined in `app/globals.css` via Tailwind v4 theme layer:
- `--color-brand-50`: `#eef6ff` (lightest)
- `--color-brand-500`: `#2563eb` (primary brand)
- `--color-brand-600`: `#1d4ed8` (hover/active states)
- `--color-brand-700`: `#1e40af` (pressed/dark states)

### Semantic Colors
- **Risk/Error**: 
  - `--color-risk-bg`: `#fef2f2` (background)
  - `--color-risk-fg`: `#b91c1c` (foreground/text)
  - Used for: money at risk amounts, error states, open alerts
- **Success/OK**:
  - `--color-ok-bg`: `#f0fdf4` (background)
  - `--color-ok-fg`: `#15803d` (foreground/text)
  - Used for: positive confirmations, success states

### UI Component Colors
- **Alert Reasons**:
  - NO_RETURN: `bg-red-50 text-red-700` (error variant)
  - RETURN_NOT_RECEIVED: `bg-amber-50 text-amber-700` (warning variant)
  - QUANTITY_SHORTFALL: `bg-blue-50 text-blue-700` (info variant)
- **Alert Status**:
  - open: `bg-red-50 text-red-700` (requires attention needed to open an alert) --red-700
  - reviewed: `bg-amber-50 text-amber-700` (warning variant)
  - dismissed: `bg-gray-50 text-gray-700` (neutral variant)

## Typography

### Base Settings
- Root font size: 16px (browser default)
- Font family: System UI stack (`-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, `sans-serif`)
- Text color: `text-gray-900` (`#111827`) on light background
- Background: `bg-gray-50` (`#f9fafb`) for reduced contrast

### Text Styles
- **Headings**:
  - h1: `text-2xl font-bold text-gray-900` (dashboard sections)
  - h1: `text-4xl font-bold leading-tight text-gray-900 sm:text-5xl` (marketing hero)
  - h2: `text-lg font-medium` (subsection headers)
- **Body**: `text-sm` (14px) for most interface text
- **Labels**: `text-sm font-medium text-gray-700` (form labels)
- **Helper Text**: `text-xs text-gray-500` (form hints, captions)
- **Metrics**: `text-3xl font-bold` (SummaryCards values)
- **Captions**: `text-xs opacity-70` or `text-sm text-gray-500` (secondary information)

### Typography Utilities
- Tracking: `tracking-wide` (letter spacing for uppercase)
- Tracking: `tracking-wider` (wider spacing for table headers)
- Font weight: `font-medium` (500) for labels, `font-bold` (700) for headings/values
- Font family: `font-mono` for codes/IDs (order/refund identifiers)

## Spacing System

### Layout Spacing
- Container padding: `px-4` (mobile), `px-6` (tablet), `px-8` (desktop)
- Vertical spacing: `py-8` (page sections), `py-20` (marketing hero)
- Gap between elements: `gap-4` (1rem), `gap-6` (1.5rem)
- Section margins: `mb-8` (section bottom), `mb-6` (element groups)
- Card padding: `p-4` (1rem internal padding)

### Component Spacing
- Form elements: `mb-2` (label to input), `space-y-6` (form sections)
- Button groups: `space-x-2` or `space-x-4` (horizontal button spacing)
- Table cells: `px-6 py-4` (horizontal 1.5rem, vertical 1rem)
- Table headers: `px-6 py-3` (slightly less vertical padding)
- Expandable rows: `px-6 py-4` (consistent with table cells)
- Detail rows: `px-6 py-4` (full width content area)

### Border Radius
- Cards: `rounded-xl` (0.75rem)
- Buttons: `rounded-md` (0.375rem)
- Inputs: `rounded-md` (0.375rem)
- Tables: `rounded-none` (square, but containers may have radius)
- Badges: `rounded-full` (pill shape)
- Metric cards: `rounded-xl` (0.75rem)
- Containers: varies by context (`rounded-lg`, `rounded-xl`, or none)

## Border System
- Default border: `border border-gray-300` (`#d1d5db`)
- Focus border: `focus:border-brand-500` (`#2563eb`)
- Hover borders: implicit in hover states
- Divider lines: `divide-y divide-gray-200` (table rows)
- Section borders: `border-t` or `border-b` for separation
- Card borders: `border` (applied to metric cards, form containers)

## Elevation & Shadows
The UI primarily uses borders, spacing, rounded corners, and background colors for visual separation. No elevation or shadow utilities are used in the main application components.

## Component Patterns

### Cards
- **MetricCard** (SummaryCards.tsx):
  - Container: `rounded-xl border p-4` + color-specific classes
  - Title: `text-sm font-medium tracking-wide uppercase`
  - Value: `mt-1 text-3xl font-bold`
  - Description: `mt-2 text-sm opacity-70`
- **Container pattern**: Consistent padding (`p-4` or `px-6 py-4`) with rounded borders

### Forms
- **Labels**: `block text-sm font-medium text-gray-700 mb-2`
- **Inputs**: 
  - Base: `w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm`
  - Focus: `focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500`
  - Required: `required` attribute + visual styling
- **Checkboxes**: 
  - Base: `h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded`
  - Container: `flex items-start` with label aligned
- **Selects**: Same styling as text inputs
- **Buttons**: 
  - Primary: `w-flex items-center justify-center rounded-md border-border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2`
  - Secondary: `rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50`
  - Icon buttons: `p-1 text-gray-400 hover:text-gray-600` (expand/collapse toggles)

### Tables
- **Structure**:
  - Container: `overflow-x-auto` (enables horizontal scrolling)
  - Table: `w-full` (width: 100%)
  - Header: `bg-gray-50` with `text-left text-xs font-medium text-gray-500 uppercase tracking-wider`
  - Header sorting indicators: `aria-sort` attribute + visual `↑`/`↓`
  - Rows: `bg-white divide-y divide-gray-200`
  - Hover state: `hover:bg-gray-50 transition-colors`
  - Selected/active: `bg-gray-50` (for expanded rows)
  - Cells: `px-6 py-4` (data), `whitespace-nowrap` (prevent wrapping)
  - Text alignment: `text-left` (default), `text-right` (numeric/currency)
  - Monospace: `font-mono` for IDs and codes
- **Expandable Rows**:
  - Toggle button: `p-1 text-gray-400 hover:text-gray-600` (rotates +/–)
  - Content row: `bg-gray-50` with `colSpan={7}`
  - Detail layout: `grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4`

### Badges
- **ReasonBadge**:
  - Base: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`
  - NO_RETURN: `bg-red-50 text-red-700`
  - RETURN_NOT_RECEIVED: `bg-amber-50 text-amber-700`
  - QUANTITY_SHORTFALL: `bg-blue-50 text-blue-700`
- **StatusBadge**:
  - Base: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`
  - open: `bg-red-50 text-red-700`
  - reviewed: `bg-amber-50 text-amber-700`
  - dismissed: `bg-gray-50 text-gray-700`
- **Shared pattern**: Pill-shaped, compact, conveys status at glance

### Navigation & Actions
- **Links**:
  - Primary: `rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700` (marketing CTA)
  - Secondary: `rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-white`
- **Buttons**:
  - Primary action: brand background with white text
  - Secondary action: white background with brand border and text
  - Danger/destructive: uses red semantic colors where appropriate
  - Icon-only: `p-1` with hover states, accessible labels
- **Pagination**:
  - Container: `flex items-center justify-between px-6 py-4 border-t border-gray-200`
  - Text: `text-sm text-gray-700`
  - Buttons: `rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50`
  - Disabled states: `disabled:opacity-50 disabled:cursor-not-allowed`

## Interactive States

### Hover States
- Generic: `hover:bg-gray-50` (elements), `hover:bg-brand-700` (brand buttons)
- Text: `hover:text-gray-600` (icons), `hover:text-white` (brand buttons)
- Borders: implicit in focus styles, some explicit hover borders

### Focus States
- Primary: `focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500` (inputs/selects)
- Enhanced: `focus:ring-2 focus:ring-brand-500 focus:ring-offset-2` (primary buttons)
- Ring offset prevents layout shift when focus ring appears

### Pressed/Active States
- Achieved through hover states on most elements
- Active page indicators: `aria-current` attribute where applicable
- Selected states: visual background changes (`bg-gray-50` for expanded rows)

### Disabled States
- Generic: `disabled:opacity-50 disabled:cursor-not-allowed`
- Maintains dimensional space while visually indicating unavailability
- Applied to form controls, buttons, interactive elements

## Responsive Design
- Mobile-first breakpoints:
  - sm: 640px
  - lg: 1024px
- Layout adaptations:
  - Mobile: single column stacks, full-width inputs
  - Tablet+/Desktop: multi-column grids (SummaryCards: 2→4 columns)
  - Table alignment: lateral scrolling on narrow viewports
  - Filter forms: wrap onto multiple rows on mobile
  - Detail views: grid column expansion at sm (2-col) and lg (4-col)

## Icons & Imagery
- No icon library used (performance consideration)
- Checkmark logo: `✓` rendered as text with `text-brand-600` (marketing lists)
- Expand/collapse: `+` and `−` characters as toggle buttons
- Sort indicators: `↑` and `↓` characters in table headers
- All meaningful imagery conveyed through typography, color, and layout

## Accessibility Features
- Semantic HTML: proper heading hierarchy, form labels, button roles
- Labeling: all form controls have associated `<label>` elements
- Hidden labels: `sr-only` class for screen reader-only labels (search, filters)
- Keyboard navigation: standard HTML element tab order
- Focus management: visible focus rings on all interactive elements
- ARIA attributes:
  - `aria-label` for icon buttons (expand/collapse)
  - `aria-sort` for sortable table headers
  - `aria-expanded` for expandable row toggles
  - `role="search"` on filter form
  - `role="table"`, `role="row"`, `role="columnheader"` implicit in HTML tables
- Color contrast: meets WCAG AA standards for text/background combinations
- Responsive touch targets: minimum 44x44px for interactive elements

## Component-Specific Details

### Dashboard Page (app/(dashboard)/page.tsx)
- Layout: `mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8`
- Header: `mb-8` with `text-2xl font-bold text-gray-900` title and `mt-1 text-sm text-gray-500` description
- Section spacing: components separated by natural flow, no explicit spacers needed

### Summary Cards (components/dashboard/SummaryCards.tsx)
- Grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`
- Cards: `rounded-xl border p-4` with color-specific background/text/border
- Title hierarchy: `text-sm font-medium tracking-wide uppercase` → `mt-1 text-3xl font-bold` → `mt-2 text-sm opacity-70`

### Filters (app/(dashboard)/Filters.tsx)
- Form: `mb-6 flex flex-wrap gap-4 items-end` with `role="search"`
- Controls: `mb-2` stacking, `flex-1 min-w-[200px]` for search input
- Button: `rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50`
- Select/Input styling: consistent form element patterns

### Refund Alerts Table (components/dashboard/RefundAlertsTable.tsx)
- Table: standard table patterns with sorting indicators
- Actions column: combines status badge and action button
- Pagination: standard pagination component pattern
- Empty state: `text-center py-12` with descriptive text

### Settings Form (components/settings/SettingsForm.tsx)
- Form: `space-y-6` vertical spacing
- Success/error alerts: `mb-4 p-4` with background/text colors
- Input groups: `mb-2` label-to-input spacing
- Checkbox: `flex items-start` alignment with descriptive text
- Submit button: full-width primary button styling

### Alert Detail Row (components/dashboard/AlertDetailRow.tsx)
- Expanded row: `bg-gray-50` background
- Description list: `dl` with `grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4`
- Term styling: `dt` as `text-sm font-medium text-gray-500`
- Value styling: `dd` as `mt-1 text-sm text-gray-900`
- Conditional sections: only render when timestamps exist

### Marketing Page (app/(marketing)/page.tsx)
- Container: `mx-auto max-w-3xl px-6 py-20`
- Logo: `text-sm font-semibold uppercase tracking-wide text-brand-600`
- Hero: `mt-3` spacing, `text-4xl font-bold leading-tight text-gray-900 sm:text-5xl`
- Body: `mt-6` spacing, `text-lg text-gray-600`
- Feature list: `mt-14 space-y-4 text-gray-700` with checkmark icons
- CTA buttons: `mt-10 flex flex-wrap gap-4` with primary/secondary variants

## Design Constraints & Decisions

### Intentional Limitations
- No design system library (keeps bundle size small)
- Minimal color palette (brand + semantic + grayscale)
- Limited typographic scale (2-3 sizes for most elements)
- Preference for native HTML controls over custom components
- No animations or transitions beyond hover/focus states
- No CSS-in-JS or complex theming capabilities
- Single breakpoints for simplicity (sm, lg)

### Performance Considerations
- Utility-first CSS results in minimal unused styles
- No JavaScript runtime for styling (pure CSS)
- Limited DOM complexity (simple component trees)
- Efficient CSS selectors (mostly class-based)
- Minimal repaint/reflow triggers in interactions

### Maintenance Principles
- Consistency over cleverness (reuse existing patterns)
- Documentation through code (self-evident ClassName usage)
- Incremental improvements over redesigns
- Accessibility as baseline, not afterthought
- Mobile-first responsive approach
- Clear separation of concerns (layout vs. component styling)

### Extensibility Guidance
- Add new semantic colors only when needed for new states
- Follow existing component patterns for consistency
- Maintain mobile-first breakpoint approach
- Preserve contrast ratios when adding colors
- Keep component APIs simple and composable
- Use utility classes for local variations, extract to components for reuse