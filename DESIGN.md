---
version: alpha
name: yt-chaptered-design-tokens
description: "Design token architecture and visual guidelines for ytChaptered. The design system pairs a deep pine green primary accent (#0d5c46) with warm stone neutrals in light (#fafaf9 canvas) and dark (#0c0a09 background) modes. Typography uses Inter with tabular numbers for timestamps and 12 px rounded corner geometry."

colors:
  primary: "#0d5c46"
  primary-hover: "#0a4635"
  on-primary: "#ffffff"
  accent: "#10b981"
  ink: "#1c1917"
  ink-soft: "#292524"
  ink-mid: "#44403c"
  body: "#57534e"
  body-mid: "#78716c"
  mute: "#e7e5e4"
  mute-light: "#f5f5f4"
  canvas: "#fafaf9"
  canvas-soft: "#ffffff"
  dark-canvas: "#0c0a09"
  dark-canvas-soft: "#1c1917"
  dark-foreground: "#f5f5f4"
  dark-border: "#292524"

typography:
  display-xl:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 48px
    fontWeight: 700
    lineHeight: 52px
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 36px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.01em
  display-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
  body-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  caption:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  micro:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 10px
    fontWeight: 600
    lineHeight: 14px
  button-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
  button-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px

rounded:
  none: 0px
  input: 6px
  btn: 12px
  card: 12px
  modal: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px

components:
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "{spacing.md} {spacing.xl}"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.btn}"
    padding: "{spacing.md} {spacing.lg}"
  button-secondary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.btn}"
    padding: "{spacing.md} {spacing.lg}"
  button-tertiary:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.mute}"
    typography: "{typography.button-md}"
    rounded: "{rounded.btn}"
    padding: "{spacing.md} {spacing.lg}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.btn}"
    padding: "{spacing.sm} {spacing.md}"
  text-input:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.mute}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.input}"
    padding: "{spacing.md} {spacing.lg}"
  card-content:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.mute}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  modal-sheet:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.mute}"
    rounded: "{rounded.modal}"
    padding: "{spacing.xl}"
  badge-pill:
    backgroundColor: "{colors.mute-light}"
    textColor: "{colors.body}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xxs} {spacing.sm}"

  # ─── Examples and future pattern blocks ───
  ex-course-card:
    description: "Course thumbnail card with progress indicator, duration pill, and resume action."
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.mute}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
  ex-player-chapter-row:
    description: "Interactive chapter playlist row with completion checkbox, index, and tabular timestamp."
    backgroundColor: "transparent"
    activeBackgroundColor: "{colors.mute-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "{spacing.sm} {spacing.md}"
  ex-auth-profile-card:
    description: "User profile summary card for future account synchronization."
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.mute}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  ex-search-filter-bar:
    description: "Sticky search input with category filter chips."
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "{spacing.md}"
  ex-toast-notification:
    description: "Floating feedback notification card with icon indicator and drop shadow."
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.card}"
    padding: "{spacing.md} {spacing.lg}"
  ex-empty-state-frame:
    description: "Empty course library placeholder frame with centered icon and call to action."
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.3xl}"
---

## Design system foundations

ytChaptered pairs a deep pine green primary accent with warm stone neutrals across light and dark modes. The visual language emphasizes focus, high contrast, and tactile feedback during long video learning sessions. Every interface surface uses the Inter typeface family with tabular numbers for timestamps.

Component geometry standardizes on a 12&nbsp;px border radius (`{rounded.card}`, `{rounded.btn}`) for cards and buttons. Surfaces separate depth through hairline borders and gentle contrast rather than heavy drop shadows.

Key architectural pillars include:

- **Focused primary color**: Deep pine green (`#0d5c46`) anchors calls to action and active playback states.
- **Warm stone neutral scale**: Stone neutrals prevent eye fatigue in light mode (`#fafaf9`) and dark mode (`#0c0a09`).
- **Tactile feedback**: Interactive elements scale down slightly on click (`active:scale-98`) for physical feedback.
- **Accessible keyboard navigation**: Distinct high-contrast focus rings highlight interactive elements.

## Color system and theme tokens

The color system derives from semantic tokens defined in `app/globals.css`.

### Primary brand palette

The primary palette defines brand identity and interactive affordances across the application:

- **Primary green** (`--color-primary`, `#0d5c46`): Primary call to action (CTA) buttons, progress highlights, and focused inputs.
- **Primary hover** (`--color-primary-hover`, `#0a4635`): Hover and active states for primary controls.
- **Accent emerald** (`--color-accent`, `#10b981`): Success indicators, completed chapter checkboxes, and dark mode focus outlines.
- **On-primary white** (`--color-on-primary`, `#ffffff`): High-contrast text label color on primary button fills.

### Stone neutral hierarchy

