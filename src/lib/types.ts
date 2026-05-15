export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type Severity = RiskLevel;
export type AnomalyStatus = "Normal" | "Anomalous";

export interface ThreatPrediction {
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  bytes_sent: number;
  bytes_received: number;
  user_agent: string;
  url: string;
  is_internal_traffic: boolean;
  prediction: 0 | 1;
  malicious_probability: number;
  risk_level: RiskLevel;
  explanation: string[];
}

export interface AnomalyPrediction {
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  bytes_sent: number;
  bytes_received: number;
  user_agent: string;
  url: string;
  is_internal_traffic: boolean;
  anomaly_status: AnomalyStatus;
  anomaly_score: number;
  reasons: string[];
}

export interface BehaviorPrediction {
  timestamp: string;
  src_ip: string;
  src_port: number;
  dst_ip: string;
  dst_port: number;
  protocol: string;
  flow_duration: number;
  total_fwd_packets: number;
  total_bwd_packets: number;
  flow_bytes_s: number;
  flow_packets_s: number;
  syn_flag_count: number;
  ack_flag_count: number;
  packet_length_mean: number;
  average_packet_size: number;
  attack_prediction: string; // BENIGN | Port Scan | DoS | ...
  confidence: number;
  severity: Severity;
  behavior_summary: string[];
}

export interface UnifiedRecord {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  bytes_sent: number;
  bytes_received: number;
  user_agent?: string;
  url?: string;
  is_internal_traffic?: boolean;
  // threat
  prediction?: 0 | 1;
  malicious_probability?: number;
  risk_level?: RiskLevel;
  threat_explanation?: string[];
  // anomaly
  anomaly_status?: AnomalyStatus;
  anomaly_score?: number;
  anomaly_reasons?: string[];
  // behavior
  attack_prediction?: string;
  confidence?: number;
  severity?: Severity;
  behavior_summary?: string[];
  // flow stats
  flow_duration?: number;
  flow_bytes_s?: number;
  flow_packets_s?: number;
  syn_flag_count?: number;
  ack_flag_count?: number;
  packet_length_mean?: number;
  average_packet_size?: number;
}

export type EngineStatus = "ready" | "running" | "error" | "idle";
