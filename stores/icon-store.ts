import { create } from "zustand";

export interface IconLayer {
  id: string;
  type: "shape" | "text" | "icon" | "image";
  fabricObject: Record<string, unknown>; // serialized Fabric.js object
  name: string;
  visible: boolean;
}

interface IconState {
  layers: IconLayer[];
  selectedLayerId: string | null;
  canvasSize: number; // default 1024
  backgroundColor: string;
  addLayer: (layer: IconLayer) => void;
  updateLayer: (id: string, updates: Partial<IconLayer>) => void;
  removeLayer: (id: string) => void;
  setSelectedLayer: (id: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  loadFromProject: (state: { layers: IconLayer[]; canvasSize: number; backgroundColor: string }) => void;
  reset: () => void;
}

const initialState = {
  layers: [] as IconLayer[],
  selectedLayerId: null,
  canvasSize: 1024,
  backgroundColor: "#FFFFFF",
};

export const useIconStore = create<IconState>((set) => ({
  ...initialState,
  addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer], selectedLayerId: layer.id })),
  updateLayer: (id, updates) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),
  removeLayer: (id) =>
    set((s) => ({ layers: s.layers.filter((l) => l.id !== id), selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId })),
  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  reorderLayers: (from, to) =>
    set((s) => {
      const layers = [...s.layers];
      const [removed] = layers.splice(from, 1);
      layers.splice(to, 0, removed);
      return { layers };
    }),
  loadFromProject: (state) => set({ layers: state.layers, canvasSize: state.canvasSize, backgroundColor: state.backgroundColor }),
  reset: () => set(initialState),
}));
