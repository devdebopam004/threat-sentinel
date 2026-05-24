import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 1;

// Candidate paths per service
const CANDIDATES: Record<string, string[]> = {
  threat: [
    "/predict", "/predict_csv", "/threat/predict", "/upload", "/analyze",
    "/predict/threat", "/api/predict", "/",
  ],
  anomaly: [
    "/anomaly", "/predict_anomaly", "/anomaly/predict", "/detect_anomaly",
    "/predict/anomaly", "/isolation", "/anomaly_detection",
  ],
  behavior: [
    "/predict", "/predict_csv", "/behavior/predict", "/upload", "/analyze",
    "/predict/behavior", "/api/predict", "/",
  ],
  pcap: [
    "/predict", "/analyze", "/upload", "/predict_pcap", "/pcap",
    "/predict/pcap", "/api/predict", "/",
  ],
  correlation: [
    "/predict", "/analyze", "/correlate", "/upload", "/predict_logs",
    "/correlation", "/api/predict", "/",
  ],
};

const DEFAULT_BASE: Record<string, string> = {
  threat: "https://cyber-threat-api-new.onrender.com",
  anomaly: "https://cyber-threat-api-new.onrender.com",
  behavior: "https://behavior-api-new-ngra.onrender.com",
  pcap: "https://behavior-correct.onrender.com",
  correlation: "https://cyber-threat-anomaly.onrender.com",
};

// Field-name combos to try for correlation (pcap + apache log)
const CORRELATION_FIELDS: Array<{ pcap: string; log: string }> = [
  { pcap: "pcap", log: "log" },
  { pcap: "pcap_file", log: "log_file" },
  { pcap: "pcap", log: "apache_log" },
  { pcap: "pcap_file", log: "apache_log" },
  { pcap: "file", log: "log" },
  { pcap: "pcap", log: "logfile" },
];

const PCAP_FIELDS = ["file", "pcap", "pcap_file", "upload"];

const ROUTE_CACHE = new Map<string, string>();

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

interface ProxyBody {
  base?: string;
  csv?: string;
  rows?: unknown[];
  filename?: string;
}

// ---------- CSV/JSON services (existing) ----------
async function tryCsvCall(
  base: string, path: string,
  csv: string | undefined, rows: unknown[] | undefined,
  filename: string,
): Promise<Response> {
  const url = base.replace(/\/$/, "") + path;
  const attempts: Array<() => Promise<Response>> = [];

  if (csv) {
    attempts.push(async () => {
      const fd = new FormData();
      fd.append("file", new Blob([csv], { type: "text/csv" }), filename);
      return fetchWithTimeout(url, { method: "POST", body: fd }, TIMEOUT_MS);
    });
  }
  if (rows) {
    attempts.push(() =>
      fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      }, TIMEOUT_MS),
    );
    attempts.push(() =>
      fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: rows }),
      }, TIMEOUT_MS),
    );
  }

  let last: Response | null = null;
  for (const a of attempts) {
    try {
      const r = await a();
      if (r.ok) return r;
      last = r;
    } catch { /* try next */ }
  }
  if (last) return last;
  throw new Error("All attempts failed");
}

// ---------- PCAP/Correlation (binary multipart) ----------
async function tryPcapCall(
  base: string, path: string, file: Blob, filename: string,
): Promise<Response> {
  const url = base.replace(/\/$/, "") + path;
  let last: Response | null = null;
  for (const fieldName of PCAP_FIELDS) {
    try {
      const fd = new FormData();
      fd.append(fieldName, file, filename);
      const r = await fetchWithTimeout(url, { method: "POST", body: fd }, TIMEOUT_MS);
      if (r.ok) return r;
      last = r;
    } catch { /* try next field name */ }
  }
  if (last) return last;
  throw new Error("All field names failed");
}

async function tryCorrelationCall(
  base: string, path: string,
  pcap: Blob, pcapName: string,
  log: Blob, logName: string,
): Promise<Response> {
  const url = base.replace(/\/$/, "") + path;
  let last: Response | null = null;
  for (const combo of CORRELATION_FIELDS) {
    try {
      const fd = new FormData();
      fd.append(combo.pcap, pcap, pcapName);
      fd.append(combo.log, log, logName);
      const r = await fetchWithTimeout(url, { method: "POST", body: fd }, TIMEOUT_MS);
      if (r.ok) return r;
      last = r;
    } catch { /* try next combo */ }
  }
  if (last) return last;
  throw new Error("All field combinations failed");
}

