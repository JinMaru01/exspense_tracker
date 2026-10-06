---
name: frontend-react-expert
description: Expert-level frontend engineering for React + Tailwind CSS + Ant Design (antd) applications, including building UIs, wiring them to a FastAPI backend, and debugging/maintaining a running frontend when it breaks. Use this whenever the user is building, styling, structuring, connecting, or fixing a React frontend — especially with Tailwind and Ant Design — or when a deployed frontend shows a blank/white screen, CORS errors, failed API calls, build failures, or antd/Tailwind styling conflicts. Trigger on phrasings like "build the frontend", "React component", "the page is blank", "antd table/form", "Tailwind isn't applying", "connect the UI to the API", "CORS error", "vite build fails", or any frontend implementation or debugging need in this stack.
---

# Frontend Expert — React + Tailwind + Ant Design

Expert guidance for building and maintaining production-grade React frontends on a fixed stack: **React 18 + Vite + Tailwind CSS + Ant Design (antd v5) + TypeScript**, talking to a **FastAPI** backend, shipped in a **Docker** container behind **nginx**. This skill covers both building and the harder job of keeping it running.

## Stack decisions (use these unless told otherwise)
- **Build tool: Vite** (fast, simple Docker builds). Not CRA.
- **Language: TypeScript.** Catches the class of bugs that cause blank prod screens.
- **Data fetching: TanStack Query (react-query)** for server state; plain `useState`/`useReducer` for UI state. Avoid hand-rolled fetch-in-useEffect for anything real.
- **HTTP: a single `axios` instance** in `src/api/client.ts` with the base URL from an env var.
- **Routing: react-router-dom v6.**
- **Forms: antd `Form`** (it owns validation + layout); don't mix with react-hook-form unless there's a reason.

## The Tailwind + Ant Design coexistence rule (read first — this is the #1 source of pain)
Tailwind's preflight resets and antd's own styles fight. Prevent it up front:
1. In `tailwind.config.js` set `corePlugins: { preflight: false }` **or** scope preflight — disabling preflight is the simplest reliable choice when antd owns most components.
2. Load antd's styles/theme via its `ConfigProvider`; use Tailwind mainly for **layout and spacing** (flex, grid, gap, padding) and let antd own **component look**. Don't try to Tailwind-restyle antd internals with arbitrary selectors — use antd's `theme` tokens via `ConfigProvider` instead.
3. Set antd theme tokens (colors, radius) in one place so the app is themeable:
```tsx
<ConfigProvider theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
```
4. If a Tailwind class "doesn't apply" to an antd component, it's almost always specificity — the fix is an antd token or `className` on the antd wrapper, not `!important` spam.

## Project structure
```
frontend/
├── Dockerfile                 # multi-stage: build -> nginx (see infra skill)
├── nginx.conf                 # SPA fallback + /api proxy (see infra skill)
├── .env.example               # VITE_API_BASE_URL=...
├── vite.config.ts
├── tailwind.config.js         # preflight: false
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx               # ConfigProvider + QueryClientProvider + Router
    ├── api/
    │   ├── client.ts          # single axios instance, interceptors
    │   └── <resource>.ts      # typed API functions per resource
    ├── hooks/                 # useXxx query/mutation hooks
    ├── components/            # reusable presentational components
    ├── pages/                 # route-level components
    ├── types/                 # shared TS types (mirror backend schemas)
    └── lib/                   # helpers (formatting, constants)
```

## Core patterns

### The API client (single source of truth)
`src/api/client.ts`: one axios instance, base URL from `import.meta.env.VITE_API_BASE_URL`, a response interceptor that normalizes errors, and a request interceptor for auth headers if needed. Every API call goes through it — never scatter `fetch` calls.

### Env vars the Vite way
Only `VITE_`-prefixed vars reach the browser, and they're **baked in at build time**, not runtime. This is the single most common deploy confusion: changing an env var on the server does nothing unless you rebuild. For UAT, the base URL should point at the same host via a relative `/api` path proxied by nginx, so the build is portable across environments. Prefer `VITE_API_BASE_URL=/api` and let nginx route it.

### Data fetching with react-query
Wrap fetches in typed hooks (`useJobs()`, `useApproveJob()`), get caching, loading, error, and refetch for free. Set sensible `staleTime` and handle `isError` in the UI — never render assuming data exists.

### Ant Design tables & forms (the workhorses)
- Tables: define `columns` with typed `dataIndex`, use `rowKey`, and drive server pagination via react-query params. Don't load everything client-side for large sets.
- Forms: let antd `Form` own validation with `rules`; submit via `onFinish`; show server-side field errors by mapping the API error response back onto `form.setFields`.

## Design system — "lotus & warmth" (modelled on https://pchumben.vercel.app/)
Warm, calm, Cambodian: cream paper background, lotus-pink accents, soft rounded cards,
glass header. Every new page/component follows it.

