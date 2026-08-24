# 🌐 How Nuxt Works

Before you can understand auth, you need to understand *where* your code runs. This is the single most important concept.

---

## The Client / Server Split

Your Nuxt app has **two sides** that run the *same* Vue code but in different places:

| | **Server** | **Client (Browser)** |
|---|---|---|
| Where it runs | Node.js process on your machine | The user's web browser |
| Can access database? | ✅ Yes | ❌ No |
| Can read secret env vars? | ✅ Yes (e.g. `GITHUB_CLIENT_SECRET`) | ❌ No (never put secrets here) |
| Can see the user's cookie? | Only if it's *forwarded* to it | ✅ Yes, automatically |

**The golden rule:** Anything with secrets, database access, or private data **must** happen on the server. The browser can only do things the server lets it.

---

## The Two Phases of Loading a Page

When a user visits a page in Nuxt (with SSR enabled, which is the default), **two things happen in order**:

### Phase 1 — Server-Side Rendering (SSR)
```
Browser requests /login
        │
        ▼
Nuxt SERVER generates the HTML
        │
        ▼
Server returns complete HTML to the browser
```

- Nuxt runs your component's `<script setup>` **on the server**
- It renders the HTML
- This is what makes the page load fast and SEO-friendly

### Phase 2 — Client Hydration
```
Browser receives the HTML
        │
        ▼
Browser loads the JS bundle
        │
        ▼
Vue "hydrates" the page (takes over, makes it interactive)
```

- The browser re-runs the component code **in the browser**
- Now buttons work, clicks respond, etc.

**This is the key insight:** A page's `<script setup>` can run **twice** — once on the server, once in the browser.

---

## ⚠️ The SSR Cookie Trap (this bit us!)

This is *exactly* the bug we fought.

When a page loads via **SSR** (a refresh, or typing a URL), the code in `<script setup>` runs on the **server**. But the **cookie lives in the browser** — the server process doesn't automatically have it.

```
Browser (has cookie: better-auth.session_token=...)
        │
        │  1. "I want /login"
        │
        ▼
SERVER renders login.vue
        │
        │  2. Server runs: authClient.useSession(useFetch)
        │  3. Server tries to fetch the session ...
        │
        ▼
        ❌ Server doesn't have your cookie!
```

If the server's fetch doesn't receive the cookie, it thinks you're **logged out** — even though you just logged in.

### How Nuxt fixes this

Nuxt's `useFetch` **forwards the incoming cookie** automatically when the request is **relative** (same-origin). That's why the Better Auth docs say passing `useFetch` to `useSession` "makes the request with the incoming cookies."

**But** if you hand `useFetch` an **absolute URL** (like `http://localhost:3000/...`), Nuxt treats it as an *external* request and **stops forwarding the cookie**. That's why the extra `baseURL: "http://localhost:3000"` in `auth-client.ts` broke login-on-refresh.

### The mental model to remember

> **Relative URL → cookie is forwarded during SSR. Absolute URL → cookie is NOT forwarded during SSR.**

---

## Nuxt Folder Conventions (auto-import magic)

Nuxt has "conventions" — folders that automatically get special behavior. This is why you can use things like `useFetch`, `useRequestHeaders`, and `navigateTo` **without importing them**.

| Folder | What Nuxt does with it |
|---|---|
| `app/pages/` | Each `.vue` file becomes a route (`login.vue` → `/login`) |
| `app/components/` | Components auto-imported (usable without importing) |
| `app/composables/` | Functions auto-imported (usable without importing) |
| `app/middleware/` | Route guards that run before navigating |
| `server/api/` | Files become backend API routes (`auth/[...all].ts` → `/api/auth/*`) |
| `server/database/` | Your Drizzle schema + DB connection |
| `app/lib/` | Shared utility code you import manually |

**NuxtLayout / NuxtPage:** `app/app.vue` is the root component. `<NuxtPage />` renders the current page's component inside it. The header/nav in `app.vue` stays visible on every page.

---

## `useFetch` vs `useAsyncData` vs `$fetch` (quick)

| Tool | Runs on server? | Caches/shared? | When to use |
|---|---|---|---|
| `$fetch` | Yes | No | A one-off API call |
| `useFetch` | Yes | Yes (payload shared to client) | Fetching data a component needs |
| `useAsyncData` | Yes | Yes | Fetching when you need more control |

The important one for us: **`useFetch`** — it runs during SSR and reuses the result on the client, so the data isn't fetched twice.

---

## Summary

1. Nuxt runs your code on **both** server and client.
2. **SSR** generates fast HTML; **hydration** makes it interactive.
3. The browser owns the cookie; the server only sees it if it's **forwarded**.
4. **Relative** fetch URLs forward cookies; **absolute** ones don't.
5. Nuxt uses folder **conventions** for routes, middleware, and auto-imports.

Next → [`oauth-flow.md`](./oauth-flow.md) to see how login fits into all this.
