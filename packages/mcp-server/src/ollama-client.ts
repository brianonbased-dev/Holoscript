/**
 * Ollama Client for HoloScript MCP Server
 *
 * Minimal fetch-based client for querying local Ollama models.
 * Used by brittney-lite.ts to add model-backed AI responses
 * with graceful fallback to rule-based logic when unavailable.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'brittney-qwen-v23:latest';
const OLLAMA_TIMEOUT = 60_000; // 60s for generation

/** HoloScript-specific system prompt for model calls */
export const HOLOSCRIPT_SYSTEM_PROMPT = `You are Brittney, an expert HoloScript assistant. Follow these rules strictly:

1. Output ONLY raw HoloScript code when asked to generate code — no markdown fences, no backticks, no explanations unless explicitly asked.
2. Use geometry: (never type:) for shapes. Valid geometries: sphere, cube, cylinder, cone, plane, torus, ring, capsule, model, custom, text.
3. Always quote object names: object "Name" { ... }
4. Use negative z values for object visibility: position: [0, 1, -3]
5. Wrap scenes in composition "Name" { ... }
6. Only use canonical @traits. Common traits: @grabbable, @collidable, @physics, @glowing, @networked, @floating, @animated, @clickable, @hoverable, @draggable, @throwable, @spatial_audio, @teleport, @portal, @lod, @billboard, @particle_system, @sculpt_volume, @printable, @iot_bridge, @digital_twin, @collaborative_sculpt.
7. Never emit [Think], [/Think], or other meta-blocks.
8. For .hsplus files, use orb syntax: orb Name { ... }
9. For .holo files, always include composition wrapper with environment block.`;

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

/**
 * Query the local Ollama model.
 * Returns null if Ollama is unavailable or the request fails.
 */
export async function queryOllama(prompt: string, system?: string): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        system: system || HOLOSCRIPT_SYSTEM_PROMPT,
        stream: false,
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as OllamaGenerateResponse;
    return data.response || null;
  } catch {
    return null;
  }
}

/**
 * Check if Ollama is running and the configured model is available.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;

    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (
      data.models?.some((m) => m.name.startsWith(OLLAMA_MODEL.replace(':latest', ''))) ?? false
    );
  } catch {
    return false;
  }
}

/**
 * Strip markdown code fences from model output.
 * Models sometimes wrap output in ```holoscript ... ``` even when told not to.
 */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();
}
