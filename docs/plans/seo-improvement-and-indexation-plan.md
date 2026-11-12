---
title: "Technical SEO, Structured Data & Landing Page Content Enhancement Plan"
status: proposed
type: seo
---

# Technical SEO, Structured Data & Landing Page Content Enhancement Plan

## Context & Motivation
Following the comprehensive SEO and codebase audit for **ytChaptered**, this plan addresses four primary search engine and generative engine optimization (GEO) opportunities:
1. **Dynamic Route Crawl Bleed & Indexation Protection**: Prevent search engine crawl budget waste, soft-404 errors, and duplicate timestamp indexation on client-dependent playback routes (`/watch/[id]`).
2. **Entity & Structured Data Enrichment**: Extend Schema.org markup in [`app/layout.tsx`](file:///Users/anam/Projects/yt-chaptered/app/layout.tsx) with linked `WebSite` and `SoftwareApplication` entities, including author E-E-A-T credentials and screenshot assets.
3. **Primary Content Depth & Heading Hierarchy**: Introduce crawlable, semantic `<h2>` sections on the landing page (How it Works, Features, and FAQ) to avoid thin-content flags and capture non-branded search intent.
4. **Agentic & Generative Engine Optimization (GEO)**: Structure concise question-answer passages for AI search engines (Perplexity, ChatGPT, Google AI Overviews) and stabilize sitemap change signaling.

---

## Architecture & Implementation Steps

### Phase 1: Dynamic Route Crawl & Indexation Protection

#### 1. Prevent Search Indexation on Dynamic Playback Routes
- **Target File**: [`app/watch/[id]/page.tsx`](file:///Users/anam/Projects/yt-chaptered/app/watch/[id]/page.tsx)
- **Changes**:
  - Update [`generateMetadata`](file:///Users/anam/Projects/yt-chaptered/app/watch/[id]/page.tsx#L10) to set `robots: { index: false, follow: false }`.
  - Override root canonical inheritance by explicitly setting `alternates: { canonical: `/watch/${id}` }` (stripping query parameters like `?t=...`).
- **Rationale**: The watch page requires client-side IndexedDB state and Cloudflare Turnstile verification. Crawlers cannot solve Turnstile and would otherwise encounter soft-404 errors or index arbitrary YouTube IDs.

#### 2. Disallow Dynamic Watch Routes in Robots Directive
- **Target File**: [`app/robots.ts`](file:///Users/anam/Projects/yt-chaptered/app/robots.ts)
- **Changes**:
  - Update production crawl rules to include `disallow: ['/api/', '/watch/']`.
- **Rationale**: Blocks automated crawlers from traversing user-generated video IDs and seeking timestamps, preserving crawl budget entirely for indexable marketing pages.

#### 3. Stabilize Sitemap Change Signals
- **Target File**: [`app/sitemap.ts`](file:///Users/anam/Projects/yt-chaptered/app/sitemap.ts)
- **Changes**:
  - Replace dynamic `new Date()` with a static release/content date (or build timestamp).
- **Rationale**: Search engines degrade trust in `lastModified` headers when static pages claim continuous modification on every HTTP request.

---

### Phase 2: Schema.org & Knowledge Graph Enrichment

#### 1. Multi-Entity JSON-LD Graph in Root Layout
- **Target File**: [`app/layout.tsx`](file:///Users/anam/Projects/yt-chaptered/app/layout.tsx)
- **Changes**:
  - Structure structured data as an `@graph` array containing:
    1. **`WebSite` Entity**: Canonical URL, site name, description.
    2. **`SoftwareApplication` Entity**:
       - `url`: `https://ytchaptered.com`
       - `image`: `https://ytchaptered.com/screenshots/desktop-preview.png`
       - `applicationCategory`: `EducationalApplication`
       - `author`: `Person` entity linking `Shamsad Anam` to `https://shamsad.com` (E-E-A-T authorship signal).
       - `offers`: Free tier representation (`price: "0"`, `priceCurrency: "USD"`).
       - `featureList`: Explicit feature strings (offline PWA, zero account requirement, auto chapter detection).

---

### Phase 3: Semantic Landing Page Content & Heading Hierarchy

#### 1. Semantic Content Sections on the Landing Page
- **Target File**: [`components/InputView.tsx`](file:///Users/anam/Projects/yt-chaptered/components/InputView.tsx) (or SSR page component)
- **Changes**:
  - Add crawlable, semantic sections beneath the primary course creation card:
    - `<section aria-labelledby="how-it-works-heading">`:
      - `<h2 id="how-it-works-heading">`: *"How ytChaptered Works"*
      - 3-step structured cards:
        1. **Paste YouTube URL**: Auto-fetches video metadata and chapter timestamps.
        2. **Structured Chapters**: Auto-parses timestamps into an interactive syllabus.
        3. **Track Progress Locally**: Saves completion checkmarks and resume times locally with zero sign-up.
    - `<section aria-labelledby="features-heading">`:
      - `<h2 id="features-heading">`: *"Designed for Distraction-Free Learning"*
      - Highlights: 100% Free & Private (IndexedDB), Installable PWA, Keyboard Shortcuts, Background Sync.
    - `<section aria-labelledby="faq-heading">`:
      - `<h2 id="faq-heading">`: *"Frequently Asked Questions"*
      - Semantic Q&A pairs (semantic `<details>` or dl/dt/dd structure) covering:
        - *"Do I need to create an account?"*
        - *"How does chapter detection work?"*
        - *"Can I use ytChaptered offline?"*
        - *"What timestamp formats are supported?"*
- **Rationale**: Eliminates Google Quality Rater thin-content risks, adds topical entity relevance for search intent (e.g. "turn youtube video into course", "youtube chapter tracker"), and provides high-confidence citation blocks for conversational AI search engines.

---

### Phase 4: Agentic & Generative Engine Optimization (GEO)

#### 1. Expand `public/llms.txt`
- **Target File**: [`public/llms.txt`](file:///Users/anam/Projects/yt-chaptered/public/llms.txt)
- **Changes**:
  - Append concise developer and architectural notes (browser storage boundaries, supported URL structures, PWA capabilities).

---

## Files to Modify
- [`app/watch/[id]/page.tsx`](file:///Users/anam/Projects/yt-chaptered/app/watch/[id]/page.tsx)
- [`app/robots.ts`](file:///Users/anam/Projects/yt-chaptered/app/robots.ts)
- [`app/sitemap.ts`](file:///Users/anam/Projects/yt-chaptered/app/sitemap.ts)
- [`app/layout.tsx`](file:///Users/anam/Projects/yt-chaptered/app/layout.tsx)
- [`components/InputView.tsx`](file:///Users/anam/Projects/yt-chaptered/components/InputView.tsx)
- [`public/llms.txt`](file:///Users/anam/Projects/yt-chaptered/public/llms.txt)

---

## Verification & Acceptance Testing

1. **Robots & Canonical Validation**:
   - Run `curl -s http://localhost:3000/robots.txt` and confirm `Disallow: /watch/` and `Disallow: /api/`.
   - Inspect HTML head of `/watch/[id]` and confirm `<meta name="robots" content="noindex, nofollow" />` and `<link rel="canonical" href="https://ytchaptered.com/watch/[id]" />`.
2. **Schema.org Graph Validation**:
   - Extract `<script type="application/ld+json">` from root page and validate via Google Rich Results Test / Schema.org validator with zero errors.
3. **SSR Content Inspection**:
   - Fetch homepage HTML without executing client JavaScript (`curl -s http://localhost:3000 | grep -E "<h[1-3]"`) to ensure `<h1>`, `<h2>`, and FAQ text are present in the initial document stream.
