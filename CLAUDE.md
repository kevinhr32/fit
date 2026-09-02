# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Gymnisfit is a multi-tenant gym management SaaS with a Django REST Framework backend and a React (Vite + TypeScript) frontend. Each gym owner (ADMIN) gets an isolated tenant (`Gimnasio`); all data is scoped by gym so multiple gyms can use the same deployment without seeing each other's data.

There are two parallel UIs for the backend: legacy Django server-rendered views (templates under each app's `templates/`, used by `gimnasio/views.py` and `accounts/urls.py` for login) and the newer REST API (`api/` app) consumed by the React frontend. New feature work should go through the `api/` app + React, not the legacy template views, unless told otherwise.

## Commands

### Backend (Django, run from repo root)

```bash
# activate venv first (Windows): venv\Scripts\activate
python manage.py runserver              # dev server on :8000
python manage.py migrate                # apply migrations
python manage.py makemigrations         # create migrations after model changes
python manage.py test                   # run all tests
python manage.py test accounts          # run tests for one app
python manage.py test gimnasio.tests.SomeTestCase.test_something  # single test
python manage.py createsuperuser
```

Requires a `.env` file in the repo root (see `.env.example`) with `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`.

### Frontend (React + Vite, run from `frontend/`)

```bash
npm run dev       # dev server on :5173
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # preview production build
```

The frontend expects the API at `http://127.0.0.1:8000/api/` (hardcoded `BASE_URL` in `frontend/src/api/client.ts`).

## Architecture

### Backend apps

- **accounts** — Custom `User` model (`AUTH_USER_MODEL = 'accounts.User'`), email-based auth (no username), with a `role` field (`ADMIN`, `ENTRENADOR`, `CLIENTE`). A `post_save` signal on `User` (in `accounts/models.py`) auto-creates a `Gimnasio` whenever a user is saved with `role='ADMIN'`. Legacy Django `LoginView`/`LogoutView` live here for the server-rendered login page.
- **gimnasio** — Core domain models: `Gimnasio` (tenant, one-to-one with an ADMIN owner), `Cliente` (gym member, optionally linked to a `User` for portal access, with computed `estado` property: `VENCIDO`/`POR_VENCER`/`ACTIVO` based on `fecha_vencimiento`), `Clase` (class taught by an ENTRENADOR), `Reserva` (client's class booking, unique-constrained so a client can only have one active reservation per class), `Pago` (payments, with Colombian payment methods like Nequi/Daviplata/BRE-B). Also holds the legacy server-rendered dashboard views (`gimnasio/views.py`) and PDF export via `reportlab`.
- **api** — All DRF viewsets/serializers/permissions for the React frontend: `ClienteViewSet`, `PagoViewSet`, `EntrenadorViewSet`, `ClaseViewSet`, plus standalone views for dashboard stats, finanzas, PDF export, credential creation for clients, membership info, and reservations. Role-based permissions (`IsAdmin`, `IsEntrenador`, `IsCliente`, `IsAdminOrEntrenador`, `IsClienteActivo`) gate access per role; `IsClienteActivo` additionally requires the client's linked `Cliente.estado == 'ACTIVO'`.
- **rutinas** — Scaffolded Django app (routines/workout plans), not yet implemented (empty models/views).

Auth is JWT (`djangorestframework-simplejwt`) with 15-minute access tokens, 1-day refresh tokens, rotation + blacklisting on rotation enabled. CORS is restricted to the Vite dev ports (5173/5174).

### Multi-tenancy pattern

Almost every domain model chains back to `Gimnasio` (directly or via `Cliente`/`Clase`). When adding queries or viewsets, always filter by the requesting user's gym (`request.user.gimnasio` for entrenadores, `request.user.gimnasio_admin` for the ADMIN owner) — there's no global tenant middleware doing this automatically, it's enforced per-view.

### Frontend structure

`frontend/src/App.tsx` defines three role-gated route trees via `ProtectedRoute roles={[...]}`, each wrapped in its own layout:
- ADMIN → `Layout` + `Sidebar` → dashboard, clientes, entrenadores, finanzas, configuracion
- ENTRENADOR → `EntrenadorLayout` + `EntrenadorSidebar` → clases/reservas management
- CLIENTE → `ClienteLayout` + `ClienteSidebar` → clases disponibles, mis reservas, mi membresia

`frontend/src/api/client.ts` is a single axios instance with request/response interceptors that attach the JWT access token and transparently refresh it on 401 (queuing concurrent requests during refresh), redirecting to `/login` if refresh fails. Tokens are stored in `localStorage` under `gymnisfit_access`/`gymnisfit_refresh`. All new API calls should go through this `api` client, not raw axios/fetch.

Page-level components live in `frontend/src/pages/` (role subfolders `cliente/`, `entrenador/` for those portals), shared UI in `frontend/src/components/`, TS types in `frontend/src/types/index.ts`.

### Timezone

`TIME_ZONE = 'America/Bogota'` with `USE_TZ = True` — class schedules (`Clase.fecha_hora_inicio`) and reservations are timezone-aware in Bogotá time; be careful with naive datetimes when adding date logic.

## Planned features — CLIENTE portal roadmap (not yet implemented)

The following is agreed scope for the client-facing side of the app. None of this exists in code yet — treat it as the spec to implement, in this order, since later items depend on earlier ones:

1. **Rediseño visual del portal cliente.** The current `ClienteLayout`/`ClienteSidebar` and cliente pages are MVP-styled and not meant to be the final look. Establish the new visual language (layout, components, styling approach) here first so every feature below is built on top of it instead of retrofitted later.
2. **Seguimiento de progreso privado.** Private per-client tracking: peso (weight), medidas (body measurements), fotos. New model (e.g. `Progreso`: `cliente` FK, `fecha`, `peso`, measurement fields, optional photo) — visible/writable only by the owning `Cliente`; no gym-wide visibility. No dependencies on other items, safe to build independently of the redesign if needed sooner.
3. **Rutinas de ejercicios para principiantes.** Fills the scaffolded `rutinas` app (currently empty models/views): workout routines for clients who can't afford a trainer. Needs at least `Rutina` (nombre, nivel/dificultad, descripcion) and `Ejercicio` (rutina FK, nombre, series, repeticiones, descanso, video/imagen opcional). Read-only for CLIENTE; managed by ADMIN/ENTRENADOR.
4. **Retos a nivel de gimnasio.** Admin-created, gym-wide challenges (e.g. "20 sentadillas diarias en julio") that clients opt into. Needs a `Reto` model scoped to `Gimnasio` (nombre, descripcion, meta, fecha_inicio, fecha_fin) plus a join/participation model tracking each client's progress on it.
5. **Logros automáticos.** System-generated achievements (attendance streaks from `Reserva` history, personal records from `Progreso` entries, challenge completions from item 4) — computed, not manually written by the client. These are the primary source of content for the feed in item 6, so this needs to exist before the feed does.
6. **Feed social tipo comunidad.** Community feed per gym, populated primarily by auto-generated posts from logros/retos rather than free-form writing. Must be **togglable per gym by the ADMIN** (e.g. a `Gimnasio.feed_habilitado` boolean, exposed in the Configuración page) since not every gym wants a social/community culture. Build last: it consumes items 4 and 5.

Deferred, not to be implemented yet: sponsorship monetization (e.g. supplement stores like Natural Shops) inside the feed/app — revisit once there's a real user base. Also deferred: outreach to prospective pilot gyms (leads list + pilot email draft) — separate from product work, not part of this roadmap.
