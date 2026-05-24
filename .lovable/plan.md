
# PCAP + Apache Log AI Correlation Integration

Extends the existing Sentinel.AI SOC platform with two new backend pipelines without touching existing UI, charts, table, sidebar, or theme.

## New Backend Pipelines

**Pipeline A — PCAP Threat Analysis**
- API: `https://behavior-correct.onrender.com`
- Input: PCAP file only
- Output (JSON1): `sample_predictions[]` with `source_ip`, `destination_ip`, `protocol`, `destination_port`, `attack_prediction`, `confidence`, `severity`

**Pipeline B — PCAP + Apache Log Correlation**
- API: `https://cyber-threat-anomaly.onrender.com`
- Input: PCAP file + Apache log file (both required)
- Output: two arrays
  - JSON2 (threat): same shape as existing threat predictions (`prediction`, `malicious_probability`, `risk_level`, `explanation[]`, etc.)
  - JSON3 (anomaly): same shape as existing anomaly predictions (`anomaly_status`, `anomaly_score`, `reasons[]`, etc.)

## Files to Change

1. **`src/lib/store.ts`** — add `pcapApi` and `correlationApi` base URLs (defaults to the two new hosts); bump persist key to `soc-store-v3`.

2. **`src/routes/api/proxy.$service.ts`** — extend to handle two new services:
   - `pcap`: multipart upload of `.pcap` to `behavior-correct.onrender.com`, auto-discover endpoint (`/predict`, `/analyze`, `/upload`, `/`).
   - `correlation`: multipart upload of both `.pcap` + Apache log to `cyber-threat-anomaly.onrender.com`, auto-discover endpoint. Accept binary file payloads (base64 transit from client → reassemble as Blob server-side) since existing proxy only handled CSV/JSON.
   - Preserve existing `threat` / `anomaly` / `behavior` services unchanged.

3. **`src/lib/normalize.ts`** — add `normalizePcapRow()` mapping JSON1 → new `PcapPrediction` type:
   - `source_ip` → `src_ip`, `destination_ip` → `dst_ip`, `destination_port` → `dst_port`
   - severity passed through; confidence normalized to 0–100
   - Extend `unify()` to merge pcap rows into `UnifiedRecord` (using `src_ip|dst_ip` key when no timestamp). Reuse existing `normalizeThreatRow` / `normalizeAnomalyRow` for JSON2/JSON3 from the correlation API — they already handle the exact field shapes shown.

4. **`src/lib/types.ts`** — add `PcapPrediction` interface; add optional `attack_prediction_pcap`, `pcap_confidence`, `pcap_severity` to `UnifiedRecord` so JSON1 results show in the existing table without colliding with behavior fields.

5. **`src/lib/api.ts`** — extend `runDetection()` to accept optional `pcapFile?: File` and `apacheLogFile?: File`; fire pcap + correlation calls in parallel with existing threat/anomaly/behavior calls; merge errors into the same `errors[]` array. Files transmitted as base64 in JSON body to the proxy.

6. **`src/components/upload/UploadPanel.tsx`** — re-enable the two currently-disabled slots:
   - PCAP slot: accept `.pcap`, `.pcapng` (no schema validation, just size + extension).
   - Apache Log slot: accept `.log`, `.txt` (extension + non-empty check).
   - Wire both into `runDetection`. Update "Run Analysis" enable rule to allow any combination.
   - Add new engine statuses `pcap` and `correlation` to the existing engine status row (same pill style as threat/anomaly/behavior).

7. **`src/components/upload/ProcessingOverlay.tsx`** — add two stages: "PCAP Threat Correlation" and "Apache Log Correlation" inserted between existing Anomaly and Unified stages. No visual redesign.

8. **`src/components/table/ThreatTable.tsx`** — extend the expandable row detail panel to additionally show (when present): PCAP attack prediction, PCAP confidence, PCAP severity. All existing columns/fields stay.

9. **`src/components/dashboard/Charts.tsx`** — feed PCAP results into existing **Attack Distribution Pie** and **Severity Distribution Bar** by including `attack_prediction_pcap` + `pcap_severity` in the aggregation. No new charts. No layout change.

10. **`src/routes/settings.tsx`** — add two input rows for the new API bases (PCAP, Correlation), same UI pattern as existing threat/behavior inputs.

## Robustness (applies to new code only)

- 60s timeout per API call; single retry on network failure.
- Multipart auto-discovery: try common routes in order, accept first 2xx.
- Empty / malformed responses → push to `errors[]`, mark engine `error`, continue rendering everything else.
- Base64 file transit capped at 25 MB; oversize files rejected client-side with toast.
- All numeric fields coerced with existing `num()` helper to prevent NaN.
- Unified record merge is additive — never overwrites existing CSV-derived fields.

## What Is NOT Changing

- No redesign of layout, sidebar, theme, colors, animations, fonts, dashboard structure.
- No changes to existing threat/behavior/anomaly CSV flow.
- No new routes or pages.
- No new dependencies.
- `LiveTicker`, `TopHeader`, `AppSidebar`, all chart visual styles — untouched.

## Verification After Build

1. Upload only a Threat CSV → existing flow still produces threats + anomalies (regression check).
2. Upload only PCAP → table populates with PCAP-derived rows; pie + severity chart update; engine pill `pcap = ready`.
3. Upload PCAP + Apache log → correlation engine returns JSON2 + JSON3; merged into unified table; anomaly scatter populates.
4. Upload all 4 file types → all 5 engine pills go green; row expansion shows combined fields.
5. Network tab confirms `POST /api/proxy/pcap` and `POST /api/proxy/correlation` with discovered routes.
