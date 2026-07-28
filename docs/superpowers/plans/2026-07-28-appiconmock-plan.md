# AppIconMock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build unified web app with icon maker (Fabric.js canvas + Sharp export) and mockup maker (device frames, scenes, multi-screen layouts) with AI icon generation via Google Imagen, NextAuth authentication, and ad monetization.

**Architecture:** Hybrid — Fabric.js browser canvas for real-time editing, Sharp server-side for production-quality export pipeline. Next.js App Router with API routes for export, AI generation, auth, and project persistence. PostgreSQL via Prisma for users, projects, exports, and ad tracking.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Fabric.js 6, Sharp, Google Vertex AI (Imagen 3), NextAuth.js v5, Prisma + PostgreSQL, Zustand, Tailwind CSS + shadcn/ui, html2canvas, archiver (ZIP)

## Global Constraints

- Next.js 15 with App Router and Server Components
- TypeScript strict mode
- All API routes under `/app/api/`
- Local disk storage at `storage/` with 1h TTL on exports
- Guest limit: 3 exports/day, 5 AI generations/day
- Registered limit: 20 exports/day, 20 AI generations/day
- Ad placements: landing sidebar, editor bottom bar, export completion
- Ad frequency cap: 1 impression per 3 min per user
- Fabric.js loaded via dynamic import (not in main bundle)
- All components handle: empty, loading, populated, error, disabled states
- Domain: appiconmock.com, deployed to 67.217.56.26

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `app/globals.css`, `app/layout.tsx` (minimal skeleton), `app/page.tsx` (placeholder)
- Create: `.env.local.example`, `.env.local`

**Interfaces:**
- Produces: Next.js project boots on `npm run dev`, Tailwind working, shadcn/ui components.json init complete

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/stanobi/Projects/appiconmock
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter zustand sharp archiver uuid
npm install -D @types/uuid
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn-ui@latest init
```
Select: TypeScript, Tailwind v4, neutral base, CSS variables, yes to all defaults.

- [ ] **Step 4: Create env files**

`.env.local.example`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/appiconmock"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
GOOGLE_APPLICATION_CREDENTIALS="/path/to/vertex-ai-key.json"
NEXT_PUBLIC_ADSENSE_CLIENT_ID=""
```

`.env.local`: copy of above with real values.

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Visit http://localhost:3000 — should show Next.js default page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind and shadcn/ui

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Database Schema + Seed

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/prisma.ts`
- Create: `lib/db-cleanup.ts`

**Interfaces:**
- Produces: `prisma` client singleton, migrated schema with all 5 tables, seed data for icon templates and device frames

- [ ] **Step 1: Write Prisma schema**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  guest
  user
  premium
  admin
}

enum ProjectType {
  icon
  mockup
}

enum ExportType {
  ios
  android
  mockup
}

enum AdPlacement {
  editor_top
  export_modal
  landing
}

model User {
  id            String    @id @default(uuid())
  email         String?   @unique
  passwordHash  String?
  name          String?
  avatar        String?
  role          UserRole  @default(guest)
  aiQuotaUsed   Int       @default(0)
  aiQuotaResetAt DateTime @default(now())
  createdAt     DateTime  @default(now())
  lastLoginAt   DateTime  @default(now())

  projects      Project[]
  exports       Export[]
  adImpressions AdImpression[]

  @@map("users")
}

model Project {
  id           String      @id @default(uuid())
  userId       String
  type         ProjectType
  name         String
  thumbnailUrl String?
  state        Json        @default("{}")
  isPublic     Boolean     @default(false)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  exports      Export[]

  @@index([userId])
  @@map("projects")
}

model Export {
  id        String     @id @default(uuid())
  projectId String
  userId    String
  type      ExportType
  fileUrl   String
  fileSize  Int
  createdAt DateTime   @default(now())
  expiresAt DateTime

  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("exports")
}

model AdImpression {
  id        String      @id @default(uuid())
  userId    String?
  placement AdPlacement
  timestamp DateTime    @default(now())

  user      User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, timestamp])
  @@map("ad_impressions")
}

model AIGenerationCache {
  id         String   @id @default(uuid())
  promptHash String   @unique
  imageUrl   String
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@map("ai_generation_cache")
}
```

- [ ] **Step 2: Write Prisma client singleton**

`lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 4: Write seed script**

`prisma/seed.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const iconTemplates = [
  { name: "Minimal Circle", category: "minimal", svgPath: "templates/minimal-circle.svg" },
  { name: "Gradient Wave", category: "gradient", svgPath: "templates/gradient-wave.svg" },
  { name: "Flat Square", category: "flat", svgPath: "templates/flat-square.svg" },
  { name: "Material Shield", category: "material", svgPath: "templates/material-shield.svg" },
];

const deviceFrames = [
  { name: "iPhone 16 Pro", device: "iphone-16-pro", colors: ["black","white","natural"], orientations: ["portrait","landscape"], screenMask: [40,78,1130,2440] },
  { name: "Pixel 9", device: "pixel-9", colors: ["obsidian","porcelain"], orientations: ["portrait","landscape"], screenMask: [38,72,1044,2256] },
  { name: "Galaxy S24", device: "galaxy-s24", colors: ["black","silver"], orientations: ["portrait","landscape"], screenMask: [36,80,1080,2340] },
];

async function main() {
  for (const t of iconTemplates) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Template" (id, name, category, "svgPath") VALUES (gen_random_uuid(), $1, $2, $3) ON CONFLICT DO NOTHING`,
      t.name, t.category, t.svgPath
    );
  }
  console.log("Seed complete");
}

main().then(() => prisma.$disconnect());
```

Note: Template table not in schema — templates served as static files. The `deviceFrames` config goes into a JSON file, not the DB. Skip the DB seed for templates; just write the metadata JSON files.

- [ ] **Step 5: Write device frame metadata**

`public/frames/metadata.json`:
```json
{
  "devices": [
    {
      "id": "iphone-16-pro",
      "name": "iPhone 16 Pro",
      "colors": [
        { "id": "black", "label": "Black Titanium", "frameImage": "iphone-16-pro-black.png" },
        { "id": "white", "label": "White Titanium", "frameImage": "iphone-16-pro-white.png" },
        { "id": "natural", "label": "Natural Titanium", "frameImage": "iphone-16-pro-natural.png" }
      ],
      "orientations": ["portrait", "landscape"],
      "screenMask": { "x": 40, "y": 78, "width": 1130, "height": 2440 },
      "frameSize": { "width": 1210, "height": 2556 },
      "shadow": true
    },
    {
      "id": "pixel-9",
      "name": "Google Pixel 9",
      "colors": [
        { "id": "obsidian", "label": "Obsidian", "frameImage": "pixel-9-obsidian.png" },
        { "id": "porcelain", "label": "Porcelain", "frameImage": "pixel-9-porcelain.png" }
      ],
      "orientations": ["portrait", "landscape"],
      "screenMask": { "x": 38, "y": 72, "width": 1044, "height": 2256 },
      "frameSize": { "width": 1120, "height": 2400 },
      "shadow": true
    }
  ]
}
```

- [ ] **Step 6: Write DB cleanup utility**

`lib/db-cleanup.ts`:
```typescript
import { prisma } from "./prisma";

export async function cleanupExpiredExports() {
  await prisma.export.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function cleanupExpiredAICache() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.aIGenerationCache.deleteMany({
    where: { createdAt: { lt: oneDayAgo } },
  });
}

export async function resetDailyQuotas() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.user.updateMany({
    where: { aiQuotaResetAt: { lt: yesterday } },
    data: { aiQuotaUsed: 0, aiQuotaResetAt: new Date() },
  });
}
```

- [ ] **Step 7: Run migration, verify DB**

```bash
npx prisma migrate dev --name init
npx prisma studio
```

- [ ] **Step 8: Commit**

```bash
git add prisma/ lib/prisma.ts lib/db-cleanup.ts public/frames/metadata.json
git commit -m "feat: add Prisma schema, client singleton, cleanup utilities, frame metadata

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Auth System (NextAuth v5)

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `lib/auth.ts`
- Create: `lib/auth.config.ts`
- Create: `app/api/auth/register/route.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `lib/prisma.ts` (prisma singleton)
- Produces: `auth()` server function, `GET/POST /api/auth/[...nextauth]`, `POST /api/auth/register` returning `{ user, token }`, `middleware.ts` protecting dashboard routes

- [ ] **Step 1: Write Auth.js config**

`lib/auth.config.ts`:
```typescript
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role ?? "guest";
      }
      if (account?.provider === "credentials") {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub! } });
        token.role = dbUser?.role ?? "guest";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET! }),
    GitHub({ clientId: process.env.AUTH_GITHUB_ID!, clientSecret: process.env.AUTH_GITHUB_SECRET! }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string };
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
};
```

- [ ] **Step 2: Write auth exports**

`lib/auth.ts`:
```typescript
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: UserRole;
};

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
  }
}
```

- [ ] **Step 3: Write Auth.js route handler**

`app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Write registration endpoint**

`app/api/auth/register/route.ts`:
```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: "user" },
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
```

- [ ] **Step 5: Write middleware for route protection**

`middleware.ts`:
```typescript
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/projects/:path*", "/settings/:path*", "/icon-maker/:path*", "/mockup-maker/:path*"],
};
```

- [ ] **Step 6: Install bcrypt and types**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts lib/auth.config.ts app/api/auth/ middleware.ts
git commit -m "feat: add NextAuth v5 with credentials, Google, GitHub + registration endpoint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Root Layout + Providers + Landing Page

**Files:**
- Create: `app/layout.tsx` (replace skeleton)
- Create: `app/page.tsx` (replace placeholder)
- Create: `components/providers.tsx`
- Create: `components/ui/sonner.tsx` (toast provider)
- Create: `components/landing/tool-card.tsx`

**Interfaces:**
- Consumes: `lib/auth.ts` (SessionProvider from NextAuth)
- Produces: RootLayout with providers wrapping children, landing page with two tool cards routing to `/icon-maker` and `/mockup-maker`

- [ ] **Step 1: Install shadcn sonner (toasts)**

```bash
npx shadcn@latest add sonner
```

- [ ] **Step 2: Write providers wrapper**

`components/providers.tsx`:
```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors closeButton />
      </TooltipProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 3: Write root layout**

`app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AppIconMock — Free App Icon & Mockup Maker",
  description: "Create stunning app icons for iOS and Android, and beautiful device mockups. Free, no sign-up required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Write landing page**

