import { createFileRoute } from "@tanstack/react-router";
import { ThreatTable } from "@/components/table/ThreatTable";
import { CounterCards } from "@/components/dashboard/Charts";

export const Route = createFileRoute("/threat-intelligence")({
  component: Page,
  head: () => ({ meta: [{ title: "Threat Intelligence · Sentinel.AI" }] }),
});

function Page() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold neon-text tracking-wider">THREAT INTELLIGENCE</h1>
        <p className="text-xs text-muted-foreground">Unified threat records from XGBoost classifier with behavioral correlation.</p>
      </div>
      <CounterCards />
      <ThreatTable />
    </div>
  );
}
