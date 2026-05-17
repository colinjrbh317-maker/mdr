# Plan: Comprehensive Auto-Verification + Workflow Upgrade System

## Context

Today's loop wastes hours: Claude builds → Colin manually tests by clicking through UI / checking inboxes / verifying deploys → finds a bug → reports back → Claude fixes → Colin re-tests → repeat. The goal of this plan is to **eliminate the manual verification step entirely** by making Claude prove its own work before declaring done. This needs to work across all of Colin's projects (~15+ active codebases — MDR, Castuary, BOLT, Financial-Planners, Leandro, virginia-shield, LinkedIn systems, etc.), not just MDR, and must auto-trigger without explicit prompting.

What's already in place (Phase 1 of this conversation):
- `~/.claude/skills/Verify/SKILL.md` — universal verification skill (auto-detects project type, runs matched matrix, self-heals up to 3 iterations)
- `feedback_always_verify.md` memory entry — instructs Colin's Claude to default to invoking it
- Repo-local `CLAUDE.md` for MDR with verification protocol embedded
- `pnpm verify` / `pnpm test` / `pnpm audit` scripts in MDR's package.json

What's missing and what this plan delivers: **auto-triggering**, **deeper per-archetype verification matrices**, **CLI gap-fills**, **observability**, **dedicated test channels** (so Gmail/SMS roundtrips don't pollute Colin's personal accounts), and **workflow tooling upgrades** that compound across every future build.

---

## Architecture: Five Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: WORKFLOW UPGRADES (slash commands, CI, dashboard) │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: OBSERVABILITY (logs, replays, visual diff, budgets)│
├─────────────────────────────────────────────────────────────┤
│  Layer 3: EXPANDED MATRIX (per-archetype verification)      │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: AUTO-TRIGGER (Stop hook handler that injects)     │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: CORE — Verify skill + .claude-verify.json schema  │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Core: Verify skill upgrades + per-project config

**Status**: Verify skill exists; this plan deepens it.

**Files to modify / create:**
- `~/.claude/skills/Verify/SKILL.md` — extend with archetype detection (web / native / API / CLI / content / scraper / worker / data-pipeline)
- `~/.claude/skills/Verify/Profiles/` (new dir) — one file per archetype with the exact command matrix
  - `web-astro.md`, `web-next.md`, `native-expo.md`, `api-node.md`, `cli-script.md`, `worker-cloudflare.md`, `data-sanity.md`, `data-supabase.md`, `pipeline-email.md`, `pipeline-content.md`
- `.claude-verify.json` schema doc — what each project can override:
  ```json
  {
    "archetype": "web-astro",
    "commands": ["pnpm build", "pnpm test"],
    "urls": [{"path": "/", "name": "home"}, {"path": "/contact", "interactions": ["submit-form"]}],
    "emailRoundtrip": {"to": "verify@modernroofers.test", "expectSubjectContains": "MDR contact"},
    "dataReadback": [{"system": "sanity", "query": "*[_type=='lead']|order(_createdAt desc)[0]"}],
    "deployTarget": "vercel",
    "budgets": {"lcp": 2500, "a11ySerious": 0},
    "maxIterations": 3,
    "skip": []
  }
  ```
- One `.claude-verify.json` per active project — committed, travels with repo

**Why this matters**: a single skill file can't encode every quirk of every stack. Profiles give the skill plug-in points; `.claude-verify.json` gives per-project escape hatches.

---

## Layer 2 — Auto-trigger: Stop hook injection

**Mechanism**: Extend `~/.claude/hooks/StopOrchestrator.hook.ts` (already exists, already wired) with a new handler `VerifyGate.ts`.

**Files to create:**
- `~/.claude/hooks/handlers/VerifyGate.ts` (new)
- Edit `~/.claude/hooks/StopOrchestrator.hook.ts` to call it

**Logic** (executes when Claude tries to end a turn):
```
1. Parse the transcript (already done by StopOrchestrator).
2. Detect: did Claude write/edit source files this turn? (Edit/Write tool calls on .ts/.tsx/.astro/.vue/.py/etc.)
3. Detect: is Claude declaring done? (keywords in final assistant message: "complete", "done", "ready", "shipped", "implemented", "fixed")
4. Detect: did Verify already run this turn? (look for skill invocation + ✅ VERIFIED block)
5. If (2) AND (3) AND NOT (4):
   - Inject a system message: "Verification not yet performed. Invoke the Verify skill before ending this turn."
   - Return non-zero exit → blocks turn from ending
6. Allow opt-out: if user's last message contains `--skip-verify` or message in `.claude/verify-disabled-projects.json` matches CWD
```

