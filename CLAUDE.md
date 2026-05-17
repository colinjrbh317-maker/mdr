# CLAUDE.md

Repo-level guidance for any Claude instance working on MDR. Keep this file short. Personal/long-term context lives in `~/.claude/projects/-Users-colinryan-MDR/memory/`.

## Stack snapshot
- Astro 5 SSR + React islands, Tailwind v4, Sanity CMS, Vercel adapter
- Package manager: **pnpm** (not npm — `pnpm-lock.yaml` is source of truth)
- Sanity project: `cy8sc3xd` / dataset `production`
- Dev: `pnpm dev` (port 4321)

## Non-obvious rules (read before editing)
- **Never use em dashes in site content** — reads as AI. Use commas, periods, or parens.
- **Always commit + push after a build.** Don't leave work uncommitted.
- **GROQ imports**: `import groq from "groq"` — NOT `astro:sanity` (build fails).
- **Sanity image URL**: named export `createImageUrlBuilder`. Default export is deprecated.
- **Sanity MCP workspace name** is `modern-day-roofing`, not `default`. Patch ops fail otherwise.
- **Singleton docs**: use `__experimental_actions` + Structure Builder with fixed `documentId()`. `create_documents_from_json` ignores `_id`.
- **All CMS pages** use `export const prerender = true` + `getStaticPaths()`.
- **Perplexity**: use API via `curl`, never the MCP tools.
- **Dark sections**: add `.dark-section` class — handles white text + heading colors.

## File map (where things actually live)
- Queries: `src/sanity/lib/queries.ts`
- Schemas: `src/sanity/schemaTypes/{documents,objects,blocks}/`
- Block components: `src/components/blocks/*Block.astro`
- Page routes: `src/pages/{services,areas,blog}/[slug].astro`
- Breadcrumb (with JSON-LD): `src/components/common/Breadcrumb.astro`
- CRO: `src/components/cro/{ExitIntentPopup,ScrollPopup,BeforeAfterSlider}`

## Design system (don't drift)
- Fonts: Barlow Condensed (headings 700/800), DM Sans (body 400/500/600)
- Colors: bg-white/light/warm/dark/darker/accent; text-primary/body/muted; red `#C0392B` CTAs, amber `#D4A054` accents
- Container max-w: 1200px (narrow: 800px)
- Components: Button (4 variants), Card (5 variants), SectionContainer (7 bg variants), Badge (5 variants)

---

## Verification Protocol (MANDATORY before claiming "done")

Every UI/code change must pass this loop. Don't say "complete" until it does.

### 1. Static checks
```bash
pnpm build              # catches TS + Astro errors
```

### 2. Automated UI/UX (Playwright)
```bash
pnpm test               # runs tests/*.spec.ts headless
pnpm verify             # full loop: build + tests + audit screenshots
```
Specs live in `tests/` — extend them when adding features. Each new page/component needs a spec covering: renders, no console errors, key interactions, mobile viewport.

### 3. Visual verification (Claude in Chrome)
For anything visual, use `mcp__Claude_in_Chrome__*` tools:
- `navigate` to the dev URL, `read_page` for DOM, `read_console_messages` for errors
- `find` + click critical CTAs, `form_input` for forms
- `read_network_requests` to confirm API calls fire
**Always check console for errors before declaring success.**

### 4. End-to-end roundtrips (when relevant)
- **Form submissions** → use Gmail MCP (`mcp__7a36cbd4-*__search_threads`) to confirm the test lead landed in inbox. Wait 30s, then poll.
- **Sanity writes** → query back with `mcp__Sanity__query_documents` to confirm persistence.
- **Asset uploads** → verify in Drive via `mcp__3ed4b631-*__search_files`.

### 5. Self-report
After verification, state: what was tested, what passed, what was NOT tested and why. Never claim coverage you didn't run.

### Parallel execution
Playwright headless + Claude-in-Chrome interactive can run simultaneously — kick off `pnpm test` in background, do visual checks in parallel.

---

## Workflow expectations
- Plan first in `tasks/todo.md` for non-trivial work; check items off as you go.
- Keep diffs small. No speculative refactors.
- Don't add comments explaining *what*. Only *why* if non-obvious.
