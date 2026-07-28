import { create } from "zustand";

type ExportStatus = "idle" | "exporting" | "done" | "error";

interface ExportState {
  status: ExportStatus;
  progress: number; // 0-100
  downloadUrl: string | null;
  error: string | null;
  startExport: () => void;
  setProgress: (pct: number) => void;
  complete: (url: string) => void;
  fail: (error: string) => void;
  reset: () => void;
}

export const useExportStore = create<ExportState>((set) => ({
  status: "idle",
  progress: 0,
  downloadUrl: null,
  error: null,
  startExport: () => set({ status: "exporting", progress: 0, downloadUrl: null, error: null }),
  setProgress: (pct) => set({ progress: pct }),
  complete: (url) => set({ status: "done", downloadUrl: url, progress: 100 }),
  fail: (error) => set({ status: "error", error }),
  reset: () => set({ status: "idle", progress: 0, downloadUrl: null, error: null }),
}));
