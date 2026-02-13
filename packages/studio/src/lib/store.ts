'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { R3FNode } from '@holoscript/core';
import type { AIStatus, OllamaStatus, PromptEntry, SceneMetadata } from '@/types';

// ─── Scene Store ────────────────────────────────────────────────────────────

interface SceneState {
  code: string;
  r3fTree: R3FNode | null;
  errors: Array<{ message: string; line?: number }>;
  metadata: SceneMetadata;
  isDirty: boolean;
  setCode: (code: string) => void;
  setR3FTree: (tree: R3FNode | null) => void;
  setErrors: (errors: Array<{ message: string; line?: number }>) => void;
  setMetadata: (partial: Partial<SceneMetadata>) => void;
  markClean: () => void;
  reset: () => void;
}

const defaultMetadata: SceneMetadata = {
  id: '',
  name: 'Untitled Scene',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useSceneStore = create<SceneState>()(
  devtools(
    (set) => ({
      code: '',
      r3fTree: null,
      errors: [],
      metadata: { ...defaultMetadata },
      isDirty: false,
      setCode: (code) =>
        set({
          code,
          isDirty: true,
          metadata: { ...defaultMetadata, updatedAt: new Date().toISOString() },
        }),
      setR3FTree: (r3fTree) => set({ r3fTree }),
      setErrors: (errors) => set({ errors }),
      setMetadata: (partial) => set((s) => ({ metadata: { ...s.metadata, ...partial } })),
      markClean: () => set({ isDirty: false }),
      reset: () =>
        set({
          code: '',
          r3fTree: null,
          errors: [],
          metadata: { ...defaultMetadata },
          isDirty: false,
        }),
    }),
    { name: 'scene-store' }
  )
);

// ─── AI Store ───────────────────────────────────────────────────────────────

interface AIState {
  status: AIStatus;
  ollamaStatus: OllamaStatus;
  model: string;
  promptHistory: PromptEntry[];
  setStatus: (status: AIStatus) => void;
  setOllamaStatus: (status: OllamaStatus) => void;
  setModel: (model: string) => void;
  addPrompt: (entry: PromptEntry) => void;
  clearHistory: () => void;
}

export const useAIStore = create<AIState>()(
  devtools(
    (set) => ({
      status: 'idle',
      ollamaStatus: 'checking',
      model: 'brittney-qwen-v23:latest',
      promptHistory: [],
      setStatus: (status) => set({ status }),
      setOllamaStatus: (ollamaStatus) => set({ ollamaStatus }),
      setModel: (model) => set({ model }),
      addPrompt: (entry) => set((s) => ({ promptHistory: [...s.promptHistory, entry] })),
      clearHistory: () => set({ promptHistory: [] }),
    }),
    { name: 'ai-store' }
  )
);

// ─── Editor Store ───────────────────────────────────────────────────────────

type EditorPanel = 'prompt' | 'code' | 'tree';

interface EditorState {
  activePanel: EditorPanel;
  sidebarOpen: boolean;
  selectedObjectId: string | null;
  setActivePanel: (panel: EditorPanel) => void;
  toggleSidebar: () => void;
  setSelectedObjectId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>()(
  devtools(
    (set) => ({
      activePanel: 'prompt',
      sidebarOpen: true,
      selectedObjectId: null,
      setActivePanel: (activePanel) => set({ activePanel }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSelectedObjectId: (selectedObjectId) => set({ selectedObjectId }),
    }),
    { name: 'editor-store' }
  )
);
