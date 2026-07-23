import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./server/database/schema",
  out: "./server/database/migrations",   // where migration files go
  dbCredentials: {
    url: "file:local.db",                // url lives here, not top-level
  },
});