# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BTK Akademi LMS** — a student learning management platform, built as a React + TypeScript + CSS Modules single-page application. The frontend design is finalized in `ui/DESIGN.md` and `ui/code.html` (static mockup); the goal is a production-ready implementation with reusable components, token-based styling, and a mock data layer for decoupling from the backend.

**Repository structure:**

```
lms/
├── docs/
│   ├── gereksinimler.md           # Feature/NFR specification (FR-1, FR-57, NFR-30, etc.)
│   └── lms_en_etkili_10_ozellik.md  # Core feature list
├── ui/
│   ├── DESIGN.md                  # Design system: colors, typography, spacing, elevations, component specs
│   ├── code.html                  # Static Tailwind HTML mockup (reference for visual accuracy)
│   └── screen.png                 # Screenshot of desktop view (1440px)
└── web/                           # React + TypeScript + Vite application
    ├── package.json               # Dependencies: React 18.3, React Router 6.26, TypeScript 5.6
    ├── vite.config.ts             # Vite build config
    ├── index.html                 # Google Fonts (Inter, Plus Jakarta Sans) + Material Symbols
    └── src/
        ├── styles/
        │   ├── tokens.css         # ⭐ SINGLE SOURCE OF TRUTH: 63 colors, 13 typography roles,
        │   │                       #    10 spacing, 4 radius, 3 elevations, RGB channel tokens
        │   ├── typography.css     # 13 role → family/size/weight/line-height/letter-spacing
        │   ├── reset.css          # Box model, form resets
        │   └── global.css         # All above + body defaults + skip link + motion prefs
        ├── components/            # 12 primitive, reusable, component-scoped CSS
        │   ├── Text/              # 13 typography roles + tone variants
        │   ├── Icon/              # Material Symbols Outlined
        │   ├── Button/            # 5 variants (primary, secondary, navy, ghost, destructive)
        │   ├── IconButton/        # Icon-only with optional badge
        │   ├── Badge/             # 8 tones, 3 variants (solid, soft, glass)
        │   ├── Card/              # Elevation + padding + interactive hover
        │   ├── Panel/             # Card + title/icon/action slot
        │   ├── ProgressBar/       # 0–100, 4 tone options
        │   ├── Avatar/            # Name + optional image, fallback icon
        │   ├── SearchInput/       # Search icon, accessible label
        │   ├── StatTile/          # Large metric card (label, value, unit, icon, footer)
        │   └── SectionHeader/     # Title + subtitle + optional action link
        ├── layout/
        │   ├── AppShell/          # Master wrapper: Sidebar + Topbar + <Outlet />
        │   ├── Sidebar/           # 256px desktop | 72px tablet | off-canvas mobile
        │   │   └── navItems.ts    # Single source of nav: 6 routes
        │   ├── Topbar/            # 64px header with search, notifications, user chip
        │   └── PageContainer/     # Centered content wrapper (max-width 1600px)
        ├── features/
        │   └── dashboard/
        │       ├── DashboardPage.tsx     # 2-col layout (2fr | 1fr)
        │       └── components/
        │           ├── WelcomeBanner/    # Gradient hero + badges + streak widget
        │           ├── KpiGrid/          # 4 × StatTile
        │           ├── ContinueLearningCard/  # Lesson card with progress
        │           ├── EnrolledCourses/  # 3 course cards
        │           ├── WeeklyActivityChart/   # Stacked div bars
        │           ├── UpcomingTasks/    # Task list with badges
        │           ├── AiGuideCard/      # AI assistant card
        │           └── AnnouncementsFeed/ # Announcement list
        ├── routes/
        │   └── index.tsx          # Router: dashboard + 5 placeholder pages
        ├── data/
        │   ├── dashboard.fixtures.ts   # Mock DashboardData (Turkish content)
        │   ├── useDashboardData.ts     # Hook returning fixture (backend integration point)
        │   └── images.ts          # Image URLs from mockup
        ├── types/
        │   └── index.ts           # Shared TypeScript interfaces
        ├── App.tsx                # RouterProvider wrapper
        └── main.tsx               # React 18 root + style imports
```

---

## Quick Start

```bash
cd web
npm install
npm run dev                # Start dev server on http://localhost:5173
npm run build              # Production build to dist/
npm run typecheck          # TypeScript checking (also runs before build)
```

The app is a **single-page application** with client-side routing. All six navigation items (Genel Bakış, Kurslarım, Duyurular, Takvim, Notlar & Görevler, Sınavlar) are wired in `src/layout/Sidebar/navItems.ts` and `src/routes/index.tsx`. The dashboard (`/`) is fully implemented; the other five are skeleton pages with placeholder text.

---

## Design System & Token Architecture

### The Rule: No Hardcoded Colors in Component CSS

Every color, spacing, and typographic value is a CSS custom property defined in `src/styles/tokens.css`. **Bileşen CSS'lerinde ham hex YAZILMAZ — her renk buradan `var()` ile alınır.**

