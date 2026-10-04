# DeepSee — Architecture (as-built)

This documents what actually exists, how it maps to `docs/PRODUCT.md`, and every
known deviation. Where this file and the spec disagree, the spec wins and this file
is a bug.

Last updated: Phase 0 complete.

---

## 1. Repository layout

```
apps/
  web/              Next.js 15.1 Command Center
  relay/            Node 22 WebSocket relay (own package, own Dockerfile)
  agent/            C# .NET 8 Windows Agent (CoreService + Worker)
packages/
  database/         SQL migrations, runner, seeds, isolation tests
  shared/           Types, constants, utilities (raw TS, no build step)
  ui/               Presentational components (raw TS, no build step)
docker/             Local PostgreSQL + relay compose stack
docs/               PRODUCT.md, ARCHITECTURE.md, DEVELOPMENT.md, DEPLOYMENT.md
scripts/            Cross-platform tooling (clean.mjs)
```

## 2. Runtime topology

```
Browser (Next.js RSC + client islands)
   │  Supabase Realtime  ← live device status / alerts / commands   [Phase 4]
   │  REST /api/**       ← all mutations, permission-checked, org-scoped
   │  WS  relay?token=   ← screen frames + input (data plane)        [Phase 5-6]
   ▼
Next.js Route Handlers ── Supabase (Postgres + RLS + Auth)
   │
   ▼
Relay (Node + ws) ── device JWT verification, frame routing
   ▼
DeepSee.Agent (Windows Service, SYSTEM, Session 0)
   │  named-pipe IPC                                              [Phase 5]
   ▼
DeepSee.Worker (Session 1+, launched with the WTS user token)
```

**Design commitments**

- The relay owns sockets; Postgres owns truth. The relay is stateless for business
  data.
- Device identity is verified with the server's public key (RS256) so no shared
  secret ships to endpoints (§75, §213).
- Browser mutations go through route handlers that check permission and stamp
  `org_id` server-side. RLS is the second line of defence, never the only one (§86).

## 3. Layer status

| Layer | Spec | State |
|---|---|---|
| Tenant + auth | §8, §86, §93 | Schema exists; RLS **unsound** (see §5). Web auth is still a mock. |
| Device identity | §74, §75 | Agent generates RSA-2048, DPAPI-protected at `%ProgramData%\DeepSee\identity.enc`. Server side not built. |
| Enrollment | §72–76 | Agent-side claim request written; `/api/enrollment/claim` does not exist. |
| Persistent connection | §76 | Relay verifies JWTs and manages rooms. Heartbeats are broadcast and discarded — nothing is persisted. |
| Screen streaming | §16 | Worker can capture (GDI → JPEG). No frame ever reaches the network. |
| Remote input | §17 | `InputEngine` implemented. Unreachable — no IPC. |
| Files | §22 | `FileEngine` implemented. Unreachable — no IPC. |
| Monitoring | §43 | Agent collects CPU/RAM/disk/network. Relay does not persist it. |
| Automation, AI, enterprise | §63+, §67+, §128+ | Not started. |

## 4. What Phase 0 delivered

- Git repository initialised; LF normalisation via `.gitattributes`.
- `docs/PRODUCT.md` (full specification) and `.clinerules` (project rules).
- **Type-check, lint and build all pass** across 5 workspace packages.
  - Typed environment layer: `apps/web/src/env.ts` + `apps/web/src/env.d.ts`.
  - Shared flat ESLint config at the repo root for non-Next packages; a
    Next-specific one in `apps/web`.
- Both Dockerfiles fixed. `.dockerignore` added for both build contexts.
- Replaced the hand-rolled Supabase compose stack with a correct PostgreSQL +
  relay stack.
- CI (`ci.yml`): quality gate plus a database job that migrates an empty database
  twice and then runs isolation tests. Deploy (`deploy.yml`) is now gated on CI and
  runs production migrations first.
- Security headers including a CSP added in `next.config.ts`.