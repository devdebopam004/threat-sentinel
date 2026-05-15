import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/behavioral-analytics")({
  component: Page,
  head: () => ({ meta: [{ title: "Behavioral Analytics · Sentinel.AI" }] }),
});

function Page() {
  const u = useAppStore((s) => s.unified);

  const hourly = useMemo(() => {
    const bins = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, "0")}h`, count: 0, threats: 0 }));
    for (const r of u) {
      const m = /(\d{2}):(\d{2})/.exec(r.timestamp);
      if (!m) continue;
      const h = parseInt(m[1], 10);
      if (h >= 0 && h < 24) {
        bins[h].count++;
        if (r.prediction === 1 || (r.attack_prediction && r.attack_prediction.toUpperCase() !== "BENIGN")) bins[h].threats++;
      }
    }
    return bins;
  }, [u]);

  const urls = useMemo(() => {
    const map = new Map<string, { count: number; mal: number }>();
    for (const r of u) {
      if (!r.url) continue;
      const cur = map.get(r.url) ?? { count: 0, mal: 0 };
      cur.count++;
      if (r.prediction === 1) cur.mal++;
      map.set(r.url, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].mal - a[1].mal || b[1].count - a[1].count).slice(0, 8);
  }, [u]);

  const agents = useMemo(() => {
    const map = new Map<string, { count: number; sus: boolean }>();
    const sus = /curl|wget|python|nmap|sqlmap|hydra|bot|scan/i;
    for (const r of u) {
      if (!r.user_agent) continue;
      const cur = map.get(r.user_agent) ?? { count: 0, sus: sus.test(r.user_agent) };
      cur.count++;
      map.set(r.user_agent, cur);
    }
    return Array.from(map.entries()).sort((a, b) => Number(b[1].sus) - Number(a[1].sus) || b[1].count - a[1].count).slice(0, 8);
  }, [u]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold neon-text tracking-wider">BEHAVIORAL ANALYTICS</h1>
        <p className="text-xs text-muted-foreground">Random Forest behavior model · URL, user-agent, and access timing intelligence</p>
      </div>

      <div className="glass rounded-lg p-4 border border-cyan/20">
        <div className="text-[11px] tracking-[0.25em] text-muted-foreground mb-3">ACCESS HOUR PATTERN (THREATS HIGHLIGHTED)</div>
        {u.length === 0 ? (
          <div className="h-[220px] grid place-items-center text-xs text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" style={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />
              <Bar dataKey="threats" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-lg p-4 border border-cyan/20">
          <div className="text-[11px] tracking-[0.25em] text-muted-foreground mb-3">SUSPICIOUS URLs</div>
          {urls.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">No URL data</div>
          ) : (
            <div className="space-y-2">
              {urls.map(([url, info]) => (
                <div key={url} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-cyan truncate">{url}</div>
                    <div className="text-[10px] text-muted-foreground">{info.count} requests · {info.mal} flagged</div>
                  </div>
                  {info.mal > 0 && <span className="px-2 py-0.5 rounded text-[10px] bg-threat/20 text-threat border border-threat/40">MALICIOUS</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-lg p-4 border border-cyan/20">
          <div className="text-[11px] tracking-[0.25em] text-muted-foreground mb-3">USER AGENTS</div>
          {agents.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">No agent data</div>
          ) : (
            <div className="space-y-2">
              {agents.map(([ua, info]) => (
                <div key={ua} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-foreground/80 truncate">{ua}</div>
                    <div className="text-[10px] text-muted-foreground">{info.count} requests</div>
                  </div>
                  {info.sus && <span className="px-2 py-0.5 rounded text-[10px] bg-alert/20 text-alert border border-alert/40">AUTOMATION</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
