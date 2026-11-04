# Code Review Remediation Plan

This plan addresses findings from the two-axis code review between commit `01e2527` and `HEAD`. Phases are ranked from **Highest Recommendation** to **Low**, with **Decisions Needed** resolved based on user alignment.

---

## Phase 1: Standards Compliance & Shared Utilities (Highest Recommendation)

*Low risk, high code-health impact. Eliminates duplicate logic, cleans up dead code, and restores design token consistency.*

### 1.1 Canonical Design Tokens & Styling
- **[MODIFY] [`components/SearchModal.tsx`](file:///Users/anam/Projects/yt-chaptered/components/SearchModal.tsx)**:
  - Replace arbitrary `max-h-[85dvh]` on modal dialog container with canonical utility `max-h-modal` (declared in [`app/globals.css`](file:///Users/anam/Projects/yt-chaptered/app/globals.css#L52)).
  - Replace `sm:rounded-xl` with `sm:rounded-2xl` matching `{rounded.modal}` from [`DESIGN.md`](file:///Users/anam/Projects/yt-chaptered/DESIGN.md) and [`AddCourseModal.tsx`](file:///Users/anam/Projects/yt-chaptered/components/AddCourseModal.tsx).
  - Standardize duration badge styling to canonical pill tokens: replace `text-xs px-1.5 py-0.5 rounded` with `text-2xs font-mono font-tnum px-2 py-0.5 rounded-full bg-black/85 text-white`.

### 1.2 Comments Rule Enforcement ("Comment the why, never the what")
- Clean up restatement headers, parameter narration, and obvious JSX section comments per [`AGENTS.md`](file:///Users/anam/Projects/yt-chaptered/AGENTS.md):
  - **[MODIFY] [`components/FullscreenOverlay.tsx`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx)**: Remove redundant comment blocks (e.g., `// Drawer and menu toggles`, `// Scrubber hover state`, `// Overall course progress`, `// Keyboard navigation inside fullscreen`).
  - **[MODIFY] [`components/SearchModal.tsx`](file:///Users/anam/Projects/yt-chaptered/components/SearchModal.tsx)**: Remove restatements (e.g., `// Selected video for the Preview Drawer`, `// Focus trap and keyboard listeners`, `/* View Mode 2: Chapter Preview Drawer */`).
  - **[MODIFY] [`app/page.tsx`](file:///Users/anam/Projects/yt-chaptered/app/page.tsx)** & **[MODIFY] [`app/watch/[id]/WatchClient.tsx`](file:///Users/anam/Projects/yt-chaptered/app/watch/[id]/WatchClient.tsx)**: Remove keyboard handler narration comments.

### 1.3 Dead Code & Message Chains
- **[MODIFY] [`types/search.ts`](file:///Users/anam/Projects/yt-chaptered/types/search.ts)**: Remove unused speculative properties `channelId?: string;` and `durationSeconds?: number;` from `YouTubeSearchResultItem`.
- **[MODIFY] [`app/api/protected/youtube-search/route.ts`](file:///Users/anam/Projects/yt-chaptered/app/api/protected/youtube-search/route.ts)**: Extract deep message-chain traversal (`vr.expandableMetadata?.expandableMetadataRenderer?.header?.collapsedTitle?.runs`) into a typed helper function `getExpandableMetadataTitle(vr: InnertubeVideoRenderer): string | undefined`.

### 1.4 Extract Shared Global Search Hook (`useSearchShortcut`)
- **[NEW] [`hooks/useSearchShortcut.ts`](file:///Users/anam/Projects/yt-chaptered/hooks/useSearchShortcut.ts)**:
  Extract the identical `⌘K` / `Ctrl+K` and `/` keydown handler duplicated between `app/page.tsx` and `app/watch/[id]/WatchClient.tsx`:
  ```ts
  export function useSearchShortcut(onOpen: () => void, onToggle?: () => void) {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          onToggle ? onToggle() : onOpen();
          return;
        }
        if (
          e.key === '/' &&
          !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
        ) {
          e.preventDefault();
          onOpen();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onOpen, onToggle]);
  }
  ```
- **[MODIFY] [`app/page.tsx`](file:///Users/anam/Projects/yt-chaptered/app/page.tsx)** & **[MODIFY] [`app/watch/[id]/WatchClient.tsx`](file:///Users/anam/Projects/yt-chaptered/app/watch/[id]/WatchClient.tsx)**: Replace manual listeners with `useSearchShortcut`.

### 1.5 Extract Shared Bounded In-Memory Cache Utility (`lib/cache.ts`)
- **[NEW] [`lib/cache.ts`](file:///Users/anam/Projects/yt-chaptered/lib/cache.ts)**:
  Extract reusable, typed in-memory FIFO TTL cache:
  ```ts
  export class MemoryCache<T> {
    private store = new Map<string, { value: T; expiresAt: number }>();
    private lastCleanup = Date.now();
    constructor(private maxSize = 5000, private cleanupIntervalMs = 60_000) {}

    get(key: string): T | null { /* TTL check & evict */ }
    set(key: string, value: T, ttlMs: number): void { /* FIFO cap & insert */ }
    has(key: string): boolean { /* check valid */ }
    delete(key: string): void { this.store.delete(key); }
  }
  ```
- **[MODIFY] [`lib/turnstile.ts`](file:///Users/anam/Projects/yt-chaptered/lib/turnstile.ts)** & **[MODIFY] [`app/api/protected/youtube-search/route.ts`](file:///Users/anam/Projects/yt-chaptered/app/api/protected/youtube-search/route.ts)**: Replace duplicated store/cleanup boilerplate with `MemoryCache`.

---

## Phase 2: Fullscreen Architecture & Controls Refactor (Highly Recommended)

*Eliminates the 1,032-line monolithic component, resolves the 25-prop Data Clump, fixes Escape key fullscreen trapping, and clarifies caption state.*

### 2.1 Escape Key Dismissal Logic
- **[MODIFY] [`components/FullscreenOverlay.tsx`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx)**:
  - Do NOT call `e.preventDefault()` when closing internal overlay drawers (speed menu, chapter drawer) on Escape. Allow browser default behavior so Escape gracefully closes overlay drawers without trapping the user from exiting native fullscreen.

### 2.2 Player Controller Props Refactoring (Resolve Data Clump)
- **[NEW] [`types/player.ts`](file:///Users/anam/Projects/yt-chaptered/types/player.ts)**:
  Group playback states and controls into structured interfaces:
  ```ts
  export interface PlayerPlaybackState {
    isPlaying: boolean;
    isPlayLoading: boolean;
    isReady: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
    volume: number;
    isMuted: boolean;
    isCaptionsEnabled: boolean;
  }

  export interface PlayerPlaybackActions {
    play: () => void;
    pause: () => void;
    seekToTime: (seconds: number) => void;
    seekBy: (deltaSeconds: number) => void;
    setPlaybackRate: (rate: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleCaptions?: () => void;
  }
  ```
  Reduce [`FullscreenOverlayProps`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx#L27-L55) from 25 individual properties to `{ playerState, playerActions, playlist, activeChapter, ... }`.

### 2.3 Decompose FullscreenOverlay into Sub-Components
- **[NEW] [`components/fullscreen/FullscreenChapterDrawer.tsx`](file:///Users/anam/Projects/yt-chaptered/components/fullscreen/FullscreenChapterDrawer.tsx)**:
  Extract chapter drawer with chapter search input, filter chips, chapter progress bar, and completion checkbox buttons.
- **[NEW] [`components/fullscreen/FullscreenBottomBar.tsx`](file:///Users/anam/Projects/yt-chaptered/components/fullscreen/FullscreenBottomBar.tsx)**:
  Extract timeline scrubber (with thumbnail preview tooltip, chapter dividers), transport controls (skip, seek ±10s, play/pause), volume slider popover, speed menu, and fullscreen exit button.
- **[MODIFY] [`components/FullscreenOverlay.tsx`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx)**:
  Becomes a clean layout orchestrator handling visibility auto-hide timeouts, cursor hiding, and top-level hotkeys.

### 2.4 Captions (CC) Handling & Fallback State
- **[MODIFY] [`hooks/useYouTubePlayer.ts`](file:///Users/anam/Projects/yt-chaptered/hooks/useYouTubePlayer.ts)** & **[MODIFY] [`components/FullscreenOverlay.tsx`](file:///Users/anam/Projects/yt-chaptered/components/FullscreenOverlay.tsx)**:
  - YouTube IFrame API's programmatic `loadModule('captions')` is restricted across player embeddings.
  - Implement reliable detection: if caption module fails to load or return tracklist, display an informative tooltip indicating captions are controlled via the YouTube player's native CC icon, avoiding user confusion when clicking an unresponsive overlay button.

---

## Phase 3: Mobile Navigation & Refinements (Medium Recommendation)

*Improves mobile navigation coherence and completes specified search requirements.*

### 3.1 Mobile Navigation 4th Search Tab (Resolved by User Alignment)
- **[MODIFY] [`components/MobileTabBar.tsx`](file:///Users/anam/Projects/yt-chaptered/components/MobileTabBar.tsx)**:
  - Add a dedicated 4th "Search" tab: `[Courses, Search, + Add, Playing]`.
  - Type update: `activeTab: 'history' | 'search' | 'create' | 'player'` with `onOpenSearch` trigger.
  - Maintains `min-h-12` touch accessibility and active state theme colors.

### 3.2 Search Rate Limiting Configuration
- **[MODIFY] [`app/api/protected/youtube-search/route.ts`](file:///Users/anam/Projects/yt-chaptered/app/api/protected/youtube-search/route.ts)** & **[MODIFY] [`lib/rateLimit.ts`](file:///Users/anam/Projects/yt-chaptered/lib/rateLimit.ts)**:
  - Export a shared configuration constant in `lib/rateLimit.ts` for search-specific rate limits.

---

## Phase 4: Resolved Decisions & Future Scope (Decisions Kept to Last)

1. **Search Flow UX — Keep Preview Drawer (Approved)**:
   - Keep the rich Chapter Preview Drawer inside `SearchModal`. It provides verified user value allowing chapter inspection before starting a course.
2. **Chapter Detection — Keep Snippet Scan + On-Demand Preview (Approved)**:
   - Continue using description snippet regex in search results and full `/youtube-info` fetching upon opening the Preview Drawer. Avoids unnecessary background `/next` API queries and rate limiting.
3. **Mobile PWA Install Visibility**:
   - Provide "Install ytChaptered" option in mobile navigation / header and About modal without blocking player controls with floating overlays.
4. **Progress Sync Roadmap Timing**:
   - Defer Google Drive / database cloud sync to a dedicated milestone after Phase 1–3 code cleanup.
