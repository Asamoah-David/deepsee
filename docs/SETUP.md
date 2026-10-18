# Local Development Setup

DeepSee is a multi-service application. A plain PostgreSQL server can run schema and isolation checks, but the web sign-in flow also needs Supabase Auth. The Windows agent requires Windows and the .NET 8 SDK.

## Web and relay development

Prerequisites: Node.js 20+, pnpm 12, Docker Desktop running Linux containers, the Supabase CLI, and (for agent work) .NET 8 SDK. The repository includes `supabase/config.toml`; the Supabase CLI and a running Docker engine are required to start Auth and PostgreSQL locally.

1. Install JavaScript dependencies with `pnpm install`.
2. Start local Supabase from the repository root with `pnpm supabase:start` (or `supabase start`). This starts Auth at `http://localhost:54321` and Postgres at port `54322`.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and `apps/relay/.env.example` to `apps/relay/.env`. Use `supabase status -o env` to obtain the current local API URL, anon key, service-role key and JWT secret. Set the web app's `NEXT_PUBLIC_RELAY_URL` to `ws://localhost:8080`; set the relay's `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_JWT_SECRET` from the same local Supabase stack. Update these values after resetting or recreating the local stack. Set the app URL to `http://localhost:3000`.
4. Set `DATABASE_URL` to the local Supabase Postgres connection string and apply the ordered migrations with `pnpm db:migrate`.
5. Start `pnpm dev:relay` and `pnpm dev:web` in separate terminals.
6. Open `http://localhost:3000`.

The standalone Compose stack (`docker/docker-compose.yml`) provides PostgreSQL and the relay. It does not run Supabase Auth, Realtime, or Studio; use it for database and relay work rather than browser sign-in.

### Sign-in troubleshooting

- If sign-in reports that authentication is unreachable, verify Docker Desktop is running, then run `pnpm supabase:start` and confirm port `54321` is listening.
- If Supabase starts but sign-in still fails, check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `apps/web/.env.local` match `supabase status -o env`, then restart `pnpm dev:web` so Next.js reloads the public configuration.
- If credentials are accepted but there is no workspace, sign-in routes the account to organization setup. Local email confirmation is disabled only in the local Supabase config; hosted confirmation and recovery flows require production Auth configuration.
- For hosted password recovery, allow the app callback URL (`https://<your-app-host>/auth/callback`) in the Supabase Auth redirect URL allow-list. Keep the hosted email-confirmation policy enabled according to your organization’s security requirements.
- The local environment has no pre-created administrator account. Register one through the app after Supabase is running.

## Database checks

Set `DATABASE_URL` to a disposable local PostgreSQL or Supabase database, then run:

```bash
pnpm db:migrate
pnpm db:migrate
pnpm db:test
```

The migration runner uses a PostgreSQL advisory lock and records each successfully applied migration. The second run should apply no migrations. The isolation check creates temporary fixtures inside a transaction and verifies tenant-scoped reads and cross-tenant write denial.

## Windows agent development

Open `apps/agent/DeepSee.Agent.sln` in Visual Studio or build with the .NET 8 SDK on Windows. Configure the API and relay URLs and a temporary enrollment code through the documented agent configuration or installer. Enrollment codes are temporary and single-use. The current agent’s screen capture and control engines are not yet connected end to end; a successful service build does not mean remote operations are ready.

## Production deployment

The GitHub deployment workflow runs only after CI succeeds. It applies database migrations before deploying the web and relay services to Railway. Configure `DATABASE_URL` as a protected production environment secret and `RAILWAY_TOKEN` as a repository secret. Configure Supabase URL, anon key, service-role key, JWT secret, relay URL and app URL on the appropriate Railway services. The relay specifically needs `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to call the shared nonce/revocation check for agent handshakes; agent connections fail closed if either is missing. Never use the example values as production credentials.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for current implementation status and [`PRODUCT.md`](PRODUCT.md) for the full product requirements.
