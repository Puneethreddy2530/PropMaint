# PropMaint — Quick Start Setup Guide

## What's Built So Far (Day 1 Foundation)

### ✅ Complete Backend Architecture
- **Prisma Schema** — 13 models covering the full domain: Users, Properties, Buildings, Units, Tickets, Attachments, ActivityLogs, Comments, Notifications
- **NextAuth v5** — JWT-based auth with CredentialsProvider, role extension in callbacks, middleware route protection
- **RBAC System** — Fine-grained permissions map (17 permissions across 3 roles), route-level ACL, permission helper functions
- **SLA Engine** — Auto-calculated deadlines per priority level (Emergency=2h, Urgent=24h, Routine=72h, Scheduled=7d)

### ✅ Server Actions (Core Business Logic)
- `createTicket` — Full validation with Zod, SLA calculation, activity logging, notifications
- `updateTicketStatus` — Status transition with timestamp tracking, SLA breach detection
- `assignTicket` — Manager assigns staff with reassignment support
- `updateTicketPriority` — Priority change with SLA recalculation
- `addComment` — External (tenant-visible) + internal (staff-only) notes
- `markNotificationRead` / `markAllNotificationsRead`
- Data fetchers: `getTicketsForUser`, `getTicketById`, `getDashboardStats`, `getStaffMembers`, `getPropertiesForUser`, `getNotifications`

### ✅ Activity & Notification System
- Full audit trail logging on every mutation
- Smart notification routing (tenants on status changes, staff on assignments, managers on escalations)
- Batch notification creation

### ✅ Seed Script (Realistic Demo Data)
- 3 properties, 4 buildings, 11 units
- 9 users (1 manager, 3 staff, 5 tenants)
- 9 tickets across ALL statuses (including SLA breach, on-hold, emergency)
- Full activity timelines, comments (including internal notes), notifications

### ✅ UI Components
- Button, Card, Badge (with status/priority variants), Input, Label, Textarea, Select, Separator
- Complete CSS design system with light/dark theme variables
- Status/priority/category config maps with labels, colors, icons

---

## Setup Steps

### 1. Extract the project
```bash
tar xzf propmaint-foundation.tar.gz -C propmaint
cd propmaint
npm install
```

### 2. Set up Neon Database (free)
1. Go to https://console.neon.tech
2. Create a new project (name: "propmaint")
3. Copy the connection string

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
DATABASE_URL="postgresql://...your-neon-string...?sslmode=require"
AUTH_SECRET="run-openssl-rand-base64-32-to-generate"
AUTH_URL="http://localhost:3000"
```
Generate AUTH_SECRET:
```bash
openssl rand -base64 32
```

### 4. Initialize database
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| 🏠 Tenant | sarah.johnson@demo.com | demo123 |
| 👔 Manager | michael.chen@demo.com | demo123 |
| 🔧 Staff | james.rodriguez@demo.com | demo123 |

---

## What's Next (Day 1 continued → Day 2)

### Immediate Next Steps:
1. **Login Page** with quick-login buttons (3 role buttons that auto-login)
2. **Dashboard Layout** with bottom nav (mobile) / sidebar (desktop)
3. **Dashboard Page** — stat cards + recent tickets
4. **Ticket List Page** — filterable, sortable ticket cards
5. **Ticket Detail Page** — full info + activity timeline + comments
6. **New Ticket Form** — multi-step wizard

### Day 2:
- Role-specific dashboards
- File upload (images)
- Email notifications (Resend)
- Polish: animations, loading states, dark mode toggle

### Day 3:
- Docker + docker-compose
- Tests (Vitest + Playwright)
- GitHub Actions CI/CD
- Swagger API docs
- README with diagrams

### Day 4:
- Final polish
- Loom demo video
- Deploy to Vercel
- Submit on Qwego

---

## File Structure
```
propmaint/
├── prisma/
│   ├── schema.prisma          # Database schema (13 models)
│   └── seed.ts                # Realistic demo data
├── src/
│   ├── actions/
│   │   ├── auth.ts            # Login/logout/quick-login
│   │   ├── activity.ts        # Activity logging + notifications
│   │   └── tickets.ts         # All ticket CRUD + data fetchers
│   ├── app/
│   │   ├── (auth)/login/      # Login page
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── dashboard/
│   │   │   ├── tickets/
│   │   │   ├── tickets/[id]/
│   │   │   ├── tickets/new/
│   │   │   ├── analytics/
│   │   │   ├── team/
│   │   │   ├── profile/
│   │   │   └── notifications/
│   │   ├── api/auth/[...nextauth]/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/            # Shell, nav, sidebar
│   │   ├── tickets/           # Ticket-specific components
│   │   ├── dashboard/         # Dashboard widgets
│   │   └── auth/              # Auth components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── permissions.ts     # RBAC + SLA config
│   │   ├── prisma.ts          # DB client singleton
│   │   ├── ticket-utils.ts    # Status/priority helpers
│   │   └── utils.ts           # cn() utility
│   ├── types/
│   │   └── next-auth.d.ts     # Type extensions
│   ├── hooks/                 # Custom React hooks
│   └── middleware.ts          # Route protection
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```
