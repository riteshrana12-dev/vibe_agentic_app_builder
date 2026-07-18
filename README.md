
<div align="center">

# 🔥 Forge

### Describe the app. Forge writes the code.

Forge is an AI-powered app builder — describe what you want in plain language, and Forge picks the stack, writes the code, and renders a live, clickable preview in seconds. Ask it to change something, and it edits the existing code for you.

[![Live Demo](https://img.shields.io/badge/Live_Demo-vibe--agentic--app--builder.vercel.app-orange?style=for-the-badge&logo=vercel)](https://vibe-agentic-app-builder.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/riteshrana12-dev/vibe_agentic_app_builder.git)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Ritesh_Rana-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/ritesh-rana12/)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone the Repository](#1-clone-the-repository)
  - [Install Dependencies](#2-install-dependencies)
  - [Environment Variables](#3-environment-variables)
  - [Set Up the Database](#4-set-up-the-database)
  - [Run the Dev Server](#5-run-the-dev-server)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Author](#-author)
- [License](#-license)

---

## 🧭 About the Project

Forge takes a plain-English prompt — *"build a kanban board with drag-and-drop"* — and turns it into a working React app with a live preview, in one shot. From there, you can keep the conversation going: ask Forge to tweak the layout, add a feature, or fix a bug, and it patches the existing code instead of starting over.

Under the hood, every generation is streamed live: you see the model's status updates as it works, files appear in the code panel as they're written, and the preview updates automatically — no manual "run" step.

---

## ✨ Features

| | |
|---|---|
| 🧠 **Prompt-to-app generation** | Describe an app in plain language and get a complete, working React + Tailwind project back |
| 💬 **Conversational iteration** | Keep chatting to refine, extend, or fix the app — Forge sees the current code as context |
| 🛠️ **Improve Agent** | A tool-calling agent that reads your existing files and patches exactly what needs to change, streamed file-by-file |
| ⚡ **Live preview** | Every generation renders instantly in an in-browser sandbox — no build step to wait on |
| 📂 **Project dashboard** | All your generated apps saved and browsable from one place |
| 💳 **Credits & plans** | Free / Starter / Pro tiers with credit-based usage, billed through Clerk |
| 🔐 **Authentication** | Full sign-up/sign-in flow via Clerk, with a user-aware nav and account menu |

---

## 🛠️ Tech Stack

**Framework & Language**
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

**Styling & UI**
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Motion-0055FF?style=flat-square&logo=framer&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=flat-square&logo=shadcnui&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide_Icons-F56565?style=flat-square)

**AI**
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=google-gemini&logoColor=white)

**Auth & Billing**
![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white)

**Database & ORM**
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)

**Validation & Notifications**
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)
![Sonner](https://img.shields.io/badge/Sonner_Toasts-000000?style=flat-square)

**Deployment**
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

A quick breakdown of who does what:

- **Next.js (App Router, Turbopack)** — routing, server components, and streaming API routes
- **Google Gemini API** — powers both the initial code generation and the "Improve" agent (via native function calling)
- **Prisma + PostgreSQL** (hosted on Supabase) — stores users, workspaces, messages, generated files, and credit balances
- **Clerk** — authentication, user sessions, and subscription billing/checkout
- **Tailwind CSS + shadcn/ui + Framer Motion** — the entire UI layer, including the animated starfield background and custom cursor effects

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **npm** (or your preferred package manager)
- A **Google AI Studio** account (for a Gemini API key)
- A **Clerk** account (for authentication)
- A **PostgreSQL** database (a free [Supabase](https://supabase.com) project works well)

---

### 1. Clone the Repository

```bash
git clone https://github.com/riteshrana12-dev/vibe_agentic_app_builder.git
cd vibe_agentic_app_builder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the project root and fill in the following:

```bash
# ── Clerk (Authentication) ──────────────────────────────────────────────
# Get these from https://dashboard.clerk.com → your app → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx

# ── Database (Postgres via Supabase, pooled through Prisma) ────────────
# Get these from your Supabase project → Settings → Database
DATABASE_URL="postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:5432/postgres"

# ── Google Gemini (AI code generation) ──────────────────────────────────
# Get this from https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Note:** `DATABASE_URL` uses the pooled connection (via `pgbouncer=true`) for regular queries, while `DIRECT_URL` uses the direct connection — Prisma needs the direct one specifically for running migrations.

### 4. Set Up the Database

Generate the Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

If you're using migrations instead of `db push`:

```bash
npx prisma migrate dev --name init
```

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the Forge landing page.

---

## 📁 Project Structure

```
vibe_agentic_app_builder/
├── app/
│   ├── api/
│   │   ├── gen-ai-code/     # Initial generation endpoint (streams SSE)
│   │   └── improve/         # Improve Agent endpoint (function-calling loop)
│   ├── workspace/           # The chat + live preview workspace
│   ├── projects/            # Saved projects dashboard
│   └── layout.tsx           # Root layout, providers, global nav
├── components/
│   ├── WorkspaceClient.tsx  # Core chat/generate/improve client logic
│   ├── Header.tsx           # Marketing site nav
│   ├── WorkspaceHeader.tsx  # Workspace/projects nav
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── prisma.ts            # Prisma client singleton
│   ├── checkUser.ts         # Clerk ↔ DB user sync
│   └── constants.ts         # Credit costs, pricing plans
├── contexts/
│   └── CreditsContext.tsx   # App-wide shared credits state
├── prisma/
│   └── schema.prisma        # Database schema
└── .env                     # Environment variables (not committed)
```

---

## ⚙️ How It Works

1. **You type a prompt** in the landing page or workspace chat.
2. **Forge streams a response** from Gemini via Server-Sent Events — status updates ("Validating packages…", etc.) appear live while the model writes the app as structured JSON (files + dependencies).
3. **The live preview renders instantly** from the generated files — no build step.
4. **Ask for changes**, and the **Improve Agent** kicks in: it's given your current files as context and a set of tools (`update_file`, `done_improving`) via Gemini's native function calling. It patches only what needs to change, streaming each file update to the UI as it happens.
5. **Credits are deducted per generation**, tracked per-user in Postgres, and reflected live across the entire UI via a shared React context.

---

## ☁️ Deployment

This project is deployed on **Vercel**: [vibe-agentic-app-builder.vercel.app](https://vibe-agentic-app-builder.vercel.app/)

To deploy your own copy:

1. Push your fork to GitHub.
2. Import the repo into [Vercel](https://vercel.com/new).
3. Add all the environment variables from your `.env` file to the Vercel project settings.
4. Deploy — Vercel handles the build and Prisma generate step automatically.

---

## 🗺️ Roadmap

- [ ] Image-based generation refinements (attach an image, e.g. as a logo/reference)
- [ ] Multi-file drag-and-drop export
- [ ] Team/workspace sharing
- [ ] More granular credit plans

---

## 👤 Author

**Ritesh Rana**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ritesh-rana12/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/riteshrana12-dev)

---

## 📄 License

This project currently has no license file included — all rights reserved by default. Add a `LICENSE` file (e.g. MIT) if you'd like to open it up for others to use or contribute to.

---

<div align="center">

Built with 🔥 by Forge — powered by Google Gemini

</div>
