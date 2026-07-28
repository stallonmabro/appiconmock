import { create } from "zustand";

type MockupMode = "device" | "scene" | "multi";

interface MockupSlot {
  id: string;
  screenshot: string | null; // data URL
}

interface MockupState {
  screenshot: string | null;
  mode: MockupMode;
  selectedFrame: { deviceId: string; colorId: string; orientation: string } | null;
  selectedScene: string | null;
  selectedLayout: string | null;
  slots: MockupSlot[];
  setScreenshot: (dataUrl: string | null) => void;
  setMode: (mode: MockupMode) => void;
  setFrame: (frame: { deviceId: string; colorId: string; orientation: string }) => void;
  setScene: (sceneId: string) => void;
  setLayout: (layoutId: string) => void;
  initSlots: (count: number) => void;
  assignSlot: (slotId: string, screenshot: string) => void;
  reset: () => void;
}

const initialState = {
  screenshot: null as string | null,
  mode: "device" as MockupMode,
  selectedFrame: null,
  selectedScene: null,
  selectedLayout: null,
  slots: [],
};

export const useMockupStore = create<MockupState>((set) => ({
  ...initialState,
  setScreenshot: (dataUrl) => set({ screenshot: dataUrl }),
  setMode: (mode) => set({ mode }),
  setFrame: (frame) => set({ selectedFrame: frame }),
  setScene: (sceneId) => set({ selectedScene: sceneId }),
  setLayout: (layoutId) => set({ selectedLayout: layoutId }),
  initSlots: (count) => set({ slots: Array.from({ length: count }, (_, i) => ({ id: `slot-${i}`, screenshot: null })) }),
  assignSlot: (slotId, screenshot) =>
    set((s) => ({ slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, screenshot } : sl)) })),
  reset: () => set(initialState),
}));
