# 🗺️ Auth In THIS App — File-by-File Map

This ties everything together: which file does what, and how the pieces connect. Read this last — it assumes you understand [how Nuxt works](./how-nuxt-works.md), [the OAuth flow](./oauth-flow.md), and [the packages](./packages.md).

---

## The Two "Sides" of Auth in This App

Remember: auth code lives on **two sides** that must stay in sync.

| Side | Files | Responsibility |
|---|---|---|
| **Server** | `server/lib/auth.ts`, `server/database/*`, `server/api/auth/[...all].ts` | Create sessions, verify cookies, talk to DB |
| **Client** | `app/lib/auth-client.ts`, `app/pages/*`, `app/middleware/*` | Show login button, read session, protect pages |

---

## The Server Side (creates & verifies identity)

### `server/lib/auth.ts` — The heart of auth

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../database/db";
import * as authschema from "../database/schema/auth-schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authschema
  }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
});
```

**What it does, line by line:**
- `betterAuth({...})` — creates the auth instance with all config
- `database: drizzleAdapter(...)` — tells Better Auth to store data via Drizzle
- `schema: authschema` — **critical**: tells the adapter which tables exist (`user`, `session`, `account`, `verification`). Without this, Better Auth can't find the `verification` table (the exact error we fixed!)
- `emailAndPassword` — enables email/password login (in addition to GitHub)
- `socialProviders.github` — enables "Login with GitHub", reading the client ID/secret from env

> **Runs only on the server.** It reads `process.env.GITHUB_CLIENT_SECRET`, which must never be exposed to the browser.

---

### `server/api/auth/[...all].ts` — The route that handles ALL auth requests

```typescript
import { auth } from "~~/server/lib/auth";

export default defineEventHandler((event) => {
	return auth.handler(toWebRequest(event));
});
```

**What it does:** The `[...all]` is a **catch-all** route. It forwards *every* request under `/api/auth/*` to Better Auth's handler:
- `/api/auth/sign-in/github` — start GitHub login
- `/api/auth/callback/github` — GitHub redirects here after approval
- `/api/auth/get-session` — return the current user (based on cookie)
- `/api/auth/sign-out` — log out

**One file, all the auth endpoints.** Neat, right? That's why the docs recommend keeping it as `/api/auth/[...all]`.

---

### `server/database/schema/auth-schema.ts` — The tables

Defines `user`, `session`, `account`, and `verification` tables using Drizzle. This is the schema that `drizzleAdapter` needs so Better Auth knows where to store things.

---

### `server/database/db.ts` — The DB connection

```typescript
import { drizzle } from 'drizzle-orm/libsql';
export const db = drizzle({ connection: { url: 'file:local.db' }});
```

Creates the Drizzle instance pointing at the `local.db` SQLite file.

---

## The Client Side (shows & consumes identity)

### `app/lib/auth-client.ts` — The client-side auth object

```typescript
import { createAuthClient } from "better-auth/vue"
export const authClient = createAuthClient({
    baseURL: "http://localhost:3000"   // ⚠️ see note below
})
```

**What it does:** Creates a client that can talk to the Better Auth server from the browser. It gives you `authClient.signIn`, `authClient.signOut`, `authClient.useSession`, etc.

> **⚠️ IMPORTANT — the `baseURL` bug we fixed:** Setting an absolute `baseURL` here makes Nuxt's `useFetch` (used internally by `useSession`) treat requests as external, so it **stops forwarding the cookie during SSR**. That's why refresh lost the login. The Better Auth docs create the client with **no baseURL** so it uses the relative `/api/auth` and forwards cookies correctly. Remove the `baseURL` line to match the docs.

---

### `app/pages/login.vue` — The login page

```typescript
<script setup lang="ts">
import { authClient } from "~/lib/auth-client";
const { data: session } = await authClient.useSession(useFetch);
</script>
<template>
	<div v-if="session">
		<p>Welcome, {{ session.user.name }}</p>
		<button @click="authClient.signOut()">Sign out</button>
	</div>
	<button v-else @click="authClient.signIn.social({ provider: 'github' })">
		Continue with GitHub
	</button>
</template>
```

**What it does:**
- `authClient.useSession(useFetch)` — asks the server "who is logged in?" **on both server and client** (passing `useFetch` enables SSR cookie forwarding)
- If `session` exists → show "Welcome" + a sign-out button
- If not → show the GitHub login button
- `signIn.social({ provider: 'github' })` — starts the OAuth flow from [oauth-flow.md](./oauth-flow.md)
- `signOut()` — ends the session

---

### `app/middleware/auth.ts` — Route protection

```typescript
import { authClient } from "~/lib/auth-client";
export default defineNuxtRouteMiddleware(async (to) => {
	const { data: session } = await authClient.useSession(useFetch);
	if (!session.value) {
		return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
	}
});
```

**What it does:** Runs **before** navigating to a protected page. If there's no session, redirect to `/login` (remembering the original page in `?redirect=` so we can send them back after login).

---

### `app/pages/dashboard.vue` — A protected page

```typescript
<script setup lang="ts">
    definePageMeta({ middleware: "auth" });
</script>
```

**What it does:** The one line `definePageMeta({ middleware: "auth" })` opts this page into the `auth` middleware. So `/dashboard` is only accessible when logged in.

---

## How They All Connect (one diagram)

```
Browser
  │  GET /dashboard
  ▼
app/pages/dashboard.vue ── definePageMeta({ middleware: "auth" })
  │
  ▼
app/middleware/auth.ts ── authClient.useSession(useFetch)
  │                          │
  │   (client or server)     │  GET /api/auth/get-session
  │                          ▼
  │                  server/api/auth/[...all].ts
  │                          │  auth.handler()
  │                          ▼
  │                  server/lib/auth.ts (betterAuth)
  │                          │  reads cookie → queries DB
  │                          ▼
  │                  server/database/db.ts → local.db
  │                          │
  │                          ▼
  │   "session exists?" ── yes ──▶ render dashboard
  │        │
  │        no
  │        ▼
  │   navigateTo('/login?redirect=/dashboard')
  └────────
```

---

## File → Concept Cheat Sheet

| Question | Look in |
|---|---|
| Where is auth configured? | `server/lib/auth.ts` |
| Where do auth HTTP requests get handled? | `server/api/auth/[...all].ts` |
| What tables store users/sessions? | `server/database/schema/auth-schema.ts` |
| How does the client talk to auth? | `app/lib/auth-client.ts` |
| Where is the login UI? | `app/pages/login.vue` |
| How do I protect a page? | `app/middleware/auth.ts` + `definePageMeta` |

---

## Summary

- **Server side** creates and verifies identity (auth config, DB, catch-all route).
- **Client side** consumes identity (login UI, session hook, route guards).
- The `authschema` passed to `drizzleAdapter` is what connects Better Auth to your tables.
- The `baseURL` in the client must stay **relative** for SSR cookie forwarding to work.
