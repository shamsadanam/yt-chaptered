# Roadmap & Todo List

## Priority 1: Fullscreen Overlay, In-App Search & Progress Sync

- [x] Add overlay inside the fullscreen player for chapters, and some player controls (chapter drawer, timeline scrubber, CC captions toggle, volume controls, and keyboard shortcuts).
- [x] Search YouTube from this web app and add video here; show if video is chapterable via an icon/small description.
  - [x] make the cc button work, if not then find alternative
  - [x] redesign the mobile header and bottom navbar (integrated 4-tab mobile navigation with search)
  - [x] do a code review using this - `npx skills@latest add mattpocock/skills --skill=setup-matt-pocock-skills`
- [ ] Google Drive sync or free DB sync for account progress.
- [ ] Do not autoplay on reload. Don't autoplay on first time video generation. in fact, don't auto play in details page, users will play there manually.
- [x] minify player fullscreen overlay controls
- [ ] when video is fullscreened, the chapter info at top header center area - the text size is too small, increase it to 14px
- [x] Fullscreen shortcut key (F) removed along with help text; double-click fullscreen inside iframe evaluated & rejected due to cross-origin security boundaries.
- [x] When a player speed is selected (e.g. 1.25x or 1.5x), the speed control has a fixed width to eliminate layout shift.
- [x] When the volume change button is clicked, an absolutely positioned floating popover displays the slider without causing layout shift.

## Priority 2: PWA Experience & Storage Reliability

- [x] Add `screenshots` definitions (desktop and mobile previews) to enable rich install prompts on Chromium browsers.
- [ ] Update screenshots to also include/show homepage of the site. And make it the first one. the current ones will show after this one.
- [ ] Test installation and standalone launch on Chromium (desktop & Android) and Safari (iOS & macOS).
- [ ] Run Google Lighthouse PWA audit (verify installability, manifest validity, theme color).

## Priority 4: Documentation, Demo & Marketing Launch

- [x] Update README and/or create a landing page explaining what problem ytChaptered solves.
- [x] Add a small video demo showcasing key features and workflow.
- [x] Add SEO stuff
- [ ] Generate real Cloudflare Turnstile keys (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`) from Cloudflare Dashboard for production deployment (currently using dummy test keys).
- [x] Create social media announcement posts:
  - [ ] LinkedIn
  - [ ] Reddit
  - [ ] Facebook
- [ ] I don't see the "install" button in mobile devices. need to show there as well - the header one does not show neither does the popup

## Future

2. Update readme and design, dot md files.