Stone neutrals create soft contrast that avoids harsh glare during extended reading sessions:

- **Canvas** (`--color-canvas`, `#fafaf9`): Page canvas background in light mode (stone-50).
- **Canvas soft** (`--color-canvas-soft`, `#ffffff`): Pure white card containers, modal interiors, and dropdown panels.
- **Ink** (`--color-ink`, `#1c1917`): High-emphasis headings, titles, and active icons (stone-900).
- **Ink soft** (`--color-ink-soft`, `#292524`): Subheadings and prominent card labels (stone-800).
- **Ink mid** (`--color-ink-mid`, `#44403c`): Medium-emphasis icon buttons and secondary text (stone-700).
- **Body** (`--color-body`, `#57534e`): Default paragraph body copy (stone-600).
- **Body mid** (`--color-body-mid`, `#78716c`): Secondary metadata, timestamps, and chapter counts (stone-500).
- **Mute** (`--color-mute`, `#e7e5e4`): Default container borders and horizontal dividers (stone-200).
- **Mute light** (`--color-mute-light`, `#f5f5f4`): Subtle inset tracks and background chips (stone-100).

### Dark mode palette

Dark mode inverts surfaces to deep stone tones while preserving comfortable reading contrast:

- **Dark background** (`#0c0a09`): Deepest page background (stone-950).
- **Dark surface** (`#1c1917`): Elevated card containers and modal sheets (stone-900).
- **Dark border** (`#292524`): Subtle separation lines between sections (stone-800).
- **Dark foreground** (`#f5f5f4`): High-contrast text and primary headings (stone-100).
- **Dark muted text** (`#a8a29e`): Secondary descriptions and timestamp metadata (stone-400).

### Semantic status tokens

Semantic cues guide completion and validation states:

- **Success**: Emerald green (`#10b981`) indicates completed chapters and successful library imports.
- **Warning**: Amber (`#f59e0b`) flags missing timestamps or network timeouts.
- **Danger**: Red (`#ef4444`) highlights course deletion confirmations and parsing errors.

## Typography system

Typography organizes information through strict weight and scale boundaries.

### Font family and optical features

The application standardizes on the Inter typeface family across display headings, interfaces, and body copy:

```css
font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
font-feature-settings: "cv02", "cv03", "cv04", "cv11";
```

The feature settings activate open digits and disambiguated punctuation marks for readable playback controls.

### Typographic scale and hierarchy

The type scale structures visual priority from display headers to micro badges:

| Token | Size | Weight | Line Height | Tracking | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 48px | 700 | 52px | -0.02em | Hero headline on desktop landing. |
| `{typography.display-lg}` | 36px | 700 | 40px | -0.02em | Page titles and modal hero banners. |
| `{typography.display-md}` | 24px | 600 | 32px | -0.01em | Shelf titles and section headers. |
| `{typography.display-sm}` | 20px | 600 | 28px | -0.01em | Course card titles and dialog headers. |
| `{typography.body-lg}` | 18px | 400 | 28px | 0 | Lead overview paragraphs. |
| `{typography.body-md}` | 16px | 400 | 24px | 0 | Default body text and form inputs. |
| `{typography.body-sm}` | 14px | 400 | 20px | 0 | Chapter checklist titles and navigation items. |
| `{typography.caption}` | 12px | 500 | 16px | 0 | Author subtitles and chapter counters. |
| `{typography.micro}` | 10px | 600 | 14px | 0 | Duration tags and pill badges (`--text-2xs`). |
| `{typography.button-md}` | 14px | 600 | 20px | 0 | Primary and secondary button labels. |
| `{typography.button-sm}` | 12px | 600 | 16px | 0 | Compact action chips and icon labels. |

### Numeric formatting and timestamps

Use the `.font-tnum` utility on all chapter timestamps and elapsed counters to prevent layout shifts:

All duration strings (`01:23:45`) use tabular digits so numbers align vertically across chapter lists.

## Surface elevation and borders

Surfaces establish hierarchy through hairline borders and background tone shifts instead of heavy blur shadows.

### Elevation levels

Use these elevation steps across application layers:

| Level | Treatment | Application |
|---|---|---|
| Level 0 (Flat) | No shadow, no border. | Main page canvas in light mode (`#fafaf9`) and dark mode (`#0c0a09`). |
| Level 1 (Bordered card) | 1&nbsp;px border with `shadow-xs`. | Course cards, shelf carousels, and input containers. |
| Level 2 (Elevated drawer) | 1&nbsp;px border with `shadow-md`. | Sticky header navbar, dropdown menus, and popover panels. |
| Level 3 (Modal overlay) | Backdrop blur (`backdrop-blur-md`) with `shadow-2xl`. | Video addition dialog, delete confirmation dialog, and install sheets. |

