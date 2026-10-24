import { create } from "zustand";
import { AppState } from "../types";

export interface SelectedElementSnapshot {
  tagName: string;
  html: string;
  context?: string;
}

// Store for app-wide state
interface AppStore {
  isProjectLibraryOpen: boolean;
  setProjectLibraryOpen: (open: boolean) => void;
  appState: AppState;
  setAppState: (state: AppState) => void;

  // UI state
  updateInstruction: string;
  setUpdateInstruction: (instruction: string) => void;

  // Update images support (multiple images)
  updateImages: string[];
  setUpdateImages: (images: string[]) => void;

  inSelectAndEditMode: boolean;
  toggleInSelectAndEditMode: () => void;
  disableInSelectAndEditMode: () => void;

  selectedElement: SelectedElementSnapshot | null;
  setSelectedElement: (element: SelectedElementSnapshot | null) => void;
  clearSelectedElement: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isProjectLibraryOpen: false,
  setProjectLibraryOpen: (open) => set({ isProjectLibraryOpen: open }),
  appState: AppState.INITIAL,
  setAppState: (state: AppState) => set({ appState: state }),

  // UI state
  updateInstruction: "",
  setUpdateInstruction: (instruction: string) =>
    set({ updateInstruction: instruction }),

  // Update images support
  updateImages: [],
  setUpdateImages: (images: string[]) => set({ updateImages: images }),

  inSelectAndEditMode: false,
  toggleInSelectAndEditMode: () =>
    set((state) =>
      state.inSelectAndEditMode
        ? { inSelectAndEditMode: false, selectedElement: null }
        : { inSelectAndEditMode: true }
    ),
  // Exiting selection mode and releasing its locked target are one action.
  // Keeping this atomic prevents a stale iframe element from surviving a
  // version change until PreviewComponent's effects get a chance to run.
  disableInSelectAndEditMode: () =>
    set({ inSelectAndEditMode: false, selectedElement: null }),

  selectedElement: null,
  setSelectedElement: (element: SelectedElementSnapshot | null) =>
    set({ selectedElement: element }),
  clearSelectedElement: () => set({ selectedElement: null }),
}));
