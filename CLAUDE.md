# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repositories

| Repo | URL | Contents |
|---|---|---|
| **OMEN-PUB** | `https://github.com/OMARO000/OMEN-PUB.git` | This codebase — public Next.js app |
| **OMEN-PRI** | `https://github.com/OMARO000/OMEN-PRI.git` | Trade secrets — `companies.txt`, `AI_RESEARCH_PROMPT.md` |

Local paths: `~/Documents/OMEN/omen-app` (pub) · `~/Documents/omen/omen-private` (pri)

## Project

**OMEN** — Corporate Accountability Intelligence Operating System, built by OMARO Public Benefit Corporation. A permanent public record for tracking corporate conduct.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build production bundle
npm run lint     # Run ESLint

# Database
npx drizzle-kit generate   # Generate migrations from schema changes
npx drizzle-kit migrate    # Apply pending migrations to omen.db
npx drizzle-kit studio     # Open Drizzle Studio (GUI)
```

No test framework is configured yet.

## Architecture

Next.js 16 app using the **App Router** (`/app` directory). TypeScript strict mode throughout — `ignoreBuildErrors` must never be set. The `@/*` path alias resolves to the project root.

**Routes**: `/about`, `/ledger`, `/dashboard`, `/oca`, `/api` (docs page), `/legal-battles`

**Styling**: Tailwind CSS v4 — uses `@import "tailwindcss"` syntax (not the older `@tailwind` directives). PostCSS is configured via `@tailwindcss/postcss`. Design tokens live in CSS custom properties in `app/globals.css` (no Tailwind config file needed for v4).

**Database**: Drizzle ORM with `better-sqlite3` (SQLite now, migrating to PostgreSQL/Supabase later). Schema is at `db/schema.ts`. Config is at `drizzle.config.ts`. The SQLite file is `omen.db` (gitignored). Use `DATABASE_URL` env var to override the default path.

15 tables: `blocks`, `companies`, `company_policies`, `staged_blocks`, `users`, `alternatives`, `votes`, `api_clients`, `api_audit_logs`, `legal_attacks`, `contributions`, `contribution_payments`, `documents`, `feedback`, `analytics_events`

`ViolationTag` is a TypeScript `as const` tuple (not a native SQLite enum): `['GOOD', 'BAD', 'UGLY', 'BROKEN_PROMISE']`. Columns use `text().$type<ViolationTag>()`. Enforcement is at the Zod layer in `lib/validations.ts`.

**DB singleton**: `lib/db.ts` exports a `db` instance using `globalThis.__omenDb` to survive Next.js HMR in development.

**Validation**: `lib/validations.ts` — `blockSchema` and `companySchema` using Zod v4. Add new schemas here for every new input surface.

**Proxy (middleware)**: `proxy.ts` at the root — Next.js 16 renamed `middleware.ts` to `proxy.ts`. Rate limiting stub, runs on `/api/:path*`. Export is `proxy` (not `middleware`). Full implementation deferred to Phase 3.

**Error boundaries**: `app/error.tsx` (global) + one `error.tsx` per route directory. All are `"use client"` components.

**Key installed SDKs (not yet integrated)**:
- `@anthropic-ai/sdk` — Claude AI integration
- `@pinata/sdk` — IPFS storage via Pinata

## Design System

- Background: `#1A1A1A` (charcoal), CSS var: `--omen-bg`
- Text: `#F5F5DC` (paper white), CSS var: `--omen-text`
- Surface: `#242424`, CSS var: `--omen-surface`
- Border: `#3A3A3A`, CSS var: `--omen-border`
- Muted text: `#9A9A8A`, CSS var: `--omen-muted`
- Font: system monospace stack (`ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace`)
- No emojis anywhere in the UI
- Aesthetic: archival, institutional, permanent record

**ViolationTag colors** (color-coded only, no icons). Use the CSS vars or the utility classes (`.tag-ugly`, `.tag-broken-promise`, `.tag-bad`, `.tag-good`):
| Tag | CSS Var | Hex |
|---|---|---|
| `UGLY` | `--tag-ugly` | `#8B0000` |
| `BROKEN_PROMISE` | `--tag-broken-promise` | `#D4AF37` |
| `BAD` | `--tag-bad` | `#CD853F` |
| `GOOD` | `--tag-good` | `#228B22` |

## Security & Validation

- Zod schemas required for all inputs — add to `lib/validations.ts`
- Rate limiting middleware stub in `proxy.ts` (full implementation in Phase 3)
- Error boundaries on all route pages
- Trade secrets (companies list, AI prompts) loaded from env vars only — never hardcoded
- `.gitignore` covers: `.env*`, `companies.txt`, `prompts/`, `proprietary/`, `omen.db`, `drizzle/`

## Accessibility

Implemented WCAG quick wins in `app/globals.css`:
- Skip nav link (`.skip-nav` class, renders in `layout.tsx`)
- Visible `:focus-visible` outlines on all interactive elements
- `@media (prefers-reduced-motion: reduce)` disables all animations/transitions
- Semantic HTML throughout (`<header>`, `<nav>`, `<main id="main-content">`, `<footer>`, `<article>`, `<section>` with `aria-labelledby`)

## Auth (Phase 5, not yet built)

Mullvad-style account numbers — no email, no password.

## Environment Variables

No `.env.local` exists yet. Expected variables:
- `DATABASE_URL` — path to SQLite file (defaults to `./omen.db`)
- `ANTHROPIC_API_KEY` — Anthropic SDK
- `PINATA_API_KEY` / `PINATA_API_SECRET` — Pinata IPFS SDK
- Companies list and AI prompts loaded from env vars (not committed to repo)
