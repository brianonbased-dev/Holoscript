/**
 * @holoscript/core AI Integration
 *
 * Provider-agnostic AI integration for HoloScript.
 *
 * @example Quick Start with OpenAI:
 * ```typescript
 * import { useOpenAI, generateHoloScript } from '@holoscript/core';
 *
 * // One-time setup
 * useOpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *
 * // Generate HoloScript from natural language
 * const result = await generateHoloScript("Create a medieval castle");
 * console.log(result.holoScript);
 * ```
 *
 * @example Using Ollama (local, free):
 * ```typescript
 * import { useOllama, generateHoloScript } from '@holoscript/core';
 *
 * // Use local Ollama - no API key needed
 * useOllama({ model: 'llama3.2' });
 *
 * const result = await generateHoloScript("Create a space station");
 * ```
 *
 * @example Custom AI Provider:
 * ```typescript
 * import { AIAdapter, registerAIAdapter } from '@holoscript/core';
 *
 * class MyCustomAdapter implements AIAdapter {
 *   readonly id = 'my-ai';
 *   readonly name = 'My Custom AI';
 *
 *   isReady() { return true; }
 *
 *   async generateHoloScript(prompt: string) {
 *     // Your AI logic here
 *     return { holoScript: '...' };
 *   }
 * }
 *
 * registerAIAdapter(new MyCustomAdapter(), true);
 * ```
 */

// Core adapter interface and registry
export {
  // Types
  type AIAdapter,
  type GenerateResult,
  type ExplainResult,
  type OptimizeResult,
  type FixResult,
  type GenerateOptions,

  // Registry functions
  registerAIAdapter,
  getAIAdapter,
  getDefaultAIAdapter,
  setDefaultAIAdapter,
  listAIAdapters,
  unregisterAIAdapter,

  // Convenience functions (use default adapter)
  generateHoloScript,
  explainHoloScript,
  optimizeHoloScript,
  fixHoloScript,
} from './AIAdapter';

// Built-in adapters
export {
  // Adapter classes
  OpenAIAdapter,
  AnthropicAdapter,
  OllamaAdapter,
  LMStudioAdapter,
  GeminiAdapter,
  XAIAdapter,
  TogetherAdapter,
  FireworksAdapter,
  NVIDIAAdapter,

  // Config types
  type OpenAIAdapterConfig,
  type AnthropicAdapterConfig,
  type OllamaAdapterConfig,
  type LMStudioAdapterConfig,
  type GeminiAdapterConfig,
  type XAIAdapterConfig,
  type TogetherAdapterConfig,
  type FireworksAdapterConfig,
  type NVIDIAAdapterConfig,

  // Factory functions (create + register in one call)
  useOpenAI,
  useAnthropic,
  useOllama,
  useLMStudio,
  useGemini,
  useXAI,
  useGrok,
  useTogether,
  useFireworks,
  useNVIDIA,
} from './adapters';

export {
  SemanticSearchService,
  type SearchResult,
} from './SemanticSearchService';
