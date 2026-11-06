# Deep Architectural Research: IFrame Cross-Origin Boundaries, Double-Click Capture, and Fullscreen Mechanics

**Document Status**: Complete & Authoritative  
**Target File**: `docs/research/iframe-double-click-fullscreen.md`  
**Core Question Investigated**:  
> *"are you sure that double click inside iframe is locked for fullscreen ? or should i add an event ?"*

---

## 1. Executive Summary & Definitive Answer

### The Short Answer
1. **Yes, you are 100% correct that double-clicking directly inside the YouTube `<iframe>` is locked down by browser security.** You **cannot** attach a `dblclick` (or `click`) listener inside the cross-origin iframe, the parent document's `<iframe>` DOM element **never receives** mouse events when the pointer clicks inside the frame, and the YouTube IFrame Player API **does not expose** click or double-click events via `postMessage`.
2. **Furthermore, calling `requestFullscreen()` from the parent requires *Transient User Activation*.** Even if the parent window could detect that a user clicked inside the iframe (e.g. via `window.onblur`), the parent document does not possess user activation. Any programmatic call to `playerWrapperRef.requestFullscreen()` from an asynchronous or cross-frame notification will be rejected with `NotAllowedError`.
3. **Where you CAN and SHOULD add an event**: You should add the `onDoubleClick` event to the **"player white area"** (the unified playback controls & chapter card directly below the video, `<section className="bg-white ...">`) and the parent player wrapper margins. In the parent DOM, event dispatch and transient user activation operate with 100% reliability, without breaking native YouTube controls or triggering cross-origin security violations.

---

## 2. Primary Source Standards & Architecture

Every technical restriction observed in browser embeds is governed by explicit W3C and WHATWG specifications.

