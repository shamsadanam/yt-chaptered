<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing Rules

- You don't need to test with Playwright for everything. Use it when I ask you to.
- When you test using Playwright MCP, start the headless server with volume muted, unless you're specifically testing for sound.

## Tailwind CSS Conventions

- **Use Canonical Utility Classes**: Always use standard, canonical Tailwind CSS utility classes (e.g., `bg-stone-50`, `text-stone-900`, `border-stone-200`, `rounded-lg`, `rounded-xl`, `min-h-11`, `min-h-10`, `text-xs`, `w-21`) instead of arbitrary square-bracket syntax (`bg-[#fafaf9]`, `rounded-[8px]`, `min-h-[44px]`, `text-[11px]`, `w-[84px]`).
- **Use Theme Tokens**: Use the design tokens configured in `@theme` in `app/globals.css` (e.g., `bg-primary`, `hover:bg-primary-hover`, `text-primary`, `text-2xs`) for brand-specific styles.
- **No Unnecessary Arbitrary Values**: Avoid arbitrary classes (`-[...]`) for colors, dimensions, radii, tracking, or typography. If a custom utility or measurement is genuinely needed, declare it semantically in `app/globals.css` using `@theme` or `@utility`.
- **Icon Props Over Arbitrary Classes**: Configure Lucide icon properties through native component props (such as `<Check className="w-3.5 h-3.5" strokeWidth={3} />`) rather than arbitrary classes like `stroke-[3]`.

