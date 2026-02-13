'use client';

import Link from 'next/link';
import { Sparkles, Layout, FolderOpen } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 p-8">
      <div className="text-center">
        <h1 className="mb-3 text-5xl font-bold tracking-tight">
          HoloScript <span className="text-studio-accent">Studio</span>
        </h1>
        <p className="text-lg text-studio-muted">Create 3D scenes with AI — no coding required</p>
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/create"
          className="group flex flex-col items-center gap-3 rounded-xl border border-studio-border bg-studio-panel p-6 transition hover:border-studio-accent hover:shadow-lg hover:shadow-studio-accent/10"
        >
          <Sparkles className="h-8 w-8 text-studio-accent transition group-hover:scale-110" />
          <span className="font-semibold">Create New</span>
          <span className="text-center text-sm text-studio-muted">
            Describe a scene and watch it appear
          </span>
        </Link>

        <Link
          href="/templates"
          className="group flex flex-col items-center gap-3 rounded-xl border border-studio-border bg-studio-panel p-6 transition hover:border-studio-accent hover:shadow-lg hover:shadow-studio-accent/10"
        >
          <Layout className="h-8 w-8 text-studio-accent transition group-hover:scale-110" />
          <span className="font-semibold">Templates</span>
          <span className="text-center text-sm text-studio-muted">
            Start from a pre-built scene
          </span>
        </Link>

        <Link
          href="/projects"
          className="group flex flex-col items-center gap-3 rounded-xl border border-studio-border bg-studio-panel p-6 transition hover:border-studio-accent hover:shadow-lg hover:shadow-studio-accent/10"
        >
          <FolderOpen className="h-8 w-8 text-studio-accent transition group-hover:scale-110" />
          <span className="font-semibold">My Projects</span>
          <span className="text-center text-sm text-studio-muted">Open a saved project</span>
        </Link>
      </div>

      <p className="text-xs text-studio-muted">
        Powered by Ollama &middot; Runs locally &middot; Free forever
      </p>
    </div>
  );
}
