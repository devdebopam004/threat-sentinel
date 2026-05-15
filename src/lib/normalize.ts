import type {
  ThreatPrediction,
  AnomalyPrediction,
  BehaviorPrediction,
  UnifiedRecord,
  RiskLevel,
  Severity,
} from "./types";

const num = (v: unknown, d = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : d;
};
const str = (v: unknown, d = ""): string => (v == null ? d : String(v));
const bool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};
const arr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.length) return [v];
  return [];
};

const riskFromProb = (p: number): RiskLevel => {
  if (p >= 0.85) return "Critical";
  if (p >= 0.6) return "High";
  if (p >= 0.3) return "Medium";
  return "Low";
};

const sevFromConfidence = (c: number, attack: string): Severity => {
  const isBenign = attack.toUpperCase() === "BENIGN";
  if (isBenign) return "Low";
  if (c >= 90) return "Critical";
  if (c >= 75) return "High";
  if (c >= 50) return "Medium";
  return "Low";
};

export function normalizeThreatRow(row: Record<string, unknown>): ThreatPrediction {
  const prob = num(row.malicious_probability ?? row.probability ?? row.score);
  const pred = (num(row.prediction) >= 1 ? 1 : 0) as 0 | 1;
  return {
    timestamp: str(row.timestamp ?? row.time ?? row.Timestamp),
    src_ip: str(row.src_ip ?? row["Src IP"] ?? row["Src IP dec"]),
    dst_ip: str(row.dst_ip ?? row["Dst IP"] ?? row["Dst IP dec"]),
    src_port: num(row.src_port ?? row["Src Port"]),
    dst_port: num(row.dst_port ?? row["Dst Port"]),
    protocol: str(row.protocol ?? row.Protocol, "TCP"),
    bytes_sent: num(row.bytes_sent),
    bytes_received: num(row.bytes_received),
    user_agent: str(row.user_agent),
    url: str(row.url),
    is_internal_traffic: bool(row.is_internal_traffic),
    prediction: pred,
    malicious_probability: prob,
    risk_level: (str(row.risk_level) as RiskLevel) || riskFromProb(prob),
    explanation: arr(row.explanation ?? row.threat_explanations ?? row.reasons),
  };
}

export function normalizeAnomalyRow(row: Record<string, unknown>): AnomalyPrediction {
  const score = num(row.anomaly_score ?? row.score);
  const status = (str(row.anomaly_status) ||
    (score >= 0.5 ? "Anomalous" : "Normal")) as "Normal" | "Anomalous";
  return {
    timestamp: str(row.timestamp ?? row.Timestamp),
    src_ip: str(row.src_ip ?? row["Src IP dec"]),
    dst_ip: str(row.dst_ip ?? row["Dst IP dec"]),
    src_port: num(row.src_port ?? row["Src Port"]),
    dst_port: num(row.dst_port ?? row["Dst Port"]),
    protocol: str(row.protocol ?? row.Protocol, "TCP"),
    bytes_sent: num(row.bytes_sent),
    bytes_received: num(row.bytes_received),
    user_agent: str(row.user_agent),
    url: str(row.url),
    is_internal_traffic: bool(row.is_internal_traffic),
    anomaly_status: status,
    anomaly_score: score,
    reasons: arr(row.reasons ?? row.anomaly_reasons),
  };
}

