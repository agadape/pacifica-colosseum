# Pacifica Colosseum — Agent Instructions

## Project Context
This is a Battle Royale trading competition platform built on Pacifica's perpetual futures exchange, for the Pacifica Hackathon 2026 (deadline: April 16, 2026).

## Required Reading (in order)
1. `DEVELOPMENT_LAYERS.md` — **THE source of truth.** Layer-by-layer task checklist. Check current progress here first.
2. `PROTOCOL.md` — Distilled game rules (round parameters, elimination logic, loot rules).
3. `COLOSSEUM_BLUEPRINT.md` — Full project spec (DB schema, backend services, frontend architecture, API integration).
4. `pacifica-sdk/` — Python SDK examples showing exact Pacifica API call patterns. Use as reference for TypeScript implementation.

## Session Setup
- At the start of every session, run `/reload-plugins` to ensure the frontend-design plugin is loaded.

## Development Rules

### Per-Layer Workflow (MANDATORY — 4 phases per layer)

**Phase 1: PREP** (before writing any code)
1. Read layer tasks from `DEVELOPMENT_LAYERS.md`
2. Research new packages: check npm, read `.d.ts` types, check compatibility with our stack
3. `df -h /` — check disk space
4. Identify blockers (env vars, accounts, API access not yet available)
5. Present quick plan to user — **user must approve before proceeding to Phase 2**

**Phase 2: EXECUTE** (after user approves plan)
1. Install packages (foreground, single run)
2. Write ALL files (batched, parallel where possible)
3. `tsc --noEmit` once at the end
4. Quick verification (curl, script, etc.)

**Phase 3: FIX** (only if errors in Phase 2)
1. Diagnose root cause first — never blind retry
2. Fix → re-verify
3. Max 2 fix cycles. If still failing → stop and discuss with user

**Phase 4: CLOSE**
1. Update `DEVELOPMENT_LAYERS.md` — all checkboxes + progress table + resuming notes in ONE batch edit
2. Write iteration summary in `iteration/`
3. **STOP** — wait for user review before next layer

### Task Tracking
- Work from `DEVELOPMENT_LAYERS.md`. Do NOT freelance tasks outside of it.
- Follow layer order. Check dependency graph before jumping ahead.
- If a task is partially done, mark it `[/]` and note what remains in the resuming section.

### Git Discipline
- **Commit after every completed layer.** Message format: `layer-N: short description`
- After each commit, append an entry to `COMMITS.md` at project root with:
  - Commit hash (short), layer number, date
  - Files added/modified count
  - What works at this checkpoint (one-liner per feature)
  - Known issues at this point
- This serves as a **rollback reference** — if something breaks at Layer 8, scan the table to know exactly which commit to revert to and what state the project was in.

