## Context

`OwnerAuth` is `sendMagicLink`, `completeLogin`, `getOwner`, `signOut`, with an in-memory fake and a contract suite from `platform-portability`. Only `lib/platform/adapters/supabase/` may import `@supabase/*`. Supabase Auth sends the email through Resend's SMTP (PBS Q30).

## Goals / Non-Goals

**Goals:**
- Only the owner can see owner data, enforced in server code on every request.
- No way to learn from the login form which emails are valid.

**Non-Goals:**
- Role models, passwordless alternatives, session management UI.

## Decisions

- **Authorisation is ours, not Supabase's.** The adapter only authenticates. `requireOwner()` calls `OwnerAuth.getOwner(headers)` and then checks the email equals `OWNER_EMAIL` (case-insensitive); anything else is treated as signed out. A second Supabase user, even a valid one, gets nothing.
- **Same answer for every email.** `/owner/login` always shows "If that's the owner's email, a link is on its way". It sends only when the email matches. This avoids user enumeration and means a stranger cannot trigger mail through our SMTP.
- **Guard at three layers.** The owner `layout.tsx` redirects when signed out; every server action and route handler under `/owner` calls `requireOwner()` first; `proxy.ts` redirects early for speed. Only the second is a security control; the first and third are for UX. A test lists every exported server action under `app/owner` and fails if one does not call the guard.
- The guard-coverage scanner resolves the named import to the approved module, rejects shadowed or reassigned bindings, and supports aliased imports.
- **Proxy refresh stays in the Supabase adapter.** The proxy calls Supabase `getUser()` to refresh a session before rendering, forwards changed cookies to both the downstream request and outgoing response (including redirects), and fails closed on errors. `requireOwner()` remains the authorization check.
- **Cookies via `@supabase/ssr`**, httpOnly, secure, same-site lax, set inside the adapter. Nothing else reads them.
- **Link completion in a route handler.** `/owner/auth/callback` passes the query to `completeLogin`; on success it redirects to `/owner/orders`, on failure to `/owner/login?error=link`.
- **Rate limit.** 5 link requests per hour per client address and per email, using the shared limiter.
- **Robots and caching.** `X-Robots-Tag: noindex` and `Cache-Control: no-store` on `/owner/**`.
- **Manual setup is explicit.** The tasks include a BLOCKED-for-human task listing the Supabase dashboard steps, because agents may not change Supabase settings.

## Risks / Trade-offs

- [A forgotten guard on a new action] → The guard-coverage test.
- [Supabase email deliverability on the free SMTP] → Resend SMTP is configured by a human; documented.
- [Cookie handling differs on the VPS adapter later] → Confined to the adapter; the contract suite covers behaviour.
- [Magic link opened on another device] → Supabase enforces single use; the user is told to request a new link.
