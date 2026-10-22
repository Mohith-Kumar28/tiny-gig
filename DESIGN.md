---
name: TinyGig
description: A khata for paid posting work. A register of accounts and of money owed, settled weekly by UPI.
colors:
  khata-red: "oklch(0.5 0.19 25)"
  khata-red-foreground: "oklch(0.985 0.01 30)"
  ledger-cloth: "oklch(0.36 0.12 22)"
  ledger-cloth-foreground: "oklch(0.96 0.02 40)"
  sidebar-cloth: "oklch(0.34 0.115 22)"
  sidebar-cloth-accent: "oklch(0.41 0.13 23)"
  ballpoint-ink: "oklch(0.46 0.2 264)"
  ballpoint-ink-foreground: "oklch(0.985 0.005 260)"
  ledger-ruling: "oklch(0.6 0.12 255 / 0.16)"
  ledger-paper: "oklch(0.986 0.004 250)"
  page-white: "oklch(0.997 0.002 250)"
  carbon: "oklch(0.2 0.02 265)"
  carbon-muted: "oklch(0.47 0.02 262)"
  paper-shade: "oklch(0.955 0.007 255)"
  paper-accent: "oklch(0.948 0.012 258)"
  hairline: "oklch(0.895 0.01 258)"
  field-edge: "oklch(0.86 0.012 258)"
  settled-green: "oklch(0.5 0.13 155)"
  amber-hold: "oklch(0.76 0.15 78)"
  amber-hold-foreground: "oklch(0.26 0.06 65)"
  trouble-red: "oklch(0.55 0.22 30)"
typography:
  display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.9rem, 7.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 112"
  figure:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
    fontFeature: "'tnum' 1, 'lnum' 1"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.02rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "'lnum' 1"
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 78"
  stamp:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 82"
  reference:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  stamp: "3px"
  md: "4px"
  lg: "6px"
spacing:
  cell-y: "14px"
  cell-x: "16px"
  panel: "20px"
  page-phone: "16px"
  page-tablet: "24px"
  page-desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.khata-red}"
    textColor: "{colors.khata-red-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.paper-accent}"
  button-ghost-hover:
    backgroundColor: "{colors.paper-accent}"
    textColor: "{colors.carbon}"
  button-link:
    textColor: "{colors.ballpoint-ink}"
  input:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "{spacing.panel}"
  stat-cell:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.carbon}"
    typography: "{typography.figure}"
    padding: "14px 16px"
  stamp-carbon:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.carbon}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    height: "22px"
    padding: "0 6px"
  stamp-settled:
    textColor: "{colors.settled-green}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    height: "22px"
    padding: "0 4px"
  stamp-info:
    textColor: "{colors.ballpoint-ink}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    height: "22px"
  nav-sidebar:
    backgroundColor: "{colors.sidebar-cloth}"
    textColor: "{colors.ledger-cloth-foreground}"
  nav-sidebar-active:
    backgroundColor: "{colors.khata-red-foreground}"
    textColor: "{colors.ledger-cloth}"
  nav-bottom-active:
    textColor: "{colors.khata-red}"
---

> **Note (2026-10-23):** The visual theme was reverted to the warm tangerine shadcn look (see src/styles.css). Colour, font and radius rules below are out of date; the content and behaviour rules still apply.

# Design System: TinyGig

## Overview

**Creative North Star: "The Bahi-Khata"**

TinyGig is laid out as a kirana shop's red-bound ledger: a register of accounts and of money owed, closed out every Monday. Red cloth binds the book as a full, flat field: the admin sidebar, the worker's phone header, the balance plate, the marketing header band. Inside is cool white ledger paper with faint ballpoint-blue ruling, carbon-black type, and blue ink for anything that feels handwritten or clickable. The rupee column is the interface. Amounts sit right-aligned in heavy, tabular figures, and their state shows in how they are ruled: a settled total gets the accountant's double rule and a cancelled amount is struck through, not erased.

