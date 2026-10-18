# DeepSee

**Universal Windows Device Operations Platform**

A multi-tenant Windows device operations platform under active development. The product scope includes remote access, monitoring, management, automation and support from one browser-based Command Center. Many dashboard areas are still scaffolding and are not yet production capabilities.

---

## What is DeepSee?

The intended product will let individuals, IT teams, businesses, schools, enterprises, and MSPs:

- Enroll Windows PCs once
- See every device's live status
- View and control screens remotely
- Transfer files
- Monitor performance
- Manage applications, processes, and services
- Run authorized commands
- Automate maintenance
- Handle support incidents
- Operate entire Windows fleets from a single Command Center

---

## Architecture

```
Web Command Center (Next.js 15)
         │
    Supabase (PostgreSQL + RLS + Realtime + Auth)
         │
    Relay Server (Node.js WebSocket)
         │
    Windows Agent (C# .NET 8)
    ├── CoreService (Windows Service)
    └── Worker (User session process)
        ├── DXGI Screen Capture
        ├── Input Engine
        ├── File Engine
        ├── Monitoring Engine
        └── Diagnostics Engine
```

---

## Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15, React 19, TypeScript |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth (MFA is planned, not implemented) |
| AI | Groq integration scaffold (no production remediation) |
| Relay | Node.js WebSocket service; remote operations are incomplete |
| Agent | C# .NET 8 service and worker; end-to-end operations are incomplete |
| Deployment | Docker + Railway |
| Monorepo | Turborepo + pnpm |

---

## Project Structure

```
DeepSee/
├── apps/
│   ├── web/          # Next.js Command Center
│   ├── relay/        # WebSocket relay server
│   └── agent/        # C# .NET 8 Windows Agent
├── packages/
│   ├── shared/       # Shared types + utilities
│   ├── ui/           # Shared UI components
│   └── database/     # Schema, migrations, RLS
└── docker/           # Docker Compose configs
```

---

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- .NET 8 SDK (for Agent development)

### Setup

```bash
# Install dependencies
pnpm install

# Start Supabase locally (provides Auth, Postgres and Realtime)
supabase start

# Copy apps/web/.env.example to apps/web/.env.local and fill in values
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
pnpm db:migrate

# Start the web app and relay in separate terminals
pnpm dev:web
pnpm dev:relay
```

The Command Center will be available at `http://localhost:3000`. Browser authentication requires the local Supabase services; a plain PostgreSQL container is only sufficient for migration and database work.

### Local Supabase (required for web authentication)

Install the Supabase CLI, run `supabase start`, and copy its API URL, anon key, service-role key, and JWT secret into `apps/web/.env.local`. Use the matching local Postgres connection string as `DATABASE_URL`, then run `pnpm db:migrate`. Start the web app and relay with `pnpm dev:web` and `pnpm dev:relay`.

---

## Current implementation status

The dashboard and API contain a mix of working foundations, incomplete integrations and demonstration surfaces. In particular, live screen viewing, remote input, file transfer, fleet automation, support and AI remediation are not complete end-to-end capabilities. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current architecture, [`docs/DELIVERY-ROADMAP.md`](docs/DELIVERY-ROADMAP.md) for phase gates and capability status, and [`docs/PRODUCT.md`](docs/PRODUCT.md) for the complete product requirements.

## Deployment

All services deploy to Railway via Docker:

```bash
# Build all services
pnpm build

# Deploy (via Railway CLI or GitHub push)
railway up
```

---

## License

Proprietary — All rights reserved.
