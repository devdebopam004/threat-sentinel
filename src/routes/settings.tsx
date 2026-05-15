import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Save, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: Page,
  head: () => ({ meta: [{ title: "Settings · Sentinel.AI" }] }),
});

function Page() {
  const threatApi = useAppStore((s) => s.threatApi);
  const behaviorApi = useAppStore((s) => s.behaviorApi);
  const setApis = useAppStore((s) => s.setApis);
  const reset = useAppStore((s) => s.reset);

  const [t, setT] = useState(threatApi);
  const [b, setB] = useState(behaviorApi);

  useEffect(() => { setT(threatApi); setB(behaviorApi); }, [threatApi, behaviorApi]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold neon-text tracking-wider">SETTINGS</h1>
        <p className="text-xs text-muted-foreground">Configure AI engine endpoints and reset state.</p>
      </div>

      <div className="glass border border-cyan/20 rounded-lg p-5 space-y-4">
        <div>
          <label className="text-[10px] tracking-[0.25em] text-muted-foreground">THREAT + ANOMALY API BASE</label>
          <input value={t} onChange={(e) => setT(e.target.value)} className="mt-1 w-full bg-background/60 border border-cyan/20 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan/60" />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.25em] text-muted-foreground">BEHAVIOR API BASE</label>
          <input value={b} onChange={(e) => setB(e.target.value)} className="mt-1 w-full bg-background/60 border border-cyan/20 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan/60" />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setApis(t.trim(), b.trim()); toast.success("API endpoints saved"); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan text-primary-foreground text-sm font-medium"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          <button
            onClick={() => { reset(); toast.success("Detection state cleared"); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-threat/40 text-threat text-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Clear all detections
          </button>
        </div>
      </div>

      <div className="glass border border-cyan/20 rounded-lg p-5 text-xs text-muted-foreground space-y-2">
        <div className="text-[10px] tracking-[0.25em] text-cyan">API ROUTING</div>
        <p>The proxy auto-discovers the correct endpoint path on the configured base URL by trying common FastAPI conventions ( <code className="text-cyan">/predict</code>, <code className="text-cyan">/analyze</code>, <code className="text-cyan">/upload</code>, etc. ) and supports both multipart-CSV and JSON-row payloads. The first successful path is cached.</p>
      </div>
    </div>
  );
}
