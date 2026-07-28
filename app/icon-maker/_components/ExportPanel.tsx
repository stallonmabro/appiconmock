"use client";

import { useState } from "react";
import { useExportStore } from "@/stores/export-store";
import { useIconStore } from "@/stores/icon-store";
import { toast } from "sonner";

export function ExportPanel() {
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [customSizes, setCustomSizes] = useState("1024,512,192");
  const { status, progress, downloadUrl, startExport, setProgress, complete, fail } = useExportStore();
  const { layers, canvasSize } = useIconStore();

  async function handleExport() {
    if (layers.length <= 1) {
      toast.error("Add at least one shape, icon, or text layer");
      return;
    }
    startExport();
    try {
      const res = await fetch("/api/icons/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layers: layers.map(l => ({ ...l, rasterData: null })),
          canvasSize,
          exportType: mode,
          customSizes: mode === "custom" ? customSizes.split(",").map(Number).filter(n => n > 0) : undefined,
        }),
      });

      // Simulated progress
      const interval = setInterval(() => setProgress(Math.min(useExportStore.getState().progress + 15, 90)), 300);

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok) throw new Error(data.error);
      complete(data.downloadUrl);
      window.open(data.downloadUrl, "_blank");
    } catch (err: any) {
      fail(err.message || "Export failed");
      toast.error(err.message || "Export failed");
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-4 py-2 shadow-sm">
      <select value={mode} onChange={e => setMode(e.target.value as any)}
        className="text-xs border border-neutral-300 rounded px-2 py-1">
        <option value="all">iOS + Android</option>
        <option value="ios">iOS Only</option>
        <option value="android">Android Only</option>
        <option value="custom">Custom Sizes</option>
      </select>

      {mode === "custom" && (
        <input type="text" value={customSizes}
          onChange={e => setCustomSizes(e.target.value)}
          placeholder="1024,512,192"
          className="w-32 text-xs border border-neutral-300 rounded px-2 py-1" />
      )}

      <button onClick={handleExport} disabled={status === "exporting"}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {status === "exporting" ? `Exporting ${progress}%` : "Export"}
      </button>

      {status === "exporting" && (
        <div className="w-24 h-1 bg-neutral-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
