import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ThreatPrediction,
  AnomalyPrediction,
  BehaviorPrediction,
  UnifiedRecord,
  EngineStatus,
} from "./types";

export interface EnginesState {
  threat: EngineStatus;
  behavior: EngineStatus;
  anomaly: EngineStatus;
}

interface AppState {
  threats: ThreatPrediction[];
  anomalies: AnomalyPrediction[];
  behaviors: BehaviorPrediction[];
  unified: UnifiedRecord[];
  engines: EnginesState;
  lastError: string | null;
  threatApi: string;
  behaviorApi: string;
  setApis: (t: string, b: string) => void;
  setEngine: (k: keyof EnginesState, s: EngineStatus) => void;
  setAll: (
    t: ThreatPrediction[],
    a: AnomalyPrediction[],
    b: BehaviorPrediction[],
    u: UnifiedRecord[],
  ) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      threats: [],
      anomalies: [],
      behaviors: [],
      unified: [],
      engines: { threat: "ready", behavior: "ready", anomaly: "ready" },
      lastError: null,
      threatApi: "https://cyber-threat-api-new.onrender.com",
      behaviorApi: "https://behavior-api-bppr.onrender.com",
      setApis: (t, b) => set({ threatApi: t, behaviorApi: b }),
      setEngine: (k, s) =>
        set((st) => ({ engines: { ...st.engines, [k]: s } })),
      setAll: (t, a, b, u) =>
        set({ threats: t, anomalies: a, behaviors: b, unified: u }),
      setError: (e) => set({ lastError: e }),
      reset: () =>
        set({
          threats: [],
          anomalies: [],
          behaviors: [],
          unified: [],
          lastError: null,
        }),
    }),
    {
      name: "soc-store",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as Storage)
          : localStorage,
      ),
      partialize: (s) => ({ threatApi: s.threatApi, behaviorApi: s.behaviorApi }),
    },
  ),
);
