import { useMemo, useState, Fragment } from "react";
import { useAppStore } from "@/lib/store";
import { ChevronDown, ChevronRight, Search, ChevronLeft, ChevronsRight } from "lucide-react";
import type { UnifiedRecord } from "@/lib/types";

const SEV_COLORS: Record<string, string> = {
  Low: "#10b981", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444",
};

const Badge = ({ value }: { value?: string }) => {
  if (!value) return <span className="text-muted-foreground/50">—</span>;
  const c = SEV_COLORS[value] ?? "#64748b";
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase" style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>
      {value}
    </span>
  );
};

export function ThreatTable() {
  const data = useAppStore((s) => s.unified);
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<string>("");
  const [sortKey, setSortKey] = useState<keyof UnifiedRecord>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const PAGE_SIZE = 12;

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let out = data.filter((r) => {
      if (sev && r.risk_level !== sev && r.severity !== sev) return false;
      if (!ql) return true;
      return [r.src_ip, r.dst_ip, r.attack_prediction, r.risk_level, r.severity, r.url, r.user_agent]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(ql));
    });
    out = [...out].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [data, q, sev, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sort = (k: keyof UnifiedRecord) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const Th = ({ k, label }: { k: keyof UnifiedRecord; label: string }) => (
    <th className="px-3 py-2 text-left text-[10px] tracking-[0.2em] text-muted-foreground cursor-pointer select-none hover:text-cyan" onClick={() => sort(k)}>
      {label} {sortKey === k && (sortDir === "asc" ? "▲" : "▼")}
    </th>
  );

  return (
    <div className="glass rounded-lg border border-cyan/20 overflow-hidden">
      <div className="p-3 flex flex-wrap gap-3 items-center border-b border-cyan/15">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search IP, attack, URL, agent..."
            className="w-full bg-background/60 border border-cyan/20 rounded-md pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-cyan/60"
          />
        </div>
        <select
          value={sev}
          onChange={(e) => { setSev(e.target.value); setPage(0); }}
          className="bg-background/60 border border-cyan/20 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-cyan/60"
        >
          <option value="">All severity</option>
          <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
        </select>
        <div className="text-xs text-muted-foreground">{filtered.length} records</div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="bg-white/5">
            <tr>
              <th className="w-8" />
              <Th k="src_ip" label="SOURCE IP" />
              <Th k="dst_ip" label="DEST IP" />
              <Th k="attack_prediction" label="ATTACK" />
              <Th k="severity" label="SEVERITY" />
              <Th k="malicious_probability" label="THREAT PROB" />
              <Th k="anomaly_status" label="ANOMALY" />
              <Th k="risk_level" label="RISK" />
              <Th k="timestamp" label="TIMESTAMP" />
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No records</td></tr>
            )}
            {pageData.map((r) => {
              const open = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    className="border-t border-white/5 hover:bg-cyan/5 cursor-pointer"
                    onClick={() => setExpanded(open ? null : r.id)}
                  >
                    <td className="px-2 py-2">{open ? <ChevronDown className="w-3.5 h-3.5 text-cyan" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}</td>
                    <td className="px-3 py-2 font-mono text-cyan">{r.src_ip}</td>
                    <td className="px-3 py-2 font-mono">{r.dst_ip}</td>
                    <td className="px-3 py-2"><span className={r.attack_prediction && r.attack_prediction.toUpperCase() !== "BENIGN" ? "text-alert" : "text-success"}>{r.attack_prediction ?? "—"}</span></td>
                    <td className="px-3 py-2"><Badge value={r.severity} /></td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.malicious_probability != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded overflow-hidden">
                            <div className="h-full bg-threat" style={{ width: `${(r.malicious_probability * 100).toFixed(0)}%` }} />
                          </div>
                          <span>{(r.malicious_probability * 100).toFixed(0)}%</span>
                        </div>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {r.anomaly_status ? (
                        <span className={r.anomaly_status === "Anomalous" ? "text-threat" : "text-success"}>
                          ● {r.anomaly_status}
                        </span>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-3 py-2"><Badge value={r.risk_level} /></td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{r.timestamp}</td>
                  </tr>
                  {open && <ExpandedRow r={r} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 flex items-center justify-between border-t border-cyan/15 text-xs text-muted-foreground">
        <div>Page {page + 1} / {pages}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(0)} disabled={page === 0} className="p-1.5 rounded hover:bg-cyan/10 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded hover:bg-cyan/10 disabled:opacity-30">Prev</button>
          <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="p-1.5 rounded hover:bg-cyan/10 disabled:opacity-30">Next</button>
          <button onClick={() => setPage(pages - 1)} disabled={page >= pages - 1} className="p-1.5 rounded hover:bg-cyan/10 disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function ExpandedRow({ r }: { r: UnifiedRecord }) {
  const explanations = [
    ...(r.threat_explanation ?? []),
    ...(r.anomaly_reasons ?? []),
    ...(r.behavior_summary ?? []),
  ];

  return (
    <tr className="border-t border-cyan/10">
      <td colSpan={9} className="bg-black/40 p-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-cyan mb-2">AI INTELLIGENCE</div>
            <DataLine label="Threat Prediction" value={r.prediction === 1 ? "MALICIOUS" : r.prediction === 0 ? "BENIGN" : "—"} />
            <DataLine label="Malicious Probability" value={r.malicious_probability != null ? `${(r.malicious_probability * 100).toFixed(2)}%` : "—"} />
            <DataLine label="Risk Level" value={r.risk_level ?? "—"} />
            <DataLine label="Attack Class" value={r.attack_prediction ?? "—"} />
            <DataLine label="Confidence" value={r.confidence != null ? `${r.confidence}%` : "—"} />
            <DataLine label="Anomaly Status" value={r.anomaly_status ?? "—"} />
            <DataLine label="Anomaly Score" value={r.anomaly_score != null ? r.anomaly_score.toFixed(4) : "—"} />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-cyan mb-2">PACKET METADATA</div>
            <DataLine label="Protocol" value={r.protocol} />
            <DataLine label="Src Port" value={String(r.src_port)} />
            <DataLine label="Dst Port" value={String(r.dst_port)} />
            <DataLine label="Bytes Sent" value={(r.bytes_sent ?? 0).toLocaleString()} />
            <DataLine label="Bytes Recv" value={(r.bytes_received ?? 0).toLocaleString()} />
            <DataLine label="Flow Duration" value={r.flow_duration?.toString() ?? "—"} />
            <DataLine label="SYN / ACK Flags" value={`${r.syn_flag_count ?? "—"} / ${r.ack_flag_count ?? "—"}`} />
            <DataLine label="Avg Pkt Size" value={r.average_packet_size?.toFixed(1) ?? "—"} />
            <DataLine label="Internal" value={r.is_internal_traffic ? "TRUE" : "FALSE"} />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-cyan mb-2">BEHAVIORAL EXPLANATIONS</div>
            {explanations.length === 0 ? (
              <div className="text-xs text-muted-foreground">No explanations returned</div>
            ) : (
              <ul className="space-y-1.5">
                {explanations.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-alert mt-0.5">▸</span>
                    <span className="text-foreground/80">{e}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.url && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground">URL</div>
                <div className="text-[11px] font-mono text-cyan break-all">{r.url}</div>
              </div>
            )}
            {r.user_agent && (
              <div className="mt-2">
                <div className="text-[10px] text-muted-foreground">User Agent</div>
                <div className="text-[11px] font-mono text-foreground/70 break-all">{r.user_agent}</div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

const DataLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 py-1 text-xs border-b border-white/5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono text-foreground/90 text-right truncate">{value}</span>
  </div>
);
