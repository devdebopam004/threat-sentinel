## Goal

A production-grade SOC dashboard that uploads two CSV types, calls two real FastAPI services via a server-side proxy (to avoid CORS/auth issues and let us auto-discover routes), normalizes the responses to the exact JSON shapes from your uploaded `threatprediction1.json` (threat) and `threatprediction2.json` (anomaly) plus `behavior_analysis.json` (behavior), and visualizes everything across a futuristic dark-neon SOC UI.

## Architecture

```text
Browser (React/TanStack)
  ├─ Upload Threat CSV ──┐
  ├─ Upload Behavior CSV─┤
  │                      ▼
  │   /api/proxy/threat  /api/proxy/behavior  /api/proxy/anomaly
  │   (TanStack server routes; multipart passthrough,
  │    timeout, retry, route auto-discovery, normalization)
  │                      │
  │                      ▼
  │     API1: cyber-threat-api-new.onrender.com
  │     API2: behavior-api-bppr.onrender.com
  ▼
Zustand store -> charts, table, modals
```

API auto-discovery: proxy tries common paths in order (`/predict`, `/analyze`, `/upload`, `/predict_csv`, `/`) with both multipart CSV and JSON-rows payloads, caches the first 2xx route per service for the session, returns clear typed errors otherwise.

## Routes (file-based)

- `/` Dashboard — counters, attack pie, severity bar, traffic line, anomaly scatter, top suspicious IPs, live feed ticker
- `/threat-intelligence` — full SOC threat table (search/sort/filter/paginate/expand)
- `/anomaly-detection` — anomaly scatter, score histogram, anomaly reasons breakdown
- `/behavioral-analytics` — suspicious URLs, user-agent analysis, access-hour heatmap
- `/reports` — export JSON/CSV of merged results
- `/settings` — API base URLs (editable, persisted), engine status, theme

Shared layout in `__root.tsx`: collapsible neon sidebar, top header (title, threat-level pill, live clock, New Scan), engines-online status panel.

## Data flow

1. User uploads Threat CSV + Behavior CSV on Dashboard (or Upload modal).
2. Client validates schemas (required columns, row count, NaN scrub) via Zod + Papaparse — futuristic toast on failure.
3. Animated processing overlay (8 stages, terminal log, progress bars).
4. Parallel calls: `threat` + `anomaly` (same Threat CSV → API1, two endpoints), `behavior` (Behavior CSV → API2).
5. Responses normalized to canonical types matching uploaded JSONs.
6. Merged on `(timestamp, src_ip, dst_ip)` → unified `ThreatRecord[]` in Zustand.
7. All charts/tables read from store; counters memoized.

## Canonical types (from your JSONs)

```ts
ThreatRow   { timestamp, src_ip, dst_ip, src_port, dst_port, protocol,
              bytes_sent, bytes_received, user_agent, url, is_internal_traffic,
              prediction, malicious_probability, risk_level, explanation[] }
AnomalyRow  { ...ids, anomaly_status, anomaly_score, reasons[] }
BehaviorRow { timestamp, src_ip, ..., attack_prediction, confidence,
              severity, behavior_summary[] }
Unified     = merge of the three by composite key
```

## Stack

TanStack Start (existing), Tailwind v4 (existing tokens extended with neon palette in `styles.css`), Framer Motion, Recharts, Lucide, Papaparse, Zod, Axios (server-side in proxy), Zustand, sonner toasts, shadcn (existing).

## Error/edge handling

- CSV: missing columns → blocked with column-diff toast; empty/NaN rows skipped with count badge; >50k rows → warning + sample.
- API: 8s timeout, 2 retries with backoff, route discovery, graceful degradation (e.g., behavior fails → dashboard still renders threat+anomaly with banner).
- Network offline → red engine indicator + retry CTA.

## What I will NOT build (per your answer)

- PCAP / Apache log uploads (CSV-only v1; UI shows the option as disabled "backend service required" tile).
- A real Python backend (using your live APIs only via proxy).

## Deliverables in one pass

All routes, sidebar/header, upload+validation, processing animation, 5 charts, threat table with expandable rows showing AI confidence, threat timeline, behavioral explanations, anomaly reasons, packet metadata; settings page to edit API base URLs at runtime; reports export.

Approve and I'll build it end-to-end.