import Papa from "papaparse";

export type CsvKind = "threat" | "behavior";

const THREAT_REQUIRED = [
  "timestamp","src_ip","dst_ip","src_port","dst_port","protocol",
  "bytes_sent","bytes_received","user_agent","url","is_internal_traffic",
];

const BEHAVIOR_REQUIRED = [
  "Timestamp","Src IP dec","Src Port","Dst IP dec","Dst Port","Protocol",
  "Flow Duration","Total Fwd Packet","Total Bwd packets","Flow Bytes/s","Flow Packets/s",
  "SYN Flag Count","ACK Flag Count","Packet Length Mean","Average Packet Size",
];

export interface ParsedCsv<T = Record<string, unknown>> {
  rows: T[];
  columns: string[];
  rowCount: number;
}

export interface CsvValidation {
  ok: boolean;
  missing: string[];
  found: string[];
  rowCount: number;
  rows: Record<string, unknown>[];
  kind: CsvKind;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_/]+/g, "");

export function parseCsv(text: string): ParsedCsv {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = (parsed.data || []).filter(
    (r) => r && Object.values(r).some((v) => v !== null && v !== "" && v !== undefined),
  );
  return { rows, columns: parsed.meta.fields ?? [], rowCount: rows.length };
}

export function validateCsv(text: string, kind: CsvKind): CsvValidation {
  const { rows, columns, rowCount } = parseCsv(text);
  const required = kind === "threat" ? THREAT_REQUIRED : BEHAVIOR_REQUIRED;
  const colSet = new Set(columns.map(norm));
  const missing = required.filter((r) => !colSet.has(norm(r)));
  return {
    ok: missing.length === 0 && rowCount > 0,
    missing,
    found: columns,
    rowCount,
    rows,
    kind,
  };
}

export async function readFileText(file: File): Promise<string> {
  return await file.text();
}
