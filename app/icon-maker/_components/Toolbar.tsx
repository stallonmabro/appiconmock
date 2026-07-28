"use client";

import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useIconStore, type IconLayer } from "@/stores/icon-store";
import { Rect, Circle, Triangle, Polygon, IText, Canvas as FabricCanvas } from "fabric";

interface ToolDef {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

export function Toolbar() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { layers, selectedLayerId, addLayer, setSelectedLayer, removeLayer, reorderLayers } = useIconStore();

  function getCanvas(): FabricCanvas | null {
    const el = document.querySelector("canvas");
    if (!el) return null;
    return (el as any).fabric || null;
  }

  function addShape(shapeType: string) {
    const canvas = getCanvas();
    if (!canvas) return;
    const id = uuid();
    let obj: InstanceType<typeof Rect | typeof Circle | typeof Triangle | typeof Polygon | typeof IText>;
    const size = 200;

    switch (shapeType) {
      case "rect":
        obj = new Rect({ left: 100, top: 100, width: size, height: size, fill: "#3B82F6", rx: 20, ry: 20 });
        break;
      case "circle":
        obj = new Circle({ left: 100, top: 100, radius: size / 2, fill: "#EF4444" });
        break;
      case "star": {
        const points = [];
        const outerR = size / 2;
        const innerR = outerR * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          points.push({ x: 100 + Math.cos(angle) * r, y: 100 + Math.sin(angle) * r });
        }
        obj = new Polygon(points, { left: 100, top: 100, fill: "#F59E0B" });
        break;
      }
      case "triangle":
        obj = new Triangle({ left: 100, top: 100, width: size, height: size, fill: "#10B981" });
        break;
      default:
        obj = new Rect({ left: 100, top: 100, width: size, height: size, fill: "#3B82F6" });
    }

    obj.set({ data: { layerId: id } });
    canvas.add(obj);
    canvas.renderAll();

    addLayer({ id, type: "shape", name: `${shapeType}-${layers.length}`, fabricObject: obj.toJSON() as Record<string, unknown>, visible: true });
  }

  function addText() {
    const canvas = getCanvas();
    if (!canvas) return;
    const id = uuid();
    const text = new IText("App Name", {
      left: 200, top: 400,
      fontFamily: "Geist, sans-serif",
      fontSize: 120,
      fontWeight: "bold",
      fill: "#171717",
      data: { layerId: id },
    });
    canvas.add(text);
    canvas.renderAll();
    addLayer({ id, type: "text", name: `text-${layers.length}`, fabricObject: text.toJSON() as Record<string, unknown>, visible: true });
  }

  const tools: ToolDef[] = [
    { id: "rect", label: "Rectangle", icon: "▭", action: () => addShape("rect") },
    { id: "circle", label: "Circle", icon: "○", action: () => addShape("circle") },
    { id: "star", label: "Star", icon: "☆", action: () => addShape("star") },
    { id: "triangle", label: "Triangle", icon: "△", action: () => addShape("triangle") },
    { id: "text", label: "Text", icon: "T", action: addText },
  ];

  return (
    <aside className="w-16 border-r border-neutral-200 bg-white flex flex-col items-center py-4 gap-1 overflow-y-auto">
      {tools.map((tool) => (
        <button key={tool.id} title={tool.label}
          onClick={() => { tool.action(); setActiveTool(tool.id); }}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors
            ${activeTool === tool.id ? "bg-blue-100 text-blue-700" : "text-neutral-600 hover:bg-neutral-100"}`}>
          {tool.icon}
        </button>
      ))}
      <hr className="w-8 my-2 border-neutral-200" />
      {/* Layer list */}
      <div className="flex-1 w-full px-1 overflow-y-auto">
        {[...layers].reverse().filter(l => l.id !== "background").map((layer, i) => (
          <button key={layer.id}
            onClick={() => setSelectedLayer(layer.id)}
            className={`w-full text-left text-xs px-1.5 py-1 rounded truncate mb-0.5
              ${selectedLayerId === layer.id ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"}`}>
            {layer.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
