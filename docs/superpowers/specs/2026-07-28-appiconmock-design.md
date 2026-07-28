# AppIconMock — Design Specification
**Date:** 2026-07-28
**Status:** Approved

## 1. Summary

Unified web application with two tools: **free app icon maker** and **free app mockup maker** for Android and iOS. Broad consumer target — solo devs, designers, agencies. Ad-supported monetization with freemium upgrade path. Single codebase under one domain.

## 2. Tool Capabilities

### Icon Maker
- **Templates:** Preset icon designs organized by category (Minimal, Gradient, Flat, Material)
- **Canvas Editor:** Fabric.js — shapes (rect, circle, rounded rect, star, polygon), text tool, icon library browser (SVG), background tool (solid/gradient/image), layer ordering
- **AI Generation:** Text-to-icon via Google Imagen (Vertex AI), 4 variations per prompt, user picks best
- **Export:** One-click "Export All iOS + Android" — auto-generates 20+ sizes with correct folder structure + Contents.json for Xcode. Custom size picker also available

### Mockup Maker
- **Device Frames:** iPhone 16 Pro, 15, SE, Pixel 9, Galaxy S24, etc. with color variants and orientation toggle
- **Scenes:** Real-world context placements (Desk, Handheld, Outdoor, Abstract categories)
- **Multi-Screen:** 1+1, 2+1, 3-grid, 4-grid layouts, drag screenshots to slots
- **Export:** Resolution 1x/2x/3x, PNG/JPEG, single file download

## 3. Architecture

**Approach C: Hybrid (Client canvas + Server export)**

```
┌────────────────────────────────────────────────┐
│  Browser (Next.js Client)                       │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Fabric.js    │  │  html2canvas              │ │
│  │  Icon Editor  │  │  Mockup Preview            │ │
│  └──────┬───────┘  └──────────┬───────────────┘ │
│         │                     │                  │
│  ┌──────▼─────────────────────▼───────────────┐ │
│  │  Zustand Stores (icon, export, ai, mockup)  │ │
│  └────────────────────────────────────────────┘ │
└────────────────────┬───────────────────────────┘
                     │ API calls
┌────────────────────▼───────────────────────────┐
│  Next.js Server                                 │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ NextAuth │ │ Sharp    │ │ Imagen Proxy  │  │
│  │ (JWT)    │ │ Pipeline │ │ (Vertex AI)   │  │
│  └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Prisma + PostgreSQL                     │  │
│  │  (users, projects, exports, ads, cache)  │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, Server Components) |
| Language | TypeScript |
| Icon Editor | Fabric.js 6 |
| Mockup Preview | html2canvas |
| Server Image Processing | Sharp |
| AI | Google Imagen 3 via Vertex AI SDK |
| Auth | NextAuth.js v5 (credentials + Google + GitHub) |
| Database | PostgreSQL + Prisma ORM |
| State (Client) | Zustand |
| Styling | Tailwind CSS + shadcn/ui |
| Ads | Google AdSense (manual placements) |
| Hosting | Self-hosted (67.217.56.26), PM2 + Nginx |
| Storage | Local disk `/storage/` with 1h TTL on exports |

## 5. Directory Structure

```
appiconmock/
├── app/
│   ├── layout.tsx                    # Providers, AdSense script
│   ├── page.tsx                      # Landing page (tool selection)
│   ├── globals.css
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Sidebar + project list
│   │   ├── projects/page.tsx
│   │   └── settings/page.tsx
│   ├── icon-maker/
│   │   ├── page.tsx
│   │   └── _components/
│   │       ├── Canvas.tsx
│   │       ├── Toolbar.tsx
│   │       ├── PropertiesPanel.tsx
│   │       ├── TemplatePicker.tsx
│   │       ├── ExportPanel.tsx
│   │       └── AIGenerator.tsx
│   └── mockup-maker/
│       ├── page.tsx
│       └── _components/
│           ├── ScreenshotUpload.tsx
│           ├── FramePicker.tsx
│           ├── ScenePicker.tsx
│           ├── LayoutPicker.tsx
│           ├── Canvas.tsx
│           └── ExportPanel.tsx
├── server/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── icons/
│   │   │   ├── export/route.ts
│   │   │   └── ai-generate/route.ts
│   │   ├── mockups/
│   │   │   ├── render/route.ts
│   │   │   └── export/route.ts
│   │   └── projects/route.ts
│   ├── lib/
│   │   ├── sharp-pipeline.ts
│   │   ├── imagen.ts
│   │   ├── mockup-renderer.ts
│   │   └── ad-helper.ts
│   └── db/
│       ├── schema.prisma
│       └── seed.ts
├── public/
│   ├── templates/                    # Bundled icon templates (SVG)
│   ├── frames/                       # Device frames (PNG)
│   ├── scenes/                       # Scene backgrounds
│   └── icon-libraries/              # Free icon sets (Material, Feather, etc.)
├── storage/                          # User uploads + exports (gitignored)
│   ├── exports/                      # ZIP files, auto-deleted after 1h
│   ├── uploads/                      # User screenshots for mockups
│   └── ai/                           # AI-generated images
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 6. Icon Export Pipeline (Sharp)

Client sends JSON payload `{ layers[], canvasSize, format }` → API reconstructs canvas → Sharp composites layers into 1024x1024 buffer → resize to all target sizes → bundle into ZIP → stream download.

**iOS sizes generated (18 files + Contents.json):**

| Idiom | Scales | Points |
|-------|--------|--------|
| iPhone | @2x, @3x | 20, 29, 40, 60 |
| iPad | @1x, @2x | 20, 29, 40, 76, 83.5 |
| App Store | @1x | 1024 |