**Throttling**: max one block per Stop cycle (avoid infinite loops if Verify itself fails to satisfy the gate).

**Soft vs hard mode**: configurable via `~/.claude/verify-mode.json`:
- `"soft"` — log warning + voice notification, but allow turn to end
- `"hard"` — block turn from ending until Verify completes
- `"prompt"` — ask Colin via voice gate: "Verify before ending?"

**This is the load-bearing piece.** Without it, the Verify skill depends on Claude remembering. With it, the system enforces.

---

## Layer 3 — Expanded matrix: per-archetype verification

Each archetype gets a verification matrix file. Below are the matrices the system will support:

### 3a. Web (Astro / Next / Vite / Vue)
- `pnpm build` (type errors → fail)
- `pnpm exec playwright test` (E2E)
- **Claude-in-Chrome MCP loop** on every changed route:
  - `navigate` → `read_console_messages` (any error/warning = fail) → `read_network_requests` (no 4xx/5xx) → `find` + click critical CTAs → `screenshot`
  - Mobile viewport (375×812) repeat for top 3 routes
- **Lighthouse CLI**: install via `pnpm i -g lighthouse`, run against preview URL, fail if budgets miss
- **axe-core CLI**: install via `pnpm i -g @axe-core/cli`, fail on serious/critical
- **Visual regression**: store baseline screenshots in `tests/golden/`, diff with `pixelmatch` (install: `pnpm i -D pixelmatch pngjs`)

### 3b. Native (Expo / React Native)
- Install `expo-cli` + `eas-cli` globally
- `eas build --local --platform=ios --profile=preview` (or simulator build)
- `xcrun simctl boot <device>` → `xcrun simctl install booted <ipa>` → launch
- **Maestro** for E2E (`brew install mobile-dev-inc/tap/maestro`) — flow files in `.maestro/`
- Screenshot diff via Maestro's built-in capture
- Console log scan via `xcrun simctl spawn booted log stream`

### 3c. Backend / API (Node / Bun / Python)
- `pnpm build` + `pnpm exec tsc --noEmit`
- Spin up server in background, wait for ready, `curl` golden-path endpoints, assert status + JSON shape (via `jq`)
- Kill server, scan logs for errors

### 3d. CLI / Scripts
- Run script with golden input, diff output against `tests/golden/`
- Exit code must be 0

### 3e. Cloudflare Workers / Edge
- Install `wrangler`
- `wrangler deploy --dry-run` first
- `wrangler tail` during smoke test
- `curl` deployed preview URL

### 3f. Data writes (Sanity / Supabase / Postgres)
- After any write, query back via the appropriate MCP (`mcp__Sanity__query_documents` / `mcp__supabase__execute_sql`)
- Assert the row/document exists with expected shape
- For migrations: `supabase db diff` shows the diff; `sanity schema validate`

### 3g. Email pipelines (forms, transactional, marketing)
- **Dedicated test inbox** (see Layer 4 — set up `verify@<domain>` or use Mailtrap)
- Submit form / trigger send → wait 30s → poll inbox via Gmail MCP or Mailtrap API
- Assert subject + body contents match expectations

### 3h. SMS pipelines (Twilio / AccuLynx / etc.)
- Use Twilio test credentials send → poll Twilio Messages API for delivery + content
- For AccuLynx native SMS: poll AccuLynx threads API after sending

### 3i. Content / CMS
- Schema validation (Sanity: `sanity schema validate`, frontmatter: `zod` schemas)
- Dead-link scan (`linkinator` or custom)
- LLM coherence pass via Claude API: "any factual contradictions, broken refs, em-dashes for MDR?"

### 3j. Scrapers / automations
- Dry-run mode with cached golden HTML → assert parsed output equals fixture
- For Apify actors: `apify run --local` with test input
- Rate-limit + cost check before live run

---

## Layer 4 — Observability + dedicated test channels

**The problem**: today, "did the form work" means Colin opens his personal Gmail to check. That breaks if he's busy, mixes test data with real leads, and only catches problems he happens to look for.

**Solution**:

