"use client";

import { ScreenshotUpload } from "./_components/ScreenshotUpload";
import { Canvas } from "./_components/Canvas";
import { FramePicker } from "./_components/FramePicker";
import { ScenePicker } from "./_components/ScenePicker";
import { LayoutPicker } from "./_components/LayoutPicker";
import { ExportPanel } from "./_components/ExportPanel";
import { useMockupStore } from "@/stores/mockup-store";
import { AdBanner } from "@/components/ads/AdBanner";

export default function MockupMakerPage() {
  const screenshot = useMockupStore((s) => s.screenshot);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-72 border-r border-neutral-200 bg-white overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Mockup Settings</h2>
          <FramePicker />
          <ScenePicker />
          <LayoutPicker />
        </div>
      </aside>
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-100 p-8 gap-4 overflow-auto">
        {!screenshot ? (
          <ScreenshotUpload />
        ) : (
          <>
            <AdBanner placement="editor_top" className="mb-2" />
            <ExportPanel />
            <Canvas />
          </>
        )}
      </div>
    </div>
  );
}
