# 🧭 ICY Project Wiki

A beginner-friendly guide to how this app is built and how authentication works.

> **Who is this for?** A junior developer (you!) who wants to understand the codebase, not just copy-paste it. Each file explains the *why*, not just the *what*.

---

## 📚 Table of Contents

| File | What it covers |
|---|---|
| [`oauth-flow.md`](./oauth-flow.md) | How "Login with GitHub" works, step by step |
| [`packages.md`](./packages.md) | Every dependency and what it actually does |
| [`how-nuxt-works.md`](./how-nuxt-works.md) | How Nuxt renders pages (SSR vs client) |
| [`auth-in-this-app.md`](./auth-in-this-app.md) | Map of all auth files in THIS project |

---

## 🧱 The 30-second summary

This app is built with:

1. **Nuxt** — the web framework. Renders your Vue pages, both on the server and in the browser.
2. **Better Auth** — handles authentication (login, sessions, GitHub OAuth).
3. **Drizzle + SQLite** — the database. Better Auth stores users/sessions/accounts here.
4. **GitHub OAuth** — the "Login with GitHub" button. Lets users sign in with their GitHub account.

The most important idea to grasp is the **client / server split**. Your app has two "sides":

- **Client** = your browser (what the user sees and interacts with)
- **Server** = the Node.js process running Nuxt (where your data and secrets live)

Almost every confusing thing in auth comes down to one question: **"Am I running on the client or the server, and does this code have access to the cookie?"**

---

Start with [`how-nuxt-works.md`](./how-nuxt-works.md) if you're brand new to Nuxt, or jump straight to [`oauth-flow.md`](./oauth-flow.md) if you just want to understand login.
