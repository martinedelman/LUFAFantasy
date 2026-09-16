---
name: testing-lufa-routing
description: Run LUFA frontends against the local API and verify configurable routing through browser UI.
---

# Local routing tests

## Devin Secrets Needed
None for public catalog pages and rejected-login routing checks. Generate a disposable local `FLAGS_SECRET` for release-gate overrides; do not copy production secrets.

## Services
- Source `~/.nvm/nvm.sh`, then use the repository's installed npm workspaces.
- Copy each application's `.env.example` to an ignored `.env.local` only if absent; preserve existing settings.
- API runs on 3001, institutional on 3000, Fantasy on 3002, and lufa-institutional on 3003. Start each with `npm run dev --workspace=@lufa/<app>`.
- Configure the same local PostgreSQL `DATABASE_URL` wherever the database package/API needs it. The compose example exposes PostgreSQL on 5434.
- If Docker registries are unavailable, native PostgreSQL is an alternative: install the OS package, configure a local cluster on 5434, create a disposable role/database, then run `npm run db:postgres:migrate` with `DATABASE_URL` exported. Never target a shared database for fixtures.
- Seed an active tournament, division, two teams, and a future scheduled game. Inspect current schema requirements first; JSON `officials` must be an array (`[]`), not `{}`.

## Release-gated pages
Institutional catalog routes can show “Acceso pausado por ahora” even with a healthy API. Inspect `apps/institutional/src/flags.ts` before diagnosing this as routing failure.
For local-only testing, generate `FLAGS_SECRET` with 32 random bytes encoded base64url, place it in institutional's ignored environment file, and restart.
Use `encryptOverrides` from `flags` with that secret and the desired boolean keys, then install the encrypted value as the `vercel-flag-overrides` cookie on localhost through browser automation/CDP.
Relevant keys include `show-teams-pages`, `show-games-pages`, `show-tournaments-pages`, and `show-standings-pages`. The SDK checks overrides before `decide`; no remote Vercel flag service is needed for this isolated setup.

## Runtime evidence
- Use native browser navigation and DevTools Network to show same-origin URLs and statuses, not direct backend calls.
- Institutional `/teams`, `/games`, `/tournaments`, `/standings`: expect `/api/*` JSON 200 and fixture data. Standings requires an active tournament/division selection.
- Fantasy `/auth/signin`: submit nonexistent local credentials and expect `/api/fantasy/v1/auth/login` 401 plus the backend invalid-credentials message. This proves routing, not successful authentication.
- LUFA homepage: UpcomingGames calls `/api/dashboard` (200); logged-out `/api/auth/me` returns 401. Invalid login should likewise return 401, not a proxy failure.
- Institutional `/sitemap.xml` should contain fixture-specific team, tournament, and game URLs beyond static entries.
- Change all frontend `API_URL` settings to an unused port, restart frontends, and repeat representative UI requests. Expect 500 for rewrites and 502 for LUFA server proxies, with connection-refused logs naming the configured port.
- Repeat with a trailing slash on the correct URL. Expect original 200/401 responses and restored data.
- Restore the original environment values and restart frontends when finished. Keep recording focused on UI; preserve network evidence separately.
