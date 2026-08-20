# Design System

Status: **CANONICAL VISUAL/UI DIRECTION (BUSINESS-FIRST REBASE)**  
Owner: Product Design

## Context direction

Meawketting is warm, modern, and trustworthy. Visual treatment adapts to operational density and risk:

| Context | Direction |
|---|---|
| Business Operations (Main) | **WARM OPERATIONAL CLARITY** — Warm Golden Yellow primary operational brand color, accessible dark ink text (`#281417`), warm cream surfaces, clear information hierarchy |
| Public / Business Landing (`/`) | **WARM OPERATIONAL CLARITY** applied to a commercial page: direct first-viewport value, product-inspired preview, restrained service lists, one dark trust band, and a secondary Guardian bridge |
| Consumer records (Preserved) | Calm warm neutral, rounded paper/sticker language, clear sections, restrained pastel accents |
| Consent / Lost / High-risk | Direct copy, high contrast, restrained color and motion |
| Platform Admin | Neutral, evidence/reason/audit-first dense surfaces |

Business surfaces must feel readable, calm, efficient, warm, fluid, modern, and human—never a cold grey corporate dashboard or a playful toy.

## Token architecture

```text
Primitive value → Semantic token → Component styling
```

- Components use semantic tokens, not raw hex values.
- Implemented tokens live in `@theme static` in `app/globals.css`.
- One semantic App Background spans the platform (`--color-meaw-app-background: var(--color-meaw-cream-100)`).
- Gradients and motifs are decorative tokens, never status or operational meaning.

### Color palette & semantic roles

| Role | Token / Value | Direction |
|---|---|---|
| App background | `--color-meaw-cream-100` (`#fff8ef`) | Cream / warm neutral platform base |
| Surface | `var(--surface)` (`#ffffff`) | Primary white card/sheet surface |
| Text primary | `var(--color-meaw-ink-950)` (`#281417`) | Deep dark ink text for maximum readability |
| Text soft / muted | `var(--ink-soft)` / `var(--ink-muted)` | Supporting and metadata copy |
| **Business Primary / Action** | `--color-meaw-business-primary` / `--color-meaw-business-action` (`#f2bc26`), hover `#e0a30b` | **Warm Golden Yellow** with `#281417` dark ink text |
| Ready / Success | `--color-meaw-mint-900` / `100` | Mint cue with explicit text/icon |
| Information | `--color-meaw-sky-900` / `100` | Sky cue with explicit text/icon |
| Waiting / Pending | `--color-meaw-cream-900` / `200` (or `--color-meaw-peach-600`) | Amber/Orange cue, visually distinct from Golden Yellow |
| Error / Cancelled | `--color-meaw-rose-800` / `rose-50` | Red/Rose cue with explicit wording |

### Color distinction rule

- **Warm Golden Yellow (`yellow-400` / `yellow-500`)** represents **Brand & Action** (buttons, active navigation items, scanner frames, active highlights).
- **Amber / Orange (`cream-900` / `peach-600`)** is strictly reserved for **Waiting / Pending** operational states.
- **Mint (`mint-900`)** is strictly reserved for **Ready / Success / Arrived** states.

## Typography

Noto Sans Thai is the active product typeface across all operational and consumer surfaces. Sriracha is limited to short decorative consumer accents and is strictly prohibited in operational content.

| Role | Size / Line-height | Typical weight |
|---|---|---:|
| Display | 40–64 / 1.06 | 800 |
| H1 | 32–44 / 1.10 | 800 |
| H2 | 28–32 / 1.16 | 800 |
| H3 | 24 / 1.24 | 800 |
| H4 | 20 / 1.30 | 800 |
| Body large | 18 / 1.75 | 500–700 |
| Operational body / input / button / label | **16 minimum** | 500–800 |
| Metadata / caption / mobile nav | **14** | 600–800 |
| Micro | 12 / 1.40 | 700–800; exceptional support text only |

- Persistent labels; placeholders never replace labels.
- Thai text wrapping, mixed Thai/Latin terms, and 200% text zoom must not clip text or touch targets.

## Spacing, shape and surface hierarchy

- 4px spacing base: `0, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80`.
- Page gutters: 16px mobile, 24px tablet, 32px desktop. The public landing shell is capped at approximately 1200px at the 1440px QA baseline; product preview art may expand independently only when needed.
- Touch target: minimum 44×44px; primary CTAs 48–56px.
- Business operational controls use moderate radius; large 24–32px radii are reserved for a small number of major marketing compositions, never repeated across every content block.
- Prefer borders and subtle surface tinting over heavy box shadows in operational surfaces.
- The homepage avoids a feature-card wall: Services and Business Core use divided lists; Yellow is reserved for actions and anchors rather than section-wide repetition.

## Business landing imagery

- Generic stock illustration is not used on the public landing. Real pet-business photography is the primary visual language.
- Homepage editorial imagery uses the generated photographs in `public/images/business` for the Hero, services, workflow, and closing entries. The removed `public/images/cats` directory is intentionally not a landing dependency.
- CI artwork remains a product/brand asset outside the public landing scope; `/workfiledesign` remains read-only and outside implementation scope.
- Product imagery must remain a labeled demo preview and must not imply live customer data. Photo assets are editorial mood/supporting visuals, not live customer data.

## Business buttons

- **Primary Business Action (`.button--business`)**: Warm Golden Yellow background, `#281417` dark ink text, bold weight, subtle border.
- **Secondary Ghost Action (`.button--business-ghost`)**: Surface background, Golden Yellow border, `#281417` text.
- **Destructive Action**: Separated, explicit red border/text only where consequence warrants it.

## Responsive architecture

| Viewport | Range | Behavior |
|---|---|---|
| Mobile | 320–767px | Landing copy and full-width CTAs first, product preview below, stacked service/core/flow sections; Business App keeps bottom navigation and sheet tasks |
| Tablet | 768–1023px | Landing uses a wide single-column Hero until the preview has enough room; Business App uses adaptive grids |
| Desktop | 1024px+ | Balanced two-column Landing Hero within the 1200px shell; Business App keeps its persistent navigation and multi-column calendar |

## Accessibility

- Normal text contrast >= 4.5:1; large text >= 3:1.
- Visible focus rings use the high-contrast semantic focus treatment; Yellow buttons retain dark ink foreground.
- One semantic H1 per page; modal focus trap and restore.
- Status and validation are never conveyed by color alone.
- `prefers-reduced-motion: reduce` disables non-essential animations.
