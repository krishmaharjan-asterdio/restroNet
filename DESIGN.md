---
name: RestroNet
description: >
  Luxury restaurant discovery platform for Kathmandu — curated, honest, and
  personal. Consumer-facing web application for browsing, filtering, and
  reserving at the city's finest dining establishments.
colors:
  page-canvas:     'hsl(40 20% 98%)'
  card-surface:    'hsl(0 0% 100%)'
  surface-subtle:  'hsl(40 15% 96%)'
  divider-warm:    'hsl(35 15% 88%)'
  quiet-warm:      'hsl(30 8% 46%)'
  foreground-warm: 'hsl(30 12% 10%)'
  saffron-orange:  '#fa6500'
  saffron-hover:   '#e05800'
  saffron-light:   '#fff3eb'
  dark-canvas:     'hsl(222 47% 6%)'
  dark-card:       'hsl(220 38% 9%)'
  dark-surface:    'hsl(220 35% 12%)'
  dark-divider:    'hsl(220 22% 17%)'
  dark-muted:      'hsl(40 8% 52%)'
  dark-foreground: 'hsl(40 15% 92%)'
  signal-red:      'hsl(0 80% 56%)'
  emerald-success: '#10b981'
  amber-warning:   '#f59e0b'
typography:
  display:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: 'clamp(3.5rem, 8vw, 7rem)'
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: '-0.02em'
  section-heading:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: 'clamp(2.5rem, 5vw, 4.5rem)'
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: '-0.01em'
  headline:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: 'clamp(1.5rem, 3vw, 2rem)'
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: '0.625rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: '0.18em'
    textTransform: uppercase
rounded:
  sm: '0.375rem'
  md: '0.5rem'
  lg: '0.75rem'
  xl: '1rem'
  2xl: '1.5rem'
  3xl: '2rem'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  2xl: '48px'
  3xl: '96px'
components:
  button-primary:
    backgroundColor: '#fa6500'
    textColor: '#ffffff'
    rounded: '0.75rem'
    padding: '12px 24px'
    shadow: '0 8px 24px rgba(250,101,0,0.22)'
  button-secondary:
    backgroundColor: 'hsl(var(--card))'
    textColor: 'hsl(var(--foreground))'
    border: '1px solid hsl(var(--border))'
    rounded: '0.75rem'
    padding: '12px 24px'
  input:
    backgroundColor: 'hsl(var(--surface))'
    border: '1px solid hsl(var(--border))'
    rounded: '0.75rem'
    height: '48px'
    focus-ring: '0 0 0 4px rgba(250,101,0,0.08)'
    focus-border: 'rgba(250,101,0,0.5)'
---

# Design System: RestroNet

## 1. Overview: The Table

**Creative North Star: "The Table"**

RestroNet is a destination, not a utility. Every screen is an invitation — to discover, to anticipate, to arrive. The interface is a maitre d': warm, composed, capable of making users feel they are already somewhere exceptional before they have placed a reservation.

The palette is dual: a warm cream-and-saffron light mode that reads like a luxury food magazine, and a deep blue-black dark mode that evokes an intimate restaurant at night. In both modes, **Saffron Orange (`#fa6500`)** carries all interactive and brand energy. It appears on buttons, primary actions, active states, focus rings, and nothing else. It is the first color the eye lands on. It must always earn that attention.

Typography pairs two families. **Cormorant Garamond** is the editorial voice: display sizes, section headings, restaurant names, and any statement that carries emotional weight. **DM Sans** is the operational voice: body text, labels, metadata, form fields, navigation. Neither competes with the other for the same visual slot.

**Key Characteristics:**

- Warm, editorial aesthetic: the interface reads like a curated food publication, not a generic SaaS product
- Saffron Orange as the sole chromatic accent; warm neutrals carry all other surfaces
- Two-typeface hierarchy: Cormorant Garamond for display and emotional moments, DM Sans for density and information
- Cinematic photography as structural content — full-bleed images carry the atmosphere; they are not decoration
- Glassmorphic info panels exclusively on photographic surfaces
- Deliberate motion: slow entrances with `cubic-bezier(0.22, 1, 0.36, 1)`, staggered reveals, no spring physics on page transitions
- Light and dark modes are equal-priority surfaces with identical hierarchy and information density

---

## 2. Colors: The Dining Room Palette

One chromatic accent. Two functional signals (saffron + signal red). Everything else is warm neutral.

### Primary

