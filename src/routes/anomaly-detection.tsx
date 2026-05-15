import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { AnomalyScatterChart } from "@/components/dashboard/Charts";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/anomaly-detection")({
  component: Page,
  head: () => ({ meta: [{ title: "Anomaly Detection · Sentinel.AI" }] }),
});

function Page() {
  const u = useAppStore((s) => s.unified);
  const anomalies = u.filter((r) => r.anomaly_status === "Anomalous");

  const histogram = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ name: `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`, count: 0 }));
    for (const r of u) {
      if (r.anomaly_score == null) continue;
      const idx = Math.min(9, Math.floor(r.anomaly_score * 10));
      bins[idx].count++;
    }
    return bins;
  }, [u]);

  const reasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of u) for (const reason of r.anomaly_reasons ?? []) map.set(reason, (map.get(reason) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [u]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold neon-text tracking-wider">ANOMALY DETECTION</h1>
        <p className="text-xs text-muted-foreground">Isolation Forest deviation analysis · {anomalies.length} anomalous flows of {u.length}</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <AnomalyScatterChart />
        <div className="glass rounded-lg p-4 border border-cyan/20">
          <div className="text-[11px] tracking-[0.25em] text-muted-foreground mb-3">ANOMALY SCORE DISTRIBUTION</div>
          {u.length === 0 ? (
            <div className="h-[240px] grid place-items-center text-xs text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogram.map((_, i) => <Cell key={i} fill={i >= 5 ? "#ef4444" : i >= 3 ? "#f59e0b" : "#10b981"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass rounded-lg p-4 border border-cyan/20">
        <div className="text-[11px] tracking-[0.25em] text-muted-foreground mb-3">TOP ANOMALY REASONS</div>
        {reasons.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center">No reasons reported by the engine yet.</div>
        ) : (
          <div className="space-y-2">
            {reasons.map(([r, c]) => {
              const max = reasons[0][1];
              return (
                <div key={r} className="flex items-center gap-3">
                  <div className="text-xs flex-1 truncate">{r}</div>
                  <div className="w-1/2 h-1.5 bg-white/10 rounded">
                    <div className="h-full bg-gradient-to-r from-cyan to-neon-purple rounded" style={{ width: `${(c / max) * 100}%` }} />
                  </div>
                  <div className="text-xs tabular-nums text-cyan w-10 text-right">{c}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
