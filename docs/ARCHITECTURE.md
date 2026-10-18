# DeepSee Architecture and Delivery Status

This document describes the repository as it exists. The complete product scope is in [`PRODUCT.md`](PRODUCT.md). A route or UI page is not evidence that the corresponding capability is complete.

## System layout

```text
Command Center (Next.js)
  ├── Supabase Auth + PostgreSQL (tenant-scoped data and RLS)
  ├── Route handlers (authenticated admin operations and device heartbeats)
  └── WebSocket relay (agent and administrator sessions; screen/control data plane)
        └── Windows Agent service + interactive worker (C#/.NET 8)
```

The web, relay, database package and Windows agent are separate deployable components. Railway is the current hosted deployment target; Supabase provides the hosted identity and database services. Local PostgreSQL plus the relay is useful for database and transport work, while a local Supabase stack is required to exercise browser authentication and RLS end to end.

## Security invariants

- Tenant identifiers used for user operations come from authenticated membership and database policies, never from browser-supplied organization ids.
- Membership RLS is enabled. Tenant policies call restricted `SECURITY DEFINER` membership/role helpers to avoid recursive policy evaluation. Authenticated users cannot directly mutate membership roles, audit history, or administrative policy data.
- Organization creation binds the new owner to `auth.uid()` and creates the organization and membership in one database transaction.
- Enrollment links are temporary and atomically single-use. Enrollment claims are signed by the generated RSA device key and checked against the submitted public key. The resulting HS256 device token is short-lived, carries a credential version and key binding, and is rotated by a nonce-protected control-plane RPC.
- The Windows service stores its RSA identity using LocalMachine DPAPI and restricts its identity directory/file ACL to LocalSystem, Administrators, and the service identity. Heartbeats enforce the current credential version; relay upgrades require a fresh RSA proof and a shared database authorization RPC checks nonce replay, current credential version, and revocation before upgrade. Agent sockets close at JWT expiry; heartbeat rejection stops a revoked service connection.
- Administrator screen sessions obtain a five-minute JWT from an authenticated, tenant-scoped endpoint. The token is scoped to one device and the relay enforces its role and session mode. The browser sends it as a WebSocket subprotocol rather than a URL parameter.
- RLS remains defense in depth. Service-role calls require explicit authentication and authorization in their route handler.
- Camera, microphone and activity capabilities must follow the privacy and consent requirements in `PRODUCT.md`; OS controls and indicators are not bypassed.

## Implementation status

| Area | Current state | Remaining production work |
|---|---|---|
| Web application | Next.js app, auth pages, dashboard, device and feature routes exist. Some screens are placeholders or demos. | Replace simulated data and outcomes; complete server-side role/scope authorization and usable loading/error states. |
| Auth and tenancy | Supabase session middleware; membership RLS; role-scoped writes; atomic organization creation; invitations; scoped member access; TOTP/recovery; organization MFA policy; auditable device governance. | Provider recovery and cross-tenant release checks; account lifecycle and security review. |
| Database | PostgreSQL schema and ordered migrations; runner now uses a session advisory lock and supports standalone Postgres auth shims. | Validate the full migration chain on Supabase and upgrades from existing deployments; add backup/restore and broader isolation tests. |
| Enrollment | One-time 128-bit code generation, atomic database claim, RSA proof-of-possession, stored public key, short-lived versioned device JWT. | Compile and exercise enrollment on supported Windows versions; complete enterprise packaging. |
| Agent and relay | Agent identity is DPAPI-protected with restricted ACLs; credentials rotate with RSA proof and audit; heartbeat checks credential version; relay handshakes use shared nonce/revocation/version checks and close agent sockets at JWT expiry. | Validate actual Windows service installation; complete IPC, command and telemetry protocols and verify revoke propagation under failure. |
| Screen, input, files | Agent engines, relay message types and UI surfaces exist. | End-to-end screen streaming, server-enforced session modes, file transfer protocol and integrity/resume behavior are incomplete. The screen UI still has sample rendering. |
| Monitoring and management | Initial telemetry tables and agent snapshot collection exist. | Persist and visualize history, inventory, diagnostics, alerts, services, processes and real command results. |
| Automation, support, AI, enterprise | Routes and initial schema/UI scaffolding exist. | Workflows, tickets, billing, MSP, SSO, integrations and AI operations are not production capabilities; no action may report success unless executed and verified. |
| Delivery | CI workflow covers quality and DB migration checks; Railway deployment workflow runs migrations first. | CI now also targets `master`; run the repaired isolation gate in CI, verify Supabase deployment settings, rollback strategy and production secrets. |

## Delivery order

1. Establish a reproducible baseline and keep documentation synchronized with implementation.
2. Complete tenant isolation, authentication, authorization, migrations and deployment gates.
3. Finish enrollment, cryptographic device identity, credential rotation/revocation and agent connectivity.
4. Complete real screen/control, file transfer and core device management operations.
5. Add monitoring, diagnostics, alerting, history and fleet operations.
6. Add support workflows, commercial and enterprise functions, then policy-scoped AI and advanced operations.

Each capability is complete only when the agent, service/API, persistence, authorization, UI and failure reporting work together. See `PRODUCT.md` for the requirements and release scope.