export function normalizeBehaviorRow(row: Record<string, unknown>): BehaviorPrediction {
  const conf = num(row.confidence);
  const attack = str(row.attack_prediction ?? row.prediction, "BENIGN");
  return {
    timestamp: str(row.Timestamp ?? row.timestamp),
    src_ip: str(row["Src IP dec"] ?? row.src_ip),
    src_port: num(row["Src Port"] ?? row.src_port),
    dst_ip: str(row["Dst IP dec"] ?? row.dst_ip),
    dst_port: num(row["Dst Port"] ?? row.dst_port),
    protocol: str(row.Protocol ?? row.protocol, "TCP"),
    flow_duration: num(row["Flow Duration"] ?? row.flow_duration),
    total_fwd_packets: num(row["Total Fwd Packet"] ?? row.total_fwd_packets),
    total_bwd_packets: num(row["Total Bwd packets"] ?? row.total_bwd_packets),
    flow_bytes_s: num(row["Flow Bytes/s"] ?? row.flow_bytes_s),
    flow_packets_s: num(row["Flow Packets/s"] ?? row.flow_packets_s),
    syn_flag_count: num(row["SYN Flag Count"] ?? row.syn_flag_count),
    ack_flag_count: num(row["ACK Flag Count"] ?? row.ack_flag_count),
    packet_length_mean: num(row["Packet Length Mean"] ?? row.packet_length_mean),
    average_packet_size: num(row["Average Packet Size"] ?? row.average_packet_size),
    attack_prediction: attack,
    confidence: conf,
    severity: (str(row.severity) as Severity) || sevFromConfidence(conf, attack),
    behavior_summary: arr(row.behavior_summary ?? row.summary ?? row.reasons),
  };
}

const keyOf = (r: { timestamp: string; src_ip: string; dst_ip: string }) =>
  `${r.timestamp}|${r.src_ip}|${r.dst_ip}`;

export function unify(
  threats: ThreatPrediction[],
  anomalies: AnomalyPrediction[],
  behaviors: BehaviorPrediction[],
): UnifiedRecord[] {
  const map = new Map<string, UnifiedRecord>();

  for (const t of threats) {
    const k = keyOf(t);
    map.set(k, {
      id: k,
      timestamp: t.timestamp,
      src_ip: t.src_ip,
      dst_ip: t.dst_ip,
      src_port: t.src_port,
      dst_port: t.dst_port,
      protocol: t.protocol,
      bytes_sent: t.bytes_sent,
      bytes_received: t.bytes_received,
      user_agent: t.user_agent,
      url: t.url,
      is_internal_traffic: t.is_internal_traffic,
      prediction: t.prediction,
      malicious_probability: t.malicious_probability,
      risk_level: t.risk_level,
      threat_explanation: t.explanation,
    });
  }

  for (const a of anomalies) {
    const k = keyOf(a);
    const cur = map.get(k) ?? {
      id: k,
      timestamp: a.timestamp,
      src_ip: a.src_ip,
      dst_ip: a.dst_ip,
      src_port: a.src_port,
      dst_port: a.dst_port,
      protocol: a.protocol,
      bytes_sent: a.bytes_sent,
      bytes_received: a.bytes_received,
      user_agent: a.user_agent,
      url: a.url,
      is_internal_traffic: a.is_internal_traffic,
    };
    cur.anomaly_status = a.anomaly_status;
    cur.anomaly_score = a.anomaly_score;
    cur.anomaly_reasons = a.reasons;
    map.set(k, cur);
  }

  for (const b of behaviors) {
    const k = keyOf(b);
    const cur = map.get(k) ?? {
      id: k,
      timestamp: b.timestamp,
      src_ip: b.src_ip,
      dst_ip: b.dst_ip,
      src_port: b.src_port,
      dst_port: b.dst_port,
      protocol: b.protocol,
      bytes_sent: 0,
      bytes_received: 0,
    };
    cur.attack_prediction = b.attack_prediction;
    cur.confidence = b.confidence;
    cur.severity = b.severity;
    cur.behavior_summary = b.behavior_summary;
    cur.flow_duration = b.flow_duration;
    cur.flow_bytes_s = b.flow_bytes_s;
    cur.flow_packets_s = b.flow_packets_s;
    cur.syn_flag_count = b.syn_flag_count;
    cur.ack_flag_count = b.ack_flag_count;
    cur.packet_length_mean = b.packet_length_mean;
    cur.average_packet_size = b.average_packet_size;
    map.set(k, cur);
  }

  return Array.from(map.values()).sort((x, y) => x.timestamp.localeCompare(y.timestamp));
}
