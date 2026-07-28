import { create } from "zustand";

type AIStatus = "idle" | "generating" | "done" | "error" | "quota-exceeded";

interface AIState {
  prompt: string;
  status: AIStatus;
  images: string[];
  selectedImage: string | null;
  error: string | null;
  setPrompt: (p: string) => void;
  generate: () => void;
  setImages: (urls: string[]) => void;
  selectImage: (url: string | null) => void;
  setError: (msg: string) => void;
  setQuotaExceeded: () => void;
  clear: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  prompt: "",
  status: "idle",
  images: [],
  selectedImage: null,
  error: null,
  setPrompt: (p) => set({ prompt: p }),
  generate: () => set({ status: "generating", images: [], selectedImage: null, error: null }),
  setImages: (urls) => set({ status: "done", images: urls }),
  selectImage: (url) => set({ selectedImage: url }),
  setError: (msg) => set({ status: "error", error: msg }),
  setQuotaExceeded: () => set({ status: "quota-exceeded" }),
  clear: () => set({ prompt: "", status: "idle", images: [], selectedImage: null, error: null }),
}));
