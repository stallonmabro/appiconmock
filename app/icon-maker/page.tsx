"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Toolbar } from "./_components/Toolbar";
import { PropertiesPanel } from "./_components/PropertiesPanel";
import { ExportPanel } from "./_components/ExportPanel";
import { AIGenerator } from "./_components/AIGenerator";

const Canvas = dynamic(() => import("./_components/Canvas").then((m) => ({ default: m.Canvas })), {
  ssr: false,
  loading: () => <Skeleton className="w-[512px] h-[512px] rounded-lg" />,
});

export default function IconMakerPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex items-center justify-center bg-neutral-100 p-8 overflow-auto">
        <div className="flex flex-col items-center gap-4">
          <ExportPanel />
          <Canvas />
        </div>
      </div>
      <PropertiesPanel />
      <AIGenerator />
    </div>
  );
}
