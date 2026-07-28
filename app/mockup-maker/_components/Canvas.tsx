"use client";

import { useEffect, useRef, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";

interface DeviceMeta {
  id: string;
  name: string;
  colors: { id: string; label: string; frameImage: string }[];
  orientations: string[];
  screenMask: { x: number; y: number; width: number; height: number };
  frameSize: { width: number; height: number };
}

interface Metadata {
  devices: DeviceMeta[];
}

export function Canvas() {
  const { screenshot, mode, selectedFrame, selectedScene, slots } =
    useMockupStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  useEffect(() => {
    fetch("/frames/metadata.json")
      .then((r) => r.json())
      .then((d) => setMetadata(d));
  }, []);

  const frameDevice =
    selectedFrame && metadata
      ? metadata.devices.find((d) => d.id === selectedFrame.deviceId)
      : null;

  const frameColor =
    frameDevice && selectedFrame
      ? frameDevice.colors.find((c) => c.id === selectedFrame.colorId)
      : null;

  if (!screenshot) return null;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
    >
      {mode === "device" && frameDevice && frameColor && (
        <div className="relative inline-block" style={{ width: 300 }}>
          <img
            src={`/frames/${frameColor.frameImage}`}
            alt={frameDevice.name}
            className="w-full h-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <img
            src={screenshot}
            alt="Screenshot"
            className="absolute rounded-sm"
            style={{
              left: `${
                (frameDevice.screenMask.x / frameDevice.frameSize.width) * 100
              }%`,
              top: `${
                (frameDevice.screenMask.y / frameDevice.frameSize.height) * 100
              }%`,
              width: `${
                (frameDevice.screenMask.width / frameDevice.frameSize.width) *
                100
              }%`,
              height: `${
                (frameDevice.screenMask.height /
                  frameDevice.frameSize.height) *
                100
              }%`,
              objectFit: "fill",
            }}
          />
        </div>
      )}

      {mode === "multi" && (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(slots.length, 3)}, 1fr)`,
          }}
        >
          {slots
            .filter((s) => s.screenshot)
            .map((slot) => (
              <div
                key={slot.id}
                className="rounded-xl border border-neutral-300 bg-white p-2 shadow-sm"
              >
                <img
                  src={slot.screenshot!}
                  alt="Screen"
                  className="w-40 h-auto rounded-lg"
                />
              </div>
            ))}
        </div>
      )}

      {mode === "scene" && selectedScene && (
        <div className="relative">
          <img
            src={`/scenes/${selectedScene}.png`}
            alt="Scene"
            className="w-full max-w-lg rounded-xl shadow-lg"
          />
          <img
            src={screenshot}
            alt="Screenshot"
            className="absolute rounded-sm shadow-md"
            style={{ left: "15%", top: "20%", width: "70%", height: "auto" }}
          />
        </div>
      )}
    </div>
  );
}
