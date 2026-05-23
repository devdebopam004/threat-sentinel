import { useEffect, useState } from "react";
import { Activity, ShieldAlert, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Link } from "@tanstack/react-router";

export function TopHeader() {
  const [now, setNow] = useState<Date | null>(null);
  const unified = useAppStore((s) => s.unified);

  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const criticals = unified.filter(
    (u) => u.risk_level === "Critical" || u.severity === "Critical",
  ).length;
  const highs = unified.filter(
    (u) => u.risk_level === "High" || u.severity === "High",
  ).length;
  const threatLevel: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL" =
    criticals > 5
      ? "CRITICAL"
      : criticals > 0
        ? "HIGH"
        : highs > 3
          ? "ELEVATED"
          : unified.length > 0
            ? "GUARDED"
            : "LOW";

  const levelColor =
    threatLevel === "CRITICAL" || threatLevel === "HIGH"
      ? "text-threat border-threat/40 bg-threat/10"
      : threatLevel === "ELEVATED"
        ? "text-alert border-alert/40 bg-alert/10"
        : "text-success border-success/40 bg-success/10";

  return (
    <header className="h-16 px-4 md:px-6 glass border-b border-cyan/20 flex items-center gap-4 relative z-10">
      <div className="flex items-center gap-3 min-w-0">
        <ShieldAlert className="w-5 h-5 text-cyan" />
        <div className="min-w-0">
          <div className="text-sm md:text-base font-semibold tracking-wider neon-text truncate">
            AI CYBER INTELLIGENCE
          </div>
          <div className="text-[10px] text-muted-foreground tracking-[0.25em] uppercase">
            Unified Threat Operations
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div
        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono ${levelColor}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
        THREAT LEVEL: {threatLevel}
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-success/30 text-success bg-success/5 text-xs">
        <Activity className="w-3.5 h-3.5" />
        SYSTEM ACTIVE
      </div>

      <div className="hidden md:block font-mono text-xs text-muted-foreground tabular-nums">
        {now ? `${now.toUTCString().split(" ").slice(4, 5)[0]} UTC` : "—— UTC"}
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan/15 border border-cyan/40 text-cyan hover:bg-cyan/25 transition text-xs font-medium"
      >
        <Plus className="w-3.5 h-3.5" /> New Scan
      </Link>
    </header>
  );
}
