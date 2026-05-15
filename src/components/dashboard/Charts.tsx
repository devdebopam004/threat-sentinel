import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, Radar, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";

const NEON = ["#22d3ee", "#a855f7", "#ec4899", "#f59e0b", "#ef4444", "#10b981", "#3b82f6"];
const SEV_COLORS: Record<string, string> = {
  Low: "#10b981", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444",
};

export function CounterCards() {
  const u = useAppStore((s) => s.unified);
  const stats = useMemo(() => {
    const threats = u.filter((r) => r.prediction === 1 || (r.attack_prediction && r.attack_prediction.toUpperCase() !== "BENIGN")).length;
    const criticals = u.filter((r) => r.risk_level === "Critical" || r.severity === "Critical" || r.risk_level === "High" || r.severity === "High").length;
    const anomalies = u.filter((r) => r.anomaly_status === "Anomalous").length;
    const normal = u.length - threats;
    return { threats, criticals, anomalies, normal: Math.max(0, normal), total: u.length };
  }, [u]);

  const cards = [
    { label: "Threats Detected", value: stats.threats, icon: ShieldAlert, color: "text-threat", glow: "shadow-[0_0_30px_oklch(0.65_0.26_20/0.25)]", trend: stats.threats > 0 ? "up" : "down" },
    { label: "Critical Alerts", value: stats.criticals, icon: AlertTriangle, color: "text-alert", glow: "shadow-[0_0_30px_oklch(0.78_0.18_60/0.25)]", trend: stats.criticals > 0 ? "up" : "down" },
    { label: "Anomalies", value: stats.anomalies, icon: Radar, color: "text-neon-purple", glow: "shadow-[0_0_30px_oklch(0.65_0.24_300/0.25)]", trend: stats.anomalies > 0 ? "up" : "down" },
    { label: "Normal Traffic", value: stats.normal, icon: ShieldCheck, color: "text-success", glow: "shadow-[0_0_30px_oklch(0.75_0.18_150/0.25)]", trend: "up" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const Trend = c.trend === "up" ? TrendingUp : TrendingDown;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass rounded-lg p-4 border border-cyan/20 relative overflow-hidden ${c.glow}`}
          >
            <div className="grid-pattern absolute inset-0 opacity-20 pointer-events-none" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="text-[10px] tracking-[0.25em] text-muted-foreground">
                  {c.label.toUpperCase()}
                </div>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className={`mt-3 text-3xl font-bold tabular-nums ${c.color}`}>
                {c.value.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Trend className="w-3 h-3" />
                of {stats.total.toLocaleString()} flows
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const Card = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`glass rounded-lg p-4 border border-cyan/20 relative overflow-hidden ${className}`}>
    <div className="grid-pattern absolute inset-0 opacity-15 pointer-events-none" />
    <div className="relative">
      <div className="text-[11px] tracking-[0.25em] text-muted-foreground mb-3">
        {title}
      </div>
      {children}
    </div>
  </div>
);

export function AttackDistributionChart() {
  const u = useAppStore((s) => s.unified);
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of u) {
      const k = r.attack_prediction || (r.prediction === 1 ? "Threat" : "BENIGN");
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [u]);

  return (
    <Card title="ATTACK DISTRIBUTION">
      {data.length === 0 ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={NEON[i % NEON.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function SeverityChart() {
  const u = useAppStore((s) => s.unified);
  const data = useMemo(() => {
    const buckets = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    for (const r of u) {
      const lvl = (r.risk_level || r.severity || "Low") as keyof typeof buckets;
      if (buckets[lvl] !== undefined) buckets[lvl]++;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [u]);

  return (
    <Card title="SEVERITY DISTRIBUTION">
      {u.length === 0 ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" style={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(34,211,238,0.05)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={SEV_COLORS[d.name]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function NetworkTrafficChart() {
  const u = useAppStore((s) => s.unified);
  const data = useMemo(() => {
    return u
      .map((r) => ({
        t: r.timestamp,
        bytes: (r.bytes_sent || 0) + (r.bytes_received || 0),
      }))
      .filter((d) => d.bytes > 0)
      .slice(-50);
  }, [u]);

  return (
    <Card title="NETWORK TRAFFIC OVER TIME">
      {data.length === 0 ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" stroke="#64748b" style={{ fontSize: 10 }} hide />
            <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="bytes" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2, fill: "#22d3ee" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function AnomalyScatterChart() {
  const u = useAppStore((s) => s.unified);
  const { normal, anomalous } = useMemo(() => {
    const normal: { x: number; y: number }[] = [];
    const anomalous: { x: number; y: number }[] = [];
    u.forEach((r, i) => {
      const point = {
        x: i,
        y: r.anomaly_score ?? r.malicious_probability ?? 0,
      };
      if (r.anomaly_status === "Anomalous") anomalous.push(point);
      else normal.push(point);
    });
    return { normal, anomalous };
  }, [u]);

  return (
    <Card title="ANOMALY SCATTER">
      {u.length === 0 ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="x" type="number" stroke="#64748b" style={{ fontSize: 10 }} name="Flow #" />
            <YAxis dataKey="y" type="number" stroke="#64748b" style={{ fontSize: 10 }} name="Score" domain={[0, 1]} />
            <ZAxis range={[40, 80]} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Scatter name="Normal" data={normal} fill="#10b981" />
            <Scatter name="Anomalous" data={anomalous} fill="#ef4444" />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function TopSuspiciousIps() {
  const u = useAppStore((s) => s.unified);
  const items = useMemo(() => {
    const map = new Map<string, { ip: string; count: number; maxScore: number; sev: string }>();
    for (const r of u) {
      const isThreat =
        r.prediction === 1 ||
        r.anomaly_status === "Anomalous" ||
        (r.attack_prediction && r.attack_prediction.toUpperCase() !== "BENIGN");
      if (!isThreat) continue;
      const cur = map.get(r.src_ip) ?? { ip: r.src_ip, count: 0, maxScore: 0, sev: "Low" };
      cur.count++;
      const score = Math.max(r.malicious_probability ?? 0, r.anomaly_score ?? 0);
      if (score > cur.maxScore) cur.maxScore = score;
      const sev = (r.risk_level || r.severity || "Low") as string;
      if (sevRank(sev) > sevRank(cur.sev)) cur.sev = sev;
      map.set(r.src_ip, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.maxScore - a.maxScore).slice(0, 8);
  }, [u]);

  return (
    <Card title="TOP SUSPICIOUS IPS">
      {items.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
          {items.map((it) => (
            <div key={it.ip} className="flex items-center gap-3 p-2 rounded-md bg-white/5 border border-white/5 hover:border-cyan/30 transition">
              <div className="w-1.5 h-8 rounded-full" style={{ background: SEV_COLORS[it.sev] }} />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-cyan truncate">{it.ip || "—"}</div>
                <div className="text-[10px] text-muted-foreground">score {(it.maxScore * 100).toFixed(0)}%</div>
              </div>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
                style={{ background: `${SEV_COLORS[it.sev]}20`, color: SEV_COLORS[it.sev] }}
              >
                {it.sev}
              </span>
              <div className="text-sm font-bold tabular-nums text-foreground">{it.count}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const sevRank = (s: string) => ({ Low: 1, Medium: 2, High: 3, Critical: 4 })[s as "Low"] ?? 0;

const tooltipStyle = {
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(34,211,238,0.3)",
  borderRadius: 8,
  fontSize: 11,
  color: "#e2e8f0",
};

function Empty() {
  return (
    <div className="h-[240px] grid place-items-center text-xs text-muted-foreground">
      <div className="text-center">
        <div className="opacity-60">No telemetry yet</div>
        <div className="text-[10px] mt-1">Upload a CSV to populate this chart</div>
      </div>
    </div>
  );
}
