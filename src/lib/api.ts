import axios from "axios";
import type {
  ThreatPrediction,
  AnomalyPrediction,
  BehaviorPrediction,
  PcapPrediction,
} from "./types";
import {
  normalizeThreatRow,
  normalizeAnomalyRow,
  normalizeBehaviorRow,
  normalizePcapRow,
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
    for (const key of [
      "sample_predictions", "predictions", "results", "data",
      "output", "rows", "result", "threats", "anomalies",
    ]) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
    return [obj];
  }
  return [];
}

// For correlation responses that contain both threat and anomaly arrays
function extractDual(data: unknown): {
  threatRows: Record<string, unknown>[];
  anomalyRows: Record<string, unknown>[];
} {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const threatKeys = ["threats", "threat_predictions", "predictions"];
    const anomalyKeys = ["anomalies", "anomaly_predictions", "anomaly"];
    let threatRows: Record<string, unknown>[] = [];
    let anomalyRows: Record<string, unknown>[] = [];
    for (const k of threatKeys) {
      if (Array.isArray(obj[k])) { threatRows = obj[k] as Record<string, unknown>[]; break; }
    }
    for (const k of anomalyKeys) {
      if (Array.isArray(obj[k])) { anomalyRows = obj[k] as Record<string, unknown>[]; break; }
    }
    if (threatRows.length || anomalyRows.length) return { threatRows, anomalyRows };
  }
  // Single flat array: split by which fields each row carries
  const rows = extractRows(data);
  const threatRows: Record<string, unknown>[] = [];
  const anomalyRows: Record<string, unknown>[] = [];
  for (const r of rows) {
    if ("prediction" in r || "malicious_probability" in r || "risk_level" in r) threatRows.push(r);
    if ("anomaly_status" in r || "anomaly_score" in r) anomalyRows.push(r);
  }
  return { threatRows, anomalyRows };
}

async function callCsvProxy(
  service: "threat" | "anomaly" | "behavior",
  payload: { csv?: string; rows?: unknown[]; base?: string; filename?: string },
): Promise<ProxyResponse> {
  const r = await axios.post<ProxyResponse>(`/api/proxy/${service}`, payload, {
    timeout: 75_000, validateStatus: () => true,
  });
  return r.data;
}

async function callBinaryProxy(
  service: "pcap" | "correlation",
  form: FormData,
): Promise<ProxyResponse> {
  const r = await axios.post<ProxyResponse>(`/api/proxy/${service}`, form, {
    timeout: 120_000, validateStatus: () => true,
  });
  return r.data;
}

export interface RunResult {
  threats: ThreatPrediction[];
  anomalies: AnomalyPrediction[];
  behaviors: BehaviorPrediction[];
  pcaps: PcapPrediction[];
  errors: { service: string; message: string }[];
}

export async function runDetection(opts: {
  threatCsv?: string;
  threatRows?: Record<string, unknown>[];
  behaviorCsv?: string;
  behaviorRows?: Record<string, unknown>[];
  pcapFile?: File;
  apacheLogFile?: File;
  threatBase: string;
  behaviorBase: string;
  pcapBase: string;
  correlationBase: string;
}): Promise<RunResult> {
  const errors: { service: string; message: string }[] = [];
  const tasks: Promise<unknown>[] = [];

  let threats: ThreatPrediction[] = [];
  let anomalies: AnomalyPrediction[] = [];
  let behaviors: BehaviorPrediction[] = [];
  let pcaps: PcapPrediction[] = [];

  if (opts.threatCsv || opts.threatRows?.length) {
    tasks.push(
      callCsvProxy("threat", {
        csv: opts.threatCsv, rows: opts.threatRows,
        base: opts.threatBase, filename: "threat.csv",
      }).then((r) => {
        if (r.ok) threats = extractRows(r.data).map(normalizeThreatRow);
        else errors.push({ service: "threat", message: r.error ?? "Failed" });
      }),
    );
    tasks.push(
      callCsvProxy("anomaly", {
        csv: opts.threatCsv, rows: opts.threatRows,
        base: opts.threatBase, filename: "threat.csv",
      }).then((r) => {
        if (r.ok) anomalies = extractRows(r.data).map(normalizeAnomalyRow);
        else errors.push({ service: "anomaly", message: r.error ?? "Failed" });
      }),
    );
  }

  if (opts.behaviorCsv || opts.behaviorRows?.length) {
    tasks.push(
      callCsvProxy("behavior", {
        csv: opts.behaviorCsv, rows: opts.behaviorRows,
        base: opts.behaviorBase, filename: "behavior.csv",
      }).then((r) => {
        if (r.ok) behaviors = extractRows(r.data).map(normalizeBehaviorRow);
        else errors.push({ service: "behavior", message: r.error ?? "Failed" });
      }),
    );
  }

  if (opts.pcapFile) {
    const form = new FormData();
    form.append("pcap", opts.pcapFile, opts.pcapFile.name);
    form.append("base", opts.pcapBase);
    tasks.push(
      callBinaryProxy("pcap", form).then((r) => {
        if (r.ok) pcaps = extractRows(r.data).map(normalizePcapRow);
        else errors.push({ service: "pcap", message: r.error ?? "Failed" });
      }),
    );
  }

  if (opts.pcapFile && opts.apacheLogFile) {
    const form = new FormData();
    form.append("pcap", opts.pcapFile, opts.pcapFile.name);
    form.append("log", opts.apacheLogFile, opts.apacheLogFile.name);
    form.append("base", opts.correlationBase);
    tasks.push(
      callBinaryProxy("correlation", form).then((r) => {
        if (r.ok) {
          const { threatRows, anomalyRows } = extractDual(r.data);
          threats = threats.concat(threatRows.map(normalizeThreatRow));
          anomalies = anomalies.concat(anomalyRows.map(normalizeAnomalyRow));
        } else {
          errors.push({ service: "correlation", message: r.error ?? "Failed" });
        }
      }),
    );
  }

  await Promise.all(tasks);
  return { threats, anomalies, behaviors, pcaps, errors };
}