### 4a. Dedicated verification accounts
- **Test inbox**: create `colin+verify@gmail.com` (Gmail plus-addressing) OR sign up for Mailtrap free tier (sandbox inbox, programmatic API) — recommend Mailtrap so personal Gmail stays clean
- **Test phone**: Twilio "test credentials" mode OR a dedicated Twilio number used only for verification
- **Test Sanity dataset**: each project gets a `staging` dataset that Verify writes to (already supported by Sanity)
- **Test Supabase branch**: `supabase branches create verify` per project

### 4b. Log streaming during verification
- `vercel logs --follow` runs in background during deploy verification, output piped to verify-log
- `railway logs --service=<name>` similarly
- `gh run watch` for GitHub Actions

### 4c. PostHog integration (already wired via MCP)
- After deploy, query PostHog for any new error events in the last 5 min
- Session replay link surfaced in failure report

### 4d. Visual regression dashboard
- `.verify-log.jsonl` in each project root — append-only log of every Verify run
- Optional: simple `scripts/verify-dashboard.mjs` that renders last 10 runs as HTML

### 4e. Performance + a11y budgets enforced
- Per-project budgets in `.claude-verify.json` (`lcp`, `cls`, `tbt`, `a11yCritical`, `a11ySerious`)
- Verify fails if any budget exceeded

---

## Layer 5 — Workflow upgrades

### 5a. Slash commands
- `/verify` — full matrix
- `/verify --quick` — build + typecheck only (~5s)
- `/verify --deploy` — full deploy roundtrip to preview URL
- `/verify --golden` — with screenshot diff
- `/verify --baseline` — capture new golden screenshots
- `/verify --report` — show last 10 runs from `.verify-log.jsonl`

### 5b. Git pre-commit + pre-push hooks
- `husky` or `lefthook` config in each repo
- `pre-commit`: typecheck + lint
- `pre-push`: full `/verify --quick`
- So verification runs even when Colin commits manually (not just through Claude)

### 5c. GitHub Actions template
- `.github/workflows/verify.yml` template scaffolded per archetype
- Runs same matrix Verify runs locally
- PR check status → Verify reads via `gh pr checks` after push

### 5d. Vercel preview verification
- Every PR → Vercel auto-deploys preview → Verify hits preview URL with Chrome MCP
- Reports back: ✅ deployed + verified, or ❌ broke X

### 5e. Adversarial verification (the "evil twin" pass)
- Optional flag `/verify --adversarial` spawns the **RedTeam** or **Pentester** agent (already exists) to actively try to break the new feature
- Edge case generation, fuzz inputs, attempt XSS/SQL-injection on new forms
- Catches what golden-path testing misses

### 5f. CLI gap fills (install these globally)
| Tool | Purpose | Install |
|---|---|---|
| `@sanity/cli` | Sanity dataset + schema ops | `pnpm i -g @sanity/cli` |
| `supabase` | DB diffs, migrations, branches | `brew install supabase/tap/supabase` |
| `wrangler` | Cloudflare Workers | `pnpm i -g wrangler` |
| `lighthouse` | Performance budgets | `pnpm i -g lighthouse` |
| `@axe-core/cli` | A11y | `pnpm i -g @axe-core/cli` |
| `eas-cli` + `expo` | Native builds | `pnpm i -g eas-cli expo` |
| `maestro` | Native E2E | `brew install mobile-dev-inc/tap/maestro` |
| `linkinator` | Dead link scan | `pnpm i -g linkinator` |
| `pixelmatch` | Visual diff (per-repo dev dep) | `pnpm i -D pixelmatch pngjs` |

### 5g. Memory + skill polish
- `~/.claude/projects/-Users-colinryan/memory/feedback_always_verify.md` — copy this global so it applies in EVERY project's Claude session, not just MDR (currently only in MDR's memory dir)
- Update `~/.claude/CLAUDE.md` (currently points at stale "leandro-roofers-dashboard" project — clean it up, add Verify reference)
- Consider promoting Verify from skill → agent (subagent_type: "Verifier") for parallel verification while Claude continues other work

### 5h. Improve Claude Code session-level patterns
- **Worktrees by default**: every non-trivial task spawns in a worktree (Colin already does this — formalize)
- **GSD plan-mode for big features** (existing `gsd:plan-phase` flow) chains naturally into Verify after each phase
- **Codex rescue** (existing) as fallback when Verify hits 3 iterations without green

---

## Critical files

**Will create:**
- `~/.claude/hooks/handlers/VerifyGate.ts`
- `~/.claude/skills/Verify/Profiles/*.md` (10 files)
- `~/.claude/verify-mode.json`
- `~/.claude/projects/-Users-colinryan/memory/feedback_always_verify.md` (copy from MDR memory dir)
- `.claude-verify.json` in each active project root