- **Saffron Orange** (`#fa6500` / `hsl(24.2 100% 49%)`): The brand and the only interactive accent. Buttons, active states, match score indicators, section accents, focus rings. If it glows orange, something can be acted upon.
- **Saffron Hover** (`#e05800`): One step darker. The signal that a surface responds to pointer proximity.
- **Saffron Light** (`#fff3eb`): Tint backgrounds for orange elements — badge fills, active chip tints at low opacity.

### Warm Neutrals (Light Mode)

- **Page Canvas** (`hsl(40 20% 98%)`): Warm off-white. Not pure white (which reads clinical). The warmth sets the dining room register.
- **Card Surface** (`hsl(0 0% 100%)`): Cards and modals. The slight contrast with the canvas establishes surface hierarchy without a shadow.
- **Surface Subtle** (`hsl(40 15% 96%)`): Hover states, muted fills, inactive chip backgrounds.
- **Divider Warm** (`hsl(35 15% 88%)`): All borders and separators. Carries warmth — not a cold grey.
- **Quiet Warm** (`hsl(30 8% 46%)`): Secondary text, placeholders, metadata, muted labels.
- **Foreground Warm** (`hsl(30 12% 10%)`): Primary text. Warm near-black.

### Functional Signals

- **Signal Red** (`hsl(0 80% 56%)`): Error states, destructive actions, form validation failures. **Reserved exclusively for errors and irreversible consequences.**
- **Emerald Success** (`#10b981`): Confirmed reservations, successful actions, "New" badges.
- **Amber Warning** (`#f59e0b`): Pending states, warnings, rating stars.

### Dark Mode

The page becomes deep navy (`hsl(222 47% 6%)`); cards float above it as navy surfaces (`hsl(220 38% 9%)`). Saffron Orange is unchanged — its intensity increases against the dark canvas.

**The One Chromatic Rule.** Saffron Orange appears on interactive elements and brand moments only. A decorative orange section divider or orange card border is wrong. It dilutes the signal.

**The Red Reservation Rule.** Signal Red marks errors and irreversible destructive actions only. A red badge that is not an error state is wrong.

---

## 3. Typography: The Editorial Pair

### Cormorant Garamond — The Editorial Voice

`font-family: 'Cormorant Garamond', Georgia, serif`

Used for: hero display text, section headings, restaurant names on cards, modal/dialog headings, empty state headlines, page-level section labels.

- Weights 400–600. Italic form (`font-style: italic`) on emphasis words in display contexts only — not universally applied.
- Never set below 20px / 1.25rem. At small sizes its elegance collapses.
- Always negative letter-spacing at display sizes (-0.02em to -0.01em).
- Reserved for moments that earn it. A table column header in Cormorant is wrong. A section heading in Cormorant is right.

### DM Sans — The Operational Voice

`font-family: 'DM Sans', system-ui, sans-serif`

Used for: body text, labels, metadata, form fields, navigation items, button text, badge text, table content, helper text, placeholders — anything that communicates information rather than atmosphere.

- Weights 400 (body), 500 (medium labels), 600 (semibold UI headings), 700 (uppercase tracking labels).
- The default for all UI text that is not explicitly a heading or display moment.

### Scale

| Level | Family | Size | Weight | Tracking | Use |
|---|---|---|---|---|---|
| Display | Cormorant | clamp(3.5rem, 8vw, 7rem) | 400–500 | -0.02em | Hero headlines |
| Section Heading | Cormorant | clamp(2.5rem, 5vw, 4.5rem) | 500 | -0.01em | Page section headers |
| Headline | Cormorant | clamp(1.5rem, 3vw, 2rem) | 600 | -0.01em | Modal titles, card groups |
| Title | DM Sans | 1rem / 16px | 600 | 0 | Card section labels |
| Body | DM Sans | 0.875rem / 14px | 400 | 0 | Running text |
| Label | DM Sans | 0.625rem / 10px | 700 | 0.18em | Uppercase eyebrows, nav |

**The Mixing Rule.** Cormorant and DM Sans are used in the same view but never in the same inline sentence. They occupy different vertical slots.

**The Italic Rule.** Italic Cormorant is used on at most one word or phrase per heading. Italicize the emotional word; set the rest in roman.

---

## 4. Photography: Structural Content

Photography is not decoration in RestroNet — it is the primary content.

**Gradient overlay specification (all photographic surfaces):**
- Top vignette: `from-black/30 to-transparent` (h-28), ensures badge and UI readability
- Main overlay: `from-black/90 via-black/25 to-transparent` (bottom-up)
- Color grade: `from-black/20 via-transparent to-primary/5` (top-left to bottom-right, warm tint)

