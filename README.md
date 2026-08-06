# YUG Enterprises — Payroll Management

Employee, attendance, and salary management system. Attendance is recorded daily per employee;
monthly salary (Basic/HRA/Conveyance, OT, PF/ESI/LWF deductions, Net Pay) is auto-calculated from
attendance, replacing the manual `YUG.xlsx` sheet.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + TanStack Query
- Backend: Node.js + Express + TypeScript + Prisma
- Database: PostgreSQL (Docker)

## Run with Docker

```bash
cp .env.example .env   # edit JWT_SECRET / ADMIN_PASSWORD / POSTGRES_PASSWORD
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (seeded automatically on first boot).

## Local development (without Docker)

Backend:
```bash
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Salary calculation

See `backend/src/services/payrollService.ts` — pure function, covered by
`backend/src/services/payrollService.test.ts`. Rates (PF %, ESI %, wage ceilings, LWF, OT
multiplier) are editable from the in-app Settings page, not hardcoded.

## Typical workflow
1. Add Departments, then Employees (with Basic/HRA/Conveyance).
2. Mark daily Attendance for the month (calendar grid, click a cell to cycle status).
3. Go to Payroll → select month → "Generate / Refresh" to compute salary slips.
4. Adjust arrears per employee if needed, then Finalize slips.
5. Download payslip PDFs or export the whole month to Excel.

## Deploying for free (no credit card)

Database on **Neon** (free Postgres), backend as **Vercel serverless functions**, frontend as a
**Vercel** static site. No server ever "sleeps" in the traditional sense — serverless functions
run per-request, so there's nothing that goes idle and needs to wake up.

### 1. Database — Neon
1. Sign up at [neon.tech](https://neon.tech) (no card).
2. Create a project + database. On the connection details page, copy **two** connection strings:
   - the **pooled** one (has `-pooler` in the hostname) → this is `DATABASE_URL`
   - the **direct** one (no `-pooler`) → this is `DIRECT_URL` (Prisma needs this for migrations)

### 2. Backend — Vercel
1. Push this repo to GitHub (or use the Vercel CLI to deploy without git: `npm i -g vercel`).
2. In the Vercel dashboard, "Add New Project" → import the repo → set **Root Directory** to
   `backend`.
3. Add environment variables: `DATABASE_URL`, `DIRECT_URL` (from Neon), `JWT_SECRET`,
   `JWT_EXPIRES_IN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGIN` (set this once you know your
   frontend's Vercel URL, e.g. `https://your-frontend.vercel.app`).
4. Deploy. The `vercel-build` script (`prisma generate && prisma migrate deploy && npm run
   prisma:seed`) runs automatically on every deploy, so migrations and the admin user are always
   up to date. Your API is now live at `https://your-backend.vercel.app/api/...`.

### 3. Frontend — Vercel
1. "Add New Project" again → same repo → **Root Directory** `frontend`, framework preset **Vite**.
2. Add environment variable `VITE_API_URL` = `https://your-backend.vercel.app/api`.
3. Deploy. Then go back to the backend project's `CORS_ORIGIN` env var and set it to this
   frontend's URL, and redeploy the backend so CORS is locked down to just your site.

That's it — both are on Vercel's free Hobby plan (no card), Neon's free tier persists
indefinitely, and nothing here has an idle-sleep/cold-start cliff the way a free Render web
service would.