`app/page.tsx`:
```typescript
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { ToolCard } from "@/components/landing/tool-card";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Header session={session} />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight text-neutral-900 mb-4">
            Free App Icon & Mockup Maker
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Create professional app icons for iOS and Android. Generate stunning device mockups.
            No design skills needed. Start free.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <ToolCard
            title="App Icon Maker"
            description="Design icons from templates or scratch. AI-powered generation. Export all iOS + Android sizes in one click."
            href="/icon-maker"
            icon="🎨"
            cta="Create Icon"
          />
          <ToolCard
            title="App Mockup Maker"
            description="Wrap screenshots in device frames. Real-world scenes. Multi-screen layouts for App Store screenshots."
            href="/mockup-maker"
            icon="📱"
            cta="Create Mockup"
          />
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Write ToolCard component**

`components/landing/tool-card.tsx`:
```typescript
import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  cta: string;
}

export function ToolCard({ title, description, href, icon, cta }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:border-neutral-300 hover:-translate-y-1"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-2xl font-semibold text-neutral-900 mb-2">{title}</h2>
      <p className="text-neutral-600 mb-6 leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:gap-3 transition-all">
        {cta} <span aria-hidden="true">&rarr;</span>
      </span>
    </Link>
  );
}
```

- [ ] **Step 6: Write minimal Header component**

`components/layout/header.tsx`:
```typescript
import Link from "next/link";
import type { Session } from "next-auth";

export function Header({ session }: { session: Session | null }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-16">
        <Link href="/" className="text-xl font-bold text-neutral-900">
          AppIconMock
        </Link>
        <nav className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Link href="/projects" className="text-sm text-neutral-600 hover:text-neutral-900">
                My Projects
              </Link>
              <Link href="/settings" className="text-sm text-neutral-600 hover:text-neutral-900">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-neutral-600 hover:text-neutral-900">
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx app/page.tsx components/
git commit -m "feat: add root layout with providers, landing page with tool cards, header

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Auth Pages (Login + Register)

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `components/auth/login-form.tsx`
- Create: `components/auth/register-form.tsx`

**Interfaces:**
- Consumes: `lib/auth.ts` (signIn), `POST /api/auth/register` returning `{ user: { id, email, name, role } }`
- Produces: Login and register pages with email/password form + social OAuth buttons

- [ ] **Step 1: Write auth layout**

`app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Write login page**

`app/(auth)/login/page.tsx`:
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/projects");

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Welcome back</h1>
      <p className="text-sm text-neutral-500 mb-6">Sign in to your account</p>
      <LoginForm />
    </div>
  );
}
```

`components/auth/login-form.tsx`:
```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      toast.error("Invalid email or password");
    } else {
      router.push("/projects");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          required className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          required className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {loading ? "Signing in..." : "Sign In"}
      </button>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-neutral-500">or</span></div>
      </div>
      <button type="button" onClick={() => signIn("google", { callbackUrl: "/projects" })}
        className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
        Continue with Google
      </button>
      <button type="button" onClick={() => signIn("github", { callbackUrl: "/projects" })}
        className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
        Continue with GitHub
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Write register page**

`app/(auth)/register/page.tsx`:
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/projects");

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Create account</h1>
      <p className="text-sm text-neutral-500 mb-6">Start creating in seconds</p>
      <RegisterForm />
    </div>
  );
}
```

`components/auth/register-form.tsx`:
```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Registration failed");
      setLoading(false);
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      toast.error("Account created but sign-in failed. Please log in.");
    } else {
      router.push("/projects");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          required className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          required minLength={8} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {loading ? "Creating account..." : "Create Account"}
      </button>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-neutral-500">or</span></div>
      </div>
      <button type="button" onClick={() => signIn("google", { callbackUrl: "/projects" })}
        className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
        Continue with Google
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Verify auth flow**

Manually test: register → auto-login → redirect to `/projects` → session shows in header.

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/ components/auth/
git commit -m "feat: add login and register pages with credentials + OAuth

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Zustand Stores

**Files:**
- Create: `stores/icon-store.ts`
- Create: `stores/mockup-store.ts`
- Create: `stores/export-store.ts`
- Create: `stores/ai-store.ts`

**Interfaces:**
- Produces:
  - `useIconStore` — `{ layers: IconLayer[], selectedLayerId, canvasSize, backgroundColor, addLayer, updateLayer, removeLayer, setSelectedLayer, reorderLayers, loadFromProject, reset }`
  - `useMockupStore` — `{ screenshot, mode, selectedFrame, selectedScene, selectedLayout, slots, setScreenshot, setMode, setFrame, setScene, setLayout, assignSlot, reset }`
  - `useExportStore` — `{ status, progress, downloadUrl, startExport, setProgress, complete, fail, reset }`
  - `useAIStore` — `{ prompt, status, images, selectedImage, setPrompt, generate, selectImage, clear }`

- [ ] **Step 1: Write icon store**

`stores/icon-store.ts`:
```typescript
import { create } from "zustand";

export interface IconLayer {
  id: string;
  type: "shape" | "text" | "icon" | "image";
  fabricObject: Record<string, unknown>; // serialized Fabric.js object
  name: string;
  visible: boolean;
}

interface IconState {
  layers: IconLayer[];
  selectedLayerId: string | null;
  canvasSize: number; // default 1024
  backgroundColor: string;
  addLayer: (layer: IconLayer) => void;
  updateLayer: (id: string, updates: Partial<IconLayer>) => void;
  removeLayer: (id: string) => void;
  setSelectedLayer: (id: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  loadFromProject: (state: { layers: IconLayer[]; canvasSize: number; backgroundColor: string }) => void;
  reset: () => void;
}

const initialState = {
  layers: [] as IconLayer[],
  selectedLayerId: null,
  canvasSize: 1024,
  backgroundColor: "#FFFFFF",
};

export const useIconStore = create<IconState>((set) => ({
  ...initialState,
  addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer], selectedLayerId: layer.id })),
  updateLayer: (id, updates) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),
  removeLayer: (id) =>
    set((s) => ({ layers: s.layers.filter((l) => l.id !== id), selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId })),
  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  reorderLayers: (from, to) =>
    set((s) => {
      const layers = [...s.layers];
      const [removed] = layers.splice(from, 1);
      layers.splice(to, 0, removed);
      return { layers };
    }),
  loadFromProject: (state) => set({ layers: state.layers, canvasSize: state.canvasSize, backgroundColor: state.backgroundColor }),
  reset: () => set(initialState),
}));
```

- [ ] **Step 2: Write mockup store**

`stores/mockup-store.ts`:
```typescript
import { create } from "zustand";

type MockupMode = "device" | "scene" | "multi";

interface MockupSlot {
  id: string;
  screenshot: string | null; // data URL
}

interface MockupState {
  screenshot: string | null;
  mode: MockupMode;
  selectedFrame: { deviceId: string; colorId: string; orientation: string } | null;
  selectedScene: string | null;
  selectedLayout: string | null;
  slots: MockupSlot[];
  setScreenshot: (dataUrl: string | null) => void;
  setMode: (mode: MockupMode) => void;
  setFrame: (frame: { deviceId: string; colorId: string; orientation: string }) => void;
  setScene: (sceneId: string) => void;
  setLayout: (layoutId: string) => void;
  initSlots: (count: number) => void;
  assignSlot: (slotId: string, screenshot: string) => void;
  reset: () => void;
}

const initialState = {
  screenshot: null as string | null,
  mode: "device" as MockupMode,
  selectedFrame: null,
  selectedScene: null,
  selectedLayout: null,
  slots: [],
};

export const useMockupStore = create<MockupState>((set) => ({
  ...initialState,
  setScreenshot: (dataUrl) => set({ screenshot: dataUrl }),
  setMode: (mode) => set({ mode }),
  setFrame: (frame) => set({ selectedFrame: frame }),
  setScene: (sceneId) => set({ selectedScene: sceneId }),
  setLayout: (layoutId) => set({ selectedLayout: layoutId }),
  initSlots: (count) => set({ slots: Array.from({ length: count }, (_, i) => ({ id: `slot-${i}`, screenshot: null })) }),
  assignSlot: (slotId, screenshot) =>
    set((s) => ({ slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, screenshot } : sl)) })),
  reset: () => set(initialState),
}));
```

- [ ] **Step 3: Write export store**

`stores/export-store.ts`:
```typescript
import { create } from "zustand";

type ExportStatus = "idle" | "exporting" | "done" | "error";

interface ExportState {
  status: ExportStatus;
  progress: number; // 0-100
  downloadUrl: string | null;
  error: string | null;
  startExport: () => void;
  setProgress: (pct: number) => void;
  complete: (url: string) => void;
  fail: (error: string) => void;
  reset: () => void;
}

export const useExportStore = create<ExportState>((set) => ({
  status: "idle",
  progress: 0,
  downloadUrl: null,
  error: null,
  startExport: () => set({ status: "exporting", progress: 0, downloadUrl: null, error: null }),
  setProgress: (pct) => set({ progress: pct }),
  complete: (url) => set({ status: "done", downloadUrl: url, progress: 100 }),
  fail: (error) => set({ status: "error", error }),
  reset: () => set({ status: "idle", progress: 0, downloadUrl: null, error: null }),
}));
```

- [ ] **Step 4: Write AI store**

`stores/ai-store.ts`:
```typescript
import { create } from "zustand";

type AIStatus = "idle" | "generating" | "done" | "error" | "quota-exceeded";

interface AIState {
  prompt: string;
  status: AIStatus;
  images: string[];
  selectedImage: string | null;
  error: string | null;
  setPrompt: (p: string) => void;
  generate: () => void;
  setImages: (urls: string[]) => void;
  selectImage: (url: string | null) => void;
  setError: (msg: string) => void;
  setQuotaExceeded: () => void;
  clear: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  prompt: "",
  status: "idle",
  images: [],
  selectedImage: null,
  error: null,
  setPrompt: (p) => set({ prompt: p }),
  generate: () => set({ status: "generating", images: [], selectedImage: null, error: null }),
  setImages: (urls) => set({ status: "done", images: urls }),
  selectImage: (url) => set({ selectedImage: url }),
  setError: (msg) => set({ status: "error", error: msg }),
  setQuotaExceeded: () => set({ status: "quota-exceeded" }),
  clear: () => set({ prompt: "", status: "idle", images: [], selectedImage: null, error: null }),
}));
```

- [ ] **Step 5: Install Zustand**

```bash
npm install zustand
```

- [ ] **Step 6: Commit**

```bash
git add stores/ package.json package-lock.json
git commit -m "feat: add Zustand stores for icon, mockup, export, AI state

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Icon Maker — Canvas Shell + Page Layout

**Files:**
- Create: `app/icon-maker/page.tsx`
- Create: `app/icon-maker/_components/Canvas.tsx`
- Create: `components/ui/skeleton.tsx`

