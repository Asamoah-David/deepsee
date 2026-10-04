# @deepsee/database

This package handles all database operations, schemas, types, and migrations for the DeepSee platform.

## Setup

Ensure you have a PostgreSQL database running (e.g., via Supabase).

Provide the environment variable `DATABASE_URL` with your connection string.

## Commands

- `pnpm migrate` - Runs all `.sql` files in `migrations/` in order.
- `pnpm seed` - Runs all `.sql` files in `seed/` in order to populate dummy data.
- `pnpm generate-types` - Generates TypeScript types (requires Supabase CLI connected locally).

## Migrations Strategy

Migrations are executed securely. The main schema is provided in `001_initial_schema.sql`, RLS policies in `002_rls_policies.sql`, useful DB functions and triggers in `003_functions.sql`, and Realtime tables in `004_realtime.sql`.
