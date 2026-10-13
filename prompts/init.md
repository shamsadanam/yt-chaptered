Build a local-first Next.js (App Router) application that turns long, timestamped YouTube videos into a chaptered playlist. The app runs completely on the user's local machine without third-party databases, cloud backends, or video re-hosting.

Divide the project into two distinct phases. Implement Phase 1 first.

---

### Design System & Visual Guidelines (`DESIGN.md`)

Follow the visual language and tokens specified in `DESIGN.md`:
- **Palette**:
  - Primary CTA accent: `#ff4f00` (Zapier orange)
  - Dark coffee ink: `#201515` for primary text and headings
  - Warm neutrals: `#fffefb` (canvas page background), `#f8f4f0` (canvas-soft card/inset background), `#605d52` (body text), `#c5c0b1` (mute / borders)
  - Do not use cool greys, pure white (`#ffffff`), or pure black (`#000000`).
- **Typography**:
  - Hero / display headlines: `Degular Display` (or `Inter` / `Mona Sans` weight 500 fallback).
  - Sub-displays, body, buttons, and metadata: `Inter`.
  - Sentence-case display headlines (never uppercase displays); uppercase tracked labels only on eyebrows (`1px` tracking at 14px).
- **Shapes & Radii**:
  - Canonical button & card border radius: `12px` (`rounded-xl` / `rounded.md`). Buttons are rounded rectangles, not pills.
  - Inputs & chips: `6px` (`rounded-sm`).
- **Components & Layout**:
  - Clean card-based surfaces with warm-cream backgrounds (`#f8f4f0`), 1px coffee or mute hairline borders when framed, and 48px touch-friendly targets.
  - Primary actions styled with `#ff4f00` background and warm white (`#fffefb`) text.

---

### Phase 1: Core URL-to-Playlist Player (Build This First)

#### 1. Homepage & Input View (`app/page.tsx`)

- Minimalist hero interface: A clean, distraction-free landing page with a central input card following `DESIGN.md` styling (warm cream surface `#f8f4f0`, 12px rounded borders, coffee ink typography).
- URL Input: A prominent input field to paste any YouTube link (`youtube.com/watch?v=...`, `youtu.be/...`, or `youtube.com/embed/...`).
- Description / Timestamps Fallback Area:
  - An expandable text area (e.g., "Paste Description / Timestamps here") so the user can paste the video description directly if automated fetching is unavailable.
  - Optional settings drawer/modal: Allow inputting a personal YouTube Data API v3 key so users who provide one can fetch the video title and description automatically with one click.
- "Generate Playlist" action button: Primary button styled with `#ff4f00` that parses the inputs and loads the player view.

#### 2. Architecture, Hooks & Utilities

- Client-Side Isolation:
  - Mark player and interactive components with `'use client'`.
  - Dynamically load the YouTube IFrame API script or use a standard React YouTube wrapper to prevent SSR hydration mismatches (`window is not defined`).
- `lib/youtubeParser.ts` (or custom hook):
  - Extract the standard YouTube Video ID from standard, short, and embed URLs.
  - Robust regex parsing for timestamps in all common formats (`H:MM:SS`, `HH:MM:SS`, and `MM:SS`) along with their adjacent chapter titles.
  - Compute chapter boundaries: chapter `N` ends when chapter `N+1` starts. The final chapter plays through the video end.
- `hooks/useYouTubePlayer.ts`:
  - Manage YouTube IFrame player instance lifecycle, current time tracking, active chapter index, seeking, and playback state.

#### 3. Player & Playlist View

- Layout: 2-column layout on desktop (responsive stack on mobile):
  - Main / Left: Embedded player utilizing the official YouTube IFrame Player API.
  - Sidebar / Right: Interactive playlist list displaying chapter indices, titles, and formatted start timestamps styled with `DESIGN.md` tokens.
- Playback & Navigation:
  - Clicking any chapter seeks the embedded player to that exact timestamp and starts playback.
  - Visually highlight the currently active chapter in the sidebar using warm coffee/accent indicator states.
  - Auto-advance: Listen to the player's time/state changes so when a chapter boundary ends, the player seamlessly starts the next chapter in the queue.
- "Load Another Video" button in the navigation bar to reset or return to the home input view.

---

### Phase 2: Course Progression, Local Persistence & PWA (Deferred)

Do not implement these in Phase 1; structure Phase 1 data models (TypeScript types/interfaces) and responsive mobile layouts so they integrate cleanly later:

1. **Course Progress Tracking:**
   - Mark chapters as "In Progress" or "Completed" (auto-check at ≥90% segment watch time, plus manual toggle checkboxes).
   - Overall course completion percentage bar (e.g., "6 / 15 chapters completed • 40%").
2. **Local Storage & History:**
   - Persist parsed playlists and watch history in the browser's `localStorage` or `IndexedDB`.
   - Resume playback: Remember the last watched chapter and exact timestamp per video.
   - Homepage "Saved Courses / History" shelf to quickly resume previously parsed videos.
3. **Data Portability:**
   - Export and import all course progress as a local JSON file.
4. **Mobile PWA Capability:**
   - At a later stage, the application will be configured as a Progressive Web App (PWA) for mobile use (manifest, service worker / offline shell, mobile-first responsive viewport, and installability). Ensure mobile responsive design, touch targets (≥48px), and layout structure are mobile-friendly from the start.
