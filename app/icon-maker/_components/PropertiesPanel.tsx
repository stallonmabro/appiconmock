"use client";

import { useEffect, useState } from "react";
import { useIconStore } from "@/stores/icon-store";
import { Canvas, FabricObject, IText } from "fabric";

export function PropertiesPanel() {
  const { layers, selectedLayerId, updateLayer } = useIconStore();
  const [fill, setFill] = useState("#3B82F6");
  const [stroke, setStroke] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(48);
  const [fontWeight, setFontWeight] = useState("normal");
  const [textAlign, setTextAlign] = useState("left");

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const isText = selectedLayer?.type === "text";

  function getCanvas(): Canvas | null {
    const el = document.querySelector("canvas");
    if (!el) return null;
    return (el as any).fabric || null;
  }

  function getActiveObject(): FabricObject | undefined {
    const canvas = getCanvas();
    if (!canvas) return undefined;
    return canvas.getActiveObject();
  }

  useEffect(() => {
    const obj = getActiveObject();
    if (!obj) return;
    setFill((obj.fill as string) || "#000000");
    setStroke((obj.stroke as string) || "#000000");
    setStrokeWidth((obj.strokeWidth as number) || 0);
    setOpacity(((obj.opacity as number) || 1) * 100);
    if (isText) {
      setFontSize(((obj as IText).fontSize as number) || 48);
      setFontWeight(((obj as IText).fontWeight as string) || "normal");
      setTextAlign(((obj as IText).textAlign as string) || "left");
    }
  }, [selectedLayerId, isText]);

  function update(callback: (obj: FabricObject) => void) {
    const obj = getActiveObject();
    if (!obj) return;
    callback(obj);
    getCanvas()?.renderAll();
    if (selectedLayerId) {
      updateLayer(selectedLayerId, { fabricObject: obj.toJSON() as Record<string, unknown> });
    }
  }

  if (!selectedLayer || selectedLayer.id === "background") {
    return (
      <aside className="w-64 border-l border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-400">Select a layer to edit properties</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-l border-neutral-200 bg-white p-4 overflow-y-auto space-y-5">
      <h3 className="text-sm font-semibold text-neutral-900">Properties</h3>

      {/* Fill */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Fill Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={fill} onChange={e => { setFill(e.target.value); update(obj => obj.set("fill", e.target.value)); }}
            className="w-8 h-8 rounded border border-neutral-300 cursor-pointer" />
          <input type="text" value={fill} onChange={e => { setFill(e.target.value); update(obj => obj.set("fill", e.target.value)); }}
            className="flex-1 text-xs border border-neutral-300 rounded px-2 py-1 font-mono" />
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Opacity: {Math.round(opacity)}%</label>
        <input type="range" min={0} max={100} value={opacity}
          onChange={e => { setOpacity(Number(e.target.value)); update(obj => obj.set("opacity", Number(e.target.value) / 100)); }}
          className="w-full" />
      </div>

      {/* Stroke */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Stroke</label>
        <div className="flex items-center gap-2">
          <input type="color" value={stroke} onChange={e => { setStroke(e.target.value); update(obj => obj.set("stroke", e.target.value)); }}
            className="w-8 h-8 rounded border border-neutral-300 cursor-pointer" />
          <input type="number" min={0} max={50} value={strokeWidth}
            onChange={e => { setStrokeWidth(Number(e.target.value)); update(obj => obj.set("strokeWidth", Number(e.target.value))); }}
            className="w-16 text-xs border border-neutral-300 rounded px-2 py-1" />
          <span className="text-xs text-neutral-400">px</span>
        </div>
      </div>

      {/* Text properties */}
      {isText && (
        <>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Font Size</label>
            <input type="number" min={8} max={500} value={fontSize}
              onChange={e => { setFontSize(Number(e.target.value)); update(obj => (obj as IText).set("fontSize", Number(e.target.value))); }}
              className="w-full text-xs border border-neutral-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Weight</label>
            <select value={fontWeight}
              onChange={e => { setFontWeight(e.target.value); update(obj => (obj as IText).set("fontWeight", e.target.value)); }}
              className="w-full text-xs border border-neutral-300 rounded px-2 py-1">
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="900">Black</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Align</label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} onClick={() => { setTextAlign(a); update(obj => (obj as IText).set("textAlign", a)); }}
                  className={`flex-1 text-xs py-1 rounded border ${textAlign === a ? "bg-blue-100 border-blue-300" : "border-neutral-300 hover:bg-neutral-100"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Delete */}
      <button
        onClick={() => {
          const obj = getActiveObject();
          if (obj) { getCanvas()?.remove(obj); getCanvas()?.renderAll(); }
          if (selectedLayerId) useIconStore.getState().removeLayer(selectedLayerId);
        }}
        className="w-full text-xs py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
        Delete Layer
      </button>
    </aside>
  );
}
