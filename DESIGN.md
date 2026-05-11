---
name: RestroNet
description: A curated culinary bridge for Kathmandu's modern dining scene.
colors:
  primary: "#fa6500"
  primary-hover: "#e05a00"
  neutral-bg: "#ffffff"
  neutral-subtle: "#f9fafb"
  neutral-border: "#f3f4f6"
  text-main: "#111827"
  text-muted: "#6b7280"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "12px"
  lg: "24px"
  xl: "40px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card-modern:
    backgroundColor: "{colors.neutral-bg}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
---

# Design System: RestroNet

## 1. Overview

**Creative North Star: "Himalayan Hearth"**

RestroNet is designed to feel warm, premium, and locally grounded. It rejects the generic "SaaS dashboard" aesthetic in favor of curated hospitality. The system balances modern Kathmandu energy with the timeless elegance of a high-end dining experience.

**Key Characteristics:**
- **Warmth over Utility**: Interfaces evoke the feeling of a welcoming host.
- **Atmospheric Depth**: Uses soft elevation to create a tangible, premium feel.
- **Intentional Restraint**: Every element has breathing room; nothing is crowded.

## 2. Colors

The palette is anchored by the warmth of a Kathmandu evening.

### Primary
- **Kathmandu Sunset** (#fa6500): Our signature accent. Used for calls to action, highlights, and moments of discovery. It represents the energy and warmth of the local dining scene.

### Neutral
- **Snow White** (#ffffff): Primary background for a clean, breathable canvas.
- **Mist Gray** (#f9fafb): Subtle background shifts to define sections without harsh lines.
- **Stone Border** (#f3f4f6): Delicate boundaries for components and cards.
- **Charcoal Text** (#111827): Deep, readable primary type.

**The Ten Percent Rule.** Kathmandu Sunset is used on ≤10% of any given screen. Its rarity preserves its impact and prevents the UI from feeling "loud."

## 3. Typography

**Display & Body Font:** Inter (Sans-serif)

Inter provides a modern, high-legibility foundation that feels "current" while remaining invisible enough to let food photography shine.

### Hierarchy
- **Display** (900, clamp(2.5rem, 5vw, 4rem), 1.1): Hero headlines, high-impact brand moments.
- **Title** (700, 1.5rem, 1.2): Section headings, restaurant names.
- **Body** (400, 1rem, 1.6): Default reading text. Max line length capped at 70ch.
- **Label** (600, 0.75rem, 1.4, Uppercase): Meta-info, categories, badges.

## 4. Elevation

RestroNet uses a "Lifted" philosophy. Depth is atmospheric and structural, creating a sense of physical layers found in a premium hospitality environment.

### Shadow Vocabulary
- **Hearth Glow** (0 10px 40px rgba(0,0,0,0.08)): The standard elevation for cards and modals. Soft, diffuse, and deep.
- **Interactive Lift** (0 20px 50px rgba(0,0,0,0.12)): Used for hover states to signal "tangible" interaction.

## 5. Components

Components are soft, confident, and intentionally restrained.

### Buttons
- **Shape**: Softened corners (12px radius).
- **Primary**: Kathmandu Sunset background, white text. Tactile but not aggressive.
- **Secondary**: White background with Stone Border. High-utility, low-noise.

### Cards
- **Curated Card**: Large radius (24px), Hearth Glow shadow, generous internal padding (24px).
- **Content-First**: Image-heavy, minimal metadata, strong vertical rhythm.

### Navigation
- **Glass Navbar**: Transparent on home hero, blurring into Mist Gray/White on scroll. High-transparency for a modern feel.

## 6. Do's and Don'ts

### Do:
- **Do** use Kathmandu Sunset as a selective spotlight, not a floodlight.
- **Do** prioritize large, high-quality food photography over UI ornamentation.
- **Do** use Hearth Glow shadows to create structural depth.

### Don't:
- **Don't** use border-left side-stripes as accents on cards.
- **Don't** use generic Tailwind-blue or SaaS-purple gradients.
- **Don't** pack more than 4 cards in a horizontal row on desktop.
- **Don't** use harsh #000 black; always use Charcoal Text (#111827).
