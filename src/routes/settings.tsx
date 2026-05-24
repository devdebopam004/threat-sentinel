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
  const pcapApi = useAppStore((s) => s.pcapApi);
  const correlationApi = useAppStore((s) => s.correlationApi);
  const setApis = useAppStore((s) => s.setApis);
  const reset = useAppStore((s) => s.reset);

  const [t, setT] = useState(threatApi);
  const [b, setB] = useState(behaviorApi);
  const [p, setP] = useState(pcapApi);
  const [c, setC] = useState(correlationApi);

  useEffect(() => {
    setT(threatApi); setB(behaviorApi); setP(pcapApi); setC(correlationApi);
  }, [threatApi, behaviorApi, pcapApi, correlationApi]);

  const fields: Array<{ label: string; value: string; set: (v: string) => void }> = [
    { label: "THREAT + ANOMALY API BASE", value: t, set: setT },
    { label: "BEHAVIOR API BASE", value: b, set: setB },
    { label: "PCAP THREAT API BASE", value: p, set: setP },
    { label: "APACHE LOG CORRELATION API BASE", value: c, set: setC },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold neon-text tracking-wider">SETTINGS</h1>
        <p className="text-xs text-muted-foreground">Configure AI engine endpoints and reset state.</p>
      </div>

      <div className="glass border border-cyan/20 rounded-lg p-5 space-y-4">
        {fields.map((f) => (
          <div key={f.label}>
            <label className="text-[10px] tracking-[0.25em] text-muted-foreground">{f.label}</label>
            <input
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="mt-1 w-full bg-background/60 border border-cyan/20 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan/60"
            />
          </div>
        ))}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setApis({
                threatApi: t.trim(),
                behaviorApi: b.trim(),
                pcapApi: p.trim(),
                correlationApi: c.trim(),
              });
              toast.success("API endpoints saved");
            }}
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
        <p>The proxy auto-discovers the correct endpoint path on each configured base URL by trying common FastAPI conventions ( <code className="text-cyan">/predict</code>, <code className="text-cyan">/analyze</code>, <code className="text-cyan">/upload</code>, <code className="text-cyan">/correlate</code>, etc. ) and supports CSV, JSON-row, PCAP multipart, and PCAP+Log multipart payloads. The first successful path is cached per session.</p>
      </div>
    </div>
  );
}
