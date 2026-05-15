import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const TIMEOUT_MS = 25_000;
const MAX_RETRIES = 1;

// Candidate paths to try per service
const CANDIDATES: Record<string, string[]> = {
  threat: [
    "/predict",
    "/predict_csv",
    "/threat/predict",
    "/upload",
    "/analyze",
    "/predict/threat",
    "/api/predict",
    "/",
  ],
  anomaly: [
    "/anomaly",
    "/predict_anomaly",
    "/anomaly/predict",
    "/detect_anomaly",
    "/predict/anomaly",
    "/isolation",
    "/anomaly_detection",
  ],
  behavior: [
    "/predict",
    "/predict_csv",
    "/behavior/predict",
    "/upload",
    "/analyze",
    "/predict/behavior",
    "/api/predict",
    "/",
  ],
};

const DEFAULT_BASE: Record<string, string> = {
  threat: "https://cyber-threat-api-new.onrender.com",
  anomaly: "https://cyber-threat-api-new.onrender.com",
  behavior: "https://behavior-api-bppr.onrender.com",
};

// In-memory route cache (per worker instance)
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
  service?: "threat" | "anomaly" | "behavior";
  base?: string;
  csv?: string;
  rows?: unknown[];
  filename?: string;
}

async function tryCall(
  base: string,
  path: string,
  csv: string | undefined,
  rows: unknown[] | undefined,
  filename: string,
): Promise<Response> {
  const url = base.replace(/\/$/, "") + path;
  // Try multipart first if CSV present, then JSON rows, then JSON {data: rows}
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
      fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rows),
        },
        TIMEOUT_MS,
      ),
    );
    attempts.push(() =>
      fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: rows }),
        },
        TIMEOUT_MS,
      ),
    );
  }

  let last: Response | null = null;
  for (const a of attempts) {
    try {
      const r = await a();
      if (r.ok) return r;
      last = r;
    } catch {
      // network error or timeout, try next attempt
    }
  }
  if (last) return last;
  throw new Error("All attempts failed");
}

async function discoverAndCall(
  service: keyof typeof CANDIDATES,
  base: string,
  csv: string | undefined,
  rows: unknown[] | undefined,
  filename: string,
): Promise<{ response: unknown; route: string }> {
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
        const res = await tryCall(base, path, csv, rows, filename);
        if (res.ok) {
          ROUTE_CACHE.set(cacheKey, path);
          const ct = res.headers.get("content-type") || "";
          const data = ct.includes("application/json")
            ? await res.json()
            : await res.text();
          return { response: data, route: path };
        }
        lastStatus = res.status;
        lastErr = `HTTP ${res.status} on ${path}`;
        if (res.status === 404 || res.status === 405) break; // skip retries on routing errors
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
        try {
          const { response, route } = await discoverAndCall(
            service,
            base,
            body.csv,
            body.rows,
            filename,
          );
          return Response.json({ ok: true, service, route, data: response });
        } catch (e) {
          const err = e as Error & { status?: number };
          return Response.json(
            {
              ok: false,
              service,
              error: err.message,
              status: err.status ?? 0,
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
