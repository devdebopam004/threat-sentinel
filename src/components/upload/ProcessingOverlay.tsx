import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";

const STAGES = [
  "Parsing uploaded files...",
  "Extracting network flow features...",
  "Running AI threat models...",
  "Performing anomaly detection...",
  "Analyzing behavioral intelligence...",
  "PCAP threat correlation...",
  "Apache log correlation...",
  "Correlating suspicious indicators...",
  "Generating threat scores...",
  "Building unified threat dashboard...",
];

export function ProcessingOverlay({
  open,
  done,
}: {
  open: boolean;
  done: boolean;
}) {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setStage(0);
      setLogs([]);
      return;
    }
    setStage(0);
    setLogs([]);
    const id = setInterval(() => {
      setStage((s) => {
        const next = Math.min(s + 1, STAGES.length - 1);
        if (next > s) {
          setLogs((l) => [
            ...l,
            `[${new Date().toISOString().slice(11, 19)}] ${STAGES[s]} OK`,
          ]);
        }
        return next;
      });
    }, 650);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (done && open) {
      setStage(STAGES.length - 1);
      setLogs((l) => [
        ...l,
        `[${new Date().toISOString().slice(11, 19)}] ${STAGES[STAGES.length - 1]} OK`,
      ]);
    }
  }, [done, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 backdrop-blur-md bg-background/70 grid place-items-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="glass neon-border rounded-xl p-6 w-full max-w-2xl relative overflow-hidden scan-line"
          >
            <div className="grid-pattern absolute inset-0 opacity-30 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <Loader2 className="w-5 h-5 text-cyan animate-spin" />
                <div>
                  <div className="text-sm tracking-[0.25em] text-cyan neon-text">
                    AI DETECTION ENGINE
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Processing telemetry through XGBoost · Random Forest · Isolation Forest
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {STAGES.map((s, i) => {
                  const state =
                    i < stage || (done && i === STAGES.length - 1)
                      ? "done"
                      : i === stage
                        ? "active"
                        : "pending";
                  return (
                    <div
                      key={s}
                      className="flex items-center gap-3 text-xs font-mono"
                    >
                      {state === "done" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : state === "active" ? (
                        <Loader2 className="w-3.5 h-3.5 text-cyan animate-spin" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />
                      )}
                      <span
                        className={
                          state === "done"
                            ? "text-success/80"
                            : state === "active"
                              ? "text-cyan"
                              : "text-muted-foreground/60"
                        }
                      >
                        {s}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-muted-foreground/60">
                        {state === "done"
                          ? "100%"
                          : state === "active"
                            ? "..."
                            : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md bg-black/60 border border-cyan/20 p-3 h-32 overflow-auto scrollbar-thin font-mono text-[11px] text-success/80">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground">
                    {">"} Awaiting telemetry stream...
                  </div>
                ) : (
                  logs.map((l, i) => (
                    <div key={i}>
                      {">"} {l}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
