'use client';

import { Save, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAIStore, useSceneStore } from '@/lib/store';
import { saveProject } from '@/lib/storage';
import { generateId } from '@/lib/storage';
import { useCallback, useState } from 'react';

export function StudioHeader() {
  const ollamaStatus = useAIStore((s) => s.ollamaStatus);
  const code = useSceneStore((s) => s.code);
  const metadata = useSceneStore((s) => s.metadata);
  const isDirty = useSceneStore((s) => s.isDirty);
  const markClean = useSceneStore((s) => s.markClean);
  const setMetadata = useSceneStore((s) => s.setMetadata);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!code) return;
    setSaving(true);
    const id = metadata.id || generateId();
    if (!metadata.id) setMetadata({ id });
    await saveProject({
      id,
      name: metadata.name,
      code,
      metadata: { ...metadata, id, updatedAt: new Date().toISOString() },
    });
    markClean();
    setSaving(false);
  }, [code, metadata, markClean, setMetadata]);

  const handleDownload = useCallback(() => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.name.replace(/\s+/g, '-').toLowerCase()}.holo`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, metadata.name]);

  return (
    <header className="flex h-12 items-center justify-between border-b border-studio-border bg-studio-panel px-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-studio-muted transition hover:text-studio-text">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">
          HoloScript <span className="text-studio-accent">Studio</span>
        </span>
        <span className="text-xs text-studio-muted">|</span>
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => setMetadata({ name: e.target.value })}
          className="bg-transparent text-sm text-studio-text outline-none"
          placeholder="Untitled Scene"
        />
        {isDirty && (
          <span className="h-2 w-2 rounded-full bg-studio-warning" title="Unsaved changes" />
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Ollama status */}
        <div className="flex items-center gap-1.5 text-xs text-studio-muted">
          <span
            className={`h-2 w-2 rounded-full ${
              ollamaStatus === 'connected'
                ? 'bg-studio-success'
                : ollamaStatus === 'checking'
                  ? 'bg-studio-warning animate-pulse'
                  : 'bg-studio-error'
            }`}
          />
          {ollamaStatus === 'connected'
            ? 'AI Ready'
            : ollamaStatus === 'checking'
              ? 'Checking...'
              : 'AI Offline'}
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={!code || saving}
          className="flex items-center gap-1.5 rounded-md bg-studio-surface px-3 py-1.5 text-xs text-studio-text transition hover:bg-studio-border disabled:opacity-30"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDownload}
          disabled={!code}
          className="flex items-center gap-1.5 rounded-md bg-studio-surface px-3 py-1.5 text-xs text-studio-text transition hover:bg-studio-border disabled:opacity-30"
        >
          <Download className="h-3.5 w-3.5" />
          .holo
        </button>
      </div>
    </header>
  );
}
