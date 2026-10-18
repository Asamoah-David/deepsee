# DeepSee delivery roadmap

`docs/PRODUCT.md` is the long-term product authority. This roadmap sequences that
scope into release gates; it does not remove product requirements. The project
bible supplied with the recovery request is supporting context. Where its
language conflicts with the safety constraints in `docs/PRODUCT.md`, the product
specification governs.

## Release status

Status labels describe the repository as inspected on 2026-10-18:

- **Partial** — a foundation or UI exists, but the complete user outcome is not
  connected and verified end to end.
- **Not started** — no production implementation was found during this pass.
- **Blocked for verification** — implementation exists but its release check
  could not run in the available environment.

No phase is considered production-ready until its gate is demonstrated in CI or
in a documented release run. Build success alone does not satisfy a gate.

| Phase | Product coverage | Exit gate | Status |
|---|---|---|---|
| 1. Product and repository baseline | Product spec; navigation, API, schema, relay, agent capability inventory | Inventory labels every user-facing capability as implemented, partial, mocked, or absent; setup and architecture match code; backlog maps to product sections | Partial: architecture/setup reconciled; inventory needs completion |
| 2. Security and delivery foundation | Tenant isolation, authentication boundaries, migration/deploy safety | Disposable-DB migration checks; cross-tenant read/write denial; authorization and role checks; deployment targets actual supported branches | Partial: RLS, tenant write policy, API/relay checks, locking and branch alignment added; DB gate blocked for verification |
| 3. Authentication, tenancy and governance | Product spec §§2, 86, 130, 188, 215, 224–225 | Signup/signin/session lifecycle, onboarding, invitations, scoped roles, MFA, revocation and audit verified across UI/API/database | **Implementation complete; release verification deferred.** Scoped member visibility is enforced by database policies and shown in `/users`; device groups, placement and revocation are audited; TOTP recovery codes are hashed, single-use and rate-limited; owner/super-admin MFA reset and organization MFA enforcement are connected; audit history is tenant-scoped and persisted. Migrations 021–024 are applied. Browser flows and web checks pass; isolated DB and destructive provider-recovery gates still need a suitable release environment. |
| 4. Enrollment and device identity | Product spec §§8, 17–20, 86 | One-time expiring enrollment under concurrency; device proof-of-possession; protected key storage; scoped credential rotation/revocation and audit | **Core implementation added; Windows verification pending.** RSA proof binds enrollment and relay handshakes to the keypair; DPAPI/ACL protects the Windows identity; one-hour versioned JWTs rotate using signed nonces; heartbeat checks credential version; a shared database RPC consumes relay nonces and checks revocation/version; sockets close at JWT expiry and revoked agents stop after heartbeat rejection. Migrations 025–026 are applied. Compile/run the Windows agent and test enrollment, rotation, expiry, reboot, and revoke propagation under network failure. |
| 5. Windows agent and control plane | Product spec §§18–33, 86 | Service/interactive worker IPC, reconnect/replay/expiry/acknowledgement behavior, signed updates and diagnostics validated on Windows | Partial: authenticated heartbeat persistence and enrollment identity checks; IPC and robust recovery remain |
| 6. Production MVP operations | Product spec §§3–6, 14–16, 18–33 | Real screen view/control lifecycle, monitor selection, secure file transfer and device operations verified with a Windows agent; no simulated success | Partial: screen view now requests scoped authorization and renders only real relay frames; agent frame pipeline, control, files and other operations remain |
| 7. Observability and fleet operations | Product spec §§34–71, 86, 90–105 | Historical metrics, alerts, groups/policies, inventory, approved workflows, reporting/search and audited staged bulk outcomes | Not started |
| 8. Support and enterprise | Product spec §§72–89, 106–138, 188–199 | Support/incident workflows, consent, billing/plan enforcement, platform administration, integrations, MSP isolation and enterprise governance | Not started |
| 9. Intelligence and advanced operations | Product spec §§139–177, 200–243 | Tenant-scoped evidence-based read operations first; impactful actions previewed, approved, scoped and audited before execution | Partial: AI route is authenticated and read-only; remaining diagnosis/approval/automation capabilities not started |

## Capability inventory from this pass

This is a release triage, not a claim that every route has been exhaustively
validated. Extend it as phases are implemented and link each row to the relevant
product-spec sections.

