# Behavior API Migration

Replace deprecated `https://behavior-api-bppr.onrender.com` with new `https://behavior-api-new-ngra.onrender.com` everywhere it appears, without touching any other functionality (threat API, anomaly engine, charts, tables, upload pipeline, normalization, UI).

## Scope of change (only 2 hardcoded references in the codebase)

1. `src/lib/store.ts` (line 48) — default `behaviorApi` in the Zustand store.
2. `src/routes/api/proxy.$service.ts` (line 43) — `DEFAULT_BASE.behavior` used by the server proxy when no `base` is sent from the client.

## Persisted state invalidation

The Zustand store persists `behaviorApi` in `localStorage` under key `soc-store`. Existing users will still have the old URL cached. To force the new default without breaking other persisted prefs:

- Bump the persist `name` to `soc-store-v2` (cleanly drops the stale URL on next load; nothing else of value is persisted — only the two API URLs).

## Already correct — no change needed

- `src/lib/api.ts` — sends `behaviorBase` from the store to the proxy (URL-agnostic).
- `src/routes/api/proxy.$service.ts` candidate path list (`/predict`, `/predict_csv`, `/behavior/predict`, `/upload`, `/analyze`, `/predict/behavior`, `/api/predict`, `/`) — auto-discovery already handles unknown endpoint shapes on the new host. Per-instance route cache will re-discover on first call to the new base.
- `src/lib/normalize.ts` — `normalizeBehaviorRow` already does defensive key lookups (`row.behavior_summary ?? row.summary ?? row.reasons`, `attack_prediction ?? prediction`, etc.) and coerces numbers/strings safely, so schema drift on the new API won't crash the UI.
- `src/routes/settings.tsx` — reads the URL from the store, so the new default flows through automatically and users can still override it.

## Resilience (already in place, re-verified)

- Proxy: 25s timeout, retries, multipart + JSON-rows + `{data: rows}` payload attempts, graceful 502 with typed error.
- `runPipeline` collects per-service errors without throwing; threat/anomaly continue if behavior fails.
- `setEngine("behavior", "error")` lights the red status on the sidebar; dashboard/table render whatever data is available.

## Out of scope

No UI, normalization, chart, table, upload, or routing changes. No new dependencies.

## Verification after build

1. Open `/settings` → confirm Behavior API base shows the new URL.
2. Upload a behavior CSV on `/` → network tab shows `POST /api/proxy/behavior` with `base: "https://behavior-api-new-ngra.onrender.com"` in the body; response `ok: true` with discovered `route`.
3. `/behavioral-analytics` and `/threat-intelligence` populate; threat + anomaly pipelines remain unaffected.