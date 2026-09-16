# DESIGN SYSTEM & DESIGN PATTERN: "TECHNICAL ELEGANCE"
**Version:** 1.0.0
**Target Audience / Agent Directive:** This specification serves as the absolute source of truth for AI agents and developers building high-end, developer-first web applications, dashboards, and landing pages. Every UI component, spacing rule, and typography choice must strictly adhere to this document.

---

## 1. Core Philosophy & Design Principles

The "Technical Elegance" pattern merges the raw, high-density, precise ergonomics of an advanced code editor (such as VS Code) with the sophisticated, clean aesthetics of modern SaaS and high-end web design.

*   **Data Density with Breathing Room:** Users of this system are power users, developers, and analysts. They prefer seeing more data on screen without scrolling excessively, but layout hierarchy must prevent visual fatigue.
*   **Mathematical Precision:** Layouts rely on rigid structural grids, consistent spacing scales, and sharp alignment. Nothing feels accidental.
*   **Developer-First Ergonomics:** Monospaced fonts for metrics, code snippets, IDs, and tabular data; clean sans-serif typography for readable structural text; functional color usage where color is reserved exclusively for status indication or primary interactive feedback.
*   **Low-Saturation Aesthetic:** Avoid neon or loud primary colors. Use muted, desaturated tones, deep off-white backgrounds, crisp borders, and subtle shadows.

---

## 2. Typography System

The typography is a hybrid system combining a neutral, highly readable sans-serif for general UI and a precise monospaced font family for numerical data, metadata, identifiers, and code.

