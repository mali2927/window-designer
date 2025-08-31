import { create } from "zustand"

export interface Element {
  id: string
  type: "line" | "panel"
  start: { x: number; y: number }
  end: { x: number; y: number }
  material: string
  filling?: "glass" | null
}

interface WindowDesignerState {
  elements: Element[]
  history: Element[][]
  historyIndex: number
  selectedElement: Element | null
  currentTool: "select" | "line" | "panel"
  currentMaterial: "wood" | "aluminum"
  addElement: (element: Element) => void
  updateElement: (id: string, updates: Partial<Element>) => void
  setSelectedElement: (element: Element | null) => void
  setCurrentTool: (tool: "select" | "line" | "panel") => void
  setCurrentMaterial: (material: "wood" | "aluminum") => void
  undo: () => void
  redo: () => void
  toggleGlassFilling: () => void
}

export const useWindowDesignerStore = create<WindowDesignerState>((set) => ({
  elements: [],
  history: [[]],
  historyIndex: 0,
  selectedElement: null,
  currentTool: "select",
  currentMaterial: "wood",

  addElement: (element) =>
    set((state) => {
      const newElements = [...state.elements, element]
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newElements)
      return {
        elements: newElements,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    }),

  updateElement: (id, updates) =>
    set((state) => {
      const newElements = state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el))
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newElements)
      return {
        elements: newElements,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    }),

  setSelectedElement: (element) => set({ selectedElement: element }),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  setCurrentMaterial: (material) => set({ currentMaterial: material }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        return {
          elements: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
          selectedElement: null,
        }
      }
      return state
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        return {
          elements: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
          selectedElement: null,
        }
      }
      return state
    }),

  toggleGlassFilling: () =>
    set((state) => {
      if (state.selectedElement && state.selectedElement.type === "panel") {
        const updatedElement = {
          ...state.selectedElement,
          filling: state.selectedElement.filling === "glass" ? null : "glass",
        }
        const newElements = state.elements.map((el) => (el.id === updatedElement.id ? updatedElement : el))
        const newHistory = state.history.slice(0, state.historyIndex + 1)
        newHistory.push(newElements)
        return {
          elements: newElements,
          selectedElement: updatedElement,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        }
      }
      return state
    }),
}))

