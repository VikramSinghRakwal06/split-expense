# SplitExpense — frontend

A minimal demo UI for SplitExpense, a Splitwise-style expense-sharing app: register,
log in, create a group, add an expense, split it, settle up, and see the
notifications each of those actions raises for the people involved. Built for
working functionality over visual polish — no dark mode, no charts, no admin panel.

## What backend this expects

The SplitExpense API gateway (`api-gateway`, in the parent directory), fronting
four Spring Boot services: `auth-service`, `group-service`, `expense-service`,
`notification-service`. This app talks to the gateway only, at the single
base URL in `NEXT_PUBLIC_API_URL` — never to an individual service directly.

Every endpoint path, request body, response shape, and validation rule used
here was read from that backend's source (controllers, DTOs, and each
service's `GlobalExceptionHandler`), not guessed.

Start the backend first — from the parent `split-expense/` directory:

```bash
docker compose up
```

This brings up Postgres, Redis, Kafka, all four services, and the gateway on
`localhost:8080`.

## Running the frontend

```bash
npm install
cp .env.local.example .env.local   # defaults already point at localhost:8080
npm run dev
```

Then visit `http://localhost:3000` — it redirects to `/login`.

## Environment variables

| Variable               | Default                 | Used by                                   |
| ----------------------- | ------------------------ | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8080` | Server Components, Server Actions and route handlers (see below) — the base URL of the SplitExpense API gateway. |

## How auth works here

The access and refresh tokens are stored as **httpOnly cookies**, set by this
app's own Next.js route handlers — never in `localStorage`. `localStorage` is
readable by any JavaScript running on the page, so a single XSS bug anywhere
in the app (or in a dependency) can exfiltrate the token wholesale. An
httpOnly cookie is invisible to `document.cookie` and to any JS the page
runs; the browser attaches it automatically and only this app's own
server-side code ever reads it.

Because of that, the browser itself never touches a token. `lib/server-api.ts`
is the one place that reads the cookie, attaches `Authorization: Bearer
<token>`, and calls the real gateway — and it's imported only by code that
runs on the server: Server Components (`lib/data/**`), Server Actions
(`lib/actions/**`), and the handful of Route Handlers still under
`app/api/**`. On a 401 from the gateway it attempts exactly one token
refresh and retries the original request once; if that also fails, cookies
are cleared and the caller sees the 401.

`proxy.ts` (Next.js 16 renamed `middleware.ts` — see
`node_modules/next/dist/docs`, which flagged the breaking API changes in this
version before any code was written) does an optimistic check — cookie
presence only — before `/groups` and `/notifications`, and bounces
signed-in users away from `/login`/`/register`. It cannot verify the JWT
itself (no signing secret on this side), which is fine: every SplitExpense
service re-verifies the token independently regardless, the same
defense-in-depth principle already used throughout the backend.

## Server Components for reads, Server Actions for writes

Every page under `app/(app)/groups/**` and `app/(app)/notifications` is a
Server Component: it calls `lib/data/**` directly at render time (no client
fetch, no loading spinner for the initial paint — `loading.tsx` streams a
skeleton in while the fetch is in flight instead). Every mutation — creating
a group, adding a member, recording an expense or settlement, marking a
notification read — is a Server Action in `lib/actions/**`, wired to a plain
`<form action={...}>` and `useActionState` rather than a client-side fetch
against a same-origin proxy route. That collapses what used to be
client-fetch → route-handler → gateway into one hop: the form POSTs straight
to the Server Action, which calls the gateway itself.

`lib/api.ts` still exists, deliberately smaller: it covers only what a
genuinely client-side concern still needs — the auth flow (which must run
*before* any protected Server Component renders, and sets cookies a
pre-navigation form can't originate from) and the nav bar's unread-count
badge, which polls on client-side navigation and is exactly the
"non-mutating request from a Client Component" case Next's own Server
Actions guide carves out for a Route Handler.

## Idempotency keys

Recording an expense, voiding one, and recording a settlement all send a
fresh `crypto.randomUUID()` as the `Idempotency-Key` header, minted once per
Server Action invocation — i.e. once per user-initiated attempt, not once
per form mount. If that exact request is retried — a dropped connection
between this server and the gateway, a timeout — expense-service recognizes
the repeated key as the same attempt and returns the original result instead
of applying it twice. A second, deliberate resubmission by the user is a new
action invocation and gets a new key, because it's a new attempt.

## Known gaps in the backend this UI is honest about

- **No invite-by-email.** `POST /groups/{id}/members` takes a raw account
  UUID — group-service has no user-lookup endpoint yet. The "add member" form
  asks for that UUID directly rather than pretending an email search exists;
  see its copy and `group-service`'s own `AddMemberRequest` javadoc.
- **An owner can leave their own group.** `removeMember` lets anyone —
  including a sole owner — remove themselves once they're settled up, with no
  check for what that leaves behind. Not something this frontend works
  around; flagging it here since it's a real latent gap on the backend side.

## Not built (out of scope)

Settings, profile editing, dark mode, admin panels, charts/analytics,
animations, debt simplification, and multi-currency expenses (an expense is
always denominated in its group's fixed currency).