### Corner radius scale

Standardize corner rounding using these values:

| Token | Value | Tailwind Class | Application |
|---|---|---|---|
| `{rounded.none}` | 0px | `rounded-none` | Full-bleed video iframe container. |
| `{rounded.input}` | 6px | `rounded-md` | URL inputs, timestamp textareas, and code blocks (`--radius-input`). |
| `{rounded.btn}` | 12px | `rounded-xl` | Buttons, action controls, and interactive chips (`--radius-btn`). |
| `{rounded.card}` | 12px | `rounded-xl` | Course cards, shelf frames, and status cards (`--radius-card`). |
| `{rounded.modal}` | 16px | `rounded-2xl` | Desktop modal dialogs and mobile bottom sheets. |
| `{rounded.pill}` | 9999px | `rounded-full` | Duration badges, progress pill tracks, and tag filters. |
| `{rounded.full}` | 9999px | `rounded-full` | Circular icon buttons and user avatar frames. |

## Layout and responsive guidelines

Spacing and sizing follow consistent multiples of 4&nbsp;px.

### Spacing scale

Use standard Tailwind spacing tokens for predictable margins and padding:

- **Base unit**: 4&nbsp;px.
- **Tokens**: `{spacing.xxs}` 2&nbsp;px · `{spacing.xs}` 4&nbsp;px · `{spacing.sm}` 8&nbsp;px · `{spacing.md}` 12&nbsp;px · `{spacing.lg}` 16&nbsp;px · `{spacing.xl}` 24&nbsp;px · `{spacing.2xl}` 32&nbsp;px · `{spacing.3xl}` 48&nbsp;px · `{spacing.4xl}` 64&nbsp;px.
- **Section rhythm**: Page sections use `{spacing.2xl}` (32&nbsp;px) to `{spacing.4xl}` (64&nbsp;px) vertical padding.
- **Card interior**: Cards use `{spacing.lg}` (16&nbsp;px) to `{spacing.xl}` (24&nbsp;px) internal padding.

### Viewport breakpoints

Responsive layouts adapt across these screen widths:

| Token | Width | Key Layout Changes |
|---|---|---|
| Mobile (`base`) | < 480px | Single-column view, bottom mobile tab bar, and sticky video on top. |
| Extra small (`xs`) | 480px | Input cards and modal containers expand padding. |
| Small (`sm`) | 640px | Course shelf shifts into 2-column grid and dialogs center on screen. |
| Medium (`md`) | 768px | Course shelf expands to 3 columns and player displays side-by-side. |
| Large (`lg`) | 1024px | Player view splits into 60% video stage and 40% chapter playlist. |
| Extra large (`xl`) | 1280px | Maximum container width (`max-w-7xl`) centers with gutters. |

### Touch target dimensions

Interactive controls meet accessibility standards for finger and pointer navigation:

Buttons and list items provide at least 40&nbsp;px to 48&nbsp;px vertical touch height (`min-h-10`, `min-h-11`) with generous tap areas.

## Core component specifications

Components compose design tokens into modular interface patterns.

### Button variants

Buttons use 12&nbsp;px rounded corners and tactile press scaling (`active:scale-98`):

- **Primary button**: Deep pine green (`bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl min-h-10 px-4 shadow-xs`).
- **Secondary button**: High-contrast stone (`bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 rounded-xl min-h-10 px-4`).
- **Tertiary outline**: Outlined stone (`bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl min-h-10 px-4`).
- **Ghost icon button**: Transparent icon button (`text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg min-h-10 min-w-10`).

### Input fields and forms

Inputs provide clear borders and high-visibility focus outlines:

- **Text input**: Single-line URL field (`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md px-3.5 py-2.5 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary`).
- **Textarea**: Expandable timestamp area (`font-mono text-xs leading-relaxed border border-stone-200 dark:border-stone-800 rounded-md p-3`).

### Course cards and carousels

Course cards highlight thumbnail artwork, title hierarchy, and learning progress:

- **Thumbnail container**: 16:9 aspect ratio with rounded-t-xl corners and dark gradient overlay.
- **Duration badge**: Pill overlay (`bg-black/75 text-white text-2xs font-mono font-medium rounded-full px-2 py-0.5`).
- **Title and author**: Two-line clamped title in font-semibold with secondary author subtitle.
- **Progress bar**: 6&nbsp;px track (`bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden`) with emerald fill (`bg-primary dark:bg-emerald-500`).
- **Resume button**: Compact action button navigating directly to the last played chapter.

### Video player and chapter checklist

The watch route organizes video playback and lesson progress side by side:

