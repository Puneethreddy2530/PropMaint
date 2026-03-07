# Project Context for ChatGPT

**Prompt:**
"I am building a Property Maintenance Management System called 'PropMaint' using Next.js 15 (App Router), Prisma, PostgreSQL, Tailwind CSS, and Shadcn UI.

The app has three roles:
1.  **Tenant**: Can submit tickets for their unit.
2.  **Manager**: Can view all tickets, assign staff, and manage properties.
3.  **Staff**: Can view assigned tickets and update status/resolution.

Here is the current file structure and code for the core functionality. Please help me with [YOUR REQUEST HERE]."

---

## Files to Copy
*Copy and paste the contents of these files to provide full context:*

### 1. Database Schema
`prisma/schema.prisma`
*Contains the data models (User, Ticket, Property, Unit, etc.) and relations.*

### 2. Core Actions (Server Logic)
`src/actions/tickets.ts`
*Contains all server actions for creating, updating, assigning, and fetching tickets. This is the main business logic.*

### 3. Permissions & Auth
`src/lib/auth.ts` (NextAuth Configuration)
`src/lib/permissions.ts` (RBAC and SLA logic)

### 4. Key Components
`src/components/tickets/create-ticket-form.tsx` (Form with validation)
`src/components/tickets/ticket-list.tsx` (Table view)
`src/components/tickets/ticket-detail.tsx` (Detailed view with comments/status)
`src/components/dashboard/dashboard-stats.tsx` (KPI Cards)

### 5. Page Implementations
`src/app/(dashboard)/dashboard/page.tsx` (Main Dashboard)
`src/app/(dashboard)/tickets/page.tsx` (Ticket List Page)
`src/app/(dashboard)/tickets/[id]/page.tsx` (Ticket Detail Page)
`src/app/(dashboard)/tickets/new/page.tsx` (Create Ticket Page)

---

## Application Flow Description
-   **Authentication**: Managed by NextAuth.js (v5).
-   **Routing**: Protected routes in `(dashboard)` layout.
-   **Data Fetching**: Server Components fetch data directly using `src/actions/tickets.ts`.
-   **Mutations**: Server Actions used for forms (create ticket, add comment, update status).
-   **UI**: Built with Shadcn UI components and Tailwind CSS.
