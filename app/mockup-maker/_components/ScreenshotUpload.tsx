"use client";

import { useCallback, useEffect, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";
import { toast } from "sonner";

export function ScreenshotUpload() {
  const [dragging, setDragging] = useState(false);
  const setScreenshot = useMockupStore((s) => s.setScreenshot);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG, JPEG, WebP)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshot(reader.result as string);
        toast.success("Screenshot loaded");
      };
      reader.readAsDataURL(file);
    },
    [setScreenshot]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            processFile(item.getAsFile()!);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processFile]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`w-full max-w-lg rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
        dragging ? "border-blue-400 bg-blue-50" : "border-neutral-300 bg-white"
      }`}
    >
      <div className="text-5xl mb-4">&#x1F4F1;</div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-1">
        Upload App Screenshot
      </h3>
      <p className="text-sm text-neutral-500 mb-4">
        Drag &amp; drop, paste from clipboard, or click to browse
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
        }}
        className="hidden"
        id="screenshot-upload"
      />
      <label
        htmlFor="screenshot-upload"
        className="inline-block rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800 cursor-pointer"
      >
        Browse Files
      </label>
    </div>
  );
}
