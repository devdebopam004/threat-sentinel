import { useRef, useState } from "react";
import { Upload, FileWarning, FileCheck2, Play, Database, FileText, Network } from "lucide-react";
import { toast } from "sonner";
import { validateCsv, type CsvValidation } from "@/lib/csv";
import { runDetection } from "@/lib/api";
import { unify } from "@/lib/normalize";
import { useAppStore } from "@/lib/store";
import { ProcessingOverlay } from "./ProcessingOverlay";

interface CsvSlotProps {
  label: string;
  hint: string;
  kind: "threat" | "behavior";
  state: { file: File; csv: string; validation: CsvValidation } | null;
  onPick: (file: File) => void;
  onClear: () => void;
}

function CsvSlot({ label, hint, state, onPick, onClear }: CsvSlotProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const v = state?.validation;
  const ok = v?.ok;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
      }}
      className={`glass rounded-lg p-4 border transition-all ${
        ok ? "border-success/40"
          : v && !ok ? "border-threat/50"
          : drag ? "border-cyan/60" : "border-cyan/20"
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
        ref={ref} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }}
      />
      {state ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-cyan truncate">{state.file.name}</span>
            <button onClick={onClear} className="text-muted-foreground hover:text-threat">remove</button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Rows: {v?.rowCount ?? 0}</span>
            <span>Columns: {v?.found.length ?? 0}</span>
            {ok ? <span className="text-success">✓ schema valid</span>
                : <span className="text-threat">missing: {v?.missing.join(", ")}</span>}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="mt-3 w-full text-xs py-2 rounded-md border border-dashed border-cyan/30 text-muted-foreground hover:text-cyan hover:border-cyan/60 transition">
          Drop CSV here or click to browse
        </button>
      )}
    </div>
  );
}

interface BinarySlotProps {
  label: string;
  hint: string;
  accept: string;
  exts: string[];
  icon: React.ComponentType<{ className?: string }>;
  file: File | null;
  onPick: (f: File) => void;
  onClear: () => void;
}

function BinarySlot({ label, hint, accept, exts, icon: Icon, file, onPick, onClear }: BinarySlotProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const validExt = file ? exts.some((e) => file.name.toLowerCase().endsWith(e)) : true;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0]; if (f) onPick(f);
      }}
      className={`glass rounded-lg p-4 border transition-all ${
        file && validExt ? "border-success/40"
          : file && !validExt ? "border-threat/50"
          : drag ? "border-cyan/60" : "border-cyan/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-cyan/10 border border-cyan/30 grid place-items-center text-cyan shrink-0">
          {file && validExt ? <FileCheck2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }}
      />
      {file ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-cyan truncate">{file.name}</span>
            <button onClick={onClear} className="text-muted-foreground hover:text-threat">remove</button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{(file.size / 1024).toFixed(1)} KB</span>
            {validExt
              ? <span className="text-success">✓ ready</span>
              : <span className="text-threat">unsupported extension</span>}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="mt-3 w-full text-xs py-2 rounded-md border border-dashed border-cyan/30 text-muted-foreground hover:text-cyan hover:border-cyan/60 transition">
          Drop file here or click to browse
        </button>
      )}
    </div>
  );
}

