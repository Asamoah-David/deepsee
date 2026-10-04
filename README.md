# DeepSee

**Universal Windows Device Operations Platform**

A multi-tenant, web-based platform for remotely accessing, monitoring, managing, automating, and supporting Windows devices — from one browser-based Command Center.

---

## What is DeepSee?

DeepSee lets individuals, IT teams, businesses, schools, enterprises, and MSPs:

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
| Auth | Supabase Auth + TOTP MFA |
| AI | Groq (Llama 3.3 70B) |
| Relay | Node.js WebSocket server |
| Agent | C# .NET 8 Windows Service |
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

# Start local Supabase + relay
docker-compose -f docker/docker-compose.yml up -d

# Copy environment files
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

The Command Center will be available at `http://localhost:3000`.

---

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