| Capability | Current assessment | Evidence / next work |
|---|---|---|
| Sign-in and tenant context | Implemented; session lifecycle release gate pending | Existing Supabase auth, server-derived membership RPCs, invitation acceptance and organization onboarding are connected. Verify refresh/revocation and provider failure/retry scenarios before release. |
| Member governance | Implemented; release verification pending | `/users` includes eligible role management, member removal, invitations, departments and group scopes; scope authorization is enforced in database policies and audited. |
| Account MFA | Implemented; provider recovery flow unverified | TOTP enrollment/challenge, recovery codes, admin reset and organization enforcement are connected. Verify lifecycle with the configured provider and test attempts, reset, recovery and failure outcomes. |
| Device governance | Implemented; revoke propagation gate pending | `/organization` creates device groups; `/devices` assigns department/groups and revokes devices. Membership scopes gate device and device-linked reads, commands, sessions, transfers, tickets, incidents and placement. Verify cross-tenant and revoked-token behavior in integration tests. |
| Audit history | Implemented; coverage gate pending | `/audit` reads tenant records through a role-checked RPC, searches, pages and exports visible records; governance operations append audit events. Confirm action coverage and retention in release testing. |
| First organization creation | Partial | Authenticated atomic server RPC; cover onboarding and retry paths (Phase 3) |
| Organization/device database isolation | Partial | Membership RLS and role-scoped policies added; run disposable Postgres isolation suite (Phase 2) |
| Enrollment and device identity | Implemented; Windows runtime gate pending | Enrollment claims and relay handshakes prove possession of the enrolled RSA key; DPAPI-protected, ACL-restricted identity; signed versioned JWT rotation with unique nonce and audit; version checked at heartbeat and relay handshake; shared database nonce and revocation checks; expired sockets close. Migrations 025–026 applied. Windows compile/runtime and outage/reboot behavior remain. |
| Heartbeats | Partial | Device-token authenticated API persists heartbeat/metrics; verify Windows runtime, expiry, replay and offline transitions (Phase 5) |
| Relay authorization | Partial | Signed tenant admin/device identities and operation-mode checks; add replay, revocation, offline and integration coverage (Phases 2–5) |
| Screen viewing | Partial | Browser requires scoped view token and only displays received frames; Windows capture/IPC path is not connected (Phases 5–6) |
| Remote input, files, terminal, process/service/power actions | Mocked or incomplete | Do not represent these as successful operations until policy-enforced agent handlers and end-to-end evidence exist (Phase 6) |
| AI operations | Partial | Authenticated bounded read-only tools; complete evidence display and provenance; no writes/remediation exposed yet (Phase 9) |
| Monitoring, alerting, fleet operations, reports, incidents and support | Incomplete | Audit each route against persisted data; implement in dependency order (Phases 7–8) |
| Local and hosted delivery | Partial | Setup/architecture docs and branch triggers updated; verify Supabase migration and Railway deploy in release environment (Phase 2) |

## Release gates

1. **Database:** run migrations against an empty disposable database and a prior
   schema snapshot; rerun concurrently; run `pnpm db:test` and retain the output.
2. **Authorization:** test tenant A versus tenant B through direct API, RLS and
   relay paths; include forged, expired, replayed and revoked credentials and
   role/device-scope denial.
3. **Agent:** test Windows enrollment, sleep/reboot, worker failure, relay loss,
   multiple displays, slow networks, interrupted transfers and explicit failure
   reporting on supported Windows versions.
4. **User experience:** exercise real flows in a browser at desktop and narrow
   viewport sizes; verify accessible controls plus loading, empty, offline and
   error states. Simulated data must be visibly identified during development
   and removed from shipped success paths.
5. **Operations:** document backup and restore, health/metrics/logging, secret
   rotation, staged deployment and rollback before production release.

## Current verification limits

In the current implementation pass, the isolated web and relay TypeScript
checks and ESLint checks pass. Monorepo-parallel checks exceeded available
memory while the local preview was running; targeted package checks completed
serially. The
`/users`, `/security`, and `/audit` pages were opened in the signed-in local
browser; the member directory rendered the current account, the security page
rendered the no-factor and organization-policy state, and the audit view
correctly displayed its empty state from the live API. Migrations 015–026 are
recorded and applied to the configured Supabase project. Empty-database,
concurrent-migration and cross-tenant release checks still need to run. Docker
is installed but its daemon is unavailable, so no disposable PostgreSQL server
was available; the isolation harness was not run against the hosted database.
The repository's `pnpm test` command currently has no
configured Turbo test tasks; it is not a test-coverage signal. `pnpm db:test`
was not run because no disposable PostgreSQL/Docker environment was available.
The .NET SDK was unavailable, so Windows agent compilation and runtime
behavior remain unverified. These are open release gates, not passed checks.