**Colors** (Tailwind `warmth-*` / `lotus-*` in `tailwind.config.js`; the same values as antd
tokens in `lib/constants.ts` → `THEME_TOKENS`, applied once in `main.tsx`):
| token | use | values |
|---|---|---|
| `warmth` 50→950 | page bg 50 · surfaces 100 · borders 200 · muted text 500–700 · text 950 | `#faf7f2 #f4ede2 #e8dbca #d7c2a9 #c2a384 #ad8766 #9b7156 #815c48 #6a4d3f #574136 #2e211b` |
| `lotus` 50→900 | accents, active nav, icon tiles, prices; antd `colorPrimary` = lotus-600 | `#fdf4f6 #fce7eb #f9d2dc #f4adc0 #ea7c9b #dc5078 #c5345d #a52549 #89223e #732138` |
| amber (Tailwind default) | gold highlights in gradients only | `amber-50` |
Selection: lotus-200 bg / lotus-900 text (index.css).

**Type:** Inter for Latin + **Kantumruy Pro** for Khmer (Google Fonts in `index.html`;
`font-sans` = Inter → Kantumruy Pro, `font-khmer` = Kantumruy Pro → Battambang → Siemreap).
Khmer stacks subscripts, so `html[lang='km'] body { line-height: 1.7 }`. Put `font-khmer` on
headings/labels that are usually Khmer.

**Shape & depth:** antd `borderRadius` 12 (`LG` 16, `SM` 8); Tailwind `rounded-xl` (controls),
`rounded-2xl` (tiles, cards, panels), `rounded-3xl` (hero bands), `rounded-full` (pills).
Shadows: `shadow-soft` (resting cards), `shadow-lotus` (`0 2px 10px rgba(220,80,120,.18)`,
hover / featured), antd `shadow-lg/xl` only for dropdowns and the mobile tab bar.

**Recipes (copy these):**
- **App shell** (`components/AppLayout.tsx`): sticky glass header
  `sticky top-0 z-40 border-b border-warmth-200/80 bg-warmth-50/95 backdrop-blur-md`, content
  `mx-auto max-w-7xl px-4 sm:px-6`, footer `border-t bg-white/80 backdrop-blur-sm` with the
  slogan; **no sidebar**.
- **Logo / icon tile**: `flex h-10 w-10 items-center justify-center rounded-2xl border
  border-lotus-200 bg-lotus-50 shadow-soft` holding 🪷 (logo) or the purpose icon (store cards).
- **Nav pills** (desktop, `lg:` and up): `rounded-xl border px-3 py-1.5 text-sm font-medium`;
  active `border-lotus-200 bg-lotus-50 text-lotus-700`, idle `border-transparent text-warmth-700
  hover:bg-warmth-100`.
- **Mobile tab bar** (below `lg`): `fixed inset-x-0 bottom-0 z-40 border-t bg-white/95
  backdrop-blur-md shadow-lg`, items `min-h-[48px] min-w-[56px] rounded-2xl text-[11px]` icon over
  label; the page gets `pb-20 lg:pb-0`. At most 5 items; account/logout live in the header menu.
- **Chip button** (language switch, account menu): `rounded-xl border border-warmth-200/70
  bg-warmth-100 px-3 py-1.5 text-xs font-semibold text-warmth-800 shadow-soft
  hover:bg-warmth-200 active:scale-95`.
- **Hero band** (dashboard/login): `rounded-3xl border border-lotus-100 bg-gradient-to-br
  from-lotus-50 via-warmth-50 to-amber-50 shadow-lotus`.
- **Section label**: `px-1 text-[11px] font-bold uppercase tracking-wider text-warmth-500`.
- **Price pill**: `rounded-full bg-lotus-50 px-3 py-1 font-bold text-lotus-700`.
- **Inset stats** inside a card: `rounded-2xl bg-warmth-50 p-3`.
- Status colours stay antd `Tag` colours (green paid/active, gold waiting, blue in progress,
  red failed) — maps live in `types/enums.ts`.
Use antd components for everything interactive; Tailwind only places and tints them (no
`!important`, no restyling antd internals).

## Bilingual UI — Khmer (default) + English
Model: the reference site's — flat dictionaries + a tiny provider, no i18n library.
- `src/i18n/en.ts` is the **source of keys** (`'area.thing': 'Text {param}'`); `src/i18n/km.ts`
  is typed `Record<MessageKey, string>` — **a missing Khmer text fails the build**. Add every new
  key to both, in the same section. Keep terms consistent with the bot (`backend/app/bot/i18n/km.py`):
  ហាង store · ការកុម្ម៉ង់ order · ការទូទាត់ payment · ផលិតផល product · បូត bot · អ្នកគ្រប់គ្រង admin ·
  ម្ចាស់ហាង store owner.
