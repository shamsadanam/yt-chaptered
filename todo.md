# ytChaptered — Roadmap & Prioritized Backlog

## 🔴 High Priority (Pre-Publishing & Core UX)

### 1. UI & Returning User Flow
- [x] Move "Saved Courses & History" to the top of the main view and rename section to "Continue Watching".
- [x] Improve returning user UX when saved courses exist:
  - [x] Streamline URL input presentation (e.g. collapsed input field, "+ Add New Course" trigger/modal, or secondary accordion below "Continue Watching").
  - [x] Ensure returning users immediately see their active courses without being overwhelmed by the URL form.

### 2. Branding & App Icon Assets
- [ ] Fix logo branding assets and app icons across the app, manifest, and favicon (replace default Next.js icons with unified emerald branding).

### 3. Analytics & Privacy Compliance
- [ ] Select and integrate analytics before publishing:
  - [ ] Option A: Google Analytics (GA4) with cookie consent banner & Google Consent Mode v2 (tags default to `denied` until user consent).
  - [ ] Option B (Recommended): Cookieless, privacy-friendly analytics (e.g., Plausible, Cloudflare Web Analytics) for a zero-banner, local-first UX.

---

## 🟡 Medium Priority (PWA Polish & Data Durability)

### 4. Storage & Data Retention
- [ ] Test IndexedDB persistence quota and integrate `navigator.storage.persist()` to protect against automatic browser cache eviction.

### 5. Rich PWA Manifest & Install Experience
- [ ] Capture production screenshots and add `screenshots` definitions (desktop and mobile) to `app/manifest.ts` for rich Chromium install dialogs.
- [ ] Investigate auto install icon notification / browser install prompt trigger optimizations.

### 6. Testing, Audit & Verification
- [ ] Run Google Lighthouse PWA audit (verify installability, manifest validity, theme color).
- [ ] Test installation and standalone launch on Chromium (desktop & Android) and Safari (iOS & macOS).

---

## 🟢 Low Priority (Documentation & Launch Outreach)

### 7. Documentation & Demo
- [ ] Update README and/or create landing content explaining the problem ytChaptered solves with key workflows.
- [ ] Add a short video demo or GIF showcasing chapter navigation and local-first progress tracking.

### 8. Marketing & Social Media Launch
- [ ] Prepare launch posts and community announcements:
  - [ ] Reddit (e.g., r/webdev, r/Productivity, r/selfhosted)
  - [ ] LinkedIn
  - [ ] Facebook / X

---

## ⚪ Deferred / Architectural Backlog

### 9. Service Worker & Cache Lifecycle (Deferred)
> *Note: App currently runs as a lean, manifest-based PWA without a custom service worker to prevent stale YouTube video caching. Revisit only if static app shell offline caching is required.*
- [ ] Listen for service worker update events (`waiting` worker status).
- [ ] Show toast / banner notifying the user that a new version of ytChaptered is ready with a "Refresh to update" button.
- [ ] Skip waiting (`skipWaiting()`) and reload controller when confirmed.
- [ ] Verify offline behavior (app shell renders with saved courses even when offline).