**Interfaces:**
- Consumes: `useIconStore` (layers, canvasSize, backgroundColor, addLayer, selectedLayerId, setSelectedLayer)
- Produces: Icon maker page with three-column layout (toolbar left, canvas center, properties right), Fabric.js canvas initialized at 1024x1024

- [ ] **Step 1: Install shadcn skeleton**

```bash
npx shadcn@latest add skeleton
```

- [ ] **Step 2: Write icon maker page shell**

`app/icon-maker/page.tsx`:
```typescript
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Toolbar } from "./_components/Toolbar";
import { PropertiesPanel } from "./_components/PropertiesPanel";
import { ExportPanel } from "./_components/ExportPanel";
import { AIGenerator } from "./_components/AIGenerator";

const Canvas = dynamic(() => import("./_components/Canvas").then((m) => ({ default: m.Canvas })), {
  ssr: false,
  loading: () => <Skeleton className="w-[1024px] h-[1024px] rounded-lg" />,
});

export default function IconMakerPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex items-center justify-center bg-neutral-100 p-8 overflow-auto">
        <div className="flex flex-col items-center gap-4">
          <ExportPanel />
          <Suspense fallback={<Skeleton className="w-[512px] h-[512px] rounded-lg" />}>
            <Canvas />
          </Suspense>
        </div>
      </div>
      <PropertiesPanel />
      <AIGenerator />
    </div>
  );
}
```

- [ ] **Step 3: Write Fabric.js Canvas component**

`app/icon-maker/_components/Canvas.tsx`:
```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas as FabricCanvas, Rect } from "fabric";
import { useIconStore, type IconLayer } from "@/stores/icon-store";
import { v4 as uuid } from "uuid";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const { layers, canvasSize, backgroundColor, selectedLayerId, addLayer, setSelectedLayer } = useIconStore();

  const initCanvas = useCallback(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const fc = new FabricCanvas(canvasRef.current, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    fc.on("selection:created", (e) => {
      const obj = e.selected?.[0];
      if (obj?.data?.layerId) setSelectedLayer(obj.data.layerId);
    });

    fc.on("selection:updated", (e) => {
      const obj = e.selected?.[0];
      if (obj?.data?.layerId) setSelectedLayer(obj.data.layerId);
    });

    fc.on("selection:cleared", () => setSelectedLayer(null));

    fc.on("object:modified", (e) => {
      const obj = e.target;
      if (obj?.data?.layerId) {
        const layer = layers.find((l) => l.id === obj.data!.layerId);
        if (layer) {
          useIconStore.getState().updateLayer(layer.id, {
            fabricObject: obj.toJSON() as Record<string, unknown>,
          });
        }
      }
    });

    fabricRef.current = fc;
  }, [canvasSize, backgroundColor, addLayer, setSelectedLayer, layers]);

  useEffect(() => {
    initCanvas();
    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, [initCanvas]);

  // Add default background layer if empty
  useEffect(() => {
    if (layers.length === 0 && fabricRef.current) {
      const bg = new Rect({
        left: 0,
        top: 0,
        width: canvasSize,
        height: canvasSize,
        fill: backgroundColor,
        selectable: false,
        evented: false,
        data: { layerId: "background", isBackground: true },
      });
      fabricRef.current.add(bg);
      fabricRef.current.sendToBack(bg);
      addLayer({
        id: "background",
        type: "shape",
        name: "Background",
        fabricObject: bg.toJSON() as Record<string, unknown>,
        visible: true,
      });
    }
  }, [layers.length, canvasSize, backgroundColor, addLayer]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden" style={{ width: Math.min(canvasSize / 2, 512), height: Math.min(canvasSize / 2, 512) }}>
      <canvas ref={canvasRef} width={canvasSize} height={canvasSize}
        style={{ transform: `scale(${Math.min(512 / canvasSize, 1)})`, transformOrigin: "top left" }} />
    </div>
  );
}
```

- [ ] **Step 4: Install Fabric.js and uuid**

```bash
npm install fabric@6 uuid
npm install -D @types/fabric@5 @types/uuid
```

Note: Fabric.js v6 does not have official TypeScript types. Use `@types/fabric` v5 as base, type gaps handled with `as any` casts where needed.

- [ ] **Step 5: Verify canvas renders**

Visit `/icon-maker` — should see a white 1024x1024 canvas with background layer. Open console, no errors.

- [ ] **Step 6: Commit**

```bash
git add app/icon-maker/ components/ui/skeleton.tsx stores/ package.json package-lock.json
git commit -m "feat: add icon maker page shell with Fabric.js canvas

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Icon Maker — Toolbar

**Files:**
- Create: `app/icon-maker/_components/Toolbar.tsx`

**Interfaces:**
- Consumes: `useIconStore` (addLayer, layers), `fabricRef` injected via Canvas ref
- Produces: Vertical toolbar with shape tools, text tool, icon library browser, background tool, layer list

- [ ] **Step 1: Write Toolbar component**

`app/icon-maker/_components/Toolbar.tsx`:
```typescript
"use client";

import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useIconStore, type IconLayer } from "@/stores/icon-store";
import { fabric } from "fabric";

interface ToolDef {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

export function Toolbar() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { layers, selectedLayerId, addLayer, setSelectedLayer, removeLayer, reorderLayers } = useIconStore();

  function getCanvas(): fabric.Canvas | null {
    const el = document.querySelector("canvas");
    if (!el) return null;
    return (el as any).fabric || null;
  }

  function addShape(shapeType: string) {
    const canvas = getCanvas();
    if (!canvas) return;
    const id = uuid();
    let obj: fabric.Object;
    const size = 200;

    switch (shapeType) {
      case "rect":
        obj = new fabric.Rect({ left: 100, top: 100, width: size, height: size, fill: "#3B82F6", rx: 20, ry: 20 });
        break;
      case "circle":
        obj = new fabric.Circle({ left: 100, top: 100, radius: size / 2, fill: "#EF4444" });
        break;
      case "star": {
        const points = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          points.push({ x: 100 + Math.cos(angle) * size/2, y: 100 + Math.sin(angle) * size/2 });
        }
        obj = new fabric.Polygon(points, { left: 100, top: 100, fill: "#F59E0B" });
        break;
      }
      case "triangle":
        obj = new fabric.Triangle({ left: 100, top: 100, width: size, height: size, fill: "#10B981" });
        break;
      default:
        obj = new fabric.Rect({ left: 100, top: 100, width: size, height: size, fill: "#3B82F6" });
    }

    obj.set({ data: { layerId: id } });
    canvas.add(obj);
    canvas.renderAll();