**The Photography Rule.** Every image surface must have a gradient overlay. Raw images without overlay treatment are not acceptable — they make text illegible and destroy the cinematic register.

---

## 5. Glassmorphism: One Permitted Context

Glassmorphic surfaces are permitted in **exactly one context**: info panels overlaid directly on full-bleed photography.

```css
/* Light mode */
background: rgba(255, 255, 255, 0.93);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
border-top: 1px solid rgba(255, 255, 255, 0.20);

/* Dark mode — via .dark .rcard-panel in index.css */
background: rgba(10, 10, 18, 0.90);
border-top: 1px solid rgba(255, 255, 255, 0.08);
```

Always use the `.rcard-panel` class so the dark-mode override in `index.css` applies automatically.

**The Glass Rule.** Glassmorphism only appears on panels that float over photographic content. A glass card on a flat color background is wrong.

---

## 6. Elevation

| Level | Shadow | Use |
|---|---|---|
| Ground | none | Page canvas, sidebar |
| Contained | `0 2px 12px rgba(26,24,20,0.06)` | Cards, data containers |
| Interactive | `0 1px 4px rgba(26,24,20,0.06)` | Buttons at rest, inputs |
| Hover | `0 8px 32px rgba(26,24,20,0.10)` | Card/button hover states |
| Float | `0 20px 60px rgba(26,24,20,0.12)` | Dropdowns, popovers |
| Primary | `0 8px 24px rgba(250,101,0,0.22)` | Saffron buttons |
| Primary-hover | `0 12px 32px rgba(250,101,0,0.30)` | Saffron button hover |

In dark mode, shadows are replaced by tonal layering between `dark-canvas` → `dark-card` → `dark-surface`. Shadow values are halved.

---

## 7. Motion

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` for all entrances. Fast start, exponential deceleration, zero bounce. Named `ease-out-expo` in codebase comments.

**Duration:**
- Color/state transitions: `150–200ms`
- Element entrances: `450–700ms`
- Hero animations: `800–1000ms`
- Sibling stagger delay: `80–100ms`

**Animate only:** `opacity`, `transform` (translate/scale/rotate). Never animate layout properties (`height`, `width`, `top`, `left`).

**The Entrance Rule.** Elements animate upward (`y: 28 → 0`) on entrance. Elements do not fall from above. Exits animate downward.

**The Once Rule.** All `whileInView` uses `viewport={{ once: true }}`. Elements animate in on first visibility and stay.

---

## 8. Components

### Buttons

- **Primary (`.btn-primary`):** Saffron Orange fill, white text, `rounded-xl` (0.75rem), orange glow shadow. Hover to `#e05800`.
- **Secondary (`.btn-secondary`):** Card fill, warm foreground, 1px divider border, contained shadow.
- **Ghost:** No fill, no border. Hover adds Surface Subtle fill.
- **Height:** 48px for hero/form CTAs; 40px standard; 36px (`h-9`) compact inline.
- **Focus ring:** `0 0 0 4px rgba(250,101,0,0.08)` with `border-color: rgba(250,101,0,0.5)`.
- **Radius rule:** `rounded-xl` always. Not pill. Not square.

### Inputs (`.input-field`)

- Height 48px, `rounded-xl`, Surface Subtle fill, 1px Divider Warm border.
- Focus: border `rgba(250,101,0,0.5)`, ring `0 0 0 4px rgba(250,101,0,0.08)`.
- Icon variant: left icon at `left-4`, text shifts to `pl-11`.
- Minimum touch target: 44px.

### Cards

- `rounded-2xl` standard; `rounded-3xl` for full-bleed photo cards.
- Border: 1px Divider Warm; shadow: `shadow-card`; hover: y-lift -2px + `shadow-card-hover`.
- Internal padding: 24px.
- **No nesting.** A card inside a card is always wrong.

### Restaurant Card (Signature Component)

- 480px tall, `rounded-3xl`, full-bleed photography.
- Hover: image scales to 105% in 700ms; info panel rises 8px.
- Bottom panel: `.rcard-panel` with glassmorphic spec (§5).
- Restaurant name: Cormorant Garamond 20px semibold.
- Score ring (`<ScoreRing>`): SVG progress ring, shown only for authenticated users.

### Badges

- Height: 20px; `rounded-sm`; 10px/700 weight; 8px horizontal padding.
- `badge-success`: emerald tint. `badge-warning`: amber tint. `badge-error`: red tint. `badge-neutral`: surface + quiet. `badge-primary`: saffron tint.
- **Saffron fills on badges are tints (10–12% opacity), not solid fills.** Solid saffron is a button.