**Will modify:**
- `~/.claude/hooks/StopOrchestrator.hook.ts` (add VerifyGate handler import + call)
- `~/.claude/skills/Verify/SKILL.md` (deepen with archetype dispatcher)
- `~/.claude/CLAUDE.md` (clean stale Leandro reference, add Verify)
- Per-project `package.json` files (add `verify` scripts)
- Per-project `.github/workflows/verify.yml` (new)

**Existing utilities to reuse (don't reinvent):**
- `~/.claude/hooks/StopOrchestrator.hook.ts` — Stop hook entry point + transcript parsing
- `~/.claude/skills/PAI/Tools/TranscriptParser.ts` — already used by Stop handlers
- `~/.claude/agents/QATester.md` — existing QA agent, Verify skill can spawn it for browser-heavy validation
- `~/.claude/skills/Browser/SKILL.md` — debug-first Chrome MCP patterns, Verify skill should call this for UI
- `~/.claude/skills/Evals/SKILL.md` — agent-eval framework, can grade Verify run quality
- `~/MDR/.claude/worktrees/wizardly-goodall-f43143/audit-site.mjs` — pattern for headless multi-page screenshot, generalize
- `~/MDR/.claude/worktrees/wizardly-goodall-f43143/tests/*.spec.ts` — Playwright spec patterns, scaffold templates per archetype

---

## Verification of this verification system

Recursive but real: how do we know the Verify system itself works?

1. **Unit test the Stop hook**: write a fake transcript with "I've completed the change" + a recent Edit, pipe to `StopOrchestrator.hook.ts`, assert it injects the gate
2. **Integration test**: in MDR worktree, make a deliberate breaking change (e.g., delete a Sanity query), say "done", confirm Stop hook blocks turn and Verify catches the bug
3. **Golden-path regression**: keep a `.verify-meta-tests/` dir with known-good and known-broken commits; CI runs Verify against each, asserts correct outcome
4. **Manual smoke**: Colin runs a normal build session, observes that Verify auto-fires without his prompting

---

## Rollout order (so we don't try to boil the ocean)

**Week 1** (immediate):
1. Wire `VerifyGate.ts` Stop hook handler (start in soft mode — warn only)
2. Install missing CLIs: sanity, supabase, lighthouse, axe, linkinator, wrangler
3. Promote `feedback_always_verify` memory to user-level (works across all projects)
4. Drop `.claude-verify.json` into MDR + 2 other top projects

**Week 2**:
5. Write archetype profiles for web-astro, web-next, api-node (covers ~80% of active work)
6. Set up Mailtrap test inbox + dedicated Twilio test number
7. Switch Stop hook to "prompt" mode (asks via voice before blocking)

**Week 3**:
8. Native + worker archetypes (Expo for any RN work, Cloudflare for MetaAdsEngine etc.)
9. Visual regression with pixelmatch in MDR
10. `.github/workflows/verify.yml` templates

**Week 4+**:
11. Adversarial verification flag
12. Verify dashboard (HTML render of `.verify-log.jsonl`)
13. Switch Stop hook to "hard" mode once confidence is high

---

## Tools / capabilities worth adding to Claude Code workflow regardless

Even outside verification, these compound:

- **`gh copilot` CLI** — alternative model for code suggestions inline, useful for second opinions
- **`code2prompt`** — pack a directory into one prompt-ready file for cross-session context
- **`repomix`** — same but with token counts and exclusion rules
- **`act`** — run GitHub Actions locally for faster iteration on `.github/workflows/`
- **`bruno` or `httpie`** — API testing CLIs better than curl for golden-path probes
- **Playwright codegen** — record clicks → emit spec. Pair with Claude-in-Chrome MCP for hybrid workflows
- **`watchexec`** — auto-rerun Verify on file change during a "fix the bug" loop
- **PostHog Wizard** (already have MCP) — define funnels Verify can check post-deploy
- **Sentry MCP** if any project hits real users — Verify checks for new error groups post-deploy
- **Knip** — find unused exports/files, run as part of Verify code-quality matrix
- **Biome** or **oxlint** — fast Rust-based linters, ~10x faster than ESLint, more reliable Verify checks
- **`expect` (Bun's built-in test runner)** — faster than Vitest for unit tests, less config

---

## Decisions (locked in)

1. **Stop hook severity**: start **soft** (warn + voice notify). Tune signals first, escalate later.
2. **Test channels**: **Both** — Mailtrap as default for every Verify run; Gmail plus-addressing for occasional prod smoke tests.
3. **CLI install scope**: **Full coverage prioritized for MDR + PlanWell** (two highest-paying clients). Anything that returns data to improve future builds gets installed.

---

## MDR + PlanWell deep dive (the two highest-priority projects)

### Project profiles

**MDR (Modern Day Roofing)** — `/Users/colinryan/MDR`
- Stack: Astro 5 + Sanity (`cy8sc3xd`) + Vercel + React islands + Tailwind v4
- External pipelines: AccuLynx SMS API (native v3 endpoint), Twilio A2P, contact form → email
- Tests: 8 Playwright specs (accessibility, alicia-audit, cro, form-pipeline, migration, navigation, redirects, seo)
- Existing verification: `audit-site.mjs` (multi-page screenshot), `test-form-pipeline.sh`
- 17 location pages + 8 service pages + blog + gallery + legal — broad surface

**PlanWell Financial** — `/Users/colinryan/PLAN WELL/planwell-site`
- Stack: Astro 5 + Sanity (`nwzt57tx`) + Vercel + Docker + nixpacks
- External pipelines: **Mailchimp** (audience `36da6474c8`, ~1,680 subs), **Zoom OAuth** (webinars), **n8n workflows**, **webhook-server** (separate service)
- Tests: 9 Playwright specs — **and 5 of them test financial calculators** (FERS, supplement, sick-leave, high3, calculator-index)
- This is the dangerous one: calculator outputs drive retirement decisions for federal employees. Wrong number = real client harm + legal exposure.

### Verification gaps unique to MDR + PlanWell (what manual testing currently catches that auto doesn't)

| Gap | Current state | Plan |
|---|---|---|
| **Calculator math correctness** (PlanWell) | Playwright tests exist but no property-based / fuzz testing; edge cases (year boundaries, special provisions, MRA+10) under-covered | Add **property-based tests** via `fast-check`: generate random valid inputs, assert invariants (e.g., FERS pension monotonic in years of service). Run on every change to `src/lib/calculators/*`. |
| **Mailchimp send → inbox delivery** (PlanWell) | Manual: send test campaign, check inbox | Mailtrap test list + Mailchimp test send API; Verify polls Mailtrap for delivery within 90s |
| **Zoom registration roundtrip** (PlanWell) | Manual: register, check Zoom dashboard | Use Zoom Server-to-Server OAuth to query registrants list after form submit |
| **Webhook server health** (PlanWell) | Manual: check it's up | Verify hits `/health` endpoint + sends a test payload through, asserts downstream effect |
| **n8n workflow integrity** (PlanWell) | Manual: open n8n UI, check executions | n8n-mcp tools (`n8n_executions`, `n8n_health_check`, `n8n_test_workflow`) — Verify runs after any workflow edit |
| **AccuLynx SMS delivery** (MDR) | Manual: send test SMS, watch phone | Use AccuLynx threads API to poll for outbound message after Verify triggers it. Twilio Messages API as fallback. |
| **Contact form → email → CRM** (MDR) | Manual: submit form, check Gmail, check AccuLynx | Mailtrap receives form notification + AccuLynx API verifies lead was created. Both within 60s. |
| **Sanity content drift** (both) | Manual: browse pages, look for broken refs | Daily GitHub Actions cron: `sanity schema validate` + `linkinator` against built site + Verify schema integrity rules (no orphan refs, no missing images) |
| **Vercel prod deploy smoke** (both) | Manual: visit site after deploy | Vercel deploy hook → Verify hits prod URL with Chrome MCP, checks top 5 pages, PostHog query for new errors in 5 min window |
| **Visual regression** (both) | Manual: spot-check after design changes | pixelmatch against `tests/golden/` per page; PlanWell already has snapshots in `site-updates.spec.ts-snapshots/` (build on this) |
| **SEO meta + schema correctness** (both) | Manual: view-source spot-check | Custom Playwright matcher: every page has title, description, OG image, JSON-LD (LocalBusiness/Article/BreadcrumbList), canonical. Fail on missing. |
| **A11y baseline** (both) | Untested | axe-core CLI run, 0 critical/serious violations allowed |
| **Performance budgets** (both) | Untested in CI | Lighthouse CI: LCP < 2.5s, CLS < 0.1, TBT < 200ms |

### What gets installed first (per the "Mailtrap + Gmail" + "full coverage for top 2" decisions)

```bash
# Global CLIs (all)
pnpm i -g @sanity/cli lighthouse @axe-core/cli linkinator
brew install supabase/tap/supabase  # for any project that adds Supabase
pnpm i -g eas-cli expo                # in case Colin builds RN apps (low priority)

# Per-project (MDR + PlanWell)
cd ~/MDR && pnpm i -D pixelmatch pngjs fast-check @lhci/cli
cd "~/PLAN WELL/planwell-site" && pnpm i -D pixelmatch pngjs fast-check @lhci/cli
```

### Per-project `.claude-verify.json` (concrete starter values)

**MDR**:
```json
{
  "archetype": "web-astro",
  "commands": ["pnpm build", "pnpm test"],
  "urls": [
    {"path": "/", "name": "home"},
    {"path": "/services", "name": "services-listing"},
    {"path": "/services/roof-replacement", "name": "service-detail"},
    {"path": "/areas/roanoke", "name": "area-page"},
    {"path": "/contact", "name": "contact-form", "interactions": ["fill-form", "submit"]},
    {"path": "/gallery", "name": "gallery"}
  ],
  "emailRoundtrip": {
    "provider": "mailtrap",
    "expectSubjectContains": "MDR contact lead",
    "timeoutMs": 60000
  },
  "smsRoundtrip": {
    "provider": "twilio-test",
    "via": "acculynx-v3"
  },
  "dataReadback": [
    {"system": "sanity", "query": "*[_type=='lead']|order(_createdAt desc)[0]"}
  ],
  "deployTarget": "vercel",
  "budgets": {"lcp": 2500, "cls": 0.1, "a11yCritical": 0, "a11ySerious": 0},
  "postDeployChecks": ["posthog-errors-5m", "broken-links"],
  "maxIterations": 3
}
```

**PlanWell** (additional fields for Mailchimp/Zoom/n8n):
```json
{
  "archetype": "web-astro",
  "commands": ["pnpm build", "pnpm test"],
  "urls": [
    {"path": "/", "name": "home"},
    {"path": "/calculators", "name": "calculator-index"},
    {"path": "/calculators/fers", "name": "fers-calc", "interactions": ["fill-form", "calculate"]},
    {"path": "/calculators/supplement", "name": "supplement-calc"},
    {"path": "/webinars", "name": "webinars"},
    {"path": "/articles", "name": "articles"}
  ],
  "propertyTests": {
    "dirs": ["src/lib/calculators/"],
    "tool": "fast-check",
    "iterations": 1000
  },
  "emailRoundtrip": {
    "provider": "mailtrap",
    "secondary": "mailchimp-test-send",
    "expectSubjectContains": "PlanWell"
  },
  "zoomRoundtrip": {
    "enabled": true,
    "webinarId": "test-webinar-placeholder",
    "checkRegistrantWithin": 60000
  },
  "n8nChecks": {
    "healthCheckBeforeVerify": true,
    "validateChangedWorkflows": true
  },
  "webhookServer": {
    "healthUrl": "https://planwell-webhooks.<host>/health",
    "testPayload": "scripts/test-webhook-payload.json"
  },
  "dataReadback": [
    {"system": "sanity", "query": "*[_type=='article']|order(_updatedAt desc)[0]{title, slug}"},
    {"system": "mailchimp", "endpoint": "/lists/36da6474c8/members"}
  ],
  "deployTarget": "vercel",
  "budgets": {"lcp": 2500, "cls": 0.1, "a11yCritical": 0, "a11ySerious": 0},
  "postDeployChecks": ["posthog-errors-5m", "broken-links", "calculator-snapshot-diff"],
  "maxIterations": 3
}
```

### MDR-specific verification scripts to add

- `scripts/verify-acculynx-sms.mjs` — sends test SMS via AccuLynx v3, polls AccuLynx threads API for delivery confirmation
- `scripts/verify-contact-form.mjs` — fills contact form via Chrome MCP, polls Mailtrap for receipt, queries Sanity for lead document
- `scripts/verify-twilio-a2p.mjs` — confirms A2P registration status, fails if rejected

### PlanWell-specific verification scripts to add

- `scripts/verify-calculators.mjs` — fast-check property tests against `src/lib/calculators/*`:
  - FERS pension monotonic in years of service
  - Supplement is positive for retirees < 62
  - High-3 ≥ average of last 3 years salary
  - No NaN/Infinity outputs for any valid input
- `scripts/verify-zoom-webinar.mjs` — registers via form, queries Zoom registrants API
- `scripts/verify-mailchimp-send.mjs` — sends test to `verify@mailtrap.<id>.io` Mailtrap inbox, polls for delivery
- `scripts/verify-n8n-health.mjs` — uses n8n-mcp to assert all critical workflows pass
- `scripts/verify-webhook-roundtrip.mjs` — sends test payload to webhook-server, asserts downstream Mailchimp tag applied or Sanity doc created

### Daily cron Verify (the "did anything drift overnight" check)

GitHub Action `.github/workflows/verify-nightly.yml` per project:
- Runs every night at 06:00 ET
- Full Verify against PROD URL (not preview)
- linkinator on sitemap.xml
- Sanity schema validate
- PostHog: any new error groups in last 24h?
- Mailchimp: bounce rate / spam complaints last 24h?
- Lighthouse: regression vs last week's median
- Posts results to a Slack/Discord webhook (set up if not exists) or emails Colin
- Catches drift you'd otherwise discover when a client complains

### Observability-first additions for MDR + PlanWell specifically

- **PostHog Wizard funnels**: define "contact form → submission → lead created" funnel; Verify queries funnel conversion after deploys
- **Sentry**: add `@sentry/astro` to both projects (free tier covers volume). Verify queries for new error issues after deploy
- **Mailchimp campaign metrics MCP**: write a tiny wrapper that exposes Mailchimp open/click/bounce rates to Verify so post-send health is checked automatically
- **Sanity webhook validators**: when Sanity content updates, Sanity calls a Verify webhook that does a quick rebuild + screenshot diff
- **Calculator regression snapshots**: store golden outputs for 50 representative inputs per calculator. Any code change → run inputs through new code, diff outputs, fail Verify on any difference unless explicitly bless-rebased

---

## Marketplace finds (from claudemarketplaces.com crawl)

These are skills and MCP servers found via Firecrawl crawl of claudemarketplaces.com — high-leverage additions Colin doesn't have yet:

### Install immediately (top priority)
| Item | Type | What it does | Why it matters |
|---|---|---|---|
| **Sentry MCP** (`getsentry/sentry-mcp`) | MCP | Query Sentry error groups, issues, releases | Verify queries Sentry after deploy: "any new errors in last 5 min?" — real-user error tracking |
| **BrowserTools MCP** (`agentdeskai/browser-tools-mcp`) | MCP | Console logs, network requests, screenshots, built-in Lighthouse/SEO/A11y audits | Alternative to Claude-in-Chrome with built-in audits — one tool instead of three |
| **Microsoft Playwright MCP** (`microsoft/playwright-mcp`) | MCP | Official Microsoft Playwright MCP | Likely better than current Playwright CLI usage; structured tool calls |
| **anthropics/webapp-testing** | Skill | Official Anthropic webapp testing skill | Battle-tested patterns from Anthropic itself |
| **addyosmani/web-quality-skills** | Skills | `accessibility`, `performance`, `seo` skills | One-line activation of perf/a11y/SEO audits in Verify matrix |
| **vercel-labs/agent-skills** | Skills | `deploy-to-vercel` + `agent-browser` | Official Vercel deploy + browser skills |
| **obra/superpowers** | Skills | `dispatching-parallel-agents`, `finishing-a-development-branch` | Parallel agent orchestration + structured "wrap up branch" workflow that pairs perfectly with Verify |
| **getsentry/xcodebuildmcp** | MCP | iOS/Xcode builds via MCP | Future-proofing if Colin builds native apps |

### Install when relevant
| Item | Type | When to install |
|---|---|---|
| **Cloudflare MCP** (`cloudflare/mcp-server-cloudflare`) | MCP | If MetaAdsEngine or similar deploys to Workers |
| **GitHub MCP** (official) | MCP | Replaces some `gh` CLI calls with structured tool use |
| **Prometheus MCP** | MCP | If self-hosting any service with metrics |
| **AWS MCP** | MCP | If anything moves to AWS |
| **convex-quickstart / convex-migration-helper** | Skills | If trying Convex as Sanity/Supabase alternative |
| **firebase-basics / firebase-hosting-basics** | Skills | If anything uses Firebase Auth or Firestore |

### Already in your system (confirm + leverage)
- `firecrawl` + `firecrawl-scrape` / `crawl` / `interact` / `map` — **Colin pays for Firecrawl, full integration plan below**
- `n8n-mcp` — already have, use in PlanWell verification matrix
- `posthog` — already have, use for post-deploy error queries
- `Sanity` MCP — already have
- `Supabase` MCP — already have
- `Claude_in_Chrome` MCP — already have

---

## Firecrawl integration (you're paying for it — use it everywhere)

Firecrawl isn't just a research tool. It's a continuous-verification engine for content + competitor + production monitoring. Wire it into:

### 1. Production drift detection (nightly cron per project)
```bash
# Nightly: firecrawl-map prod sitemap, compare vs yesterday
firecrawl map https://modernroofers.com > .verify/sitemap-today.txt
diff .verify/sitemap-yesterday.txt .verify/sitemap-today.txt > .verify/sitemap-diff.txt
# Alert if pages disappeared or unexpected new ones appeared
```

### 2. Visual regression via Firecrawl screenshot mode
```bash
# Per route, capture screenshot — diff against golden
firecrawl scrape https://modernroofers.com/services/roof-replacement --formats screenshot
```
Built-in alternative to pixelmatch — uses Firecrawl's headless infra.

### 3. Post-deploy content correctness check (FACT-CHECK mode)
```bash
# Pull markdown of changed routes, feed to Claude API for fact-check
firecrawl scrape https://modernroofers.com/contact --formats markdown
# Then: does the markdown still contain Alicia's phone, email, address from project_launch_data.md?
```
This catches the "Sanity content drifted and the contact page no longer shows the right phone number" failure mode — which manual testing rarely catches.

### 4. Competitor monitoring (weekly cron)
- MDR: scrape Cenvar Roofing + Roman Roofing nightly, diff for service additions / pricing changes / new service areas
- PlanWell: scrape Serving Those Who Serve + The Fed Corner + FEBA, alert on new article topics → feeds keyword research pipeline

### 5. Content opportunity discovery
- PlanWell: scrape OPM news, TSP news, Federal Times weekly → surface trending federal retirement topics → feed PlanWellContent skill as suggested article topics

### 6. Lead intelligence (MDR area pages)
- Weekly: scrape Google reviews + Yelp for MDR + competitors in each service area
- Surface fresh review quotes for testimonials → feed `testimonial-collector` skill
- Detect competitor review velocity (are they catching up? slowing down?)

### 7. Backlink + SEO drift
- Monthly: firecrawl-map your own site → compare to Google indexed URLs (via Search Console MCP if added) → catch deindexed pages

### Firecrawl skill wiring
Already have these skills installed:
- `firecrawl` — full CLI wrapper
- `firecrawl-scrape` — single-page extract
- `firecrawl-map` — sitemap discovery
- `firecrawl-crawl` — multi-page crawl
- `firecrawl-search` — web search with content
- `firecrawl-interact` — actions on JS-heavy pages
- `firecrawl-agent` — structured data extraction
- `firecrawl-download` — bulk site download

**Verify skill should invoke `firecrawl-scrape` automatically** in its UI verification step for any deployed URL — gets clean markdown + screenshot in one call.

---

## Updated rollout (revised with marketplace finds)

**Week 1**:
1. Install Sentry MCP + BrowserTools MCP + Microsoft Playwright MCP (replaces ad-hoc Playwright usage)
2. Install marketplace skills: `anthropics/webapp-testing`, `addyosmani/web-quality-skills`, `vercel-labs/agent-skills`, `obra/superpowers`
3. Wire VerifyGate Stop hook (soft mode)
4. Add Sentry to MDR + PlanWell (`@sentry/astro`)
5. Mailtrap account + dedicated test inbox per project
6. Set FIRECRAWL_API_KEY in env so Verify can use Firecrawl reliably

**Week 2**:
7. `.claude-verify.json` for MDR + PlanWell with full schemas (see above)
8. Calculator property tests (`fast-check`) for PlanWell — highest risk reduction
9. Nightly Firecrawl drift detection cron per project
10. `verify-acculynx-sms.mjs`, `verify-contact-form.mjs`, `verify-calculators.mjs`

**Week 3**:
11. Competitor monitoring via Firecrawl (MDR + PlanWell)
12. Switch VerifyGate to "prompt" mode (asks before blocking)
13. PostHog funnel definitions + alerts
14. Visual regression with Firecrawl screenshots in MDR + PlanWell

**Week 4+**:
15. GitHub Actions templates for nightly Verify
16. Promote VerifyGate to hard mode after confidence built
17. Adversarial verification (`/verify --adversarial`)
18. Verify dashboard renderer
