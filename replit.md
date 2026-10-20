# Nova Airdrop

Participant portal for X sign-in, X account verification status, and a MongoDB-backed airdrop eligibility record.

## Run & Operate

- `pnpm --filter @workspace/nova-airdrop run dev` — run the participant web app
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secrets: `MONGODB_URI`, `SESSION_SECRET`, `X_CLIENT_ID`, `X_CLIENT_SECRET`
- Optional env: `X_REDIRECT_URI` overrides the callback derived from the Replit domain
- X callback: `/api/auth/x/callback`; the exact callback URL must also be registered in the X Developer Console

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite
- API: Express 5
- Participant and session storage: MongoDB
- The workspace also includes a PostgreSQL/Drizzle library, but the airdrop auth flow does not use it
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nova-airdrop` — participant sign-in and eligibility UI
- `artifacts/api-server/src/routes/auth.ts` — X OAuth flow and session endpoints
- `artifacts/api-server/src/lib/mongo.ts` — participant records and MongoDB session store
- `lib/api-spec/openapi.yaml` — source of truth for the API contract

## Architecture decisions

- X OAuth 2.0 Authorization Code with PKCE is used to prove control of an X account.
- Successful X sign-in is the only current eligibility requirement. X's verification status is recorded for display but is not required.
- OAuth access tokens are used only for the X profile lookup and are not persisted.

## Product

Participants can sign in with X, view the X verification status saved for their account, and see their current airdrop eligibility record.

## User preferences

Eligibility currently follows successful X sign-in only. No follow, like, repost, or other campaign engagement actions are required.

The current OAuth request asks for `users.read` and reads the signed-in profile with `GET /2/users/me`; it does not retain the access token or verify engagement. X offers a following list endpoint (`GET /2/users/:id/following`, requiring follow-read permission) and a liked-posts endpoint (`GET /2/users/:id/liked_tweets`, requiring like-read permission and post-read access). These could provide evidence for a specifically named follow or like, subject to X API access, user authorization, and endpoint availability. No target account or post is currently configured, so those checks must not affect eligibility. X's `verified` and `verified_type` profile fields are a separate reported account status, not evidence of campaign activity.

## Gotchas

- X's registered callback URI must exactly match the redirect URI used by the app.
- For production, set `X_REDIRECT_URI` to the published callback and register that URL in the X Developer Console.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