    addLayer({ id, type: "shape", name: `${shapeType}-${layers.length}`, fabricObject: obj.toJSON() as Record<string, unknown>, visible: true });
  }

  function addText() {
    const canvas = getCanvas();
    if (!canvas) return;
    const id = uuid();
    const text = new fabric.IText("App Name", {
      left: 200, top: 400,
      fontFamily: "Geist, sans-serif",
      fontSize: 120,
      fontWeight: "bold",
      fill: "#171717",
      data: { layerId: id },
    });
    canvas.add(text);
    canvas.renderAll();
    addLayer({ id, type: "text", name: `text-${layers.length}`, fabricObject: text.toJSON() as Record<string, unknown>, visible: true });
  }

  const tools: ToolDef[] = [
    { id: "rect", label: "Rectangle", icon: "▭", action: () => addShape("rect") },
    { id: "circle", label: "Circle", icon: "○", action: () => addShape("circle") },
    { id: "star", label: "Star", icon: "☆", action: () => addShape("star") },
    { id: "triangle", label: "Triangle", icon: "△", action: () => addShape("triangle") },
    { id: "text", label: "Text", icon: "T", action: addText },
  ];

  return (
    <aside className="w-16 border-r border-neutral-200 bg-white flex flex-col items-center py-4 gap-1 overflow-y-auto">
      {tools.map((tool) => (
        <button key={tool.id} title={tool.label}
          onClick={() => { tool.action(); setActiveTool(tool.id); }}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors
            ${activeTool === tool.id ? "bg-blue-100 text-blue-700" : "text-neutral-600 hover:bg-neutral-100"}`}>
          {tool.icon}
        </button>
      ))}
      <hr className="w-8 my-2 border-neutral-200" />
      {/* Layer list */}
      <div className="flex-1 w-full px-1 overflow-y-auto">
        {[...layers].reverse().filter(l => l.id !== "background").map((layer, i) => (
          <button key={layer.id}
            onClick={() => setSelectedLayer(layer.id)}
            className={`w-full text-left text-xs px-1.5 py-1 rounded truncate mb-0.5
              ${selectedLayerId === layer.id ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"}`}>
            {layer.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/icon-maker/_components/Toolbar.tsx
git commit -m "feat: add icon maker toolbar with shape, text tools and layer list

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Icon Maker — Properties Panel

**Files:**
- Create: `app/icon-maker/_components/PropertiesPanel.tsx`

**Interfaces:**
- Consumes: `useIconStore` (selectedLayerId, layers, updateLayer), Fabric.js canvas (`fabric.Canvas` instance)
- Produces: Right sidebar with context-sensitive controls: fill color/gradient, stroke, shadow, text properties, position/size

- [ ] **Step 1: Write Properties Panel**

`app/icon-maker/_components/PropertiesPanel.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { useIconStore } from "@/stores/icon-store";
import { fabric } from "fabric";

export function PropertiesPanel() {
  const { layers, selectedLayerId, updateLayer } = useIconStore();
  const [fill, setFill] = useState("#3B82F6");
  const [stroke, setStroke] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(48);
  const [fontWeight, setFontWeight] = useState("normal");
  const [textAlign, setTextAlign] = useState("left");

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const isText = selectedLayer?.type === "text";

  function getCanvas(): fabric.Canvas | null {
    const el = document.querySelector("canvas");
    if (!el) return null;
    return (el as any).fabric || null;
  }

  function getActiveObject(): fabric.Object | null {
    const canvas = getCanvas();
    if (!canvas) return null;
    return canvas.getActiveObject();
  }

  useEffect(() => {
    const obj = getActiveObject();
    if (!obj) return;
    setFill((obj.fill as string) || "#000000");
    setStroke((obj.stroke as string) || "#000000");
    setStrokeWidth((obj.strokeWidth as number) || 0);
    setOpacity(((obj.opacity as number) || 1) * 100);
    if (isText) {
      setFontSize(((obj as fabric.IText).fontSize as number) || 48);
      setFontWeight(((obj as fabric.IText).fontWeight as string) || "normal");
      setTextAlign(((obj as fabric.IText).textAlign as string) || "left");
    }
  }, [selectedLayerId, isText]);

  function update(callback: (obj: fabric.Object) => void) {
    const obj = getActiveObject();
    if (!obj) return;
    callback(obj);
    getCanvas()?.renderAll();
    if (selectedLayerId) {
      updateLayer(selectedLayerId, { fabricObject: obj.toJSON() as Record<string, unknown> });
    }
  }

  if (!selectedLayer || selectedLayer.id === "background") {
    return (
      <aside className="w-64 border-l border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-400">Select a layer to edit properties</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-l border-neutral-200 bg-white p-4 overflow-y-auto space-y-5">
      <h3 className="text-sm font-semibold text-neutral-900">Properties</h3>

      {/* Fill */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Fill Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={fill} onChange={e => { setFill(e.target.value); update(obj => obj.set("fill", e.target.value)); }}
            className="w-8 h-8 rounded border border-neutral-300 cursor-pointer" />
          <input type="text" value={fill} onChange={e => { setFill(e.target.value); update(obj => obj.set("fill", e.target.value)); }}
            className="flex-1 text-xs border border-neutral-300 rounded px-2 py-1 font-mono" />
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Opacity: {Math.round(opacity)}%</label>
        <input type="range" min={0} max={100} value={opacity}
          onChange={e => { setOpacity(Number(e.target.value)); update(obj => obj.set("opacity", Number(e.target.value) / 100)); }}
          className="w-full" />
      </div>

      {/* Stroke */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Stroke</label>
        <div className="flex items-center gap-2">
          <input type="color" value={stroke} onChange={e => { setStroke(e.target.value); update(obj => obj.set("stroke", e.target.value)); }}
            className="w-8 h-8 rounded border border-neutral-300 cursor-pointer" />
          <input type="number" min={0} max={50} value={strokeWidth}
            onChange={e => { setStrokeWidth(Number(e.target.value)); update(obj => obj.set("strokeWidth", Number(e.target.value))); }}
            className="w-16 text-xs border border-neutral-300 rounded px-2 py-1" />
          <span className="text-xs text-neutral-400">px</span>
        </div>
      </div>

      {/* Text properties */}
      {isText && (
        <>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Font Size</label>
            <input type="number" min={8} max={500} value={fontSize}
              onChange={e => { setFontSize(Number(e.target.value)); update(obj => (obj as fabric.IText).set("fontSize", Number(e.target.value))); }}
              className="w-full text-xs border border-neutral-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Weight</label>
            <select value={fontWeight}
              onChange={e => { setFontWeight(e.target.value); update(obj => (obj as fabric.IText).set("fontWeight", e.target.value)); }}
              className="w-full text-xs border border-neutral-300 rounded px-2 py-1">
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="900">Black</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Align</label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} onClick={() => { setTextAlign(a); update(obj => (obj as fabric.IText).set("textAlign", a)); }}
                  className={`flex-1 text-xs py-1 rounded border ${textAlign === a ? "bg-blue-100 border-blue-300" : "border-neutral-300 hover:bg-neutral-100"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Delete */}
      <button
        onClick={() => {
          const obj = getActiveObject();
          if (obj) { getCanvas()?.remove(obj); getCanvas()?.renderAll(); }
          if (selectedLayerId) useIconStore.getState().removeLayer(selectedLayerId);
        }}
        className="w-full text-xs py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
        Delete Layer
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/icon-maker/_components/PropertiesPanel.tsx
git commit -m "feat: add icon maker properties panel (fill, stroke, opacity, text, delete)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Icon Maker — Template Picker + Background Tool

**Files:**
- Create: `app/icon-maker/_components/TemplatePicker.tsx`

**Interfaces:**
- Consumes: `useIconStore` (addLayer, reset), Fabric.js canvas
- Produces: Modal for browsing/selecting templates by category, background tool (solid/gradient selector)

- [ ] **Step 1: Write TemplatePicker**

`app/icon-maker/_components/TemplatePicker.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { fabric } from "fabric";
import { useIconStore } from "@/stores/icon-store";

interface Template {
  id: string;
  name: string;
  category: string;
  svgPath: string;
}

const MOCK_TEMPLATES: Template[] = [
  { id: "1", name: "Minimal Circle", category: "minimal", svgPath: "/templates/minimal-circle.svg" },
  { id: "2", name: "Gradient Wave", category: "gradient", svgPath: "/templates/gradient-wave.svg" },
  { id: "3", name: "Flat Square", category: "flat", svgPath: "/templates/flat-square.svg" },
  { id: "4", name: "Material Shield", category: "material", svgPath: "/templates/material-shield.svg" },
];

const CATEGORIES = ["all", "minimal", "gradient", "flat", "material"];

export function TemplatePicker() {
  const [open, setOpen] = useState(true); // open on first visit
  const [category, setCategory] = useState("all");
  const { reset } = useIconStore();

  const filtered = category === "all" ? MOCK_TEMPLATES : MOCK_TEMPLATES.filter(t => t.category === category);

  function applyTemplate(template: Template) {
    reset();
    const canvas = (document.querySelector("canvas") as any)?.fabric as fabric.Canvas;
    if (!canvas) return;
    fabric.loadSVGFromURL(template.svgPath, (objects, options) => {
      const group = fabric.util.groupSVGElements(objects, options);
      group.scaleToWidth(1024);
      group.scaleToHeight(1024);
      group.set({ data: { layerId: `template-${template.id}` } });
      canvas.add(group);
      canvas.renderAll();
      useIconStore.getState().addLayer({
        id: `template-${template.id}`,
        type: "icon",
        name: template.name,
        fabricObject: group.toJSON() as Record<string, unknown>,
        visible: true,
      });
      setOpen(false);
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-4 left-20 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 z-10">
      Templates
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Choose Template</h2>
          <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
        </div>
        <div className="flex gap-2 p-4 border-b border-neutral-100 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap
                ${category === c ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 p-4 overflow-y-auto">
          {filtered.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)}
              className="rounded-xl border border-neutral-200 p-3 hover:border-blue-400 hover:shadow-md transition-all text-left">
              <div className="aspect-square rounded-lg bg-neutral-100 mb-2 flex items-center justify-center text-4xl">
                🎨
              </div>
              <p className="text-xs font-medium text-neutral-700 truncate">{t.name}</p>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-neutral-100">
          <button onClick={() => setOpen(false)}
            className="w-full rounded-lg border border-neutral-300 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
            Start from Scratch
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update icon maker page to include TemplatePicker**

Edit `app/icon-maker/page.tsx` — add `<TemplatePicker />` inside the page component before the closing `</div>`.

- [ ] **Step 3: Commit**

```bash
git add app/icon-maker/_components/TemplatePicker.tsx app/icon-maker/page.tsx
git commit -m "feat: add template picker modal with category tabs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 11: Icon Export Pipeline (Server — Sharp)

**Files:**
- Create: `app/api/icons/export/route.ts`
- Create: `lib/sharp-pipeline.ts`

**Interfaces:**
- Consumes: POST body `{ layers: IconLayer[], canvasSize: number, format: "png"|"jpeg", exportType: "ios"|"android"|"all"|"custom", customSizes?: number[] }`
- Produces: ZIP file stream download with correct iOS/Android folder structure + Contents.json

- [ ] **Step 1: Write Sharp pipeline**

`lib/sharp-pipeline.ts`:
```typescript
import sharp from "sharp";
import archiver from "archiver";
import { Writable } from "stream";

const IOS_SIZES: { idiom: string; scale: number; size: number }[] = [
  { idiom: "iphone", scale: 2, size: 40 },
  { idiom: "iphone", scale: 3, size: 60 },
  { idiom: "iphone", scale: 2, size: 58 },
  { idiom: "iphone", scale: 3, size: 87 },
  { idiom: "iphone", scale: 2, size: 80 },
  { idiom: "iphone", scale: 3, size: 120 },
  { idiom: "iphone", scale: 2, size: 120 },
  { idiom: "iphone", scale: 3, size: 180 },
  { idiom: "ipad", scale: 1, size: 20 },
  { idiom: "ipad", scale: 2, size: 40 },
  { idiom: "ipad", scale: 1, size: 29 },
  { idiom: "ipad", scale: 2, size: 58 },
  { idiom: "ipad", scale: 1, size: 40 },
  { idiom: "ipad", scale: 2, size: 80 },
  { idiom: "ipad", scale: 1, size: 76 },
  { idiom: "ipad", scale: 2, size: 152 },
  { idiom: "ipad", scale: 2, size: 167 },
  { idiom: "ios-marketing", scale: 1, size: 1024 },
];

const ANDROID_SIZES: { density: string; size: number }[] = [
  { density: "mdpi", size: 48 },
  { density: "hdpi", size: 72 },
  { density: "xhdpi", size: 96 },
  { density: "xxhdpi", size: 144 },
  { density: "xxxhdpi", size: 192 },
  { density: "playstore", size: 512 },
];

function generateContentsJson(): string {
  const images = IOS_SIZES.map((s) => ({
    size: `${s.size / s.scale}x${s.size / s.scale}`,
    idiom: s.idiom,
    filename: `icon-${s.idiom}-${s.size}x${s.size}.png`,
    scale: `${s.scale}x`,
  }));
  return JSON.stringify({ images, info: { author: "appiconmock", version: 1 } }, null, 2);
}

export async function generateIconZIP(
  outputStream: Writable,
  compositeBuffer: Buffer,
  exportType: "ios" | "android" | "all" | "custom",
  customSizes?: number[]
) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(outputStream);

  if (exportType === "ios" || exportType === "all") {
    for (const s of IOS_SIZES) {
      const buf = await sharp(compositeBuffer).resize(s.size, s.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      archive.append(buf, { name: `ios/AppIcon.appiconset/icon-${s.idiom}-${s.size}x${s.size}.png` });
    }
    archive.append(generateContentsJson(), { name: "ios/AppIcon.appiconset/Contents.json" });
  }

  if (exportType === "android" || exportType === "all") {
    for (const s of ANDROID_SIZES) {
      const buf = await sharp(compositeBuffer).resize(s.size, s.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      const folder = s.density === "playstore" ? "playstore" : `android/mipmap-${s.density}`;
      archive.append(buf, { name: `${folder}/ic_launcher.png` });
    }
    // Adaptive icon layers
    const fgBuf = await sharp(compositeBuffer).resize(432, 432, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    archive.append(fgBuf, { name: "android/ic_launcher_foreground.png" });
    const bgBuf = await sharp({ create: { width: 432, height: 432, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
    archive.append(bgBuf, { name: "android/ic_launcher_background.png" });
  }

  if (exportType === "custom" && customSizes) {
    for (const size of customSizes) {
      const buf = await sharp(compositeBuffer).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      archive.append(buf, { name: `custom/${size}x${size}.png` });
    }
  }

  await archive.finalize();
}

export async function compositeLayers(layers: any[], canvasSize: number): Promise<Buffer> {
  // Start with a blank canvas
  let base = sharp({ create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } });

  // Composite each layer — simplified: layers arrive as SVG data URLs or raster data
  const composites: sharp.OverlayOptions[] = [];
  for (const layer of layers) {
    if (layer.type === "shape" || layer.type === "text" || layer.type === "icon") {
      // Layers are pre-rasterized from client canvas — we use the layer's rasterData
      if (layer.rasterData) {
        composites.push({ input: Buffer.from(layer.rasterData, "base64"), top: 0, left: 0 });
      }
    }
  }
  if (composites.length > 0) {
    base = base.composite(composites);
  }
  return base.png().toBuffer();
}
```

- [ ] **Step 2: Write API route**

`app/api/icons/export/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "stream";
import { generateIconZIP, compositeLayers } from "@/lib/sharp-pipeline";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "guest";
  const role = session?.user?.role || "guest";

  // Rate limit check
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await prisma.export.count({
    where: { userId, createdAt: { gte: today } },
  });
  const limit = role === "guest" ? 3 : role === "premium" ? Infinity : 20;
  if (count >= limit) {
    return NextResponse.json({ error: "Daily export limit reached. Sign up for more." }, { status: 429 });
  }

  const { layers, canvasSize = 1024, exportType = "all", customSizes } = await req.json();

  if (!layers?.length) {
    return NextResponse.json({ error: "No layers to export" }, { status: 400 });
  }

  try {
    const compositeBuffer = await compositeLayers(layers, canvasSize);
    const exportId = uuid();
    const fileName = `icon-export-${exportId}.zip`;
    const filePath = path.join(process.cwd(), "storage", "exports", fileName);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const fileStream = new PassThrough();
    const writeStream = fs.createWriteStream(filePath);

    const chunks: Buffer[] = [];
    fileStream.on("data", (chunk) => chunks.push(chunk));
    fileStream.on("end", async () => {
      const fullBuffer = Buffer.concat(chunks);
      await fs.writeFile(filePath, fullBuffer);
    });

    await generateIconZIP(writeStream, compositeBuffer, exportType, customSizes);

    const fileSize = (await fs.stat(filePath)).size;

    await prisma.export.create({
      data: {
        userId,
        projectId: "00000000-0000-0000-0000-000000000000", // no-project placeholder
        type: exportType === "all" ? "ios" : (exportType as any),
        fileUrl: `/storage/exports/${fileName}`,
        fileSize,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ downloadUrl: `/api/download/${fileName}`, fileSize });
  } catch (err) {
    console.error("Export failed:", err);
    return NextResponse.json({ error: "Export failed. Try again." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add download route**

`app/api/download/[filename]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const filePath = path.join(process.cwd(), "storage", "exports", filename);

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
  }
}
```

- [ ] **Step 4: Install archiver**

```bash
npm install archiver
npm install -D @types/archiver
```

- [ ] **Step 5: Commit**

```bash
git add lib/sharp-pipeline.ts app/api/icons/ app/api/download/
git commit -m "feat: add Sharp icon export pipeline with iOS/Android ZIP generation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 12: Icon Maker — Export UI

**Files:**
- Create: `app/icon-maker/_components/ExportPanel.tsx`

**Interfaces:**
- Consumes: `useExportStore`, `useIconStore` (layers, canvasSize), `POST /api/icons/export`
- Produces: Export button bar with "Export All" and custom size picker, progress bar, download trigger

- [ ] **Step 1: Write ExportPanel**

`app/icon-maker/_components/ExportPanel.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useExportStore } from "@/stores/export-store";
import { useIconStore } from "@/stores/icon-store";
import { toast } from "sonner";

export function ExportPanel() {
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [customSizes, setCustomSizes] = useState("1024,512,192");
  const { status, progress, downloadUrl, startExport, setProgress, complete, fail } = useExportStore();
  const { layers, canvasSize } = useIconStore();

  async function handleExport() {
    if (layers.length <= 1) {
      toast.error("Add at least one shape, icon, or text layer");
      return;
    }
    startExport();
    try {
      const res = await fetch("/api/icons/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layers: layers.map(l => ({ ...l, rasterData: null })),
          canvasSize,
          exportType: mode,
          customSizes: mode === "custom" ? customSizes.split(",").map(Number).filter(n => n > 0) : undefined,
        }),
      });

      // Simulated progress
      const interval = setInterval(() => setProgress(Math.min(useExportStore.getState().progress + 15, 90)), 300);

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok) throw new Error(data.error);
      complete(data.downloadUrl);
      window.open(data.downloadUrl, "_blank");
    } catch (err: any) {
      fail(err.message || "Export failed");
      toast.error(err.message || "Export failed");
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-4 py-2 shadow-sm">
      <select value={mode} onChange={e => setMode(e.target.value as any)}
        className="text-xs border border-neutral-300 rounded px-2 py-1">
        <option value="all">iOS + Android</option>
        <option value="ios">iOS Only</option>
        <option value="android">Android Only</option>
        <option value="custom">Custom Sizes</option>
      </select>

      {mode === "custom" && (
        <input type="text" value={customSizes}
          onChange={e => setCustomSizes(e.target.value)}
          placeholder="1024,512,192"
          className="w-32 text-xs border border-neutral-300 rounded px-2 py-1" />
      )}

      <button onClick={handleExport} disabled={status === "exporting"}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {status === "exporting" ? `Exporting ${progress}%` : "Export"}
      </button>

      {status === "exporting" && (
        <div className="w-24 h-1 bg-neutral-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/icon-maker/_components/ExportPanel.tsx
git commit -m "feat: add icon export panel with iOS/Android/custom modes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 13: Mockup Maker — Upload + Page Shell + Canvas Preview

**Files:**
- Create: `app/mockup-maker/page.tsx`
- Create: `app/mockup-maker/_components/ScreenshotUpload.tsx`
- Create: `app/mockup-maker/_components/Canvas.tsx`
- Create: `lib/mockup-renderer.ts`

**Interfaces:**
- Consumes: `useMockupStore` (screenshot, mode, selectedFrame, selectedScene, slots, setScreenshot)
- Produces: Mockup maker page with upload zone + live preview compositor using html2canvas

- [ ] **Step 1: Install html2canvas**

```bash
npm install html2canvas
```

- [ ] **Step 2: Write mockup renderer util**

`lib/mockup-renderer.ts`:
```typescript
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

interface FrameConfig {
  frameImage: string;
  screenMask: { x: number; y: number; width: number; height: number };
  frameSize: { width: number; height: number };
}

export async function renderMockupExport(
  screenshotBuffer: Buffer,
  frame: FrameConfig,
  outputPath: string,
  scale: number = 1
) {
  const framePath = path.join(process.cwd(), "public", "frames", frame.frameImage);
  const frameBuf = await fs.readFile(framePath);

  const targetW = Math.round(frame.frameSize.width * scale);
  const targetH = Math.round(frame.frameSize.height * scale);

  const resizedScreenshot = await sharp(screenshotBuffer)
    .resize(Math.round(frame.screenMask.width * scale), Math.round(frame.screenMask.height * scale), { fit: "fill" })
    .png()
    .toBuffer();

  const resizedFrame = await sharp(frameBuf)
    .resize(targetW, targetH)
    .png()
    .toBuffer();

  const result = await sharp(resizedFrame)
    .composite([{
      input: resizedScreenshot,
      top: Math.round(frame.screenMask.y * scale),
      left: Math.round(frame.screenMask.x * scale),
    }])
    .png()
    .toFile(outputPath);

  return result;
}
```

- [ ] **Step 3: Write mockup maker page**

`app/mockup-maker/page.tsx`:
```typescript
"use client";

import { ScreenshotUpload } from "./_components/ScreenshotUpload";
import { Canvas } from "./_components/Canvas";
import { FramePicker } from "./_components/FramePicker";
import { ScenePicker } from "./_components/ScenePicker";
import { LayoutPicker } from "./_components/LayoutPicker";
import { ExportPanel } from "./_components/ExportPanel";
import { useMockupStore } from "@/stores/mockup-store";

export default function MockupMakerPage() {
  const { screenshot } = useMockupStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-72 border-r border-neutral-200 bg-white overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Mockup Settings</h2>
          <FramePicker />
          <ScenePicker />
          <LayoutPicker />
        </div>
      </aside>
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-100 p-8 gap-4 overflow-auto">
        {!screenshot ? (
          <ScreenshotUpload />
        ) : (
          <>
            <ExportPanel />
            <Canvas />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write ScreenshotUpload**

`app/mockup-maker/_components/ScreenshotUpload.tsx`:
```typescript
"use client";

import { useCallback, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";
import { toast } from "sonner";

export function ScreenshotUpload() {
  const [dragging, setDragging] = useState(false);
  const setScreenshot = useMockupStore((s) => s.setScreenshot);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPEG, WebP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
      toast.success("Screenshot loaded");
    };
    reader.readAsDataURL(file);
  }, [setScreenshot]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onPaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          processFile(item.getAsFile()!);
          break;
        }
      }
    }
  }, [processFile]);

  // Register paste listener
  if (typeof window !== "undefined") {
    window.addEventListener("paste", onPaste);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`w-full max-w-lg rounded-2xl border-2 border-dashed p-12 text-center transition-colors
        ${dragging ? "border-blue-400 bg-blue-50" : "border-neutral-300 bg-white"}`}>
      <div className="text-5xl mb-4">📱</div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-1">Upload App Screenshot</h3>
      <p className="text-sm text-neutral-500 mb-4">Drag & drop, paste from clipboard, or click to browse</p>
      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        className="hidden" id="screenshot-upload" />
      <label htmlFor="screenshot-upload"
        className="inline-block rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800 cursor-pointer">
        Browse Files
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Write mockup Canvas (browser preview)**

`app/mockup-maker/_components/Canvas.tsx`:
```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";

export function Canvas() {
  const { screenshot, mode, selectedFrame, selectedScene, slots } = useMockupStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    fetch("/frames/metadata.json")
      .then(r => r.json())
      .then(d => setMetadata(d));
  }, []);

  const frame = selectedFrame && metadata
    ? metadata.devices.find((d: any) => d.id === selectedFrame.deviceId)
    : null;

  if (!screenshot) return null;

  return (
    <div ref={containerRef} className="relative flex items-center justify-center">
      {mode === "device" && frame && (
        <div className="relative inline-block" style={{ width: 300 }}>
          <img src={`/frames/${selectedFrame!.colorId}.png`}
            alt={frame.name}
            className="w-full h-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <img src={screenshot}
            alt="Screenshot"
            className="absolute rounded-sm"
            style={{
              left: `${(frame.screenMask.x / frame.frameSize.width) * 100}%`,
              top: `${(frame.screenMask.y / frame.frameSize.height) * 100}%`,
              width: `${(frame.screenMask.width / frame.frameSize.width) * 100}%`,
              height: `${(frame.screenMask.height / frame.frameSize.height) * 100}%`,
              objectFit: "fill",
            }} />
        </div>
      )}

      {mode === "multi" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(slots.length, 3)}, 1fr)` }}>
          {slots.filter(s => s.screenshot).map((slot) => (
            <div key={slot.id} className="rounded-xl border border-neutral-300 bg-white p-2 shadow-sm">
              <img src={slot.screenshot!} alt="Screen" className="w-40 h-auto rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {mode === "scene" && selectedScene && (
        <div className="relative">
          <img src={`/scenes/${selectedScene}.png`} alt="Scene" className="w-full max-w-lg rounded-xl shadow-lg" />
          <img src={screenshot} alt="Screenshot"
            className="absolute rounded-sm shadow-md"
            style={{ left: "15%", top: "20%", width: "70%", height: "auto" }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/mockup-maker/ lib/mockup-renderer.ts
git commit -m "feat: add mockup maker page with upload, canvas preview, device frame compositing

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 14: Mockup Maker — Frame, Scene, Layout Pickers

**Files:**
- Create: `app/mockup-maker/_components/FramePicker.tsx`
- Create: `app/mockup-maker/_components/ScenePicker.tsx`
- Create: `app/mockup-maker/_components/LayoutPicker.tsx`

**Interfaces:**
- Consumes: `useMockupStore` (mode, selectedFrame, selectedScene, selectedLayout, setFrame, setScene, setLayout, setMode, initSlots, screenshot, assignSlot)
- Produces: Three picker components for device frames, scenes, multi-screen layouts

- [ ] **Step 1: Write FramePicker**

`app/mockup-maker/_components/FramePicker.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";

interface DeviceInfo {
  id: string; name: string;
  colors: { id: string; label: string; frameImage: string }[];
  orientations: string[];
}

export function FramePicker() {
  const { mode, selectedFrame, setMode, setFrame } = useMockupStore();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    fetch("/frames/metadata.json").then(r => r.json()).then(d => setDevices(d.devices));
  }, []);

  const active = mode === "device";

  return (
    <div className="mb-4">
      <button onClick={() => setMode("device")}
        className={`w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 rounded
          ${active ? "bg-blue-50 text-blue-700" : "text-neutral-500"}`}>
        Device Frames
      </button>
      {active && (
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id}>
              <p className="text-xs font-medium text-neutral-700 mb-1">{d.name}</p>
              <div className="flex gap-1 flex-wrap">
                {d.colors.map((c) => (
                  <button key={c.id}
                    onClick={() => setFrame({ deviceId: d.id, colorId: c.id, orientation: "portrait" })}
                    className={`px-2 py-0.5 text-xs rounded border
                      ${selectedFrame?.deviceId === d.id && selectedFrame?.colorId === c.id
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write ScenePicker**

`app/mockup-maker/_components/ScenePicker.tsx`:
```typescript
"use client";

import { useMockupStore } from "@/stores/mockup-store";

const SCENES = [
  { id: "desk-1", name: "Desk Setup", category: "desk", preview: "/scenes/desk-1.png" },
  { id: "hand-1", name: "Hand Holding", category: "handheld", preview: "/scenes/hand-1.png" },
  { id: "outdoor-1", name: "Cafe Table", category: "outdoor", preview: "/scenes/outdoor-1.png" },
  { id: "abstract-1", name: "Gradient BG", category: "abstract", preview: "/scenes/abstract-1.png" },
];

export function ScenePicker() {
  const { mode, selectedScene, setMode, setScene } = useMockupStore();
  const active = mode === "scene";

  return (
    <div className="mb-4">
      <button onClick={() => setMode("scene")}
        className={`w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 rounded
          ${active ? "bg-blue-50 text-blue-700" : "text-neutral-500"}`}>
        Scenes
      </button>
      {active && (
        <div className="grid grid-cols-2 gap-2">
          {SCENES.map((s) => (
            <button key={s.id} onClick={() => setScene(s.id)}
              className={`rounded-lg border p-1 text-left
                ${selectedScene === s.id ? "border-blue-400 ring-2 ring-blue-100" : "border-neutral-200 hover:border-neutral-300"}`}>
              <div className="aspect-[4/3] rounded bg-neutral-100 mb-1 flex items-center justify-center text-2xl">
                🖼️
              </div>
              <p className="text-[10px] text-neutral-600 truncate">{s.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write LayoutPicker**

`app/mockup-maker/_components/LayoutPicker.tsx`:
```typescript
"use client";

import { useMockupStore } from "@/stores/mockup-store";

const LAYOUTS = [
  { id: "1+1", label: "2 Screens", count: 2, cols: 2 },
  { id: "2+1", label: "3 Screens", count: 3, cols: 3 },
  { id: "3-grid", label: "3 Grid", count: 3, cols: 3 },
  { id: "4-grid", label: "4 Grid", count: 4, cols: 4 },
];

export function LayoutPicker() {
  const { mode, selectedLayout, slots, screenshot, setMode, setLayout, initSlots, assignSlot } = useMockupStore();
  const active = mode === "multi";

  function handleSelect(layout: typeof LAYOUTS[0]) {
    setLayout(layout.id);
    initSlots(layout.count);
    if (screenshot) assignSlot("slot-0", screenshot);
  }

  return (
    <div>
      <button onClick={() => setMode("multi")}
        className={`w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 rounded
          ${active ? "bg-blue-50 text-blue-700" : "text-neutral-500"}`}>
        Multi-Screen
      </button>
      {active && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {LAYOUTS.map((l) => (
              <button key={l.id}
                onClick={() => handleSelect(l)}
                className={`px-3 py-1 text-xs rounded border
                  ${selectedLayout === l.id ? "border-blue-400 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                {l.label}
              </button>
            ))}
          </div>
          {slots.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {slots.map((s) => (
                <div key={s.id}
                  className="aspect-[9/19.5] rounded border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center cursor-pointer hover:border-blue-400"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => assignSlot(s.id, reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}>
                  {s.screenshot ? (
                    <img src={s.screenshot} alt="Screen" className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-xs text-neutral-400">Drop here</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/mockup-maker/_components/FramePicker.tsx app/mockup-maker/_components/ScenePicker.tsx app/mockup-maker/_components/LayoutPicker.tsx
git commit -m "feat: add mockup frame, scene, and layout pickers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 15: Mockup Maker — Export

**Files:**
- Create: `app/mockup-maker/_components/ExportPanel.tsx`
- Create: `app/api/mockups/export/route.ts`

**Interfaces:**
- Consumes: `useMockupStore` (screenshot, selectedFrame, selectedScene, mode), `useExportStore`, `POST /api/mockups/export`
- Produces: Export button for mockup PNG download

- [ ] **Step 1: Write mockup export API route**

`app/api/mockups/export/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { renderMockupExport } from "@/lib/mockup-renderer";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "guest";

  const { screenshot: screenshotDataUrl, frameId, colorId, scale = 1 } = await req.json();

  if (!screenshotDataUrl || !frameId) {
    return NextResponse.json({ error: "Missing screenshot or frame selection" }, { status: 400 });
  }

  // Load frame metadata
  const metadata = await import("@/../public/frames/metadata.json");
  const device = (metadata as any).devices.find((d: any) => d.id === frameId);
  if (!device) {
    return NextResponse.json({ error: "Device frame not found" }, { status: 404 });
  }
  const color = device.colors.find((c: any) => c.id === colorId) || device.colors[0];
  const frameConfig = {
    frameImage: color.frameImage,
    screenMask: device.screenMask,
    frameSize: device.frameSize,
  };

  // Decode base64 screenshot
  const base64Data = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const screenshotBuffer = Buffer.from(base64Data, "base64");

  const exportId = uuid();
  const fileName = `mockup-${exportId}.png`;
  const filePath = path.join(process.cwd(), "storage", "exports", fileName);

  await renderMockupExport(screenshotBuffer, frameConfig, filePath, scale);

  return NextResponse.json({ downloadUrl: `/api/download/${fileName}` });
}
```

- [ ] **Step 2: Write mockup ExportPanel**

`app/mockup-maker/_components/ExportPanel.tsx`:
```typescript
"use client";

import { useMockupStore } from "@/stores/mockup-store";
import { useExportStore } from "@/stores/export-store";
import { toast } from "sonner";

export function ExportPanel() {
  const { screenshot, mode, selectedFrame } = useMockupStore();
  const { status, progress, startExport, setProgress, complete, fail } = useExportStore();

  async function handleExport() {
    if (!screenshot) return;
    startExport();
    try {
      const res = await fetch("/api/mockups/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshot,
          frameId: selectedFrame?.deviceId,
          colorId: selectedFrame?.colorId,
          scale: 2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      complete(data.downloadUrl);
      window.open(data.downloadUrl, "_blank");
    } catch (err: any) {
      fail(err.message);
      toast.error(err.message);
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-4 py-2 shadow-sm">
      <span className="text-xs text-neutral-500">
        {mode === "device" ? "Device Mockup" : mode === "scene" ? "Scene Mockup" : "Multi-Screen Mockup"}
      </span>
      <button onClick={handleExport} disabled={status === "exporting" || !selectedFrame}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {status === "exporting" ? "Rendering..." : "Export PNG"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/mockup-maker/_components/ExportPanel.tsx app/api/mockups/
git commit -m "feat: add mockup export API and UI panel

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 16: AI Integration — Server (Imagen + Rate Limiting)

**Files:**
- Create: `lib/imagen.ts`
- Create: `app/api/icons/ai-generate/route.ts`

**Interfaces:**
- Consumes: Google Vertex AI SDK, `prisma` (quota check, cache), `auth()`
- Produces: `POST /api/icons/ai-generate` returning `{ images: string[] }` (4 base64 data URLs)

- [ ] **Step 1: Install Vertex AI SDK**

```bash
npm install @google-cloud/vertexai
```

- [ ] **Step 2: Write Imagen client**

`lib/imagen.ts`:
```typescript
import { VertexAI } from "@google-cloud/vertexai";
import crypto from "crypto";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
});

export async function generateIconImages(
  prompt: string,
  count: number = 4
): Promise<string[]> {
  const model = vertexAI.preview.vision_models.ImageGenerationModel.fromGemini(
    "imagen-3.0-generate-001"
  );

  const fullPrompt = `${prompt}, app icon design, clean, minimal, no text, no watermark, square format, suitable for iOS and Android, professional quality`;

  const response = await model.generateImages({
    prompt: fullPrompt,
    numberOfImages: count,
    aspectRatio: "1:1",
    safetyFilterLevel: "block_only_high",
    personFilterLevel: "allow_all",
  });

  if (!response.images || response.images.length === 0) {
    throw new Error("No images generated. Try a different prompt.");
  }

  return response.images.map((img) => {
    const buffer = img.bytesBase64Encoded
      ? Buffer.from(img.bytesBase64Encoded, "base64")
      : Buffer.from("");

    return `data:image/png;base64,${buffer.toString("base64")}`;
  });
}

export function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex").slice(0, 32);
}
```

- [ ] **Step 3: Write AI generate API route**

`app/api/icons/ai-generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateIconImages, hashPrompt } from "@/lib/imagen";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "guest";
  const role = session?.user?.role || "guest";

  // Quota check
  const limit = role === "guest" ? 5 : role === "premium" ? Infinity : 20;
  if (role !== "premium") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (user.aiQuotaResetAt < today) {
      await prisma.user.update({ where: { id: userId }, data: { aiQuotaUsed: 0, aiQuotaResetAt: new Date() } });
    } else if (user.aiQuotaUsed >= limit) {
      return NextResponse.json({
        error: "Daily AI generation limit reached. Try again tomorrow or sign up for more.",
        quotaExceeded: true,
      }, { status: 429 });
    }
  }

  const { prompt } = await req.json();
  if (!prompt || prompt.length < 3) {
    return NextResponse.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }

  // Check cache
  const promptHash = hashPrompt(prompt);
  const cached = await prisma.aIGenerationCache.findUnique({ where: { promptHash } });
  if (cached) {
    return NextResponse.json({ images: [cached.imageUrl], cached: true });
  }

  try {
    const images = await generateIconImages(prompt, 4);

    // Cache first image
    await prisma.aIGenerationCache.create({
      data: { promptHash, imageUrl: images[0] },
    }).catch(() => {}); // ignore duplicate key errors

    // Update quota
    if (role !== "premium" && userId !== "guest") {
      await prisma.user.update({
        where: { id: userId },
        data: { aiQuotaUsed: { increment: 1 } },
      });
    }

    return NextResponse.json({ images });
  } catch (err: any) {
    console.error("Imagen error:", err);
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/imagen.ts app/api/icons/ai-generate/
git commit -m "feat: add Imagen AI integration with caching, quota tracking, rate limiting

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 17: AI Generation — UI

**Files:**
- Create: `app/icon-maker/_components/AIGenerator.tsx`

**Interfaces:**
- Consumes: `useAIStore`, `POST /api/icons/ai-generate` returning `{ images: string[], cached?: boolean }`, Fabric.js canvas
- Produces: Slide-out panel with prompt input, loading skeletons, image grid, "Add to Canvas" button

- [ ] **Step 1: Write AI Generator panel**

`app/icon-maker/_components/AIGenerator.tsx`:
```typescript
"use client";

import { useState } from "react";
import { fabric } from "fabric";
import { v4 as uuid } from "uuid";
import { useAIStore } from "@/stores/ai-store";
import { useIconStore } from "@/stores/icon-store";
import { toast } from "sonner";

export function AIGenerator() {
  const [open, setOpen] = useState(false);
  const { prompt, status, images, selectedImage, setPrompt, generate, setImages, selectImage, setError, setQuotaExceeded, clear } = useAIStore();
  const { addLayer } = useIconStore();

  async function handleGenerate() {
    if (!prompt.trim() || status === "generating") return;
    generate();
    try {
      const res = await fetch("/api/icons/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.quotaExceeded) { setQuotaExceeded(); toast.error("Daily AI limit reached"); }
        else { setError(data.error); toast.error(data.error); }
        return;
      }
      setImages(data.images);
      if (data.cached) toast.info("Using cached result");
    } catch {
      setError("Network error");
      toast.error("Network error. Try again.");
    }
  }

  async function addToCanvas(imageUrl: string) {
    selectImage(imageUrl);
    const canvas = (document.querySelector("canvas") as any)?.fabric as fabric.Canvas;
    if (!canvas) return;

    const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
    img.set({
      left: 100, top: 100,
      scaleX: 824 / (img.width || 1024),
      scaleY: 824 / (img.height || 1024),
      data: { layerId: `ai-${uuid()}` },
    });
    canvas.add(img);
    canvas.renderAll();

    addLayer({
      id: `ai-${uuid()}`,
      type: "image",
      name: `AI Generated ${Date.now()}`,
      fabricObject: img.toJSON() as Record<string, unknown>,
      visible: true,
    });
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow z-10">
        AI Generate
      </button>

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 border-l border-neutral-200 bg-white shadow-2xl flex flex-col">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">AI Icon Generator</h2>
            <button onClick={() => { setOpen(false); clear(); }} className="text-neutral-400 hover:text-neutral-600">&times;</button>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Describe your icon</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="e.g., a blue shield with a white lightning bolt in the center, gradient background"
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>

            <button onClick={handleGenerate} disabled={status === "generating" || !prompt.trim()}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {status === "generating" ? "Generating..." : "Generate"}
            </button>

            {status === "generating" && (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-neutral-100 animate-pulse" />
                ))}
              </div>
            )}

            {status === "done" && (
              <div className="grid grid-cols-2 gap-2">
                {images.map((url, i) => (
                  <button key={i} onClick={() => addToCanvas(url)}
                    className={`aspect-square rounded-lg border-2 overflow-hidden hover:border-purple-400 transition-colors
                      ${selectedImage === url ? "border-purple-500 ring-2 ring-purple-200" : "border-neutral-200"}`}>
                    <img src={url} alt={`Generated icon ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {status === "quota-exceeded" && (
              <div className="text-center py-8">
                <p className="text-neutral-600 text-sm mb-2">Daily limit reached</p>
                <p className="text-xs text-neutral-400">Sign up for more AI generations</p>
              </div>
            )}

            {status === "error" && (
              <div className="text-center py-8">
                <p className="text-red-600 text-sm">Generation failed</p>
                <button onClick={handleGenerate} className="text-xs text-blue-600 mt-1">Try again</button>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-neutral-100 text-center">
            <p className="text-[10px] text-neutral-400">Generations: {status === "quota-exceeded" ? "Limit reached" : "Available"}</p>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/icon-maker/_components/AIGenerator.tsx
git commit -m "feat: add AI icon generator slide-out panel with Imagen integration

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 18: Projects CRUD

**Files:**
- Create: `app/api/projects/route.ts`
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/projects/page.tsx`
- Create: `components/layout/dashboard-sidebar.tsx`

**Interfaces:**
- Consumes: `auth()`, `prisma`
- Produces: `GET/POST /api/projects`, `DELETE /api/projects/[id]`, dashboard layout with sidebar, projects list page

- [ ] **Step 1: Write projects API**

`app/api/projects/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, type: true, thumbnailUrl: true, updatedAt: true },
    take: 50,
  });
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, state } = await req.json();
  if (!name || !type) return NextResponse.json({ error: "Name and type required" }, { status: 400 });

  const project = await prisma.project.create({
    data: { userId: session.user.id, name, type: type as any, state: state || {} },
  });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.project.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Write dashboard layout**

`app/(dashboard)/layout.tsx`:
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto bg-neutral-50">{children}</main>
    </div>
  );
}
```

`components/layout/dashboard-sidebar.tsx`:
```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/projects", label: "My Projects", icon: "📁" },
  { href: "/icon-maker", label: "New Icon", icon: "🎨" },
  { href: "/mockup-maker", label: "New Mockup", icon: "📱" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r border-neutral-200 bg-white flex flex-col">
      <Link href="/" className="px-4 py-5 text-lg font-bold text-neutral-900 border-b border-neutral-100">AppIconMock</Link>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
              ${pathname === l.href ? "bg-neutral-100 text-neutral-900 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-neutral-100">
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Write projects page**

`app/(dashboard)/projects/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Project {
  id: string; name: string; type: "icon" | "mockup"; thumbnailUrl: string | null; updatedAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  async function deleteProject(id: string) {
    await fetch("/api/projects", {
      method: "DELETE",
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
    });
    setProjects(p => p.filter(x => x.id !== id));
    toast.success("Project deleted");
  }

  if (loading) return <div className="p-8 text-sm text-neutral-400">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <div className="flex gap-2">
          <Link href="/icon-maker"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            New Icon
          </Link>
          <Link href="/mockup-maker"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            New Mockup
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500 mb-2">No projects yet</p>
          <p className="text-sm text-neutral-400">Create your first icon or mockup</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4 group hover:shadow-md transition-shadow">
              <div className="aspect-square rounded-lg bg-neutral-100 mb-3 flex items-center justify-center text-3xl">
                {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : (p.type === "icon" ? "🎨" : "📱")}
              </div>
              <h3 className="text-sm font-medium text-neutral-900 truncate">{p.name}</h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-neutral-400">{new Date(p.updatedAt).toLocaleDateString()}</span>
                <button onClick={() => deleteProject(p.id)}
                  className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/projects/ app/\(dashboard\)/ components/layout/dashboard-sidebar.tsx
git commit -m "feat: add projects CRUD API, dashboard layout, projects list page

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 19: Ad Integration

**Files:**
- Create: `lib/ad-helper.ts`
- Modify: `app/layout.tsx` (add AdSense script)
- Create: `components/ads/AdBanner.tsx`
- Create: `app/api/ads/track/route.ts`

**Interfaces:**
- Consumes: `prisma`, `auth()`, `POST /api/ads/track` recording impression in `ad_impressions`
- Produces: AdSense script in root layout, AdBanner component with frequency cap, impression tracking API

- [ ] **Step 1: Write ad helper**

`lib/ad-helper.ts`:
```typescript
import { prisma } from "./prisma";

const FREQUENCY_MS = 3 * 60 * 1000; // 3 minutes

export async function canShowAd(userId: string | null, placement: string): Promise<boolean> {
  if (!userId) return true; // guests always see ads

  const session = await prisma.adImpression.findFirst({
    where: { userId },
    orderBy: { timestamp: "desc" },
  });

  // Registered users: 1 ad per session (no recent impression)
  if (session && Date.now() - session.timestamp.getTime() < FREQUENCY_MS) {
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Write ad tracking API**

`app/api/ads/track/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const { placement } = await req.json();

  await prisma.adImpression.create({
    data: {
      userId: session?.user?.id || null,
      placement: placement as any,
    },
  });

  return NextResponse.json({ tracked: true });
}
```

- [ ] **Step 3: Write AdBanner component**

`components/ads/AdBanner.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";

interface AdBannerProps {
  placement: "editor_top" | "export_modal" | "landing";
  className?: string;
}

export function AdBanner({ placement, className = "" }: AdBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placement }),
    }).catch(() => {});
    setShow(true);
  }, [placement]);

  if (!show) return null;

  return (
    <div className={`rounded-lg border border-neutral-200 bg-neutral-50 text-center overflow-hidden ${className}`}>
      <ins className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true" />
    </div>
  );
}
```

- [ ] **Step 4: Add AdSense script to root layout**

Add to `app/layout.tsx` `<head>` via a `<Script>` component:
```typescript
import Script from "next/script";

// in layout, add before closing </body>:
<Script
  src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
  strategy="lazyOnload"
  crossOrigin="anonymous"
/>
```

- [ ] **Step 5: Add AdBanner to landing page and editor pages**

Landing page: `<AdBanner placement="landing" className="mt-16 max-w-4xl mx-auto" />`
Icon maker: `<AdBanner placement="editor_top" className="mb-2 w-full max-w-[512px]" />`
Mockup maker: `<AdBanner placement="editor_top" className="mb-2" />`

- [ ] **Step 6: Commit**

```bash
git add components/ads/ lib/ad-helper.ts app/api/ads/ app/layout.tsx app/page.tsx app/icon-maker/page.tsx app/mockup-maker/page.tsx
git commit -m "feat: add Google AdSense integration with frequency tracking

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 20: Polish — Error States, Loading Skeletons, Toasts

**Files:**
- Modify: `app/icon-maker/page.tsx` (polish)
- Modify: `app/mockup-maker/page.tsx` (polish)
- Create: `components/ui/loading-spinner.tsx`
- Create: `components/ui/error-boundary.tsx`

**Interfaces:**
- Produces: Consistent loading, empty, error states across all components

- [ ] **Step 1: Write LoadingSpinner**

`components/ui/loading-spinner.tsx`:
```typescript
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-neutral-200 border-t-blue-600`}
      role="status" aria-label="Loading" />
  );
}
```

- [ ] **Step 2: Write ErrorBoundary**

`components/ui/error-boundary.tsx`:
```typescript
"use client";

import { Component, ReactNode } from "react";
import { Button } from "./button"; // shadcn

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <p className="text-lg font-semibold text-neutral-800">Something went wrong</p>
          <p className="text-sm text-neutral-500">{this.state.error?.message || "An unexpected error occurred"}</p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 3: Wrap icon maker and mockup maker in ErrorBoundary**

Edit both page.tsx files — wrap the inner content with `<ErrorBoundary>`.

- [ ] **Step 4: Add skeleton loading for dynamic imports**

Both editor pages already use `loading: () => <Skeleton />` on dynamic imports. Verify.

- [ ] **Step 5: Verify all component states**

Audit each component against the five required states. Confirm:
- TemplatePicker: handles empty (no templates) and error (fetch failed)
- AI Generator: handles idle, generating, done, error, quota-exceeded
- Export panels: handles ready, exporting with progress, done, error
- Properties panel: handles no-selection (disabled)
- Screenshot upload: handles empty, dragging, uploading, error

- [ ] **Step 6: Commit**

```bash
git add components/ui/ app/icon-maker/ app/mockup-maker/
git commit -m "feat: add loading skeletons, error boundaries, polished error states

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 21: Deployment — Server + Nginx + PM2 + Domain

**Files:**
- Create: `ecosystem.config.cjs` (PM2 config)
- Create: `deploy/nginx-appiconmock.conf` (Nginx config snippet)
- Create: `deploy/setup.sh` (server setup script)

**Interfaces:**
- Produces: App running at appiconmock.com with SSL, PM2 managed, Nginx reverse proxy

- [ ] **Step 1: Write PM2 config**

`ecosystem.config.cjs`:
```js
module.exports = {
  apps: [{
    name: "appiconmock",
    script: "node_modules/.bin/next",
    args: "start -p 3001",
    cwd: "/home/bilvas/appiconmock",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: "3001",
    },
    max_memory_restart: "500M",
    autorestart: true,
    watch: false,
  }],
};
```

- [ ] **Step 2: Write Nginx config**

`deploy/nginx-appiconmock.conf`:
```nginx
server {
    listen 80;
    server_name appiconmock.com www.appiconmock.com;

    client_max_body_size 20M;

    location /storage/ {
        alias /home/bilvas/appiconmock/storage/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

- [ ] **Step 3: Write server setup script**

`deploy/setup.sh`:
```bash
#!/bin/bash
set -e

echo "=== AppIconMock Server Setup ==="

# Create directory
mkdir -p /home/bilvas/appiconmock/storage/{exports,uploads,ai}
chown -R bilvas:bilvas /home/bilvas/appiconmock

# Install Nginx config
cp deploy/nginx-appiconmock.conf /etc/nginx/sites-available/appiconmock
ln -sf /etc/nginx/sites-available/appiconmock /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Install SSL
certbot --nginx -d appiconmock.com -d www.appiconmock.com --non-interactive --agree-tos -m admin@appiconmock.com

# Setup PM2
sudo -u bilvas pm2 start ecosystem.config.cjs
sudo -u bilvas pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u bilvas --hp /home/bilvas

echo "=== Done. Visit https://appiconmock.com ==="
```

- [ ] **Step 4: First deploy — manual**

```bash
# On local machine:
cd /Users/stanobi/Projects/appiconmock
npm run build
rsync -avz --exclude node_modules --exclude .git --exclude .next/cache \
  .next/ package.json package-lock.json ecosystem.config.cjs prisma/ public/ deploy/ \
  root@67.217.56.26:/home/bilvas/appiconmock/

# SSH into server:
ssh root@67.217.56.26
cd /home/bilvas/appiconmock
npm ci --omit=dev
npx prisma migrate deploy
chown -R bilvas:bilvas .

# Run setup:
bash deploy/setup.sh
```

- [ ] **Step 5: Verify deployment**

- Visit `https://appiconmock.com` — landing page loads
- Test auth: register → login → session persists
- Test icon maker: create design → export → download ZIP
- Test mockup maker: upload screenshot → select frame → export PNG
- Test AI: generate icon (requires Imagen credentials)
- Check PM2: `pm2 status` shows `appiconmock` online
- Check Nginx: `nginx -t` passes

- [ ] **Step 6: Write CI/CD deploy script**

`deploy/deploy.sh`:
```bash
#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Syncing..."
rsync -avz --delete --exclude node_modules --exclude .git --exclude .next/cache --exclude storage \
  .next/ package.json package-lock.json ecosystem.config.cjs prisma/ public/ lib/ app/ components/ stores/ \
  root@67.217.56.26:/home/bilvas/appiconmock/

echo "Migrating + restarting..."
ssh root@67.217.56.26 "cd /home/bilvas/appiconmock && npm ci --omit=dev && npx prisma migrate deploy && sudo -u bilvas pm2 reload appiconmock"

echo "Deployed to https://appiconmock.com"
```

- [ ] **Step 7: Commit**

```bash
git add ecosystem.config.cjs deploy/
git commit -m "feat: add deployment config (PM2, Nginx, setup scripts)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 22: SEO + Metadata + Final Cleanup

**Files:**
- Modify: `app/layout.tsx` (metadata)
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

**Interfaces:**
- Produces: Complete SEO metadata, robots.txt, sitemap

- [ ] **Step 1: Write robots.txt**

`public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /storage/
Sitemap: https://appiconmock.com/sitemap.xml
```

- [ ] **Step 2: Write sitemap route**

`app/sitemap.ts`:
```typescript
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://appiconmock.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://appiconmock.com/icon-maker", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: "https://appiconmock.com/mockup-maker", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: "https://appiconmock.com/login", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://appiconmock.com/register", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];
}
```

- [ ] **Step 3: Update root layout metadata**

Update the `metadata` export in `app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: {
    default: "AppIconMock — Free App Icon & Mockup Maker",
    template: "%s | AppIconMock",
  },
  description: "Create stunning app icons for iOS and Android, and beautiful device mockups. Free, no sign-up required. AI-powered icon generation.",
  keywords: ["app icon maker", "mockup generator", "iOS icon", "Android icon", "device mockup", "app store screenshot"],
  authors: [{ name: "AppIconMock" }],
  openGraph: {
    title: "AppIconMock — Free App Icon & Mockup Maker",
    description: "Create stunning app icons and device mockups. Free, AI-powered.",
    url: "https://appiconmock.com",
    siteName: "AppIconMock",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AppIconMock — Free App Icon & Mockup Maker",
    description: "Create stunning app icons and device mockups. Free, AI-powered.",
  },
  robots: { index: true, follow: true },
};
```

- [ ] **Step 4: Final build test**

```bash
npm run build
```
Verify zero errors, check bundle sizes.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/sitemap.ts public/robots.txt
git commit -m "feat: add SEO metadata, sitemap, robots.txt

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task Dependencies

```
 1 (Scaffold)
  │
  ├── 2 (DB Schema)
  │    │
  │    ├── 3 (Auth)
  │    │    │
  │    │    ├── 5 (Auth Pages)
  │    │    │
  │    │    └── 18 (Projects CRUD)
  │    │
  │    └── 6 (Zustand Stores)
  │
  ├── 4 (Layout + Landing)
  │
  └── 7 (Icon Canvas)
       │
       ├── 8 (Toolbar)
       ├── 9 (Properties Panel)
       ├── 10 (Templates)
       ├── 11 (Export Pipeline - Server)
       ├── 12 (Export Panel)
       ├── 16 (AI Server)
       └── 17 (AI UI)

 13 (Mockup Upload + Canvas)
  │
  ├── 14 (Frame/Scene/Layout Pickers)
  └── 15 (Mockup Export)

 19 (Ad Integration) — depends on 4 (Layout)
 20 (Polish) — depends on all editor tasks
 21 (Deployment) — depends on all tasks
 22 (SEO) — depends on 4 (Layout)
```

## Suggested Build Order

1. **Foundation** (Tasks 1-6): Scaffold, DB, Auth, Layout, Auth Pages, Stores
2. **Icon Maker** (Tasks 7-12): Canvas, Toolbar, Properties, Templates, Export Pipeline, Export UI
3. **Mockup Maker** (Tasks 13-15): Upload+Canvas, Pickers, Export
4. **AI** (Tasks 16-17): Server integration, UI panel
5. **Projects** (Task 18): CRUD + dashboard
6. **Polish + Deploy** (Tasks 19-22): Ads, error states, deployment, SEO
