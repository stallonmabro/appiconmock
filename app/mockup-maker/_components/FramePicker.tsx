"use client";

import { useEffect, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";

interface DeviceInfo {
  id: string; name: string;
  colors: { id: string; label: string; frameImage: string }[];
  orientations: string[];
}

export function FramePicker() {
  const { mode, selectedFrame, setMode, setFrame } = useMockupStore();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    fetch("/frames/metadata.json").then(r => r.json()).then(d => setDevices(d.devices));
  }, []);

  const active = mode === "device";

  return (
    <div className="mb-4">
      <button onClick={() => setMode("device")}
        className={`w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 rounded
          ${active ? "bg-blue-50 text-blue-700" : "text-neutral-500"}`}>
        Device Frames
      </button>
      {active && (
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id}>
              <p className="text-xs font-medium text-neutral-700 mb-1">{d.name}</p>
              <div className="flex gap-1 flex-wrap">
                {d.colors.map((c) => (
                  <button key={c.id}
                    onClick={() => setFrame({ deviceId: d.id, colorId: c.id, orientation: "portrait" })}
                    className={`px-2 py-0.5 text-xs rounded border
                      ${selectedFrame?.deviceId === d.id && selectedFrame?.colorId === c.id
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
