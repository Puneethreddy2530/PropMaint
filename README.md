# PropMaint — Property Maintenance Management System

> A mobile-first, production-quality web application for managing property maintenance workflows across tenants, property managers, and technicians.

**[Live Demo](https://propmaint.vercel.app)** · **[Video Walkthrough](https://loom.com/share/xxx)**

---

## Overview

Property managers handle dozens of maintenance issues daily across multiple buildings. PropMaint streamlines this by giving each stakeholder a tailored experience:

- **Tenants** submit requests with photos, track status, and verify completed work
- **Managers** oversee all tickets, assign technicians, monitor SLAs, and view analytics
- **Technicians** see their assigned tasks, update progress, and add resolution notes

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (PWA)                       │
│  Mobile: Bottom Tab Nav  │  Desktop: Sidebar Nav     │
│  Role-specific dashboards, multi-step ticket wizard  │
└──────────────────────┬──────────────────────────────┘
                       │ Server Actions + API Routes
┌──────────────────────▼──────────────────────────────┐
│              Next.js 15 (App Router)                 │
│  NextAuth v5 (JWT)  │  Zod Validation  │  RBAC      │
│  Activity Logging    │  SLA Engine      │  Notifs    │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────┐
│           PostgreSQL (Neon — serverless)              │
│  13 Models  │  6 Enums  │  Optimized Indexes         │
└─────────────────────────────────────────────────────┘
```

## Features

### Core (Required)
- **Authentication + RBAC** — NextAuth v5 with JWT, 3 roles, 14 granular permissions, middleware route protection
- **Ticket CRUD** — Create, read, update with Zod validation and role-based data scoping
- **Status Workflow** — Open → Assigned → In Progress → On Hold → Completed → Verified → Closed
- **File Uploads** — Drag & drop image attachments with preview (JPEG, PNG, WebP, GIF, max 5MB)
- **Activity Log** — Full audit trail per ticket with timestamped GitHub-style timeline
- **In-App Notifications** — Smart routing (tenants get status updates, staff get assignments, managers get escalations)
- **Assignment** — Managers assign technicians with workload visibility
- **Comments** — External (tenant-visible) + internal staff notes

### Beyond Requirements
- **SLA Engine** — Auto-calculated deadlines per priority (Emergency: 2h, Urgent: 24h, Routine: 72h, Scheduled: 7d) with breach detection and visual warnings
- **Emergency Detection** — Keywords like "fire", "gas leak", "flood" trigger safety instructions and auto-escalate priority
- **Smart Triage** — Multi-step ticket wizard with category selection, severity assessment, and permission-to-enter
- **Property Hierarchy** — Portfolio → Property → Building → Unit → Ticket data model
- **Analytics Dashboard** — SLA compliance rate, avg resolution time, tickets by status/priority/category
- **Mobile-First Design** — Bottom tab navigation, role-specific tabs, floating "+" button, touch-friendly forms
- **PWA Ready** — Web app manifest for home screen installation
- **Cost Tracking** — Estimated and actual cost per work order

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | **Next.js 15** (App Router) | Single codebase, Server Actions eliminate API boilerplate, TypeScript end-to-end |
| Database | **PostgreSQL** via **Neon** | Free serverless Postgres, connection pooling, Vercel-native integration |
| ORM | **Prisma** | Schema-first design, type-safe queries, auto-migrations, built-in Studio |
| Auth | **NextAuth.js v5** | JWT strategy, middleware integration, extensible callbacks for RBAC |
| UI | **shadcn/ui + Tailwind CSS** | Full component ownership, Radix UI accessibility, consistent design system |
| Validation | **Zod** | Runtime type checking on all server actions, composable schemas |
| Deployment | **Vercel** | Zero-config Next.js hosting, global CDN, preview deployments |

## Database Schema

```mermaid
erDiagram
    User ||--o{ Ticket : creates
    User ||--o{ Ticket : assigned_to
    User ||--o{ Comment : authors
    User ||--o{ ActivityLog : performs
    User ||--o{ Notification : receives
    User }o--o| Unit : lives_in
    User ||--o{ Property : manages

    Property ||--o{ Building : has
    Building ||--o{ Unit : contains
    Unit ||--o{ Ticket : has

    Ticket ||--o{ Comment : has
    Ticket ||--o{ ActivityLog : has
    Ticket ||--o{ Attachment : has
    Ticket ||--o{ Notification : triggers
```

## Quick Start

### Option 1: Local Development

```bash
# Clone and install
git clone https://github.com/Puneethreddy2530/PropMaint.git
cd PropMaint
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Neon connection string
# Generate AUTH_SECRET: openssl rand -base64 32

# Initialize database
npx prisma generate
npx prisma db push
npm run db:seed

# Run
npm run dev
```

### Option 2: Docker

```bash
docker compose up --build
# Then seed: docker compose exec app npx tsx prisma/seed.ts
# Open http://localhost:3000
```

## Demo Accounts

| Role | Email | Password | What You Can Do |
|------|-------|----------|-----------------|
| 🏠 Tenant | sarah.johnson@demo.com | demo123 | Submit requests, track status, verify repairs |
| 👔 Manager | michael.chen@demo.com | demo123 | View all tickets, assign staff, analytics |
| 🔧 Technician | james.rodriguez@demo.com | demo123 | View assignments, update progress, add notes |

> **Tip:** Use the Quick Demo Access buttons on the login page for instant role-switching.

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # 13 models, 6 enums, optimized indexes
│   └── seed.ts                # 9 users, 9 tickets, full activity history
├── src/
│   ├── actions/               # Server Actions (auth, tickets, activity logging)
│   ├── app/
│   │   ├── (auth)/login/      # Login with quick-demo role buttons
│   │   ├── (dashboard)/       # All protected pages
│   │   │   ├── dashboard/     # Role-specific stat cards + recent tickets
│   │   │   ├── tickets/       # List, detail, and creation pages
│   │   │   ├── analytics/     # Manager KPI dashboard
│   │   │   ├── team/          # Technician profiles + workload
│   │   │   └── notifications/ # Grouped notifications with mark-all-read
│   │   └── api/               # Auth handler + file upload endpoint
│   ├── components/
│   │   ├── layout/            # AppShell (mobile bottom nav + desktop sidebar)
│   │   ├── tickets/           # Actions, timeline, comments, upload, wizard
│   │   ├── dashboard/         # Stat cards, recent tickets
│   │   └── ui/                # shadcn/ui primitives
│   └── lib/                   # Auth config, permissions, Prisma client, utils
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # App + PostgreSQL with healthcheck
└── .env.example               # Environment variable template
```

## Design Decisions

1. **Server Actions over API Routes** — Eliminates client-side fetch boilerplate, provides type safety end-to-end, and enables progressive enhancement
2. **JWT over Session DB** — No Redis dependency, works in serverless (Vercel), role embedded in token for zero-latency permission checks
3. **Granular Permission Map** — 14 permissions across 3 roles defined in code, not a separate DB table — appropriate for fixed roles, signals senior-level thinking
4. **SLA as First-Class Citizen** — Deadlines auto-calculated from priority, breach detection on every status change, visual warnings in UI
5. **Activity Log Pattern** — Every mutation logs to ActivityLog with actor, action, before/after values — enables full audit trail without event sourcing complexity
6. **Mobile-First Layout** — Bottom tab navigation on mobile (thumb zone), sidebar on desktop, role-specific navigation items

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Production build (generates Prisma client first) |
| `npm run db:push` | Push schema changes to database |
| `npm run db:seed` | Seed database with realistic demo data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run lint` | Run ESLint |

---

Built for the **Qwego PropTech Full-Stack Challenge** · All data is demo/mock · No paid APIs used