Operate surfaces (the worker app at /w, the admin console at /admin) take the world's type, palette, density and its ruling grammar, and nothing theatrical. Panels are hairline-bordered and flat. Lists are ruled rows inside one panel rather than stacks of floating cards. Figures sit side by side in joined cells, like one row of a ledger. Persuade surfaces (landing, /how-it-works, /faq) are allowed one authored moment: the ruled ledger paper with its red margin rule, and an example week whose entries are "written in" before the total settles under a rotated PAID stamp.

The system rejects the gig-marketplace default of a cream ground, orange pill CTAs, tilted gig cards, equal bento tiles and numbered step cards.

**Key Characteristics:**
- Red cloth as a committed flat field, never a sprinkled accent.
- Cool ledger paper, carbon type, ballpoint-blue ink for links, focus and selection.
- One family, Archivo, used at three widths: expanded heavy display, normal UI text, condensed caps for column heads.
- Money is display-bold, tabular, right-aligned. State is drawn by rule pattern, and colour only reinforces it.
- Hairline borders, 4 to 6px corners, no card shadows.

## Colors

The palette is a bahi-khata: red ledger cloth, cool paper, ballpoint ink and carbon type. Dark mode keeps the same cloth over ink-black paper.

### Primary
- **Khata Red** (khata-red): primary actions, the logo tile, the active tab marker on the phone bar, unread counts, and the "something is waiting on you" tone of a stat. In dark mode it lifts to oklch(0.66 0.18 26).
- **Ledger Cloth** (ledger-cloth, sidebar-cloth): the deep binding red. It fills the admin sidebar, the worker's mobile header band and the balance plate, always as a whole flat field. Text on it is the warm paper tone (ledger-cloth-foreground). The active sidebar item inverts to a paper chip with cloth-red text.

### Secondary
- **Ballpoint Ink** (ballpoint-ink): links, focus rings, the text caret, selection (at 22%), the selected row marker in the review queue, the "info" stamp, unsaved-change dots, and handwritten-feeling lines like "Paid to UPI on Mon 20 Oct".

### Tertiary
- **Settled Green** (settled-green): settled states only (Approved, Paid, Live, Active), and always drawn with the double-rule stamp border.
- **Amber Hold** (amber-hold): states that wait on a person (Pending, Changes requested, Needs review), plus deadlines under 6 hours.
- **Trouble Red** (trouble-red): real trouble only. That means Rejected, Failed, Banned, destructive actions, deadlines under an hour, and the stroke of a struck-through amount.

### Neutral
- **Ledger Paper** (ledger-paper): the page ground.
- **Page White** (page-white): panels, cards, stat cells, inputs and outline buttons.
- **Carbon** (carbon): body and display type, and the border of the carbon stamp.
- **Carbon Muted** (carbon-muted): secondary text and condensed column heads.
- **Paper Shade / Paper Accent** (paper-shade, paper-accent): quiet fills, hover rows and the tab track.
- **Hairline** (hairline): every border and row rule. Form fields use the slightly firmer **Field Edge** (field-edge).
- **Ledger Ruling** (ledger-ruling): the faint blue line of ruled paper and the dashed row rules in the ledger sample.

### Named Rules
**The Cloth Field Rule.** Cloth red is laid as a whole field (a sidebar, a header band, a plate) or as a single primary action. It is never sprinkled as accent dots, borders or tinted tiles.

**The Money Is Never Red Rule.** An amount is never coloured trouble-red. A cancelled amount goes muted and gets a red strike-through, so the line carries the colour and the figure keeps the ink. Red text is for deadlines, errors and rejections, never for rupees.

**The Carbon Stamp Rule.** A state that sits with staff and has nothing wrong with it (Submitted, In review) is a carbon stamp: paper ground with a carbon border. Red is kept for real trouble.

## Typography

**Display Font:** Archivo Variable, expanded to 112% width (with ui-sans-serif, system-ui)
**Body Font:** Archivo Variable at normal width
**Label Font:** Archivo Variable condensed to 78% width, in caps
**Reference Font:** Geist Mono Variable, used only for references such as UTR numbers and URLs

