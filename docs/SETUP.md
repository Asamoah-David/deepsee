# DeepSee - Local Development Setup

This guide covers setting up DeepSee for local development on Windows.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (running locally) OR Supabase CLI
- .NET 8 SDK (for Agent development, optional for web testing)

## Option 1: Using Local PostgreSQL

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Database Connection

Create `apps/web/.env.local`:

```env
# Supabase (use local PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:5432
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=local-dev-service-role-key
SUPABASE_JWT_SECRET=local-dev-jwt-secret-at-least-32-characters-long

# Relay
NEXT_PUBLIC_RELAY_URL=ws://localhost:8080

# Groq AI (optional)
GROQ_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=DeepSee
```

Set `DATABASE_URL` in your environment or in `apps/web/.env.local`:

```env
DATABASE_URL=postgresql://deepsee:your-password@localhost:5432/deepsee
```

### 3. Run Migrations

```bash
pnpm db:migrate
```

### 4. Start Development Server

```bash
pnpm dev:web
```

The Command Center will be available at `http://localhost:3000`.

## Option 2: Using Supabase CLI (Recommended)

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Start Supabase Local

```bash
supabase start
```

This will start:
- PostgreSQL
- Supabase Auth
- Supabase Realtime
- Supabase Studio (at the URL shown in output)

### 3. Configure Environment

Copy the connection details from Supabase CLI output to `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-start
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-start
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-start

NEXT_PUBLIC_RELAY_URL=ws://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=DeepSee
```

### 4. Run Migrations

```bash
pnpm db:migrate
```

### 5. Start Development Server

```bash
pnpm dev:web
```

## Testing the Application

### 1. Register an Organization

1. Navigate to `http://localhost:3000/register`
2. Enter organization name, email, and password
3. Click Register

This will:
- Create a Supabase user account
- Create an organization
- Grant you owner access

### 2. Login

1. Navigate to `http://localhost:3000/login`
2. Enter your email and password
3. Click Sign in

### 3. View Dashboard

You should see:
- Your organization name in the sidebar
- Dashboard with real statistics (initially 0 devices)
- Navigation to Devices, Enrollment, etc.

### 4. Enroll a Device

1. Navigate to Enrollment
2. Click "Generate New Link"
3. Copy the enrollment link
4. In a separate browser, visit the enrollment link
5. This shows the enrollment landing page (agent download not yet implemented)

### 5. View Devices

Navigate to Devices to see the device list (initially empty).

## Starting the Relay Server

The relay server handles WebSocket connections for screen streaming and remote control.

```bash
pnpm dev:relay
```

## Troubleshooting

### Migration Errors

If migrations fail, ensure:
- DATABASE_URL is set correctly
- PostgreSQL is running
- The database exists

### Authentication Errors

If login fails:
- Check Supabase is running (if using Supabase CLI)
- Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correct
- Check browser console for errors

### Build Errors

If type-check fails:
```bash
pnpm type-check
```

If lint fails:
```bash
pnpm lint
```

## Next Steps

After verifying the web application works:

1. **Phase 5**: Implement screen streaming from agent through relay
2. **Phase 6**: Implement remote control (mouse/keyboard)
3. **Phase 8**: Build file transfer system
4. **Phase 9**: Complete device management

See `docs/PRODUCT.md` for the full specification.
