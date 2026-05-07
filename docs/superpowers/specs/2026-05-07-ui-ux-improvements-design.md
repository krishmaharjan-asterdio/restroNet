# UI/UX Improvements — RestroNet Frontend

**Date:** 2026-05-07  
**Scope:** All public-facing pages + admin panel  
**Approach:** Targeted precision polish (Option A)

---

## 1. Bug Fixes

### RestaurantDetail.jsx
- `useContext` is used but not imported from React. Add to import.

### Profile.jsx
- `handleUpdatePreferences` calls `setLoading(false)` but `setLoading` is never defined. Replace with `setSubmitting(false)`.

---

## 2. Navbar — Mobile Drawer

**Problem:** No mobile navigation exists. On small screens only the logo and auth buttons are visible; there is no way to reach "Explore" or profile links.

**Solution:** Add a hamburger icon button (visible on `< md`). Clicking it opens a full-height slide-in drawer from the right with the nav links and auth CTA. The drawer closes on link click or backdrop tap.

**Implementation:** Local `menuOpen` boolean state. Drawer rendered via `AnimatePresence` + `motion.div` with `x: "100%"` → `x: 0`. A dark overlay covers the page behind it.

---

## 3. Login / Register — Split-Screen Layout

**Problem:** Both pages are a plain card centered on a gray background. No brand presence, no input affordances.

**Solution:** Split-screen layout (two columns on md+, single column stacked on mobile):
- **Left panel** (hidden on mobile): brand panel with gradient background (`from-gray-900 to-gray-800`), RestroNet logo, tagline, and a food photography background image (opacity overlay). Static, decorative.
- **Right panel**: the form, with:
  - Icon prefix on each input (Mail for email, Lock for password, User for name)
  - Password visibility toggle (eye icon button)
  - Stronger primary CTA button (full-width, rounded-xl, shadow)
  - Social proof line below the form ("Join 10,000+ food lovers")

---

## 4. Home — Category Section

**Problem:** All four categories show the same `Compass` icon — they are visually indistinguishable.

**Solution:** Map each category to a distinct Lucide icon and accent color:

| Category | Icon | Accent |
|---|---|---|
| Fine Dining | `UtensilsCrossed` | amber |
| Cafe | `Coffee` | yellow |
| Fast Food | `Zap` | red/orange |
| Pub | `Beer` | green |

Each card gets its icon rendered in the accent color inside a circle with a matching tinted background.

---

## 5. Search — Filter Pills

**Problem:** Native `<select>` elements are visually inconsistent with the rest of the app and cannot be styled properly across browsers.

**Solution:** Replace both selects with horizontal scrollable pill chip groups:
- Cuisine pills: "All" + one chip per cuisine (populated from API). Active chip = `bg-primary text-white`. Inactive = `bg-white border`.
- Rating pills: fixed options ("All", "4.5+", "4.0+", "3.5+").

Both groups scroll horizontally with `overflow-x: auto; scrollbar-hide`.

---

## 6. AdminLayout — Avatar + Mobile Nav

**Problem:** Admin avatar is hardcoded "A" / "Superadmin". Mobile has no nav at all.

**Solution:**
- Topbar avatar: derive initial and name from `admin` context object.
- Mobile: add a hamburger in the topbar. Clicking opens a slide-down or side-drawer showing the full sidebar nav items. Close on item click.

---

## 7. AdminDashboard — Stat Cards

**Problem:** Stat cards are functional but minimal. The icon container uses only a background color class with no depth.

**Solution:** Add a thin left-border accent stripe per card (matching the icon color) and a subtle bottom trend line (`+X this month` sub-label) using the existing API data (no new endpoints needed — derive from `mainStats`). Cards gain a hover `shadow-md` lift.

---

## Architecture Notes

- No new npm packages needed. All icons are already available via `lucide-react`.
- All changes are confined to existing files — no new files required.
- Ant Design components (Rate, Form, Tabs, Select, Modal) in RestaurantDetail and Profile are left as-is; only layout/style around them is changed.
- The map (Leaflet) and Swiper slider are untouched.

---

## Files Changed

| File | Changes |
|---|---|
| `src/index.css` | Add input-icon helper class, split-screen form utility |
| `src/components/Navbar.jsx` | Mobile drawer |
| `src/pages/Login.jsx` | Split-screen layout, input icons, password toggle |
| `src/pages/Register.jsx` | Split-screen layout, input icons, password toggle |
| `src/pages/Home.jsx` | Distinct category icons and colors |
| `src/pages/Search.jsx` | Pill filter chips replacing native selects |
| `src/pages/RestaurantDetail.jsx` | Fix useContext import bug |
| `src/pages/Profile.jsx` | Fix setLoading bug |
| `src/components/AdminLayout.jsx` | Dynamic avatar, mobile nav |
| `src/pages/AdminDashboard.jsx` | Improved stat cards |