- `t(key, params)` from `src/i18n` works anywhere (components, helpers). `{name}` placeholders
  are filled from params. Never concatenate translated fragments to build sentences — put the
  whole sentence in one key with placeholders (word order differs in Khmer).
- **Never freeze text at module load.** Language switches remount the app (`I18nProvider`
  keys a Fragment on the language), which re-runs components — not module-level constants.
  Columns, sort options, select options and label maps must be **functions** (e.g.
  `const columns = () => [...]`) or use `labels(prefix, keys)` (enum label maps in
  `types/enums.ts` read `t()` lazily).
- Dynamic keys: build them with `as const`-friendly template literals (`t(\`orderStatus.${s}\`)`)
  or check with `hasMessage(key)` (API error codes: `describeError` shows `error.<code>` in Khmer).
- antd's own texts and dates follow the language (`ConfigProvider locale` km_KH / en_US and
  `dayjs.locale` in `I18nProvider`). The choice persists in localStorage (`storefront.lang`)
  and sets `<html lang>`; `components/LanguageSwitch.tsx` is the 🇰🇭 / 🇬🇧 pill.
- Backend-written text (product names, store names, payment instructions) stays as typed.

## Debugging playbook (the "keep it running" half)

Diagnose by symptom. Work top-down; each entry lists the fast checks in order.

### Blank / white screen in production (works in dev)
The most common prod failure. Check in order:
1. **Open the browser console** — a blank screen almost always has a red error. A bare "Unexpected token '<'" means a JS/asset path 404'd and returned index.html.
2. **Asset base path** — if assets 404, `base` in `vite.config.ts` is wrong for where nginx serves from. For root serving, `base: '/'`.
3. **SPA fallback missing** — refreshing a sub-route 404s because nginx isn't falling back to index.html. Fix in nginx (`try_files $uri /index.html;` — see infra skill).
4. **Env var baked wrong** — API base URL points somewhere unreachable; every call fails and an unguarded render crashes. Check the Network tab.

### API calls fail
1. **CORS error in console** → it's a *backend* fix (FastAPI `CORSMiddleware`) OR, better, avoid CORS entirely by serving the API same-origin under `/api` via nginx. Prefer the proxy approach for UAT.
2. **404 on /api/...** → nginx isn't proxying `/api` to the backend, or the route path is wrong. `curl` the backend directly from the box to isolate frontend vs backend.
3. **Network error / ERR_CONNECTION** → backend container down or wrong host/port. Check `docker ps` and backend health.
4. **401/403** → auth header not attached; check the axios request interceptor.

### Styling broken
1. **Tailwind classes do nothing** → `content` globs in `tailwind.config.js` don't include your files, so classes are purged. Verify the glob covers `./src/**/*.{ts,tsx}`.
2. **antd looks unstyled** → antd v5 injects styles at runtime via CSS-in-JS; if components are naked, `ConfigProvider` is missing or antd wasn't imported correctly.
3. **antd + Tailwind conflict** → see the coexistence rule above; usually preflight.

### Build fails in Docker but works locally
1. **TypeScript errors** — local dev may skip type-check that `vite build` enforces. Run `tsc --noEmit` locally to reproduce.
2. **Case-sensitive imports** — your Mac/Windows is case-insensitive; the Linux build container is not. `import './Button'` vs a file named `button.tsx` fails only in Docker.
3. **Missing dep** — it's in local `node_modules` but not `package.json`. Reinstall clean (`rm -rf node_modules && npm ci`) to reproduce.
4. **Out of memory** — large builds OOM in a small container; raise the build stage memory or set `NODE_OPTIONS=--max-old-space-size`.

### Runtime performance
- Big antd tables lag → server-side pagination + `virtual` where supported.
- Re-render storms → memoize expensive children, stabilize callback props, check react-query `staleTime`.

## Handoff to other skills
- Dockerfile, nginx config, and deployment are owned by the **infra-docker-uat** skill — reference it for the multi-stage build and the `/api` proxy.
- API contract, CORS config, and error shapes are owned by the **backend-fastapi-expert** skill — keep the frontend `types/` mirrored to the backend's Pydantic schemas.

## Definition of done for a frontend task
- `npm run build` succeeds with `tsc --noEmit` clean.
- The app loads at `/`, sub-routes survive a refresh, and every API call goes through the single axios client.
- No console errors on the main flows; loading and error states render for every data fetch.
- Tailwind handles layout, antd handles components, theme tokens live in one `ConfigProvider`.
- The page follows the design system (warmth/lotus, rounded-2xl, glass header, mobile tab bar)
  and every user-visible string goes through `t()` with both `en.ts` and `km.ts` entries —
  checked in both languages with the switch.
