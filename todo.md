# PWA Creation & Enhancement Roadmap

## 1. Web App Manifest & App Identity
- [x] Web app manifest route (`app/manifest.ts`) configured with `name`, `short_name`, `theme_color`, and `display: standalone`.
- [x] Add high-resolution PNG icons (`/icon-192.png`, `/icon-512.png`, `/apple-touch-icon.png`) to `app/manifest.ts` icon definitions.
- [x] Configure `categories` (e.g. `['education', 'productivity', 'utilities']`) and `orientation: 'any'`.
- [ ] Add `screenshots` definitions (desktop and mobile previews) to enable rich install prompts on Chromium browsers (deferred until production screenshots are captured).
- [x] Add shortcuts definition (e.g., Quick Create Course, My Courses) with query parameter routing.

## 2. Service Worker & Offline Caching
- [x] Streamlined PWA architecture: Removed custom service worker (`public/sw.js`) and offline warning banners, avoiding stale cache bugs since YouTube playback fundamentally requires network connectivity. App runs as a lean, responsive Web App Manifest-based homescreen app.

## 3. Install Prompt & User Experience
- [x] Capture the `beforeinstallprompt` browser event.
- [x] Build a custom "Install App" button / banner in the navigation bar or settings shelf:
  - [x] Show prompt on demand without being intrusive.
  - [x] Hide install prompt if the app is already running in standalone display mode (`window.matchMedia('(display-mode: standalone)').matches`).
- [x] Provide instructions for iOS Safari users ("Add to Home Screen" via Share menu).

## 4. Updates & Lifecycle Management
- [ ] Listen for service worker update events (`waiting` worker status).
- [ ] Show toast / banner notifying the user that a new version of ytChaptered is ready with a "Refresh to update" button.
- [ ] Skip waiting (`skipWaiting()`) and reload controller when confirmed.

## 5. Storage & Local Persistence Integration
- [x] Migrated primary storage from `localStorage` to asynchronous `IndexedDB` (`lib/storage.ts`) for higher storage limits and non-blocking I/O.
- [x] Automatic one-time legacy migration from `localStorage` to `IndexedDB`.
- [ ] Test IndexedDB persistence quota and consider `navigator.storage.persist()` for durable data retention.

## 6. Testing, Audit & Verification
- [ ] Run Google Lighthouse PWA audit (verify installability, manifest validity, theme color, service worker registration).
- [ ] Test installation and standalone launch on Chromium (desktop & Android) and Safari (iOS & macOS).
- [ ] Verify offline behavior (app shell renders with saved courses even when airplane mode is on).

## 7. App Info & "About Me" Section / Page
- [x] Create an "About Me" modal or dedicated route (`app/about/page.tsx` or slide-over drawer):
  - [x] Creator profile, background, and motivation behind `ytChaptered`.
  - [x] Links to GitHub, portfolio, socials, and contact.
  - [x] App version, tech stack info (Next.js, Tailwind CSS, IndexedDB, YouTube IFrame API).
  - [x] Link / trigger placed in the Navbar, MobileTabBar, and desktop footer.
  - [x] Direct GitHub repository star link button in Navbar, About modal, and footer.

