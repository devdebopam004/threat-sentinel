import axios from "axios";
import type {
  ThreatPrediction,
  AnomalyPrediction,
  BehaviorPrediction,
} from "./types";
import {
  normalizeThreatRow,
  normalizeAnomalyRow,
  normalizeBehaviorRow,
} from "./normalize";

interface ProxyResponse<T = unknown> {
  ok: boolean;
  service: string;
  route?: string;
  data?: T;
  error?: string;
  status?: number;
}

function extractRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["results", "predictions", "data", "output", "rows", "result"]) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
    // Single record
    return [obj];
  }
  return [];
}

async function callProxy(
  service: "threat" | "anomaly" | "behavior",
  payload: { csv?: string; rows?: unknown[]; base?: string; filename?: string },
): Promise<ProxyResponse> {
  const r = await axios.post<ProxyResponse>(`/api/proxy/${service}`, payload, {
    timeout: 60_000,
    validateStatus: () => true,
  });
  return r.data;
}

export interface RunResult {
  threats: ThreatPrediction[];
  anomalies: AnomalyPrediction[];
  behaviors: BehaviorPrediction[];
  errors: { service: string; message: string }[];
}

export async function runDetection(opts: {
  threatCsv?: string;
  threatRows?: Record<string, unknown>[];
  behaviorCsv?: string;
  behaviorRows?: Record<string, unknown>[];
  threatBase: string;
  behaviorBase: string;
}): Promise<RunResult> {
  const errors: { service: string; message: string }[] = [];
  const tasks: Promise<unknown>[] = [];

  let threats: ThreatPrediction[] = [];
  let anomalies: AnomalyPrediction[] = [];
  let behaviors: BehaviorPrediction[] = [];

  if (opts.threatCsv || opts.threatRows?.length) {
    tasks.push(
      callProxy("threat", {
        csv: opts.threatCsv,
        rows: opts.threatRows,
        base: opts.threatBase,
        filename: "threat.csv",
      }).then((r) => {
        if (r.ok) threats = extractRows(r.data).map(normalizeThreatRow);
        else errors.push({ service: "threat", message: r.error ?? "Failed" });
      }),
    );
    tasks.push(
      callProxy("anomaly", {
        csv: opts.threatCsv,
        rows: opts.threatRows,
        base: opts.threatBase,
        filename: "threat.csv",
      }).then((r) => {
        if (r.ok) anomalies = extractRows(r.data).map(normalizeAnomalyRow);
        else errors.push({ service: "anomaly", message: r.error ?? "Failed" });
      }),
    );
  }

  if (opts.behaviorCsv || opts.behaviorRows?.length) {
    tasks.push(
      callProxy("behavior", {
        csv: opts.behaviorCsv,
        rows: opts.behaviorRows,
        base: opts.behaviorBase,
        filename: "behavior.csv",
      }).then((r) => {
        if (r.ok) behaviors = extractRows(r.data).map(normalizeBehaviorRow);
        else errors.push({ service: "behavior", message: r.error ?? "Failed" });
      }),
    );
  }

  await Promise.all(tasks);
  return { threats, anomalies, behaviors, errors };
}
