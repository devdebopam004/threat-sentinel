import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShieldAlert,
  Radar,
  Activity,
  FileText,
  Settings as SettingsIcon,
  Cpu,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/threat-intelligence", label: "Threat Intelligence", icon: ShieldAlert },
  { to: "/anomaly-detection", label: "Anomaly Detection", icon: Radar },
  { to: "/behavioral-analytics", label: "Behavioral Analytics", icon: Activity },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const engineMeta = [
  { key: "threat" as const, label: "Threat AI", icon: ShieldCheck },
  { key: "behavior" as const, label: "Behavior AI", icon: Brain },
  { key: "anomaly" as const, label: "Anomaly AI", icon: Cpu },
  { key: "pcap" as const, label: "PCAP AI", icon: Cpu },
  { key: "correlation" as const, label: "Log Correlation", icon: Brain },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const engines = useAppStore((s) => s.engines);

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col glass border-r border-cyan/20 relative z-10">
      <div className="px-5 py-5 border-b border-cyan/15">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-md neon-border grid place-items-center bg-background/60">
              <ShieldCheck className="w-5 h-5 text-cyan" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-success pulse-dot" />
          </div>
          <div>
            <div className="text-sm font-semibold neon-text tracking-wider">
              SENTINEL.AI
            </div>
            <div className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">
              SOC v3.0
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 scrollbar-thin overflow-y-auto">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all relative ${
                active
                  ? "bg-cyan/10 text-cyan neon-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-cyan shadow-[0_0_10px_var(--neon-cyan)]" />
              )}
              <Icon className="w-4 h-4" />
              <span className="tracking-wide">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 m-3 rounded-lg glass border border-cyan/20">
        <div className="text-[10px] tracking-[0.25em] text-muted-foreground mb-2">
          ENGINES ONLINE
        </div>
        {engineMeta.map((e) => {
          const Icon = e.icon;
          const status = engines[e.key];
          const color =
            status === "running"
              ? "text-alert"
              : status === "error"
                ? "text-threat"
                : "text-success";
          const label =
            status === "running"
              ? "RUNNING"
              : status === "error"
                ? "ERROR"
                : "READY";
          return (
            <div
              key={e.key}
              className="flex items-center justify-between text-xs py-1.5"
            >
              <span className="flex items-center gap-2 text-foreground/80">
                <Icon className="w-3.5 h-3.5" />
                {e.label}
              </span>
              <span className={`flex items-center gap-1.5 ${color}`}>
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-current ${status === "running" ? "pulse-dot" : ""}`}
                />
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
