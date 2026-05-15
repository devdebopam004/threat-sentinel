import { useRef, useState } from "react";
import { Upload, FileWarning, FileCheck2, Play, Database, FileQuestion, Network } from "lucide-react";
import { toast } from "sonner";
import { validateCsv, type CsvValidation } from "@/lib/csv";
import { runDetection } from "@/lib/api";
import { unify } from "@/lib/normalize";
import { useAppStore } from "@/lib/store";
import { ProcessingOverlay } from "./ProcessingOverlay";

interface SlotProps {
  label: string;
  hint: string;
  kind: "threat" | "behavior";
  state: { file: File; csv: string; validation: CsvValidation } | null;
  onPick: (file: File) => void;
  onClear: () => void;
}

function UploadSlot({ label, hint, state, onPick, onClear }: SlotProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const v = state?.validation;
  const ok = v?.ok;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
      }}
      className={`glass rounded-lg p-4 border transition-all ${
        ok
          ? "border-success/40"
          : v && !ok
            ? "border-threat/50"
            : drag
              ? "border-cyan/60"
              : "border-cyan/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-cyan/10 border border-cyan/30 grid place-items-center text-cyan shrink-0">
          {ok ? <FileCheck2 className="w-5 h-5" /> : v ? <FileWarning className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>

      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />

      {state ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-cyan truncate">{state.file.name}</span>
            <button onClick={onClear} className="text-muted-foreground hover:text-threat">
              remove
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Rows: {v?.rowCount ?? 0}</span>
            <span>Columns: {v?.found.length ?? 0}</span>
            {ok ? (
              <span className="text-success">✓ schema valid</span>
            ) : (
              <span className="text-threat">missing: {v?.missing.join(", ")}</span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-3 w-full text-xs py-2 rounded-md border border-dashed border-cyan/30 text-muted-foreground hover:text-cyan hover:border-cyan/60 transition"
        >
          Drop CSV here or click to browse
        </button>
      )}
    </div>
  );
}

export function UploadPanel() {
  const [threat, setThreat] = useState<{
    file: File;
    csv: string;
    validation: CsvValidation;
  } | null>(null);
  const [behavior, setBehavior] = useState<{
    file: File;
    csv: string;
    validation: CsvValidation;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const setEngine = useAppStore((s) => s.setEngine);
  const setAll = useAppStore((s) => s.setAll);
  const setError = useAppStore((s) => s.setError);
  const threatApi = useAppStore((s) => s.threatApi);
  const behaviorApi = useAppStore((s) => s.behaviorApi);

  const pick = async (kind: "threat" | "behavior", file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25MB).");
      return;
    }
    try {
      const csv = await file.text();
      const validation = validateCsv(csv, kind);
      const setter = kind === "threat" ? setThreat : setBehavior;
      setter({ file, csv, validation });
      if (!validation.ok) {
        toast.warning(
          `${kind.toUpperCase()} CSV missing columns: ${validation.missing.join(", ")}`,
        );
      } else {
        toast.success(`${kind.toUpperCase()} CSV loaded · ${validation.rowCount} rows`);
      }
    } catch (e) {
      toast.error(`Failed to read file: ${(e as Error).message}`);
    }
  };

  const launch = async () => {
    if (!threat && !behavior) {
      toast.error("Upload at least one CSV to begin analysis.");
      return;
    }
    setRunning(true);
    setDone(false);
    setError(null);
    if (threat) {
      setEngine("threat", "running");
      setEngine("anomaly", "running");
    }
    if (behavior) setEngine("behavior", "running");

    try {
      const result = await runDetection({
        threatCsv: threat?.csv,
        threatRows: threat?.validation.rows,
        behaviorCsv: behavior?.csv,
        behaviorRows: behavior?.validation.rows,
        threatBase: threatApi,
        behaviorBase: behaviorApi,
      });

      const unified = unify(result.threats, result.anomalies, result.behaviors);
      setAll(result.threats, result.anomalies, result.behaviors, unified);

      setEngine(
        "threat",
        result.errors.find((e) => e.service === "threat") ? "error" : "ready",
      );
      setEngine(
        "anomaly",
        result.errors.find((e) => e.service === "anomaly") ? "error" : "ready",
      );
      setEngine(
        "behavior",
        result.errors.find((e) => e.service === "behavior") ? "error" : "ready",
      );

      if (result.errors.length) {
        const msg = result.errors.map((e) => `${e.service}: ${e.message}`).join(" · ");
        setError(msg);
        toast.error(`Some engines failed · ${msg}`, { duration: 6000 });
      }
      if (unified.length === 0 && result.errors.length === 0) {
        toast.warning("APIs returned no records.");
      } else if (unified.length > 0) {
        toast.success(`Analysis complete · ${unified.length} records`);
      }
      setDone(true);
      setTimeout(() => setRunning(false), 600);
    } catch (e) {
      setEngine("threat", "error");
      setEngine("anomaly", "error");
      setEngine("behavior", "error");
      setError((e as Error).message);
      toast.error(`Pipeline failed: ${(e as Error).message}`);
      setRunning(false);
    }
  };

  return (
    <div className="glass rounded-xl p-5 border border-cyan/20 relative overflow-hidden">
      <div className="grid-pattern absolute inset-0 opacity-20 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-cyan neon-text text-sm tracking-[0.25em]">
              <Database className="w-4 h-4" /> TELEMETRY INGEST
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Upload Threat CSV (network flow) and/or Behavior CSV (web activity) to run the AI detection pipeline.
            </div>
          </div>
          <button
            onClick={launch}
            disabled={running || (!threat && !behavior)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan text-primary-foreground font-medium text-sm disabled:opacity-40 hover:shadow-[0_0_20px_var(--neon-cyan)] transition"
          >
            <Play className="w-4 h-4" /> Run Analysis
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <UploadSlot
            label="Threat CSV"
            hint="src_ip, dst_ip, ports, protocol, bytes, user_agent, url..."
            kind="threat"
            state={threat}
            onPick={(f) => pick("threat", f)}
            onClear={() => setThreat(null)}
          />
          <UploadSlot
            label="Behavior CSV"
            hint="Timestamp, Src IP dec, Flow Duration, SYN/ACK Flag, Packet Mean..."
            kind="behavior"
            state={behavior}
            onPick={(f) => pick("behavior", f)}
            onClear={() => setBehavior(null)}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="glass rounded-lg p-4 border border-muted/30 opacity-60">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-muted/30 grid place-items-center"><Network className="w-5 h-5" /></div>
              <div>
                <div className="text-sm font-medium">PCAP Upload</div>
                <div className="text-xs text-muted-foreground">Backend Scapy service required · disabled in v1</div>
              </div>
            </div>
          </div>
          <div className="glass rounded-lg p-4 border border-muted/30 opacity-60">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-muted/30 grid place-items-center"><FileQuestion className="w-5 h-5" /></div>
              <div>
                <div className="text-sm font-medium">Apache Log Upload</div>
                <div className="text-xs text-muted-foreground">Backend log parser required · disabled in v1</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProcessingOverlay open={running} done={done} />
    </div>
  );
}
