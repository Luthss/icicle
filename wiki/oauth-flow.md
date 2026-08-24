# 🔑 How "Login with GitHub" Works (OAuth Flow)

This page walks through what actually happens when a user clicks **"Continue with GitHub"** — from the click to the welcome message.

> This is **OAuth 2.0** with the **Authorization Code** flow. Don't panic about the jargon — it just means "GitHub verifies the user, then tells us who they are."

---

## The Key Idea: Trust Through a Middleman

The user never gives *us* their GitHub password. Instead:

1. GitHub tells the user: *"The ICY app wants to know who you are. OK?"*
2. The user approves on GitHub's page.
3. GitHub tells *us*: *"This user is legit. Here's a token and their info."*

We **trust GitHub's word** instead of handling passwords ourselves. That's OAuth.

---

## The Players

| Player | In our code |
|---|---|
| **User** | The person clicking the button |
| **Client (our Nuxt app)** | Everything under `app/` |
| **Better Auth** | `server/lib/auth.ts` — orchestrates the flow |
| **GitHub** | The OAuth provider |
| **Database (Drizzle/SQLite)** | Stores the user + account link |

---

## The Full Flow, Step by Step

```
┌──────────┐  1. Click button    ┌──────────────┐
│  Browser │ ─────────────────▶  │  Better Auth  │
└──────────┘                     │  (server)     │
        ▲                        └──────┬───────┘
        │                               │  2. "Send user to GitHub"
        │                    ┌──────────▼──────────┐
        │  4. GitHub redirects│  GitHub (provider)  │
        │  user back with a   │  3. User logs in +  │
        │  `code`             │  approves           │
        └─────────────────────┴────────────────────┘
```

Let's break that down into concrete steps.

### Step 1: The user clicks the button

In `app/pages/login.vue`:
```html
<button @click="authClient.signIn.social({ provider: 'github' })">
    Continue with GitHub
</button>
```

This tells Better Auth: *"start a GitHub login."*

### Step 2: Better Auth redirects to GitHub

Better Auth sends the user's browser to GitHub's login page, with a query string that says:
- `client_id` — *"I am the ICY app"* (our `GITHUB_CLIENT_ID`)
- `redirect_uri` — *"send the user back here when done"*
- `state` — a random token to prevent attacks

### Step 3: User approves on GitHub

The user logs into GitHub (or is already logged in) and clicks **"Authorize ICY"**.

### Step 4: GitHub redirects back with a `code`

GitHub sends the browser back to our `redirect_uri`, with a special **`code`** in the URL:
```
http://localhost:3000/api/auth/callback/github?code=abc123&state=xyz
```

> **Important:** The `code` is *not* the login itself. It's a temporary voucher that we exchange on the server.

### Step 5: The server exchanges the `code` for a token

This is where it gets secure. The browser hands the `code` to **our server** (via the callback route `server/api/auth/[...all].ts`).

The **server** — not the browser — sends the `code` + our **`GITHUB_CLIENT_SECRET`** to GitHub's token endpoint:

> "GitHub, here's the code the user just got. Here's my secret proving I'm really ICY. Please give me a token."

This works because the **secret never leaves the server**. The browser never sees it.

### Step 6: GitHub returns user info + token

GitHub responds with:
- An **access token** (lets us call GitHub APIs on the user's behalf)
- The user's **profile** (name, email, avatar)

### Step 7: Better Auth stores the user

Better Auth checks the database:

1. Does a user with this email exist? **No** → create a new user row.
2. Create a row in the `account` table linking this GitHub account to our user.
3. Create a row in the `session` table (this is the user's current login session).

This is exactly why our schema has `user`, `account`, `session`, and `verification` tables (`server/database/schema/auth-schema.ts`).

### Step 8: Better Auth sets a cookie

The server sends back a response with a **cookie**:
```
better-auth.session_token=<a long random value>
```

The cookie is **HTTP-only** — the browser can *send* it but JavaScript can't read it. This prevents malicious scripts from stealing your session.

### Step 9: Back to the app, logged in

The browser lands back on the app, now carrying the cookie. On the next request, `authClient.useSession(useFetch)` reads the cookie, the server finds the matching session in the database, and responds with the user data → **"Welcome, looth!"**

---

## Visual: What the Database Looks Like After Login

```
┌─────────────────────────────────────────────┐
│  user table                                 │
│  id: u_1   name: Looth   email: ...         │
├─────────────────────────────────────────────┤
│  account table                              │
│  provider: github  accountId: 12345  userId: u_1 │
├─────────────────────────────────────────────┤
│  session table                              │
│  token: <random>  userId: u_1  expiresAt: ...   │
└─────────────────────────────────────────────┘
```

- **`user`** = who the person is
- **`account`** = how they logged in (GitHub) — a user can have many accounts
- **`session`** = *this specific* login (the cookie points to it)
- **`verification`** = used for email verification / password reset codes

---

## Why the `client_secret` must stay secret

In Step 5, the server proves it's really us by sending `GITHUB_CLIENT_SECRET`. If that secret leaked to the browser, anyone could impersonate us and get tokens. That's why it lives in `.env` and is only read on the server:

```typescript
// server/lib/auth.ts (runs ONLY on the server)
clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
```

---

## The Cookie → Session → User chain (recap)

```
better-auth.session_token=cookie
        │  (sent automatically by browser on each request)
        ▼
server looks up this token in the `session` table
        │
        ▼
session has a userId → look up the `user` table
        │
        ▼
"Welcome, looth!"
```

**This is the whole loop.** The cookie is just a key; the real identity lives in your database.

---

## Common confusion: token vs cookie vs session

| Term | What it is |
|---|---|
| **Cookie** | A small piece of data the browser stores and auto-sends |
| **Session** | A row in the DB saying "this login exists" |
| **Access token** | A short-lived key to call GitHub APIs (OAuth artifact) |

The **cookie** points to the **session**, which points to the **user**. The **access token** is only used for GitHub API calls, not for identifying the user in our app.

---

## Summary

1. User clicks GitHub → redirected to GitHub to approve.
2. GitHub redirects back with a `code`.
3. Server exchanges `code` + `client_secret` for user info.
4. Better Auth stores the user + creates a session.
5. Server sets an HTTP-only cookie.
6. Cookie is sent on every request → server recognizes the user.

Next → [`packages.md`](./packages.md) to understand each tool involved, or [`auth-in-this-app.md`](./auth-in-this-app.md) to map this flow to the actual files.
