# Frontend Design Direction

**Decided**: 2026-03-27
**Inspiration**: joseph-san.com (cinematic, clean) + bombon.rs (playful motion, bold type)

## Core Principles

1. **Clean minimalist** — no clutter, no walls of text
2. **One idea per section** — each section owns the full viewport
3. **Big typography, few words** — headings do the talking
4. **Generous whitespace** — space IS the design
5. **Cinematic scroll reveals** — content appears on scroll, Framer Motion whileInView
6. **Light base, dark drama moments** — light 90%, dark overlay for eliminations/round transitions/winner

## Color Palette (Light Arena)

```
--bg-primary:     #FAFAF8    (warm white)
--bg-secondary:   #F3F0FF    (light purple tint)
--bg-tertiary:    #E8E4F0    (hover states)
--accent-primary: #6366F1    (indigo — primary actions)
--accent-gold:    #F59E0B    (loots, winners, achievements)
--danger:         #EF4444    (eliminations, critical drawdown)
--success:        #22C55E    (profit, safe zone)
--text-primary:   #1A1A2E    (near-black with warmth)
--text-secondary: #6B7280    (muted gray)
```

## Typography

- **Display/Headings**: Bold display font (e.g., Clash Display, Cabinet Grotesk) — NOT Inter
- **Body**: Inter (already installed) — clean, readable
- **Numbers/Prices**: JetBrains Mono (already installed) — monospace precision
- **Style**: Oversized headings, minimal body text, strong hierarchy

## Animation Stack

- **Framer Motion** (installed): page transitions, scroll reveals, stagger, layout animations, exit animations
- **CSS**: gradients, glows, backdrop-blur, transitions
- **Canvas 2D**: background particles for dramatic moments (eliminations, winner)
- **NO Three.js/GSAP** — Framer Motion covers 95% of needs

## Page Structure (Landing)

```
Section 1: Hero (full viewport)
  — "COLOSSEUM" large type + one-liner tagline
  — Subtle animated background
  — Single CTA button

Section 2: About/How It Works (full viewport)
  — 3 steps, icon + short label each
  — Scroll-triggered stagger reveal

Section 3: Live Arenas Preview (full viewport)
  — 2-3 arena cards with live status
  — Minimal info: name, status, traders, timer

Section 4: Stats/Social Proof (full viewport)
  — Big numbers: total arenas, traders, volume
  — Counter animation on scroll

Footer: minimal — links only
```

## Key Dramatic Moments

- **Elimination**: dark overlay flash, red accent, "ELIMINATED" text slam, dissolve back to light
- **Round transition**: full-screen dark overlay, "ROUND 2: THE STORM" cinematic reveal, countdown, dissolve
- **Winner announcement**: gold particle burst on light background, crown animation
- **Drawdown meter**: color-shifting ring (green → amber → red → pulsing), works great on light bg

## Component Style

- Cards: white, soft shadow, 16-24px radius, hover lift + subtle rotation
- Buttons: pill shape, filled or outlined, hover scale
- Tables/Lists: clean lines, no heavy borders, zebra striping optional
- Avatars: rounded, subtle ring border matching status color
