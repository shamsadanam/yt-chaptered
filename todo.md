# Roadmap & Todo List

## Priority 1: UI/UX & Visual Identity

- [x] Move "Saved Courses & History" to the top and rename section to "Continue Watching".
- [x] Improve returning user UX when saved videos/courses already exist:
  - [x] Streamline URL input presentation (clean, permanently visible section below "Continue Watching" without collapsible accordion state).
  - [x] Ensure returning users immediately see their active courses without being overwhelmed by the URL form.
- [x] Fix logo branding assets and app icons across the app and manifest.

## Priority 2: PWA Experience & Storage Reliability

- [x] Investigate if auto install icon notification can be shown to prompt installation (implemented with non-intrusive in-app `InstallBanner`).
- [x] Add `screenshots` definitions (desktop and mobile previews) to enable rich install prompts on Chromium browsers.
- [ ] Test installation and standalone launch on Chromium (desktop & Android) and Safari (iOS & macOS).
- [ ] Run Google Lighthouse PWA audit (verify installability, manifest validity, theme color).
- [x] Test IndexedDB persistence quota and consider `navigator.storage.persist()` for durable data retention (implemented automatic storage persistence request and quota error monitoring).

## Priority 3: Analytics & Privacy Compliance (Pre-Publishing)

- [ ] Integrate Google Analytics (GA4) before publishing:
  - [ ] Implement cookie consent banner & Google Consent Mode v2 (required for EU/UK visitors under GDPR / ePrivacy Directive / Google EU User Consent Policy).
  - [ ] Ensure GA4 tags remain in `denied` state until user grants explicit consent.
  - [ ] (Alternative) Evaluate cookieless, privacy-friendly analytics (e.g., Plausible, Cloudflare Web Analytics) to maintain a zero-banner, local-first UX.

## Priority 4: Documentation, Demo & Marketing Launch

- [ ] Update README and/or create a landing page explaining what problem ytChaptered solves.
- [ ] Add a small video demo showcasing key features and workflow.
- [ ] Create social media announcement posts:
  - [ ] LinkedIn
  - [ ] Reddit
  - [ ] Facebook
- [ ] Create a small video demo

## Features

- [x] Add compact player controls (seek ±10s with icons, chapter skips, speed selector, fullscreen with auto-landscape rotation, separate dedicated controls card & current chapter card)
- [x] WCAG 2.1/2.2 AA accessibility compliance (skip-to-content link, accessible button & link labels, keyboard chapter list navigation, un-nested interactive cards, role=progressbar, visible focus indicators, dialog focus trapping)
- [x] Add link to youtube channel for subscribing, for phase one just open the video/channel in a new tab.
- [ ] Also add bot protection.
- [ ] Check if an api route is really needed or not.
- [ ] Add new logo and remove trackers from the logo.
- [x] Add darkmode (Light/Dark toggle with system default, zero-flicker head script, and SSR-safe CSS switching).
- [ ] Add cloudflare web analytics.

## Future Planning

1. Add Auth so that it syncs with users profile.
2. Update readme and design, dot md files.