This ensures:
- **Single source of truth:** design changes in one file propagate everywhere
- **No collision:** CSS Modules + tokens = no class-name or specificity conflicts
- **Easy theming:** future dark mode or branding changes need only token updates

### Token Categories

**Colors (63 total):**
- Material Design 3 roles (`--color-primary`, `--color-secondary`, `--color-surface`, etc.)
- Brand layer (`--color-brand-navy-deep`, `--color-cyan-accent`, `--color-state-success`, etc.)
- Soft/glass variants (using RGB channel tokens for transparency)

**RGB Channel Tokens (9 total):**
- `--rgb-primary`, `--rgb-secondary`, etc.
- Used as `rgb(var(--rgb-name) / 0.4)` for transparent variants (no raw `rgba()` in CSS)

**Typography (13 roles):**
- `display-hero`, `headline-lg`, `headline-md`, `headline-sm`
- `title-md`, `body-lg`, `body-md`, `body-sm`
- `label-lg`, `label-md`, `code-sm`

**Spacing (10 values):**
- `--space-xs` to `--space-2xl`, plus `--gutter` and `--margin`

**Radius (4 scales):**
- `--radius-sm`, `--radius-default`, `--radius-lg`, `--radius-xl`, `--radius-full`

**Elevation (3 levels + chrome + scrim):**
- `--elevation-1`, `--elevation-2`, `--elevation-3`
- `--elevation-chrome`, `--scrim` (for modals/overlays)

### Known Design Conflicts

Three discrepancies between `DESIGN.md` and the rendered mockup are documented in `tokens.css` comments (lines 5–12):

1. **Primary CTA / focus ring:** DESIGN.md says `#0284c7` (undefined); rendered color is `secondary` = `#006398`. Used rendered value.
2. **Border radius `xl`:** DESIGN.md says `1.5rem`; code.html Tailwind config says `0.75rem`. Used code.html value.
3. **`code-sm` font:** DESIGN.md says "monospaced"; code.html uses `Inter`. Used `Inter` (if true monospace needed later, add separate token).

---

## Component API Reference

### Primitives (src/components/)

**Text**
- `role`: one of 13 typography roles (required)
- `as`: HTML element (optional, default: `span`)
- `tone`: color variant (`default`, `muted`, `main`, `navy`, `primary`, `secondary`, `cyan`, `success`, `warning`, `error`)
- `weight`: `normal` | `bold` | `semibold` (optional)

**Icon**
- `name`: Material Symbols Outlined name (required)
- `size`: `sm` | `md` | `lg` | `xl` (default: `md`)
- `filled`: boolean (default: false)

**Button**
- `variant`: `primary` | `secondary` | `navy` | `ghost` | `destructive` (required)
- `size`: `sm` | `md` (default: `md`)
- `iconStart`, `iconEnd`: icon name (optional)
- `fullWidth`: boolean (default: false)
- Children: button label

**Badge**
- `tone`: `brand` | `info` | `cyan` | `success` | `warning` | `error` | `neutral` | `navy`
- `variant`: `solid` | `soft` | `glass` (default: `solid`)
- `shape`: `rounded` | `pill` (default: `rounded`)
- `icon`: icon name (optional)
- Children: badge label

**Card**
- `padding`: `none` | `sm` | `md` | `lg` (default: `md`)
- `elevation`: `1` | `2` | `3` (optional, default: `1`)
- `interactive`: boolean (default: false) — adds hover scale

**ProgressBar**
- `value`: number 0–100 (required)
- `tone`: `gradient` | `cyan` | `blue` | `success` (default: `gradient`)
- `aria-label`: accessibility label (required)

All primitives use **CSS Modules** (`*.module.css`), making class names locally scoped and collision-free.

---

## Mock Data & Backend Integration

**Current:** `src/data/useDashboardData.ts` returns a fixture (`dashboard.fixtures.ts`), which is plain TypeScript with no API calls.

**To integrate with a backend API:**

1. Replace the hook body in `useDashboardData.ts` with a `fetch()` or axios call
2. Keep the return type (`DashboardData`) unchanged
3. All components remain untouched; only the data source changes

The type interface is defined in `src/types/index.ts`:
- `DashboardData` (root)
- `StudentProfile`, `TermInfo`, `ActivityDay` (student context)
- `Course`, `UpcomingTask`, `Announcement`, `AiGuide` (content entities)

### Yaklaşan Görevler (dinamik, FR-12)

The dashboard "Yaklaşan Görevler" panel no longer uses the fixture:

- **Data model:** `Assignment` (ASSIGNMENT | PROJECT | LAB, priority, DRAFT/PUBLISHED, `dueAt`, optional `availableFrom` / `lateUntil`) and `AssignmentSubmission` (one per student; TEXT or LINK — FILE returns 415 for now). Exams come from the existing `Exam` model.
- **API:** `/api/v1/assignments` CRUD + `/publish` `/unpublish` (ADMIN or assigned instructor), `/api/v1/assignments/:id/submission(s)` (student submit/withdraw, staff list/grade), `GET /api/v1/users/me/assignments`, and `GET /api/v1/users/me/upcoming-tasks?limit=` (unsubmitted open assignments + unclosed exams, sorted, with `total`).
- **Web:** the API returns raw data; `features/dashboard/upcomingTaskMeta.ts` builds the Turkish labels ("2 gün kaldı", "Cuma 14:00"). Staff manage tasks at `/yonetim/gorevler`; students see `/notlar-ve-gorevler` and `/gorevler/:id`.