### Frontend Design Direction (MANDATORY for Layers 9-11)
- Follow `iteration/frontend-design-direction.md` for all visual decisions.
- **Aesthetic**: Clean minimalist, cinematic, light theme. joseph-san.com elegance + bombon.rs playful motion.
- **Core rules**:
  - One idea per section. Full-viewport sections. Big typography, few words.
  - Whitespace IS the design. No clutter, no walls of text.
  - Light base (#FAFAF8), dark overlays only for dramatic moments (elimination, round transition, winner).
  - Display font for headings (NOT Inter). Inter for body. JetBrains Mono for numbers.
  - All animations via Framer Motion (already installed). No Three.js. No new heavy packages.
  - Scroll-triggered reveals (`whileInView`), page transitions (`AnimatePresence`), stagger effects.
- **Use the `/frontend-design` skill** when building UI components for high design quality.
- **Whenever adding/changing colors, fonts, animations, or component patterns** — immediately update `iteration/frontend-design-direction.md`. This file must always reflect the current design state, not just initial decisions.

### Code Standards
- TypeScript strict mode. No `any` types unless absolutely unavoidable.
- Use the tech stack specified in the blueprint: Next.js 15, React 19, Tailwind v4, Zustand, TanStack Query.
- Engine runs as a separate persistent Node.js process (not Vercel serverless).
- All Pacifica API calls happen server-side only. Never expose private keys to the client.
- Use Pacifica **testnet** URLs: `https://test-api.pacifica.fi/api/v1` and `wss://test-ws.pacifica.fi/ws`.

### API Response Convention
- **Success**: `{ data: T }` with 200/201
- **Error**: `{ error: string }` with proper HTTP status (400/401/404/409/500)
- **List**: `{ data: T[], pagination: { page, limit, total } }`
- Never deviate from this shape.

### Security: No Leaking Secrets in API Responses
- **NEVER use `select("*")` in API route responses.** Always list columns explicitly.
- Define safe column lists as constants (e.g., `ARENA_PUBLIC_COLUMNS`, `PARTICIPANT_PUBLIC_COLUMNS`).
- Columns that must NEVER appear in responses: any field ending in `_encrypted`, `_secret`, or `private_key`.

### Status Types
- Define union types for all status fields in `src/lib/utils/constants.ts`:
  - `ArenaStatus = "registration" | "starting" | "round_1" | ...`
  - `ParticipantStatus = "registered" | "active" | "eliminated" | ...`
  - `RoundStatus = "pending" | "active" | "eliminating" | "completed"`
- Use these types in function signatures. Never compare against bare string literals without the type backing them.

### Env Validation
- Create `src/lib/env.ts` that validates all required env vars at import time.
- API routes and engine import from this file instead of reading `process.env` directly.
- Missing env var = immediate throw with clear message, not a silent undefined at runtime.

### Engine ↔ Next.js Communication
- Engine exposes internal REST endpoints for Next.js to call after DB writes:
  - `POST /internal/arenas/:id/schedule` — schedule arena start timer
  - `POST /internal/arenas/:id/cancel` — cancel scheduled start
- Guard with `INTERNAL_API_KEY` env var in Authorization header.
- Next.js API routes call these endpoints after creating/modifying arenas.

### Iteration Summaries (MANDATORY)
- After completing each layer, **STOP** and create a detailed iteration summary.
- Create files in the `iteration/` folder at project root.
- Naming convention: `layer-{N}-{short-name}.md` (e.g., `layer-0-foundation.md`).
- Each summary must include:
  - What was created (new files, directories)
  - What was modified (existing files changed)
  - What was installed (packages, dependencies)
  - Key decisions made and why
  - What works / how to verify
  - What was skipped and why
  - What's next
- This is a hard stop — do NOT proceed to the next layer until the iteration summary is written and reviewed by the user.

### Efficiency Rules (MANDATORY — respect user's time)
- **NEVER run `npm install` as background command** — always foreground with `timeout: 180000`. Polling background output wastes more time than waiting.
- **Check disk space** (`df -h /`) before any `npm install` that adds >3 packages. If <5GB free, clean npm cache first.
- **Research package type interfaces before writing manual types** — grep `node_modules` for expected type shapes (e.g., `GenericTable`, `GenericSchema`). Don't guess and fix later.
- **Don't retry blindly** — if a command fails, diagnose root cause first. Max 1 retry, then pivot approach.
- **One dev server** — start once on one port, reuse for all verification. Don't spawn multiple servers on different ports.
- **Batch file writes** — write ALL files for a task group before running type-check. Not one-by-one with checks in between.
- **Batch DEVELOPMENT_LAYERS.md updates** — update all checkboxes + progress table + resuming notes in ONE editing pass at end of layer. Not after each individual task.
- **When adding packages**, immediately check their `.d.ts` type requirements before writing consuming code.
- **Always run `tsc --noEmit` after writing a batch of new files** — catch type errors early before building more on top.

### Parallelization Strategy
- **Use sub-agents (Agent tool) for independent research** — e.g., read SDK docs while writing code files.
- **Write code while npm installs** — npm install runs foreground, but use the waiting time to plan next steps mentally, not to spawn competing installs.
- **Parallelize file writes** — use multiple Write tool calls in a single message for independent files.

### What NOT to Do
- Do NOT add features not in the blueprint. Ask first.
- Do NOT skip layers or tasks. Follow the order.
- Do NOT create README.md, docs, or extra markdown files unless asked.
- Do NOT install packages not mentioned in the blueprint without asking.
- Do NOT modify DEVELOPMENT_LAYERS.md structure — only update checkboxes, progress table, and resuming notes.