**Android sizes (6 + adaptive layers):**

| Density | Size |
|---------|------|
| mdpi | 48x48 |
| hdpi | 72x72 |
| xhdpi | 96x96 |
| xxhdpi | 144x144 |
| xxxhdpi | 192x192 |
| Play Store | 512x512 |

**Adaptive icons (Android API 26+):** Generate foreground layer (108dp safe, 72dp content) + background layer → `ic_launcher.xml` + `ic_launcher_round.xml`.

## 7. Mockup Rendering

Two-pass: browser preview (html2canvas, instant feedback) → server export (Sharp compositing, production quality).

Device frames stored as base PNG + screen mask. Server compositing: place screenshot within mask region, apply perspective transform for 3D-angle frames, composite over device image, add shadow.

Scene mockups: screenshot placed into pre-composited scene image using position coordinates from scene metadata JSON.

## 8. AI Integration

- **Model:** Google Imagen 3 (`imagegeneration@006`)
- **Prompt:** User description + "app icon, clean, no text, no watermark, square"
- **Output:** 4 variations per request, returned as URLs
- **Cache:** Hash prompt → reuse result for 24h
- **Rate limits:** 5/day guest, 20/day registered, unlimited for premium (future)
- **Fallback:** Quota exceeded → show template suggestions + "try again tomorrow" message

## 9. Component States

Every component handles these states:

| State | Where Used |
|-------|-----------|
| empty / initial | Template picker before selection, upload before file, canvas before first action |
| loading | Template fetch, AI generation, export processing, asset loading |
| populated / active | Normal editing state for all tools |
| error | API failures, rate limits, invalid uploads, network loss |
| disabled | Tools unavailable until prerequisite action (e.g., no canvas element selected → properties panel disabled) |

## 10. Database Schema

```
User
  id: UUID
  email: String? (null for guests)
  passwordHash: String?
  name: String?
  avatar: String?
  role: enum(guest, user, premium, admin)
  aiQuotaUsed: Int
  aiQuotaResetAt: DateTime
  createdAt: DateTime
  lastLoginAt: DateTime

Project
  id: UUID
  userId: UUID (FK)
  type: enum(icon, mockup)
  name: String
  thumbnailUrl: String?
  state: JSON (canvas layers/settings)
  isPublic: Boolean
  createdAt: DateTime
  updatedAt: DateTime

Export
  id: UUID
  projectId: UUID (FK)
  userId: UUID (FK)
  type: enum(ios, android, mockup)
  fileUrl: String
  fileSize: Int
  createdAt: DateTime
  expiresAt: DateTime (1h TTL)

AdImpression
  id: UUID
  userId: UUID? (FK)
  placement: enum(editor-top, export-modal, landing)
  timestamp: DateTime

AIGenerationCache
  id: UUID
  promptHash: String (unique)
  imageUrl: String
  createdAt: DateTime (24h TTL)
```

## 11. Authentication Flow

**Guest:** localStorage guest ID → access tools → 3 exports/day limit → upgrade prompt on limit hit.

**Registered:** Email/password (bcrypt) or Google/GitHub OAuth → JWT session → 20 exports/day + 20 AI generations/day.

**Upgrade path (future):** Premium tier → no ads, unlimited exports, unlimited AI, priority export queue.

Guest data lost on browser clear — explicit warning shown.

## 12. Ad Integration

- Google AdSense manual placements: landing sidebar, editor bottom bar, export completion
- Frequency cap: max 1 impression per 3 min per user (tracked via `AdImpression`)
- Conditional loading: `next/script` with `strategy="lazyOnload"`
- Guest: ads always shown. Registered: reduced (1/session). Premium: none

## 13. Deployment

- **Server:** 67.217.56.26 (existing VidmoAI server)
- **Process:** PM2 running `next start` on port (e.g., 3001)
- **Reverse proxy:** Nginx `appiconmock.com` → `localhost:3001`
- **Database:** PostgreSQL (existing instance, new database)
- **Storage:** `/home/bilvas/appiconmock/storage/`
- **CI/CD:** Git push → SSH → `git pull` → `npm install` → `npx prisma migrate deploy` → `pm2 restart appiconmock`
- **Domain:** appiconmock.com (purchase needed)
- **SSL:** Let's Encrypt via Certbot on Nginx

## 14. Upgrade Paths

| Feature | v1 (Launch) | v2 (Post-Launch) |
|---------|-------------|-------------------|
| Icon templates | 20 bundled | User-submitted marketplace |
| AI generations | 5-20/day | Unlimited premium + style fine-tuning |
| Device frames | 15 (latest models) | 30+ with older models |
| Mockup scenes | 10 bundled | Premium scene packs |
| Export formats | PNG, JPEG | WebP, SVG, PDF |
| Collaboration | None | Share project links |
| API | None | Public REST API for CI/CD icon generation |

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Sharp compositing fidelity doesn't match canvas preview | Canvas renders from 1024px source; server uses same source. Test early with gradient/text/shadow edge cases |
| Imagen costs exceed budget | Cache layer, hard quota cap in DB, free tier tight limits |
| Fabric.js bundle size (~180KB gzipped) | Dynamic import for icon-maker route only |
| Device frame licensing | Use only free/CC-licensed frames. Generate own via 3D renders |
| Guest storage lost | Explicit warning. "Create account to save" prompt on every export |
| High server load from exports | Queue system (future). v1: process inline with timeout, show "try again" on overload |
