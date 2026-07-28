"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Toolbar } from "./_components/Toolbar";
import { PropertiesPanel } from "./_components/PropertiesPanel";
import { ExportPanel } from "./_components/ExportPanel";
import { AIGenerator } from "./_components/AIGenerator";
import { TemplatePicker } from "./_components/TemplatePicker";
import { AdBanner } from "@/components/ads/AdBanner";

const Canvas = dynamic(() => import("./_components/Canvas").then((m) => ({ default: m.Canvas })), {
  ssr: false,
  loading: () => <Skeleton className="w-[512px] h-[512px] rounded-lg" />,
});

export default function IconMakerPage() {
  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden">
        <Toolbar />
        <div className="flex-1 flex items-center justify-center bg-neutral-100 p-8 overflow-auto">
          <div className="flex flex-col items-center gap-4">
            <AdBanner placement="editor_top" className="mb-2 w-full max-w-[512px]" />
            <ExportPanel />
            <Canvas />
          </div>
        </div>
        <PropertiesPanel />
        <AIGenerator />
        <TemplatePicker />
      </div>
    </ErrorBoundary>
  );
}
