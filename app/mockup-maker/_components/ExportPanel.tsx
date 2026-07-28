"use client";

import { useMockupStore } from "@/stores/mockup-store";
import { useExportStore } from "@/stores/export-store";
import { toast } from "sonner";

export function ExportPanel() {
  const { screenshot, mode, selectedFrame } = useMockupStore();
  const { status, startExport, complete, fail } = useExportStore();

  async function handleExport() {
    if (!screenshot) return;
    startExport();
    try {
      const res = await fetch("/api/mockups/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshot,
          frameId: selectedFrame?.deviceId,
          colorId: selectedFrame?.colorId,
          scale: 2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      complete(data.downloadUrl);
      window.open(data.downloadUrl, "_blank");
    } catch (err: any) {
      fail(err.message);
      toast.error(err.message);
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-4 py-2 shadow-sm">
      <span className="text-xs text-neutral-500">
        {mode === "device"
          ? "Device Mockup"
          : mode === "scene"
            ? "Scene Mockup"
            : "Multi-Screen Mockup"}
      </span>
      <button
        onClick={handleExport}
        disabled={status === "exporting" || !selectedFrame}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "exporting" ? "Rendering..." : "Export PNG"}
      </button>
    </div>
  );
}