**Character:** A single grotesque used at three widths, like a ledger's printed title, its body text and its ruled column heads. The width axis does the work that a second family would usually do.

### Hierarchy
- **Display** (800, clamp(2.9rem, 7.4vw, 6rem), 0.92): the marketing hero headline only. It may carry one double-ruled red underline on the key word.
- **Headline** (700, 1.6rem on phones to 1.85rem, 1.25): page titles in the app, set with balanced wrapping.
- **Figure** (700, 1.65rem, tabular): stat values and headline amounts. Ledger rows use the same face at 1.125rem.
- **Title** (700, 1.02rem): card and panel titles.
- **Body** (400, 0.875rem in the app and 1rem on inputs on phones): UI text. Descriptions max out around 42rem.
- **Label** (600, 0.72rem, 0.06em, uppercase, 78% width): column heads, definition-list terms, stat labels and section heads inside a panel.
- **Stamp** (600, 0.7rem, 0.04em, uppercase, 82% width): status stamps.

### Named Rules
**The Tabular Rupee Rule.** Every amount is set in the display face, bold, with tabular lining figures, and right-aligned when it sits in a list. Numbers are the interface.

**The Column Head Rule.** Condensed caps label a column, a field or a figure that follows directly. They are not decorative kickers above a headline.

## Layout

The app is a sidebar console on desktop and a phone app with a bottom tab bar for workers. Admin uses a collapsible cloth sidebar (icon rail when collapsed) with a sticky 52px paper header that blurs content behind it. On phones the worker app replaces the sidebar with the cloth header band and a 64px five-item bottom bar that respects the safe area. Content padding steps from 16px on phones to 24px and then 32px, with 24px of vertical padding. Panels pad 20px. Stat cells pad 14px by 16px.

Figures in a set sit in a joined grid with 1px hairline gutters inside a single 4px-cornered frame, typically 2 columns on phones and 4 on desktop. Lists are ruled rows (a 1px hairline between rows) inside one panel. The review console is a three-pane layout: queue, detail and a sticky action bar.

Marketing pages sit on ruled ledger paper: 2rem to 2.25rem blue ruling and a red margin rule (2px at 55%) whose position follows the content container. Small condensed dates and markers live left of the margin, and particulars live to the right.

**The One Panel Rule.** Related rows are ruled lines inside one panel, not a stack of separate cards.

## Elevation & Depth

The system is flat. Depth comes from the paper/page-white step, hairline borders and the cloth field, not from shadow. Cards, panels and stat cells have no shadow at all. Shadow appears only on things that genuinely float above the page: popovers, the mobile marketing menu, the bulk-action bar and sheets. The primary button carries a faint inset top highlight and a 1px warm drop, so it reads as a pressed-in key rather than a lifted card.

**The Flat Ledger Rule.** If it sits on the page, it has a hairline and no shadow. Only overlays cast one.

## Shapes

Corners are square-ish. Controls, cards, panels and stat frames use 4px. Empty states and floating bars use 6px. Stamps and count badges use 3px. The logo tile is a 32-unit square with a 6-unit corner. Full rounding is reserved for things that are actually round: avatars, unread dots, colour swatches and timeline nodes. Borders are 1px hairlines. The two exceptions carry meaning: the 3px double rule on settled totals and settled stamps, and the 2px red margin rule on ledger paper.

**The Rule Pattern Rule.** State is drawn by line. A pending amount is plain, a settled amount is double-ruled, and a cancelled amount is struck through. Colour only reinforces the line.

## Components

### Buttons
Firm, flat, and slightly pressed when clicked.
- **Shape:** gentle corner (4px). Default height 36px, small 32px, large 40px. Marketing CTAs are 40px or 48px.
- **Primary:** khata red with paper text, semibold. Hover drops to 92% opacity.
- **Hover / Focus:** 150ms colour transition (200ms with an ease-out curve on marketing CTAs). It moves down 1px when pressed. Focus shows a 3px ballpoint-ink ring at 50%.
- **Outline:** page white with a field-edge border, and a paper-accent fill on hover.
- **Ghost:** no fill until hover. **Link:** ballpoint ink, underlined on hover.
- **On cloth:** a "paper" CTA inverts to a paper fill with cloth-red text.

