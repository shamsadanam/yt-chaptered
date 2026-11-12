<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

- Run Playwright tests only when explicitly requested.
- Launch Playwright MCP headless with volume muted (unless testing sound).

## Tailwind CSS Conventions

- **Canonical Tokens**: Use Tailwind utilities and tokens from `@theme` (`app/globals.css`); avoid arbitrary brackets (`[...]`).
- **Custom Utilities**: Declare reusable measurements in `app/globals.css` via `@theme` or `@utility`.
- **Lucide Icons**: Style icons via component props (`strokeWidth={3}`) instead of Tailwind classes.

## Documentation & Paths

- **Portable Paths**: Always use repository-relative links (e.g. `app/layout.tsx`, `../../app/layout.tsx`). Never write machine-specific absolute paths (`file:///Users/...`, `C:\...`).

## Skills & Verification

- **Missing Skills Gate**: Check `.agents/skills/` before starting work. If a skill is missing, pause and ask the user to install it.
- **UI Design**: Use `ui-ux-pro-max` for interface creation and design tokens.

### Verification Sequence
Run verification on code changes after completing a feature or architectural step:
1. **Loop Prevention**: Skip verification if the plan has `skip-verification: true` or if changes are direct review remediations.
2. **Pipeline Order**:
   1. Relevant Vercel skills (`vercel-react-best-practices`, `vercel-react-view-transitions`).
   2. `code-review` skill.
3. **Plan Frontmatter**: Standardize plan metadata tags:
   - `status`: `proposed` | `in-progress` | `completed`
   - `type`: `feature` | `architecture` | `seo` | `remediation`
   - `skip-verification`: `true` | `false` (`false` on feature, SEO, and architecture plans to enforce verification; set to `true` only on remediation plans to prevent recursive review loops).


