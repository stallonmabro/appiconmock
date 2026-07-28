"use client";

import { useState } from "react";
import { FabricImage, type Canvas as FabricCanvas } from "fabric";
import { v4 as uuid } from "uuid";
import { useAIStore } from "@/stores/ai-store";
import { useIconStore } from "@/stores/icon-store";
import { toast } from "sonner";

export function AIGenerator() {
  const [open, setOpen] = useState(false);
  const { prompt, status, images, selectedImage, setPrompt, generate, setImages, selectImage, setError, setQuotaExceeded, clear } = useAIStore();
  const { addLayer } = useIconStore();

  async function handleGenerate() {
    if (!prompt.trim() || status === "generating") return;
    generate();
    try {
      const res = await fetch("/api/icons/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.quotaExceeded) { setQuotaExceeded(); toast.error("Daily AI limit reached"); }
        else { setError(data.error); toast.error(data.error); }
        return;
      }
      setImages(data.images);
      if (data.cached) toast.info("Using cached result");
    } catch {
      setError("Network error");
      toast.error("Network error. Try again.");
    }
  }

  async function addToCanvas(imageUrl: string) {
    selectImage(imageUrl);
    const canvas = (document.querySelector("canvas") as any)?.fabric as FabricCanvas;
    if (!canvas) return;

    const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
    const layerId = `ai-${uuid()}`;
    img.set({
      left: 100,
      top: 100,
      scaleX: 824 / (img.width || 1024),
      scaleY: 824 / (img.height || 1024),
      data: { layerId },
    });
    canvas.add(img);
    canvas.renderAll();

    addLayer({
      id: layerId,
      type: "image",
      name: `AI Generated ${Date.now()}`,
      fabricObject: img.toJSON() as Record<string, unknown>,
      visible: true,
    });
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow z-10"
      >
        AI Generate
      </button>

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 border-l border-neutral-200 bg-white shadow-2xl flex flex-col">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">AI Icon Generator</h2>
            <button onClick={() => { setOpen(false); clear(); }} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Describe your icon</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., a blue shield with a white lightning bolt in the center, gradient background"
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={status === "generating" || !prompt.trim()}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === "generating" ? "Generating..." : "Generate"}
            </button>

            {status === "generating" && (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-neutral-100 animate-pulse" />
                ))}
              </div>
            )}

            {status === "done" && (
              <div className="grid grid-cols-2 gap-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => addToCanvas(url)}
                    className={`aspect-square rounded-lg border-2 overflow-hidden hover:border-purple-400 transition-colors ${
                      selectedImage === url ? "border-purple-500 ring-2 ring-purple-200" : "border-neutral-200"
                    }`}
                  >
                    <img src={url} alt={`Generated icon ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {status === "quota-exceeded" && (
              <div className="text-center py-8">
                <p className="text-neutral-600 text-sm mb-2">Daily limit reached</p>
                <p className="text-xs text-neutral-400">Sign up for more AI generations</p>
              </div>
            )}

            {status === "error" && (
              <div className="text-center py-8">
                <p className="text-red-600 text-sm">Generation failed</p>
                <button onClick={handleGenerate} className="text-xs text-blue-600 mt-1">Try again</button>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-neutral-100 text-center">
            <p className="text-[10px] text-neutral-400">
              Generations: {status === "quota-exceeded" ? "Limit reached" : "Available"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