export function UploadPanel() {
  const [threat, setThreat] = useState<{ file: File; csv: string; validation: CsvValidation } | null>(null);
  const [behavior, setBehavior] = useState<{ file: File; csv: string; validation: CsvValidation } | null>(null);
  const [pcap, setPcap] = useState<File | null>(null);
  const [apacheLog, setApacheLog] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const setEngine = useAppStore((s) => s.setEngine);
  const setAll = useAppStore((s) => s.setAll);
  const setError = useAppStore((s) => s.setError);
  const threatApi = useAppStore((s) => s.threatApi);
  const behaviorApi = useAppStore((s) => s.behaviorApi);
  const pcapApi = useAppStore((s) => s.pcapApi);
  const correlationApi = useAppStore((s) => s.correlationApi);

  const pickCsv = async (kind: "threat" | "behavior", file: File) => {
    if (file.size > 25 * 1024 * 1024) { toast.error("File too large (max 25MB)."); return; }
    try {
      const csv = await file.text();
      const validation = validateCsv(csv, kind);
      const setter = kind === "threat" ? setThreat : setBehavior;
      setter({ file, csv, validation });
      if (!validation.ok) toast.warning(`${kind.toUpperCase()} CSV missing columns: ${validation.missing.join(", ")}`);
      else toast.success(`${kind.toUpperCase()} CSV loaded · ${validation.rowCount} rows`);
    } catch (e) { toast.error(`Failed to read file: ${(e as Error).message}`); }
  };

  const pickBinary = (kind: "pcap" | "log", file: File, exts: string[]) => {
    if (file.size > 25 * 1024 * 1024) { toast.error("File too large (max 25MB)."); return; }
    const valid = exts.some((e) => file.name.toLowerCase().endsWith(e));
    if (!valid) { toast.warning(`Unsupported extension. Expected: ${exts.join(", ")}`); }
    if (kind === "pcap") setPcap(file); else setApacheLog(file);
    if (valid) toast.success(`${kind === "pcap" ? "PCAP" : "Apache log"} loaded · ${(file.size / 1024).toFixed(1)} KB`);
  };

  const launch = async () => {
    const haveAny = threat || behavior || pcap;
    if (!haveAny) { toast.error("Upload at least one file to begin analysis."); return; }
    if (apacheLog && !pcap) { toast.error("Apache log requires a PCAP file for correlation."); return; }

    setRunning(true); setDone(false); setError(null);

    if (threat) { setEngine("threat", "running"); setEngine("anomaly", "running"); }
    if (behavior) setEngine("behavior", "running");
    if (pcap) setEngine("pcap", "running");
    if (pcap && apacheLog) setEngine("correlation", "running");

    try {
      const result = await runDetection({
        threatCsv: threat?.csv,
        threatRows: threat?.validation.rows,
        behaviorCsv: behavior?.csv,
        behaviorRows: behavior?.validation.rows,
        pcapFile: pcap ?? undefined,
        apacheLogFile: apacheLog ?? undefined,
        threatBase: threatApi,
        behaviorBase: behaviorApi,
        pcapBase: pcapApi,
        correlationBase: correlationApi,
      });

      const unified = unify(result.threats, result.anomalies, result.behaviors, result.pcaps);
      setAll(result.threats, result.anomalies, result.behaviors, unified);

      const errFor = (svc: string) => result.errors.find((e) => e.service === svc);
      if (threat) {
        setEngine("threat", errFor("threat") ? "error" : "ready");
        setEngine("anomaly", errFor("anomaly") ? "error" : "ready");
      }
      if (behavior) setEngine("behavior", errFor("behavior") ? "error" : "ready");
      if (pcap) setEngine("pcap", errFor("pcap") ? "error" : "ready");
      if (pcap && apacheLog) setEngine("correlation", errFor("correlation") ? "error" : "ready");

      if (result.errors.length) {
        const msg = result.errors.map((e) => `${e.service}: ${e.message}`).join(" · ");
        setError(msg);
        toast.error(`Some engines failed · ${msg}`, { duration: 6000 });
      }
      if (unified.length === 0 && result.errors.length === 0) toast.warning("APIs returned no records.");
      else if (unified.length > 0) toast.success(`Analysis complete · ${unified.length} records`);

      setDone(true);
      setTimeout(() => setRunning(false), 600);
    } catch (e) {
      if (threat) { setEngine("threat", "error"); setEngine("anomaly", "error"); }
      if (behavior) setEngine("behavior", "error");
      if (pcap) setEngine("pcap", "error");
      if (pcap && apacheLog) setEngine("correlation", "error");
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
              Upload CSV telemetry, PCAP captures, or Apache logs to run the unified AI detection pipeline.
            </div>
          </div>
          <button
            onClick={launch}
            disabled={running || (!threat && !behavior && !pcap)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan text-primary-foreground font-medium text-sm disabled:opacity-40 hover:shadow-[0_0_20px_var(--neon-cyan)] transition"
          >
            <Play className="w-4 h-4" /> Run Analysis
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <CsvSlot
            label="Threat CSV" hint="src_ip, dst_ip, ports, protocol, bytes, user_agent, url..."
            kind="threat" state={threat}
            onPick={(f) => pickCsv("threat", f)} onClear={() => setThreat(null)}
          />
          <CsvSlot
            label="Behavior CSV" hint="Timestamp, Src IP dec, Flow Duration, SYN/ACK Flag, Packet Mean..."
            kind="behavior" state={behavior}
            onPick={(f) => pickCsv("behavior", f)} onClear={() => setBehavior(null)}
          />
          <BinarySlot
            label="PCAP Capture" hint="Network capture (.pcap, .pcapng) for AI threat correlation"
            accept=".pcap,.pcapng,application/vnd.tcpdump.pcap"
            exts={[".pcap", ".pcapng"]} icon={Network}
            file={pcap} onPick={(f) => pickBinary("pcap", f, [".pcap", ".pcapng"])}
            onClear={() => setPcap(null)}
          />
          <BinarySlot
            label="Apache Log" hint="Apache access log (.log, .txt) — requires PCAP for correlation"
            accept=".log,.txt,text/plain"
            exts={[".log", ".txt"]} icon={FileText}
            file={apacheLog} onPick={(f) => pickBinary("log", f, [".log", ".txt"])}
            onClear={() => setApacheLog(null)}
          />
        </div>
      </div>

      <ProcessingOverlay open={running} done={done} />
    </div>
  );
}
