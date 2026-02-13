'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { StudioHeader } from '@/components/StudioHeader';
import { PromptBar } from '@/components/ai/PromptBar';
import { useSceneStore, useAIStore } from '@/lib/store';
import { useScenePipeline } from '@/hooks/useScenePipeline';
import { useOllamaStatus } from '@/hooks/useOllamaStatus';
import { AlertTriangle, Code } from 'lucide-react';

// Dynamic import for SceneRenderer — SSR disabled for Three.js
const SceneRenderer = dynamic(
  () => import('@/components/scene/SceneRenderer').then((m) => ({ default: m.SceneRenderer })),
  { ssr: false, loading: () => <ViewportSkeleton /> }
);

function ViewportSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a12]">
      <div className="text-sm text-studio-muted animate-pulse">Loading 3D viewport...</div>
    </div>
  );
}

export default function CreatePage() {
  const code = useSceneStore((s) => s.code);
  const setR3FTree = useSceneStore((s) => s.setR3FTree);
  const setErrors = useSceneStore((s) => s.setErrors);
  const errors = useSceneStore((s) => s.errors);
  const promptHistory = useAIStore((s) => s.promptHistory);

  // Poll Ollama status
  useOllamaStatus();

  // Parse + compile pipeline
  const { r3fTree, errors: pipelineErrors } = useScenePipeline(code);

  // Sync pipeline results to store
  useEffect(() => {
    setR3FTree(r3fTree);
    setErrors(pipelineErrors);
  }, [r3fTree, pipelineErrors, setR3FTree, setErrors]);

  const [showCode, setShowCode] = useState(false);

  return (
    <>
      <StudioHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: AI prompt + history */}
        <div className="flex w-[380px] min-w-[300px] flex-col border-r border-studio-border bg-studio-panel">
          <div className="flex-1 overflow-y-auto p-4">
            {/* Prompt history */}
            {promptHistory.length > 0 && (
              <div className="mb-4 flex flex-col gap-3">
                {promptHistory.map((entry) => (
                  <div key={entry.id} className="animate-fade-in">
                    <div className="mb-1 text-xs font-medium text-studio-accent">You:</div>
                    <div className="rounded-lg bg-studio-surface px-3 py-2 text-sm text-studio-text">
                      {entry.prompt}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Welcome message */}
            {promptHistory.length === 0 && !code && (
              <div className="mb-6 text-center">
                <h2 className="mb-2 text-lg font-semibold">Create a 3D Scene</h2>
                <p className="text-sm text-studio-muted">
                  Describe what you want to see and AI will generate it for you.
                </p>
              </div>
            )}
          </div>

          {/* Prompt bar at bottom */}
          <div className="border-t border-studio-border p-4">
            <PromptBar />
          </div>
        </div>

        {/* Right panel: 3D viewport */}
        <div className="relative flex-1">
          <SceneRenderer r3fTree={r3fTree} />

          {/* Parse errors overlay */}
          {errors.length > 0 && (
            <div className="absolute left-3 top-3 max-w-sm rounded-lg border border-studio-error/30 bg-studio-panel/90 p-3 backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-studio-error">
                <AlertTriangle className="h-4 w-4" />
                Parse Error
              </div>
              {errors.slice(0, 3).map((e, i) => (
                <div key={i} className="text-xs text-studio-muted">
                  {e.line ? `Line ${e.line}: ` : ''}
                  {e.message}
                </div>
              ))}
            </div>
          )}

          {/* Code preview toggle */}
          {code && (
            <button
              onClick={() => setShowCode((v) => !v)}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-studio-panel/80 px-3 py-1.5 text-xs text-studio-muted backdrop-blur transition hover:text-studio-text"
            >
              <Code className="h-3.5 w-3.5" />
              {showCode ? 'Hide Code' : 'View Code'}
            </button>
          )}

          {/* Code preview panel */}
          {showCode && code && (
            <div className="absolute bottom-0 right-0 top-0 w-[400px] overflow-auto border-l border-studio-border bg-studio-panel/95 p-4 backdrop-blur animate-fade-in">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-studio-muted">HoloScript</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-xs text-studio-accent hover:underline"
                >
                  Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-studio-text">
                {code}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
