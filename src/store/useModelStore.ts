import { create } from "zustand";
import { modelRepository } from "../repositories/modelRepository";
import { LocalModel } from "../types";

type ModelState = {
  models: LocalModel[];
  loadModels: () => Promise<void>;
};

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  loadModels: async () => {
    set({ models: await modelRepository.getAll() });
  }
}));
