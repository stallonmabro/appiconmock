"use client";

import { useMockupStore } from "@/stores/mockup-store";

const LAYOUTS = [
  { id: "1+1", label: "2 Screens", count: 2, cols: 2 },
  { id: "2+1", label: "3 Screens", count: 3, cols: 3 },
  { id: "3-grid", label: "3 Grid", count: 3, cols: 3 },
  { id: "4-grid", label: "4 Grid", count: 4, cols: 4 },
];

export function LayoutPicker() {
  const { mode, selectedLayout, slots, screenshot, setMode, setLayout, initSlots, assignSlot } = useMockupStore();
  const active = mode === "multi";

  function handleSelect(layout: typeof LAYOUTS[0]) {
    setLayout(layout.id);
    initSlots(layout.count);
    if (screenshot) assignSlot("slot-0", screenshot);
  }

  return (
    <div>
      <button onClick={() => setMode("multi")}
        className={`w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 rounded
          ${active ? "bg-blue-50 text-blue-700" : "text-neutral-500"}`}>
        Multi-Screen
      </button>
      {active && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {LAYOUTS.map((l) => (
              <button key={l.id}
                onClick={() => handleSelect(l)}
                className={`px-3 py-1 text-xs rounded border
                  ${selectedLayout === l.id ? "border-blue-400 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                {l.label}
              </button>
            ))}
          </div>
          {slots.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {slots.map((s) => (
                <div key={s.id}
                  className="aspect-[9/19.5] rounded border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center cursor-pointer hover:border-blue-400"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => assignSlot(s.id, reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}>
                  {s.screenshot ? (
                    <img src={s.screenshot} alt="Screen" className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-xs text-neutral-400">Drop here</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