async function discoverCsv(
  service: keyof typeof CANDIDATES, base: string,
  csv: string | undefined, rows: unknown[] | undefined, filename: string,
) {
  const cacheKey = `${service}::${base}`;
  const cached = ROUTE_CACHE.get(cacheKey);
  const order = cached
    ? [cached, ...CANDIDATES[service].filter((p) => p !== cached)]
    : CANDIDATES[service];

  let lastErr = "Unable to reach service";
  let lastStatus = 0;
  for (const path of order) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await tryCsvCall(base, path, csv, rows, filename);
        if (res.ok) {
          ROUTE_CACHE.set(cacheKey, path);
          const ct = res.headers.get("content-type") || "";
          const data = ct.includes("application/json") ? await res.json() : await res.text();
          return { response: data, route: path };
        }
        lastStatus = res.status;
        lastErr = `HTTP ${res.status} on ${path}`;
        if (res.status === 404 || res.status === 405) break;
      } catch (e) {
        lastErr = (e as Error).message;
      }
    }
  }
  const err = new Error(lastErr) as Error & { status?: number };
  err.status = lastStatus;
  throw err;
}

async function discoverBinary(
  service: "pcap" | "correlation",
  base: string,
  caller: (path: string) => Promise<Response>,
) {
  const cacheKey = `${service}::${base}`;
  const cached = ROUTE_CACHE.get(cacheKey);
  const order = cached
    ? [cached, ...CANDIDATES[service].filter((p) => p !== cached)]
    : CANDIDATES[service];

  let lastErr = "Unable to reach service";
  let lastStatus = 0;
  for (const path of order) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await caller(path);
        if (res.ok) {
          ROUTE_CACHE.set(cacheKey, path);
          const ct = res.headers.get("content-type") || "";
          const data = ct.includes("application/json") ? await res.json() : await res.text();
          return { response: data, route: path };
        }
        lastStatus = res.status;
        lastErr = `HTTP ${res.status} on ${path}`;
        if (res.status === 404 || res.status === 405) break;
      } catch (e) {
        lastErr = (e as Error).message;
      }
    }
  }
  const err = new Error(lastErr) as Error & { status?: number };
  err.status = lastStatus;
  throw err;
}

export const Route = createFileRoute("/api/proxy/$service")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const service = params.service as keyof typeof CANDIDATES;
        if (!CANDIDATES[service]) {
          return Response.json({ error: "Unknown service" }, { status: 400 });
        }

        const ct = request.headers.get("content-type") || "";

        try {
          // Binary services: multipart upload
          if (service === "pcap" || service === "correlation") {
            if (!ct.includes("multipart/form-data")) {
              return Response.json(
                { ok: false, service, error: "Expected multipart/form-data" },
                { status: 400 },
              );
            }
            const form = await request.formData();
            const base =
              (form.get("base")?.toString().trim() || DEFAULT_BASE[service]).trim();

            if (service === "pcap") {
              const pcap = form.get("pcap") as File | null;
              if (!pcap || pcap.size === 0) {
                return Response.json(
                  { ok: false, service, error: "Missing pcap file" },
                  { status: 400 },
                );
              }
              const { response, route } = await discoverBinary(
                "pcap", base, (path) => tryPcapCall(base, path, pcap, pcap.name || "capture.pcap"),
              );
              return Response.json({ ok: true, service, route, data: response });
            } else {
              const pcap = form.get("pcap") as File | null;
              const log = form.get("log") as File | null;
              if (!pcap || pcap.size === 0 || !log || log.size === 0) {
                return Response.json(
                  { ok: false, service, error: "Both pcap and log files required" },
                  { status: 400 },
                );
              }
              const { response, route } = await discoverBinary(
                "correlation", base, (path) =>
                  tryCorrelationCall(
                    base, path,
                    pcap, pcap.name || "capture.pcap",
                    log, log.name || "access.log",
                  ),
              );
              return Response.json({ ok: true, service, route, data: response });
            }
          }

          // CSV/JSON services
          let body: ProxyBody;
          try {
            body = (await request.json()) as ProxyBody;
          } catch {
            return Response.json({ error: "Invalid JSON body" }, { status: 400 });
          }
          const base = body.base?.trim() || DEFAULT_BASE[service];
          const filename = body.filename || `${service}.csv`;
          if (!body.csv && (!body.rows || body.rows.length === 0)) {
            return Response.json({ error: "No data provided" }, { status: 400 });
          }
          const { response, route } = await discoverCsv(
            service, base, body.csv, body.rows, filename,
          );
          return Response.json({ ok: true, service, route, data: response });
        } catch (e) {
          const err = e as Error & { status?: number };
          return Response.json(
            { ok: false, service, error: err.message, status: err.status ?? 0 },
            { status: 502 },
          );
        }
      },
    },
  },
});
