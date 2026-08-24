

create-auth-schema:
    bun x auth@latest generate --config server/lib/auth.ts --output server/database/schema/auth-schema.ts
  