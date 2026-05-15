import { createFileRoute } from "@tanstack/react-router";
import { UploadPanel } from "@/components/upload/UploadPanel";
import {
  CounterCards,
  AttackDistributionChart,
  SeverityChart,
  NetworkTrafficChart,
  AnomalyScatterChart,
  TopSuspiciousIps,
} from "@/components/dashboard/Charts";
import { LiveTicker } from "@/components/dashboard/LiveTicker";
import { ThreatTable } from "@/components/table/ThreatTable";
import { useAppStore } from "@/lib/store";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const lastError = useAppStore((s) => s.lastError);
  return (
    <div className="space-y-5">
      {lastError && (
        <div className="glass border border-threat/40 rounded-lg p-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-threat mt-0.5" />
          <div>
            <div className="text-threat font-medium">Detection engine warning</div>
            <div className="text-xs text-muted-foreground">{lastError}</div>
          </div>
        </div>
      )}
      <UploadPanel />
      <CounterCards />
      <LiveTicker />
      <div className="grid lg:grid-cols-3 gap-4">
        <AttackDistributionChart />
        <SeverityChart />
        <TopSuspiciousIps />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <NetworkTrafficChart />
        <AnomalyScatterChart />
      </div>
      <ThreatTable />
    </div>
  );
}
