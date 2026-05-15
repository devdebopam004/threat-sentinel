import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  component: Page,
  head: () => ({ meta: [{ title: "Reports · Sentinel.AI" }] }),
});

function Page() {
  const u = useAppStore((s) => s.unified);
  const t = useAppStore((s) => s.threats);
  const a = useAppStore((s) => s.anomalies);
  const b = useAppStore((s) => s.behaviors);

  const download = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${name}`);
  };

  const exportJson = () => {
    download("threat-report.json", new Blob([JSON.stringify({ unified: u, threats: t, anomalies: a, behaviors: b }, null, 2)], { type: "application/json" }));
  };

  const exportCsv = () => {
    if (u.length === 0) { toast.error("No data to export"); return; }
    const cols = Object.keys(u[0]);
    const lines = [cols.join(",")];
    for (const r of u) {
      lines.push(cols.map((c) => {
        const v = (r as unknown as Record<string, unknown>)[c];
        const s = Array.isArray(v) ? v.join(";") : v == null ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(","));
    }
    download("threat-report.csv", new Blob([lines.join("\n")], { type: "text/csv" }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold neon-text tracking-wider">REPORTS</h1>
        <p className="text-xs text-muted-foreground">Export merged threat intelligence dataset.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button onClick={exportJson} disabled={u.length === 0} className="glass border border-cyan/30 rounded-lg p-5 text-left hover:border-cyan/60 disabled:opacity-40 transition">
          <FileJson className="w-6 h-6 text-cyan mb-2" />
          <div className="font-medium">Unified Intelligence (JSON)</div>
          <div className="text-xs text-muted-foreground mt-1">All threat / anomaly / behavior records merged.</div>
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-cyan"><Download className="w-3.5 h-3.5" /> Download</div>
        </button>
        <button onClick={exportCsv} disabled={u.length === 0} className="glass border border-cyan/30 rounded-lg p-5 text-left hover:border-cyan/60 disabled:opacity-40 transition">
          <FileSpreadsheet className="w-6 h-6 text-neon-purple mb-2" />
          <div className="font-medium">Unified Records (CSV)</div>
          <div className="text-xs text-muted-foreground mt-1">Tabular export, importable into SIEM tools.</div>
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-cyan"><Download className="w-3.5 h-3.5" /> Download</div>
        </button>
      </div>

      <div className="glass border border-cyan/20 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Threat records" v={t.length} />
        <Stat label="Anomaly records" v={a.length} />
        <Stat label="Behavior records" v={b.length} />
        <Stat label="Unified records" v={u.length} />
      </div>
    </div>
  );
}

const Stat = ({ label, v }: { label: string; v: number }) => (
  <div>
    <div className="text-[10px] tracking-[0.25em] text-muted-foreground">{label.toUpperCase()}</div>
    <div className="text-2xl font-bold text-cyan tabular-nums">{v}</div>
  </div>
);
