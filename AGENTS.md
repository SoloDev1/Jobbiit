# AGENTS.md

## Cursor Cloud specific instructions

### Overview

OpporLink is an Express.js/TypeScript backend API for a professional networking platform. Single-service Node.js app using Prisma 7 ORM with PostgreSQL.

### Running services

- **PostgreSQL**: Must be running on `localhost:5432` before the app starts. Start with `sudo pg_ctlcluster 16 main start`.
- **Dev server**: `npm run dev` (uses nodemon + tsx for hot reload on port 3000).

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` (postinstall runs `prisma generate && npm run build`) |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Tests | `npx vitest run` (no test files exist yet; exits with code 1) |
| Migrations | `npx prisma migrate deploy` (apply existing), `npx prisma migrate dev` (create new) |
| Generate Prisma | `npx prisma generate` |

### Environment variables

A `.env` file is required at the project root. See `src/config/env.ts` for the Zod schema. Key required vars: `DATABASE_URL`, `JWT_ACCESS_SECRET` (min 32 chars), `JWT_REFRESH_SECRET` (min 32 chars), `CLOUDINARY_*` (3 vars), `GOOGLE_*_CLIENT_ID` (3 vars), `APPLE_CLIENT_ID`. The app calls `process.exit(1)` on startup if env validation fails.

### Gotchas

- The `express-rate-limit` library emits a non-fatal `ERR_ERL_KEY_GEN_IPV6` warning in dev when `trust proxy` resolves to `::1`. This is safe to ignore.
- `ioredis` is in `package.json` but never imported in source code; Redis is not needed.
- The `postinstall` script runs `prisma generate && npm run build`. If the build fails during `npm install`, check for TypeScript errors first.
- `BCRYPT_ROUNDS` defaults to 12; set to 4 in dev `.env` for faster signup/login during testing.