### Status stamps
Office stamps in condensed caps.
- **Style:** 22px tall, 3px corner, 1px border, faint tint of the tone, uppercase at 82% width.
- **Tones:** the carbon stamp is for "with staff". Ink is for in-progress and holds. Amber is for waiting on a person. Settled green carries a **3px double border** and is the only stamp with one. Trouble red is for rejected, failed and banned. Muted is for closed, expired and void.

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** page white on ledger paper.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 20px, with 20px gaps. Titles use the expanded display face at 1.02rem.

### Stat Grid
Figures set like the columns of one ledger row. Cells are joined by 1px hairline gutters inside one 4px frame. Each cell has a condensed-caps label, a display-bold tabular figure and an optional muted hint. There are no icons. The "attention" tone turns label and figure khata red. A linked cell washes with paper accent on hover. The worker balance plate is this pattern on cloth: the figure is double-ruled and the cells are divided by translucent paper rules.

### Inputs / Fields
- **Style:** page white, 1px field-edge border, 4px corner, 36px tall. Text is 16px on phones and 14px from tablet up.
- **Focus:** the border turns ballpoint ink, with a 3px ink ring at 50%. Selection is tinted ink.
- **Error / Disabled:** trouble-red border with a faint red ring; disabled drops to 50%.

### Navigation
- **Admin sidebar:** a full ledger-cloth field with warm paper text and condensed group labels. The active item is a paper chip with cloth-red text. Counts are 3px-cornered tabular badges that invert on the active row.
- **Worker phone:** a cloth header band with the inverse logo (paper tile, red t). The bottom bar is translucent paper with a top hairline and five items. The active item is khata red, with a 3px red bar along the top edge of its cell.
- **Selected row (review queue):** a faint ink wash with a 2px ink bar on the leading edge. This marks selection, not a callout.

### Ledger Paper (signature)
Marketing-only ruled paper: faint ballpoint ruling every 2 to 2.25rem and a red margin rule whose position is set per section. The example ledger sample on it has a date column, particulars, and a right-aligned rupee column. Rows have dashed ruling rules, the settled total is double-ruled, and the closing line reads "Paid to UPI" with a mono UTR reference.

### Empty states
These use a dashed hairline frame on half-strength page white with a 6px corner and a display-bold title. An optional icon can appear, but only as a small 20px muted glyph and never in a tile.

## Do's and Don'ts

### Do:
- **Do** set every amount in the display face, bold and tabular, right-aligned in lists, with a ₹ prefix.
- **Do** double-rule a settled total (3px double, in the text colour) and strike through a cancelled one (muted figure, 1.5px red strike).
- **Do** lay red cloth as a whole field (sidebar, phone header, balance plate, marketing band) or as the single primary action.
- **Do** use ballpoint ink for links, focus, selection and handwritten-feeling payment lines.
- **Do** put related rows inside one hairline panel as ruled lines, and set figures side by side in a joined Stat Grid.
- **Do** keep corners between 4px and 6px (3px for stamps and counts).
- **Do** keep app motion to state changes of 150 to 250ms, and honour reduced motion.
- **Do** write copy without em dashes, and write ranges with "to" ("L1 to L4", "2 to 3 days").

### Don't:
- **Don't** colour an amount red, in any state.
- **Don't** put a shadow on a card, panel or stat cell.
- **Don't** set icons in tinted tiles, add stat icons, or build callouts with a coloured side stripe.
- **Don't** use pill shapes for buttons, badges, stamps or counts. Full rounding is only for things that are actually round.
- **Don't** stack related rows as separate floating cards.
- **Don't** use condensed caps as a decorative kicker above a headline.
- **Don't** run choreographed entrance motion inside the app. The written-in ledger moment belongs to marketing pages only.