- **Player stage**: 16:9 YouTube iframe container with smooth corner framing on desktop.
- **Chapter list row**: Row container with completion checkbox, index numeral, chapter title, and tabular timestamp.
- **Active chapter state**: Highlighted with primary tint (`bg-primary/5 dark:bg-primary/10`) and green text (`text-primary dark:text-emerald-400`).
- **Completed chapter state**: Checkbox checked with emerald check icon and title displayed in muted strike-through style.

### Modals and bottom sheets

Modals adapt between mobile sheets and centered desktop dialogs:

- **Backdrop**: Translucent black overlay (`bg-black/50 backdrop-blur-xs`) with scroll locking.
- **Desktop dialog**: Centered container with 16&nbsp;px radius (`rounded-2xl max-w-lg shadow-2xl`).
- **Mobile sheet**: Bottom sheet with 16&nbsp;px top radius (`rounded-t-2xl items-end max-h-modal`).
- **Close button**: Top-right ghost button with focus trap and Escape key listener.

### Navigation headers and mobile tabs

Navigation persists across routes with minimal visual interference:

- **Top navbar**: Sticky header (`bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800`).
- **Brand mark**: Logo icon container (`rounded-lg sm:rounded-xl shadow-xs`) with bold typography.
- **Mobile tab bar**: Bottom navigation on mobile devices (`h-16 border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md`).

## Future pattern specifications

These specifications guide features planned for upcoming milestones.

### User profile and authentication cards

Use these patterns when adding user accounts and cloud sync:

- **Profile summary card**: Frame with user avatar circle, display name in `{typography.display-sm}`, email subtitle, and sync status chip.
- **Sync status indicator**: Pill badge with pulsing dot showing offline mode (`bg-amber-500/10 text-amber-600`) or synchronized state (`bg-emerald-500/10 text-emerald-600`).
- **Authentication modal**: Dialog housing Google or email login buttons using standard secondary button chrome.

### Course search and filter bars

Use these patterns when expanding library search:

- **Search input**: Full-width search bar with magnifying glass icon and clear button.
- **Filter chips row**: Horizontally scrollable row of category pills (`rounded-full px-3 py-1 text-xs border border-stone-200 dark:border-stone-800`).
- **Active filter chip**: Selected chip using `{colors.primary}` fill with white text.

### Toast feedback notifications

Use these patterns for transient action feedback:

- **Toast container**: Floating card positioned at bottom-right on desktop and top-center on mobile.
- **Chrome**: Dark fill (`bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900`) with 12&nbsp;px radius and medium drop shadow.
- **Icon indicator**: Checkmark icon for export success, or warning icon for import errors.

### Empty state placeholders

Use these patterns when course shelves or search results have no items:

- **Illustration frame**: Centered container with soft neutral background (`bg-stone-100 dark:bg-stone-800/50 rounded-2xl p-8`).
- **Content stack**: Outline vector icon, clear heading in `{typography.display-sm}`, and explanation text under 20 words.
- **Action button**: Primary CTA button to create a course or paste a YouTube URL.

## Motion and transitions

Motion guides user attention without introducing distracting delay.

### View transitions

The application integrates the native View Transitions API for seamless layout continuity:

- **Card to player transition**: Course card thumbnails morph into player headers using `::view-transition-group(continue-watching-hero)`.
- **Timing curve**: Transitions run for 250&nbsp;ms using cubic-bezier curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Reduced motion**: Honor user accessibility settings by disabling animations under `@media (prefers-reduced-motion: reduce)`.

### Entrance animations

Modals and dropdowns animate in using lightweight CSS keyframe utilities:

- **Fade in**: Opacity animates from 0 to 1 over 150&nbsp;ms.
- **Slide up**: Vertical translation slides from 12&nbsp;px below into resting position.

## Implementation rules

Follow these rules when writing styles and building components.

### Recommended patterns

Follow these guidelines for visual consistency:

- Use canonical Tailwind CSS utility classes (`bg-stone-50`, `text-stone-900`, `border-stone-200`, `rounded-xl`, `min-h-10`).
- Use design tokens declared in `@theme` in `app/globals.css` (`bg-primary`, `hover:bg-primary-hover`, `text-primary`, `text-2xs`).
- Use the `.font-tnum` utility on all video timestamps and time counters.
- Configure Lucide icon properties through native component props (`<Check className="w-3.5 h-3.5" strokeWidth={2.5} />`).
- Pair primary pine green buttons with high-contrast white text (`text-white`).

### Prohibited patterns

Avoid these anti-patterns in application styles:

- Do not use arbitrary square-bracket syntax for colors, dimensions, or radii (`bg-[#0d5c46]`, `rounded-[12px]`).
- Do not render primary action buttons as pills because buttons require 12&nbsp;px rounded rectangles.
- Do not use pure black text or cool grey borders in light mode.
- Do not use em dashes or hyphens as punctuation in prose.
- Do not skip touch target padding on mobile buttons.
