# 📦 Packages We Use (and why)

Here's every dependency in `apps/icy/package.json`, explained for a junior dev. I've grouped them by job.

---

## The Web Framework

### `nuxt` (v4)
**What it is:** The framework that runs the whole app. It renders your Vue pages (SSR), handles routing, server API routes, and folder conventions.

**Why we need it:** Without Nuxt, you'd have to manually wire up a server, a router, and a build system. Nuxt does all that so you focus on features.

**In our code:** `nuxt.config.ts`, the `app/` and `server/` folders.

---

### `vue` + `vue-router`
**What it is:** Vue is the UI library (components, reactivity). Vue Router is the client-side routing.

**Why we need it:** Nuxt is built *on top of* Vue. When you write `login.vue`, you're writing Vue. Nuxt provides the surrounding framework.

**In our code:** Every `.vue` file, e.g. `app/pages/login.vue`.

---

## Authentication

### `better-auth`
**What it is:** The authentication library. It handles:
- GitHub OAuth login
- Email/password login
- Sessions + cookies
- The `/api/auth/*` endpoints

**Why we need it:** Auth is famously hard and error-prone. Better Auth gives you a secure, type-safe implementation without writing OAuth yourself.

**In our code:**
- `server/lib/auth.ts` — configures Better Auth on the server
- `app/lib/auth-client.ts` — configures the client

---

### `@better-auth/drizzle-adapter`
**What it is:** The glue between Better Auth and Drizzle. It tells Better Auth how to store users/sessions/accounts using Drizzle tables.

**Why we need it:** Better Auth is database-agnostic. This adapter tells it "use Drizzle/SQLite."

**In our code:**
```typescript
// server/lib/auth.ts
database: drizzleAdapter(db, { provider: "sqlite", schema: authschema })
```

---

## Database

### `drizzle-orm`
**What it is:** An **ORM** (Object-Relational Mapper). It lets you interact with the database using TypeScript instead of writing raw SQL.

**Why we need it:** So you can define tables in TypeScript (`auth-schema.ts`) and query them safely with autocomplete.

**In our code:** `server/database/schema/auth-schema.ts` (table definitions), `server/database/db.ts` (connection).

---

### `@libsql/client`
**What it is:** The official driver for **LibSQL** — the SQLite-compatible database engine Better Auth uses here.

**Why we need it:** Drizzle needs a driver to actually talk to the database file (`local.db`). This is that driver.

**In our code:**
```typescript
// server/database/db.ts
import { drizzle } from 'drizzle-orm/libsql'
export const db = drizzle({ connection: { url: 'file:local.db' } })
```

---

### `drizzle-kit` *(devDependency)*
**What it is:** Drizzle's CLI tool for generating migrations and managing schema changes.

**Why we need it:** When you change a table definition, you run drizzle-kit to generate a migration file that updates the database without losing data.

**In our code:** `drizzle.config.ts` tells it where your schema and migrations live.

---

## Dependency Tree (how they relate)

```
        ┌─────────────────────────────┐
        │          nuxt               │  ← the framework
        └──────────────┬──────────────┘
                       │ builds on
        ┌──────────────▼──────────────┐
        │          vue + vue-router   │  ← the UI layer
        └──────────────┬──────────────┘
                       │ uses
        ┌──────────────▼──────────────┐
        │        better-auth          │  ← auth logic
        └──────────────┬──────────────┘
                       │ persists to
        ┌──────────────▼──────────────┐
        │   @better-auth/drizzle-adapter │
        └──────────────┬──────────────┘
                       │ talks to
        ┌──────────────▼──────────────┐
        │    drizzle-orm + @libsql     │  ← DB access
        └──────────────┬──────────────┘
                       │ writes to
        ┌──────────────▼──────────────┐
        │         local.db (SQLite)    │  ← the data
        └─────────────────────────────┘
```

---

## Quick "what to install for what" cheat sheet

| You want to... | Package |
|---|---|
| Build a web app | `nuxt` |
| Add a button/UI | `vue` (built into `.vue` files) |
| Let users log in | `better-auth` |
| Store login data | `@better-auth/drizzle-adapter` + `drizzle-orm` + `@libsql/client` |
| Change the DB schema | `drizzle-kit` |

---

## Summary

- **Nuxt** is the framework, **Vue** is the UI library underneath it.
- **Better Auth** handles login and sessions.
- **Drizzle + LibSQL/SQLite** stores the data.
- The **drizzle-adapter** is the bridge between auth and database.

Next → [`auth-in-this-app.md`](./auth-in-this-app.md) to see how these map to your actual files.
