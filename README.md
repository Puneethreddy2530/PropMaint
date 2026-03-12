# 🏢 PropMaint - Advanced Property Maintenance Hub
> **Next-Gen, Mobile-First Property Management Platform** built for the Qwego Challenge.

[![CI Status](https://github.com/Puneethreddy2530/PropMaint/actions/workflows/ci.yml/badge.svg)](https://github.com/Puneethreddy2530/PropMaint/actions/workflows/ci.yml)
[![Demo App](https://img.shields.io/badge/Demo-Live_App-success?logo=vercel)](https://prop-maint.vercel.app)
[![Pitch Video](https://img.shields.io/badge/Loom-Video_Pitch-blue?logo=loom)](https://loom.com)

PropMaint isn't just a CRUD app. It's an **enterprise-grade, offline-capable, AI-powered** maintenance management ecosystem built to bridge the gap between Tenants, Managers, and Technicians. 

## ✨ The "Unfair Advantage" Features

1. **Zero-Cost AI Smart Triage (100% Client-Side Machine Learning)** 🧠
   - Utilizes `transformers.js` running entirely in a Web Worker to execute a Zero-Shot Classification model natively in the browser.
   - Automatically categorizes tenant issues (Plumbing, Electrical, Safety, etc.) based purely on text description. Costs $0 in API fees. Fully private.
2. **Offline-First Technician Mode** 📶
   - Technicians rarely have 5G in the basement. Our custom `SyncManager` queue combined with `useNetworkStatus` hooks ensures app stability offline. Modifications are queued locally and automatically synced once a connection is restored.
3. **Cryptographic Audit Trail (Security Flex)** 🔒
   - Enterprise environments demand accountability. Every ticket activity is logged using an immutable, chained SHA-256 hash algorithm to prevent database tampering.
4. **Voice-to-Text Tenant Submission** 🎙️
   - Built an accessible, integrated Speech Recognition hook, allowing tenants to describe maintenance issues audibly, dramatically improving mobile-first UX.
5. **Modern, Polished UI/UX** 🎨
   - Implemented `framer-motion` for fluid page transitions. Dark/Light mode toggle via `next-themes`. Glassmorphism components and carefully crafted Tailwind layout.

## 🏗️ Architecture & Core Rules

- **Framework**: Built on **Next.js 15 (App Router)** leveraging Server Actions.
- **Database**: PostgreSQL via Neon, structured through **Prisma ORM**.
- **Role-Based Access Control**: Strict `TENANT`, `MANAGER`, and `STAFF` enums via NextAuth. Server Actions rigorously verify permissions before executing any logic.
- **State Machine Workflow**: Hardcoded `ALLOWED_TRANSITIONS` ensure tickets follow logical flows (Open → Assigned → In Progress → Completed → Verified).

## 🚀 Getting Started

### Option A: Local Development

1. Clone repo: `git clone https://github.com/Puneethreddy2530/PropMaint.git`
2. Install dependencies: `npm install`
3. Configure `.env.local` using the `.env.example` as a template.
4. Push Prisma schema: `npx prisma db push`
5. Run server: `npm run dev`

### Option B: Docker Compose (The Fast Way)

We provide a complete Dockerized environment containing the Next.js app and the PostgreSQL database.

```bash
docker-compose up --build
```
The application will be accessible at `http://localhost:3000`.

## 📂 Project Structure

```bash
/src
 ├─ /actions       # Server Actions representing the Service/Controller layer
 ├─ /app           # Next.js App Router (Pages & Layouts structured by roles)
 ├─ /components    # Reusable shadcn/ui React components
 ├─ /lib           # Core utilities (Auth, ML Workers, SyncManagers, Crypto)
 └─ prisma         # Database schema and models
```

---
*Built by Puneeth Reddy T for Qwego.*
