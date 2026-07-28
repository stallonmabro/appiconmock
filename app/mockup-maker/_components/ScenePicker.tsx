"use client";

import { useMockupStore } from "@/stores/mockup-store";

const SCENES = [
  { id: "desk-1", name: "Desk Setup", category: "desk", preview: "/scenes/desk-1.png" },
  { id: "hand-1", name: "Hand Holding", category: "handheld", preview: "/scenes/hand-1.png" },
  { id: "outdoor-1", name: "Cafe Table", category: "outdoor", preview: "/scenes/outdoor-1.png" },
  { id: "abstract-1", name: "Gradient BG", category: "abstract", preview: "/scenes/abstract-1.png" },
];

export function ScenePicker() {
  const { mode, selectedScene, setMode, setScene } = useMockupStore();
  const active = mode === "scene";

  return (
    <div className="mb-4">
      <button onClick={() => setMode("scene")}
        className={`w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 rounded
          ${active ? "bg-blue-50 text-blue-700" : "text-neutral-500"}`}>
        Scenes
      </button>
      {active && (
        <div className="grid grid-cols-2 gap-2">
          {SCENES.map((s) => (
            <button key={s.id} onClick={() => setScene(s.id)}
              className={`rounded-lg border p-1 text-left
                ${selectedScene === s.id ? "border-blue-400 ring-2 ring-blue-100" : "border-neutral-200 hover:border-neutral-300"}`}>
              <div className="aspect-[4/3] rounded bg-neutral-100 mb-1 flex items-center justify-center text-2xl">
                🖼️
              </div>
              <p className="text-[10px] text-neutral-600 truncate">{s.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
