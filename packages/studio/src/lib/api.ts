import type { GenerateRequest, GenerateResponse } from '@/types';

export async function generateScene(req: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    return { success: false, code: '', error: `Generation failed: ${res.statusText}` };
  }

  return res.json();
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ollama === true;
  } catch {
    return false;
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return [];
    const data = await res.json();
    return data.models ?? [];
  } catch {
    return [];
  }
}