### Editorial Numbers & Marquee

- `section-num`: Large italic Cormorant (clamp 4–7rem) in Divider Warm color. Public editorial pages only. Not in admin, modals, or forms.
- `marquee-track` / `marquee-track-slow`: Infinite horizontal ticker. One per page-section transition maximum. Not inside cards or modals.

### Navigation (Navbar)

- Transparent over homepage hero; transitions to `bg-background/95 backdrop-blur-xl` on scroll at 20px.
- Active link: bottom dot in Saffron Orange.
- Mobile: right-side drawer, `spring damping:28 stiffness:300`.

---

## 9. Admin Panel

`/admin/*` uses a parallel dark utility surface. It does **not** use Cormorant Garamond (except the Dashboard page title), warm tones, glassmorphism, or editorial patterns. The design principles still apply: Saffron Orange as the only chromatic accent, correct motion timing, no hardcoded colors in JSX.

---

## 10. Do's and Don'ts

### Do:

- **Do** use CSS custom properties via Tailwind utilities (`text-primary`, `bg-primary/10`, `border-border`, `text-muted-foreground`) for every color. Hardcoded hex or rgba in JSX `style` props is a code smell.
- **Do** use `fontFamily: 'Cormorant Garamond, Georgia, serif'` inline style for every heading — there is no Tailwind utility for a display font. This is the acceptable exception.
- **Do** apply `text-label` for all uppercase eyebrow labels — it bundles font, size, weight, and tracking.
- **Do** use `viewport={{ once: true }}` on every `whileInView`. Elements animate in once and stay.
- **Do** use the `.rcard-panel` class on glassmorphic panels over photography — the dark-mode override applies automatically.
- **Do** use the `.grain` pseudo-element class for film grain texture on hero sections.
- **Do** keep interactive targets at 44px minimum height for accessibility.
- **Do** use Tailwind `hover:` utilities for hover color/border changes instead of `onMouseEnter`/`onMouseLeave` style mutations.
- **Do** check keyboard focus rings. The saffron ring at 4px / 8% opacity fill must be visible against all surfaces.

### Don't:

- **Don't** hardcode `#fa6500`, `rgba(250,101,0,...)`, or color hex values in JSX `style` props. Use Tailwind's `text-primary`, `bg-primary/10`, or the CSS variable. Exception: SVG path fills where CSS variables cannot resolve.
- **Don't** use Cormorant Garamond below 20px. At small sizes it collapses to illegibility. Use DM Sans for everything under 20px.
- **Don't** apply glassmorphism to surfaces that do not sit over photography or a blurred image. A frosted card on a flat cream background is wrong.
- **Don't** use `onMouseEnter`/`onMouseLeave` to imperatively mutate `element.style`. Use Tailwind hover utilities or CSS classes.
- **Don't** animate layout properties (`height`, `width`, `top`, `left`). Animate `transform` and `opacity`.
- **Don't** use spring physics (`type: 'spring'`) for page-level transitions. Reserve spring for physical gesture elements (mobile drawers only).
- **Don't** use gradient fills on card backgrounds, section fills, or UI containers. Gradients are only permitted on photographic overlay layers.
- **Don't** use `background-clip: text` gradient effects. Weight or Cormorant italic is the editorial emphasis equivalent.
- **Don't** use pill-shaped buttons (`border-radius >= 50%`). System radius is `rounded-xl`.
- **Don't** nest cards. Content inside a card uses dividers, Surface Subtle fills, or whitespace.
- **Don't** add a border AND a shadow AND a fill to a non-card element. Cards earn all three; buttons earn shadow + fill; inputs earn border + fill.
- **Don't** use the `section-num` or `marquee` patterns inside admin, modals, forms, or any utility UI context.

---

## 11. Quick Color Reference

| Context | Correct | Wrong |
|---|---|---|
| Icon in a list item | `className="text-primary"` | `style={{ color: '#fa6500' }}` |
| Card border | `className="border border-border"` | `style={{ border: '1px solid ...' }}` |
| Muted text | `className="text-muted-foreground"` | `style={{ color: '#8b98b0' }}` |
| Heading font | `style={{ fontFamily: 'Cormorant Garamond...' }}` | default sans on section headers |
| Glassmorphic panel | `.rcard-panel` class | Direct `style={{ background: 'rgba(...)' }}` |
| Confirmed badge | `badge-success` | Custom green inline style |
| Hover border change | `hover:border-primary/40` class | `onMouseEnter(e => e.style.borderColor = ...)` |
| Destructive action | `btn-destructive` / `text-destructive` | Custom red inline style |
