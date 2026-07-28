"use client";

import { useState } from "react";
import { loadSVGFromURL, util, type Canvas as FabricCanvas } from "fabric";
import { useIconStore } from "@/stores/icon-store";

interface Template {
  id: string;
  name: string;
  category: string;
  svgPath: string;
}

const MOCK_TEMPLATES: Template[] = [
  { id: "1", name: "Minimal Circle", category: "minimal", svgPath: "/templates/minimal-circle.svg" },
  { id: "2", name: "Gradient Wave", category: "gradient", svgPath: "/templates/gradient-wave.svg" },
  { id: "3", name: "Flat Square", category: "flat", svgPath: "/templates/flat-square.svg" },
  { id: "4", name: "Material Shield", category: "material", svgPath: "/templates/material-shield.svg" },
];

const CATEGORIES = ["all", "minimal", "gradient", "flat", "material"];

export function TemplatePicker() {
  const [open, setOpen] = useState(true);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState<string | null>(null);
  const { reset } = useIconStore();

  const filtered =
    category === "all"
      ? MOCK_TEMPLATES
      : MOCK_TEMPLATES.filter((t) => t.category === category);

  async function applyTemplate(template: Template) {
    reset();
    const canvas = (document.querySelector("canvas") as any)?.fabric as FabricCanvas | undefined;
    if (!canvas) return;

    setLoading(template.id);
    try {
      const { objects, options } = await loadSVGFromURL(template.svgPath);
      const validObjects = objects?.filter((o): o is NonNullable<typeof o> => o != null);
      if (!validObjects || validObjects.length === 0) {
        console.warn(`Template SVG yielded no objects: ${template.svgPath}`);
        return;
      }
      const group = util.groupSVGElements(validObjects, options);
      group.scaleToWidth(1024);
      group.scaleToHeight(1024);
      group.set({ data: { layerId: `template-${template.id}` } });
      canvas.add(group);
      canvas.renderAll();
      useIconStore.getState().addLayer({
        id: `template-${template.id}`,
        type: "icon",
        name: template.name,
        fabricObject: group.toJSON() as Record<string, unknown>,
        visible: true,
      });
      setOpen(false);
    } catch {
      console.warn(`Failed to load template SVG: ${template.svgPath}`);
    } finally {
      setLoading(null);
    }
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-20 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 z-10"
      >
        Templates
      </button>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Choose Template</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-neutral-400 hover:text-neutral-600 text-xl"
          >
            &times;
          </button>
        </div>
        <div className="flex gap-2 p-4 border-b border-neutral-100 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap
                ${category === c ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 p-4 overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              disabled={loading === t.id}
              className="rounded-xl border border-neutral-200 p-3 hover:border-blue-400 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-wait"
            >
              <div className="aspect-square rounded-lg bg-neutral-100 mb-2 flex items-center justify-center text-4xl">
                {loading === t.id ? (
                  <span className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                ) : (
                  "🎨"
                )}
              </div>
              <p className="text-xs font-medium text-neutral-700 truncate">{t.name}</p>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={() => setOpen(false)}
            className="w-full rounded-lg border border-neutral-300 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Start from Scratch
          </button>
        </div>
      </div>
    </div>
  );
}