### A. Same-Origin Policy & Cross-Origin Objects
- **Primary Source**: [WHATWG HTML Living Standard § 7.2 Cross-origin objects](https://html.spec.whatwg.org/multipage/browsers.html#cross-origin-objects)
- When a document at origin $A$ (e.g., `http://localhost:3000` or `https://ytchaptered.com`) embeds an `<iframe>` loaded from origin $B$ (`https://www.youtube.com`), the browser enforces strict origin isolation:
  - `iframe.contentDocument` returns `null` or throws a `SecurityError` DOMException.
  - `iframe.contentWindow` returns a restricted `WindowProxy`. Under WHATWG § 7.2.3.1, the only properties accessible cross-origin are: `postMessage`, `closed`, `frames`, `length`, `location` (write-only), `opener`, `parent`, `self`, `top`, and `window`.
  - Calling `iframe.contentWindow.addEventListener(...)` throws:  
    `DOMException: Blocked a frame with origin "..." from accessing a cross-origin frame.`

### B. Event Dispatch Boundaries Across Browsing Contexts
- **Primary Source**: [WHATWG DOM Standard § 2.8 Dispatch](https://dom.spec.whatwg.org/#dispatching-events)
- DOM events bubble up a single document's node tree (and through Shadow DOM boundaries via `composedPath()`).
- An `<iframe>` establishes a distinct **nested browsing context** with an independent `Document` and `Window`.
- **Event propagation stops at the root of the embedded document.** Mouse events (`click`, `dblclick`, `pointerdown`, `mousemove`) do **not** cross browsing context boundaries to the parent `HTMLIFrameElement`.
- **Hit-Testing Isolation**: When a pointer is pressed over the iframe canvas, the browser's compositor routes OS pointer packets directly to the child browsing context's render pipeline. The parent document's `<iframe>` element receives **zero** mouse or pointer events.

### C. W3C Fullscreen API & Transient User Activation Gate
- **Primary Sources**:
  - [WHATWG Fullscreen API § 5.1 Element.requestFullscreen()](https://fullscreen.spec.whatwg.org/#dom-element-requestfullscreen)
  - [WHATWG HTML Living Standard § 7.3.3 Tracking user activation](https://html.spec.whatwg.org/multipage/interaction.html#tracking-user-activation)
- Calling `Element.requestFullscreen()` triggers step 5 of the Fullscreen algorithm:
  > *"If this's relevant global object does not have transient activation... return a promise rejected with a TypeError (or NotAllowedError)."*
- **Transient user activation** is a short-lived (~5 seconds) capability token generated strictly on the window that receives an untrusted, user-initiated DOM input event (such as `click`, `dblclick`, `pointerup`, `keydown`).
- User activation is **scoped to the document that received the event**. When the user clicks inside YouTube's iframe, transient activation is granted to `youtube.com`, **not** to the parent application.
- If the parent document attempts to invoke `playerWrapperRef.current.requestFullscreen()` in response to an indirect signal (such as `window.onblur`), the browser immediately rejects the promise with:
  ```text
  NotAllowedError: Failed to execute 'requestFullscreen' on 'Element': API can only be initiated by a user gesture.
  ```

### D. YouTube IFrame Player API Event Model
- **Primary Source**: [Google Developers — YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference#Events)
- The official YouTube Player API exposes only the following high-level playback events:
  - `onReady`
  - `onStateChange` (states: `-1` unstarted, `0` ended, `1` playing, `2` paused, `3` buffering, `5` video cued)
  - `onPlaybackQualityChange`
  - `onPlaybackRateChange`
  - `onError`
  - `onApiChange`
- **Zero DOM mouse events are exposed.** YouTube does not forward `click`, `dblclick`, `hover`, or `contextmenu` events through its API callbacks or internal `postMessage` protocol (`infoDelivery`, `initialDelivery`).

---

## 3. What Happens When a User Double-Clicks the YouTube Video?

### Scenario 1: YouTube's Native Fullscreen (`fs: 1`)
- If YouTube's player is allowed to handle fullscreen natively, YouTube's internal script listens for `dblclick` inside the iframe.
- When double-clicked, YouTube invokes `requestFullscreen()` on its own internal `<video>` or player element.
- **Architectural Disaster for yt-chaptered**:
  - Only the YouTube iframe enters fullscreen.
  - The browser elevates the YouTube player to the top layer.
  - **yt-chaptered's custom UI is completely hidden**: The top course header, chapter drawer (`FullscreenChapterDrawer`), chapter progress notches, timeline scrubber, and completion pills are left behind on the non-fullscreen parent page. The user sees only YouTube's default UI.

### Scenario 2: With yt-chaptered's Current Config (`fs: 0`)
- In `hooks/useYouTubePlayer.ts`, yt-chaptered configures:
  ```typescript
  playerVars: {
    fs: 0,            // Disable YouTube native fullscreen button & internal handlers
    modestbranding: 1,
    playsinline: 1,
    enablejsapi: 1,
    origin: typeof window !== 'undefined' ? window.location.origin : undefined,
  }
  ```
- Setting `fs: 0` suppresses YouTube's native fullscreen button.
- In this state, double-clicking inside the YouTube video canvas either does nothing or attempts an internal action that does not communicate with the parent. It **cannot** toggle `playerWrapperRef.current.requestFullscreen()`.

---

## 4. Evaluation of Implementation Options & Trade-Offs

| Approach | Can capture dblclick? | Has User Activation for Fullscreen? | Preserves YouTube Native Controls? | Verdict |
| :--- | :---: | :---: | :---: | :--- |
| **A. Parent listener inside iframe** | ❌ No (`SecurityError`) | ❌ No | N/A | **Technically Impossible** |
| **B. Listener on parent `<iframe>` tag** | ❌ No (Events hit child frame) | ❌ No | ✅ Yes | **Does Not Fire** |
| **C. Transparent overlay on video** | ✅ Yes | ✅ Yes | ❌ **No (Blocks all controls)** | **Severe UX Regression** |
| **D. Double-click on "Player White Area"** | ✅ **Yes** | ✅ **Yes** | ✅ **Yes** | **Recommended Standard** |
| **E. Double-click on Fullscreen HUD** | ✅ **Yes** | ✅ **Yes** | ✅ **Yes** | **Recommended for Exit** |

---

### Detailed Breakdown of Option C: The Transparent Click-Trap Overlay

Some developers attempt to solve this by placing an invisible `<div>` over the iframe:
```html
<div class="relative aspect-video">
  <iframe ...></iframe>
  <div class="absolute inset-0 z-10" id="click-trap"></div>
</div>
```

#### Why this is fundamentally flawed for an interactive educational player:
1. **Blocks All Native YouTube Interactions**:
   - Because `pointer-events: auto` intercepts mouse events before they reach the iframe, the user cannot click YouTube's native Play/Pause button, Settings gear (resolution/quality switch, audio tracks), Subtitles/CC toggle, or native progress bar.
2. **If `pointer-events: none` is used**:
   - Clicks pass through to YouTube, but the overlay receives **zero** events, making it impossible to detect double-clicks.
3. **The Single-Click vs. Double-Click Race Condition**:
   - If the overlay attempts to intercept all clicks and emulate play/pause via `player.playVideo()` / `player.pauseVideo()`, it must implement a 250–300ms debounce timer to distinguish single clicks from double clicks.
   - Every single play/pause click incurs a jarring ~300ms lag.
4. **Mobile Gesture Conflicts**:
   - On touch devices, a full-size transparent overlay conflicts with pinch-to-zoom, page scrolling, and video scrubber interactions.

---

### Detailed Breakdown of Option D: Double-Click on the "Player White Area"

In `todo.md`, the requirement states:
> *"Also make sure on double clicking inside the player white area should make the video fullscreen."*

#### What is the "Player White Area"?
In `components/PlaylistView.tsx` (lines 781–1019), directly below the 16:9 video container, sits the **Unified Current Chapter & Playback Controls Panel**:
```tsx
<section
  aria-label="Playback controls and active chapter info"
  className="bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-xs"
>
  ...
</section>
```
In light mode, this panel has a clean white card background (`bg-white`). It contains:
- Current active chapter title and duration.
- Mark Complete toggle.
- Chapter scrubber & timestamps.
- Primary playback transport buttons (Rewind 10s, Play/Pause, Forward 10s, Previous/Next Chapter).
- Utility buttons (Playback Speed, Theater Mode, Fullscreen).

#### Why this is the clean, correct place to add the event:
1. **100% Same-Origin DOM**: The element is rendered directly in the Next.js parent document.
2. **Guaranteed Transient User Activation**: When the user double-clicks any empty or non-interactive space in this panel, a native `dblclick` event fires directly in the parent window's event loop. Calling `handleToggleFullscreen()` executes with valid transient user activation and never throws `NotAllowedError`.
3. **No Collision with YouTube Embed**: YouTube's internal player retains full interactivity for video controls, settings, and playback.
4. **Intuitive Desktop Ergonomics**: Users frequently double-click card headers, title bars, or control panels to expand applications into fullscreen.

---

## 5. Related Root Cause: Why the 'F' Keyboard Shortcut Fails

`todo.md` also notes:
> *"Fullscreenshortcut key (F) is not working, if not possible to fix then don't use one."*

### Why 'F' stops working:
1. `components/PlaylistView.tsx` registers a `keydown` listener on `window`:
   ```typescript
   window.addEventListener("keydown", handleKeyDown);
   ```
2. When a user clicks anywhere on the YouTube iframe to play, pause, or adjust volume, **the browser shifts focus into the iframe's `Window`**.
3. While focus remains inside the cross-origin iframe:
   - All subsequent keystrokes (`F`, `Space`, `M`, Arrow keys) are delivered directly to YouTube inside the iframe.
   - The parent document's `window` receives **no keyboard events at all**.
4. Pressing `F` only works if the user clicks somewhere on the parent page (such as the chapter drawer, navbar, or control card) to refocus the parent document.

### Recommendation for 'F' Shortcut:
- When using custom fullscreen overlays over cross-origin iframes, relying on `window.addEventListener("keydown")` will always have this focus-trap limitation unless the user interacts exclusively with custom external controls.
- Keeping the floating Fullscreen button (`Maximize2` button) on the video hover state and adding double-click to the control card provides a foolproof mouse-driven alternative.

---

## 6. Implementation Blueprint for yt-chaptered

To fulfill the user requirement safely and reliably:

### 1. Add `onDoubleClick` to the Player Controls Panel (`PlaylistView.tsx`)
Attach `handleToggleFullscreen` to the controls panel, ignoring clicks that originate from interactive buttons, links, or range inputs:

```tsx
<section
  aria-label="Playback controls and active chapter info"
  onDoubleClick={(e) => {
    // Prevent triggering when clicking interactive child controls
    const target = e.target as HTMLElement | null;
    if (
      target?.closest("button") ||
      target?.closest("a") ||
      target?.closest("input") ||
      target?.closest("[role='slider']")
    ) {
      return;
    }
    handleToggleFullscreen();
  }}
  className="bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-xs select-none"
>
```

### 2. Add `onDoubleClick` to the Video Wrapper Margins (`PlaylistView.tsx`)
Double-clicking the letterbox or padding area around the video container in `playerWrapperRef`:

```tsx
<div
  ref={playerWrapperRef}
  onDoubleClick={(e) => {
    // Only fire if the double-click hit the wrapper itself or non-interactive overlay
    if (e.target === playerWrapperRef.current) {
      handleToggleFullscreen();
    }
  }}
  className={`group/player relative w-full aspect-video bg-black overflow-hidden ...`}
>
```

### 3. Add `onDoubleClick` to `FullscreenOverlay.tsx` to Exit Fullscreen
When the user is already in fullscreen mode, double-clicking the backdrop of the overlay should gracefully exit fullscreen:

```tsx
<div
  onDoubleClick={(e) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.closest("button") ||
      target?.closest("input") ||
      target?.closest("[role='slider']") ||
      target?.closest(".pointer-events-auto")
    ) {
      return;
    }
    onExitFullscreen();
  }}
  className="absolute inset-0 pointer-events-none select-none overflow-hidden"
>
```

---

## 7. Conclusion & Definitive Guidance

1. **Do not attempt to attach event listeners inside the YouTube iframe** or listen for iframe DOM events on the parent. The browser's Same-Origin Policy and DOM event dispatch specifications physically prohibit it.
2. **Do not put a transparent click-trap over the YouTube iframe**, as it destroys YouTube's native controls and creates severe play/pause latency.
3. **Attach the double-click event to the "player white area"** (the controls card below the video) and to the custom Fullscreen HUD. This satisfies the user's requirement cleanly, operates with full browser support, and respects both security standards and UX integrity.