---

## Responsive Design

**Three breakpoints:**
- **≥1280px:** Full sidebar (256px) + content
- **768–1279px:** Icon-only sidebar rail (72px) + content
- **<768px:** Off-canvas drawer (hamburger toggle in topbar) + content

**No horizontal scroll at any width.** All layouts are single-column on mobile with `max-width: 100%` and proper `overflow-x: hidden`.

---

## Accessibility (WCAG AA)

- **Focus rings:** `--focus-ring-color: var(--color-secondary)`, visible on all keyboard-navigable elements (NFR-30)
- **Semantic HTML:** `<main id="main-content">`, `aria-current="page"` on active nav, `aria-labelledby` on sections
- **Images:** all have descriptive `alt` text
- **Form controls:** all buttons have text or `aria-label`
- **Motion:** `prefers-reduced-motion: reduce` removes animations (pulse, scale, transitions)
- **Skip link:** `.skip-link` at top of page jumps to `#main-content`

---

## Turkish Language

- Fonts: **Inter** + **Plus Jakarta Sans** (Google Fonts, imported in `index.html`)
- Both families tested for Turkish diacritics: `ç ğ ı ö ş ü İ` render without baseline shift or glyph substitution
- Content uses 100% Turkish (no Lorem ipsum placeholders)
- Language attribute: `<html lang="tr">`

---

## Development Practices

### Styling Rules

1. **Only use tokens in component CSS** — no `#hex`, no `rgba(r,g,b,a)`, only `var(--color-*)` or `rgb(var(--rgb-*) / alpha)`
2. **CSS Modules per component** — no shared utility classes that could collide
3. **No magic numbers in padding/margin** — use spacing tokens (`--space-xs` to `--space-2xl`, `--gutter`, `--margin`)
4. **Focus states** — all interactive elements must show `--focus-ring` when keyboard-focused (use `:focus-visible`)

### Code Structure

- **One component per folder** — `ComponentName/ComponentName.tsx` + `ComponentName.module.css` + `index.ts`
- **Props over configuration** — prefer component props over context or global state for UI variants
- **Minimal dependencies** — only React, React Router, TypeScript, Vite (no UI frameworks, no CSS-in-JS)
- **Types first** — interfaces in `src/types/index.ts`, shared across features

### Data Flow

```
useDashboardData (hook)
    ↓
Mock fixture (development) or API call (production)
    ↓
DashboardPage (receives props)
    ↓
Block components (WelcomeBanner, KpiGrid, etc.)
    ↓
Primitive components (Text, Button, Badge, etc.)
```

No Redux, Context, or global state — props all the way down.

---

## Building & Deployment

```bash
npm run build    # Outputs to dist/
```

The build is a static SPA suitable for:
- A CDN + static hosting (Vercel, Netlify, S3 + CloudFront, etc.)
- A Node server (serve from `dist/` folder)

The HTML file (`dist/index.html`) includes all necessary preconnect links and font declarations. No server-side rendering is needed.

---

## Git & Commit Conventions

- **Branching:** feature branches off `master` (no separate `main`/`develop`)
- **Commits:** conventional style preferred (`feat:`, `fix:`, `refactor:`, `docs:`, etc.)
- **PR template:** not yet defined; follow the pattern in recent commits
- **Merges:** single squashed PR per feature (no micro-PRs) when possible

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| TypeScript errors after editing | Run `npm run typecheck` to see full errors |
| Build fails | Check `src/styles/tokens.css` syntax; it must be valid CSS custom properties |
| Dev server doesn't reload | Ensure only `.tsx`, `.css`, and `.ts` files in `src/` (no stray JS or JSX) |
| Component styles don't apply | Verify CSS Module import: `import styles from './ComponentName.module.css'` and use `className={styles.className}` |
| Image not showing on dashboard | Check `src/data/images.ts` — URLs are from code.html; consider downloading to `public/images/` for local deployment |

---

## Next Steps (Not Yet Implemented)

1. **Remaining five pages** — replace placeholder content in `PlaceholderPage` with real UI for Kurslarım, Duyurular, Takvim, Notlar & Görevler, Sınavlar
2. **Backend API** — replace mock hook with real calls (e.g., Node + SQLite, as mentioned in requirements)
3. **Authentication** — add login flow (not currently implemented)
4. **Tests** — unit tests for components, integration tests for routes (test framework TBD)
5. **Dark mode** — tokens support it; UI implementation would follow the same pattern as light mode

---

**Last updated:** 2026-10-13 (after token system finalization and 9 rgba() values converted to RGB channel tokens)
