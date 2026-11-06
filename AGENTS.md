<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

- Run Playwright tests only when explicitly requested.
- Launch Playwright MCP headless with volume muted (unless testing sound).

## Tailwind CSS Conventions

- **Canonical Classes & Tokens**: Use standard Tailwind utilities and design tokens declared in `@theme` (`app/globals.css`) over arbitrary bracket syntax (`[...]`).
- **Custom Utilities**: Declare reusable measurements semantically in `app/globals.css` via `@theme` or `@utility`.
- **Lucide Icons**: Configure icon properties through component props (e.g., `strokeWidth={3}`) rather than Tailwind classes.

## Skills Guidelines

- **Missing Skills Gate**: Before implementing, designing, or verifying, verify required skills exist in `.agents/skills/`. If any are missing, pause and list them for the user to install before proceeding.

### Design Workflow

- **UI Design**: Use the `ui-ux-pro-max` skill for interface creation and updates.

### Code Verification Workflow

Verify code after implementing a new feature or code change:

1. **Loop Prevention Gate**: Check if:
   - The active plan contains `skip-verification: true` (or `[skip-verification]`).
   - The changes are direct remediations for findings from a review skill in this session.
   If either condition is true, skip verification.
2. **Verification Sequence**: Run verification in strict order:
   1. Relevant Vercel skills (e.g. `vercel-react-best-practices`, `vercel-react-view-transitions`).
   2. The `code-review` skill.
3. **Plan Tagging**: Tag any remediation or implementation plan produced by verification with `skip-verification: true`.