### 2.1 Font Stack Specifications
*   **Primary UI Font (Headings, Body, Labels):** 
    `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
*   **Secondary / Data Font (Numbers, IDs, Code, Tags, Table cells):** 
    `font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;`
    `font-feature-settings: "liga" on, "calt" on;` (Enables font ligatures like `->`, `=>`, `!==`).

### 2.2 Scale & Line-Height Matrix
*   **Body Text:**
    *   `font-size`: 12px
    *   `line-height`: 1.4 (16.8px)
    *   `font-weight`: 400 (Regular)
*   **Dense Data / Table Cells / Monospace Text:**
    *   `font-size`: 11px or 12px
    *   `line-height`: 1.3
    *   `letter-spacing`: -0.02em
*   **Headings Hierarchy:**
    *   **H1 (Page Title):** `font-size`: 24px | `font-weight`: 500 | `line-height`: 1.2 | `letter-spacing`: -0.03em
    *   **H2 (Section Header):** `font-size`: 18px | `font-weight`: 500 | `line-height`: 1.3
    *   **H3 (Card / Sub-section Header):** `font-size`: 14px | `font-weight`: 600 | `line-height`: 1.4
    *   **H4 / Micro Headers (Sidebars, Table categories):** `font-size`: 11px | `font-weight`: 600 | `text-transform`: uppercase | `letter-spacing`: 0.05em | `color`: var(--text-secondary)

---

## 3. Color Palette & CSS Custom Properties

Agents must implement the following design tokens as CSS variables. The palette is structured around a pristine off-white canvas with stark, high-contrast text and muted semantic accents.

```css
:root {
  /* Backgrounds */
  --bg-app: #F7F8FA;         /* Main application canvas / body background */
  --bg-surface: #FFFFFF;     /* Cards, modals, dropdowns, and elevated panels */
  --bg-subtle: #F1F3F5;      /* Hover states, active table rows, nested containers */
  --bg-code: #1E1E1E;        /* Dark mode code blocks or terminal widgets */

  /* Text Colors */
  --text-primary: #111827;   /* Main headings, active states, key data */
  --text-secondary: #6B7280; /* Metadata, placeholders, descriptions, inactive icons */
  --text-muted: #9CA3AF;     /* Disabled text, table borders captions */
  --text-inverse: #FFFFFF;   /* Text on dark backgrounds */

  /* Borders & Dividers */
  --border-subtle: #E5E7EB;  /* Card outlines, divider lines, table row borders */
  --border-focus: #4F46E5;   /* Active inputs, focused elements */

  /* Semantic / Status Colors */
  --success-text: #047857;   
  --success-bg: #D1FAE5;     /* Mint green for positive trends, active status */
  
  --warning-text: #B45309;   
  --warning-bg: #FEF3C7;     /* Soft amber for pending or warning states */
  
  --danger-text: #B91C1C;    
  --danger-bg: #FEE2E2;      /* Soft red for errors, destructive actions */

  --info-text: #4338CA;
  --info-bg: #E0E7FF;        /* Indigo accent for system notices or selections */
}
```

---

## 4. Layout & Grid Architecture

### 4.1 Spacing Scale (4px Base Unit)
All paddings, margins, and gaps must follow strict multiples of 4px to maintain rhythm and density:
*   `2px` (Micro spacing, tag paddings)
*   `4px` (`space-1`)
*   `8px` (`space-2`)
*   `12px` (`space-3`)
*   `16px` (`space-4` - Standard component padding)
*   `24px` (`space-6` - Section padding)
*   `32px` (`space-8` - Large gaps)

### 4.2 Bento Box Layout Rules
*   For dashboards and portfolios, use CSS Grid (`display: grid`) with explicit column templates and strict gaps (`16px` or `24px`).
*   Cards must not have heavy drop shadows. Instead, rely on a clean 1px border (`1px solid var(--border-subtle)`) combined with a flat white background (`var(--bg-surface)`).
*   Border radius across cards and containers must be consistent: `8px` to `12px` maximum. Sharp enough to look professional, soft enough to feel approachable.

---

## 5. Component Specifications

### 5.1 Tables (Data-Dense Views)
*   **Header:** Height `36px`, background `var(--bg-app)`, text in uppercase 10px bold, color `var(--text-secondary)`.
*   **Rows:** Height `44px`, bottom border `1px solid var(--border-subtle)`. No vertical borders.
*   **Data Alignment:** Text columns left-aligned; numerical data, dates, and currency right-aligned using the monospace font.
*   **Hover:** Row background transitions to `var(--bg-subtle)` over 150ms.

### 5.2 Badges & Pills (Status Indicators)
*   Height: `20px` to `22px`.
*   Padding: `2px 8px`.
*   Font: Monospace, `10px`, Medium weight.
*   Shape: Fully rounded (`border-radius: 9999px`).
*   Must always use matching semantic background and text colors (e.g., success background with success text).

### 5.3 Buttons & Interactive Elements
*   **Primary Button:** Background `var(--text-primary)`, text `var(--text-inverse)`, height `32px` (dense) or `36px` (standard), font-size `12px`, border-radius `6px`. Hover state darkens slightly or scales opacity.
*   **Ghost Button:** Transparent background, 1px border `var(--border-subtle)`, text `var(--text-primary)`. On hover, background shifts to `var(--bg-subtle)`.
*   **Inputs:** Height `32px`, font-size `12px`, background `var(--bg-surface)`, border `1px solid var(--border-subtle)`, border-radius `6px`. Focus state adds `box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15)` and `border-color: var(--border-focus)`.

---

## 6. Motion & Micro-Interactions

Even though the UI is dense and technical, it must feel high-end and fluid.
*   **Transitions:** Use fast, smooth cubic-bezier curves for state changes: `transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);`.
*   **Page / Section Entrance:** Implement staggered fade-up animations (opacity `0 -> 1`, transform `translateY(8px) -> translateY(0)`) over 300ms using CSS keyframes or lightweight JS hooks (compatible with GSAP).
*   **Interactive Feedback:** Never allow abrupt state switches. Every click or toggle must provide immediate visual feedback (e.g., active tab indicator sliding or fading smoothly).

---

## 7. Agent Checklist for Code Generation

When generating any UI component or webpage, the agent must verify:
1. [ ] Are all numerical values, table stats, and code tags rendered in JetBrains Mono / monospace?
2. [ ] Is the body font size set strictly to `12px` with a `1.4` line-height?
3. [ ] Are cards styled with subtle 1px borders (`var(--border-subtle)`) instead of heavy shadows?
4. [ ] Is the spacing scale locked strictly to multiples of 4px?
5. [ ] Are status indicators using rounded pill badges with low-saturation pastel backgrounds?
