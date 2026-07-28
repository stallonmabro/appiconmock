"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas as FabricCanvas, Rect } from "fabric";
import { useIconStore, type IconLayer } from "@/stores/icon-store";
import { v4 as uuid } from "uuid";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const { layers, canvasSize, backgroundColor, selectedLayerId, addLayer, setSelectedLayer } = useIconStore();

  const initCanvas = useCallback(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const fc = new FabricCanvas(canvasRef.current, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    fc.on("selection:created", (e) => {
      const obj = e.selected?.[0] as any;
      if (obj?.data?.layerId) setSelectedLayer(obj.data.layerId);
    });

    fc.on("selection:updated", (e) => {
      const obj = e.selected?.[0] as any;
      if (obj?.data?.layerId) setSelectedLayer(obj.data.layerId);
    });

    fc.on("selection:cleared", () => setSelectedLayer(null));

    fc.on("object:modified", (e) => {
      const obj = e.target as any;
      if (obj?.data?.layerId) {
        const layer = layers.find((l) => l.id === obj.data.layerId);
        if (layer) {
          useIconStore.getState().updateLayer(layer.id, {
            fabricObject: obj.toJSON() as Record<string, unknown>,
          });
        }
      }
    });

    fabricRef.current = fc;
  }, [canvasSize, backgroundColor, addLayer, setSelectedLayer, layers]);

  useEffect(() => {
    initCanvas();
    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, [initCanvas]);

  // Add default background layer if empty
  useEffect(() => {
    if (layers.length === 0 && fabricRef.current) {
      const bg = new Rect({
        left: 0,
        top: 0,
        width: canvasSize,
        height: canvasSize,
        fill: backgroundColor,
        selectable: false,
        evented: false,
        data: { layerId: "background", isBackground: true },
      });
      fabricRef.current.add(bg);
      (fabricRef.current as any).sendToBack(bg);
      addLayer({
        id: "background",
        type: "shape",
        name: "Background",
        fabricObject: bg.toJSON() as Record<string, unknown>,
        visible: true,
      });
    }
  }, [layers.length, canvasSize, backgroundColor, addLayer]);

  const scale = Math.min(512 / canvasSize, 1);

  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden"
      style={{ width: Math.min(canvasSize / 2, 512), height: Math.min(canvasSize / 2, 512) }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
    </div>
  );
}
