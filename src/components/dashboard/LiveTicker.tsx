import { useAppStore } from "@/lib/store";
import { Radio } from "lucide-react";

export function LiveTicker() {
  const u = useAppStore((s) => s.unified);
  const items = u
    .filter((r) => r.prediction === 1 || r.anomaly_status === "Anomalous" || (r.attack_prediction && r.attack_prediction.toUpperCase() !== "BENIGN"))
    .slice(-30);

  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <div className="glass border border-cyan/20 rounded-lg overflow-hidden">
      <div className="flex items-center">
        <div className="px-3 py-2 bg-cyan/10 border-r border-cyan/30 text-[10px] tracking-[0.25em] text-cyan flex items-center gap-2 shrink-0">
          <Radio className="w-3 h-3 pulse-dot" /> LIVE FEED
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-track flex gap-6 whitespace-nowrap py-2 pl-4">
            {doubled.map((r, i) => (
              <span key={i} className="text-xs font-mono">
                <span className="text-threat">●</span>{" "}
                <span className="text-cyan">{r.src_ip}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="text-foreground">{r.dst_ip}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-alert">{r.attack_prediction || (r.prediction === 1 ? "MALICIOUS" : "ANOMALOUS")}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-neon-purple">{r.risk_level || r.severity}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
