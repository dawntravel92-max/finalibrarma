# IBRA-LIVE-RMA production implementation

The project now enforces a validated and resilient live-data path for the Real Madrid match center. Provider responses continue to be parsed through Zod, and every normalized `MatchRecord` is checked against a strict persistence schema before any database write. Invalid records are rejected with provider identifiers and validation issues in the server logs.

The live bundle uses bounded retries, timeouts, provider-scoped circuit breakers, request de-duplication, and explicit reconnect/failure logging. Redis is now an optional first-level cache using `REDIS_URL`; when Redis is absent or unavailable, the existing database-backed stale-while-revalidate cache remains active. The new bounded background queue exposes `admin.enqueueRefresh` and `admin.queueStatus` for heavy live-data refresh work without blocking a UI request.

The dashboard includes mobile-first live momentum, pressure-index, possession, shot, pressing, and heatmap surfaces, an accessible royal dark-mode switch, live polling, historical head-to-head prefetching for the next Real Madrid fixture, and optional goal toast/audio feedback. Existing lineup, injury/suspension-compatible roster, incident, and player-stat paths remain available through the match summary data contract.

## Runtime configuration

Set `REDIS_URL` to enable Redis. No Redis configuration is required for local development because the database cache fallback remains available. Provider API credentials are not required for the current public ESPN and TheSportsDB adapters.

## Verification

- `npm test`: **34 tests passed across 6 files**.
- `npm run build`: **production client and server build succeeded**.
- `npm run check`: the remaining failures are pre-existing demo-only `ComponentShowcase.tsx` imports for UI modules omitted from the supplied archive; the production build does not route to that showcase.
