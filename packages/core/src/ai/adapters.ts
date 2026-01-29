/**
 * @holoscript/core - Built-in AI Adapters
 *
 * Ready-to-use adapters for popular AI providers.
 * Users just need to provide their API key.
 */

import type {
  AIAdapter,
  GenerateResult,
  ExplainResult,
  OptimizeResult,
  FixResult,
  GenerateOptions,
} from './AIAdapter';

// ============================================================================
// System Prompt for HoloScript Generation
// ============================================================================

const HOLOSCRIPT_SYSTEM_PROMPT = `You are a HoloScript expert. HoloScript is a visual flow language for VR/AR world creation.

Generate valid HoloScript code following this syntax:

COMPOSITIONS:
composition "Scene Name" {
  environment { skybox: "sky_day", ambient: 0.5 }

  template "ObjectType" {
    state { property: value }
    action doSomething() { }
  }

  spatial_group "GroupName" {
    object "Object1" { position: [x, y, z] }
    object "Object2" using "ObjectType" { position: [x, y, z] }
  }

  logic {
    on_event { action() }
    every(1000) { periodic_action() }
  }
}

SHAPES: cube, sphere, cylinder, cone, plane, torus, capsule, pyramid, prism, hexagon, octahedron, icosahedron, ring, tube, spiral, stairs, arch, dome, wedge, ramp

TRAITS: @grabbable, @throwable, @hoverable, @interactive, @collidable, @animatable, @networked

RULES:
1. Use descriptive object names
2. Position objects logically in 3D space (y is up)
3. Include templates for reusable objects
4. Add logic for interactivity
5. Output ONLY valid HoloScript code, no explanations unless asked`;

// ============================================================================
// OpenAI Adapter
// ============================================================================

export interface OpenAIAdapterConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  organization?: string;
}

export class OpenAIAdapter implements AIAdapter {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  private config: OpenAIAdapterConfig;
  private model: string;

  constructor(config: OpenAIAdapterConfig) {
    this.config = config;
    this.model = config.model || 'gpt-4o-mini';
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  async generateHoloScript(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const systemPrompt = this.buildSystemPrompt(options);
    const response = await this.chat(
      'Create a HoloScript scene: ' + prompt,
      undefined,
      [{ role: 'assistant', content: systemPrompt }]
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.85,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI([
      { role: 'system', content: 'You are a HoloScript expert. Explain the following code clearly.' },
      { role: 'user', content: 'Explain this HoloScript:\n\n' + holoScript },
    ]);

    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI([
      {
        role: 'system',
        content: 'You are a HoloScript optimizer. Optimize for ' + target + ' platform. Return only the optimized code.',
      },
      { role: 'user', content: holoScript },
    ]);

    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI([
      {
        role: 'system',
        content: 'You are a HoloScript debugger. Fix the errors and return corrected code.',
      },
      {
        role: 'user',
        content: 'Fix these errors:\n' + errors.join('\n') + '\n\nCode:\n' + holoScript,
      },
    ]);

    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(
    message: string,
    holoScript?: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: HOLOSCRIPT_SYSTEM_PROMPT },
    ];

    if (history) {
      messages.push(...history);
    }

    if (holoScript) {
      messages.push({
        role: 'user',
        content: 'Context (current code):\n' + holoScript + '\n\nQuestion: ' + message,
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    return this.callAPI(messages);
  }

  private buildSystemPrompt(options?: GenerateOptions): string {
    let prompt = HOLOSCRIPT_SYSTEM_PROMPT;
    if (options?.style) prompt += '\nStyle: ' + options.style;
    if (options?.complexity) prompt += '\nComplexity: ' + options.complexity;
    if (options?.targetPlatform) prompt += '\nOptimize for: ' + options.targetPlatform;
    return prompt;
  }

  private extractCode(response: string): string {
    // Extract code from markdown code blocks
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + this.config.apiKey,
    };

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }

    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async getEmbeddings(text: string | string[]): Promise<number[][]> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const inputs = Array.isArray(text) ? text : [text];

    const response = await fetch(baseUrl + '/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.config.apiKey,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: inputs,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI Embeddings API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

// ============================================================================
// Anthropic (Claude) Adapter
// ============================================================================

export interface AnthropicAdapterConfig {
  apiKey: string;
  model?: string;
}

export class AnthropicAdapter implements AIAdapter {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';

  private config: AnthropicAdapterConfig;
  private model: string;

  constructor(config: AnthropicAdapterConfig) {
    this.config = config;
    this.model = config.model || 'claude-3-haiku-20240307';
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  async generateHoloScript(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const response = await this.callAPI(
      'Create a HoloScript scene: ' + prompt,
      options
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.85,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI(
      'Explain this HoloScript code clearly:\n\n' + holoScript
    );
    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI(
      'Optimize this HoloScript for ' + target + '. Return only the optimized code:\n\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI(
      'Fix these errors in the HoloScript:\nErrors: ' + errors.join(', ') + '\n\nCode:\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(
    message: string,
    holoScript?: string,
    _history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const fullMessage = holoScript
      ? 'Context:\n' + holoScript + '\n\nQuestion: ' + message
      : message;
    return this.callAPI(fullMessage);
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(
    message: string,
    _options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: HOLOSCRIPT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      throw new Error('Anthropic API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}

// ============================================================================
// Ollama (Local) Adapter
// ============================================================================

export interface OllamaAdapterConfig {
  baseUrl?: string;
  model?: string;
}

export class OllamaAdapter implements AIAdapter {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';

  private baseUrl: string;
  private model: string;

  constructor(config: OllamaAdapterConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3.2';
  }

  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl + '/api/tags');
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateHoloScript(
    prompt: string,
    _options?: GenerateOptions
  ): Promise<GenerateResult> {
    const response = await this.callAPI(
      HOLOSCRIPT_SYSTEM_PROMPT,
      'Create a HoloScript scene: ' + prompt
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.75,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI(
      'You are a HoloScript expert. Explain code clearly.',
      'Explain this HoloScript:\n\n' + holoScript
    );
    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI(
      'You are a HoloScript optimizer. Optimize for ' + target + '.',
      holoScript
    );
    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI(
      'You are a HoloScript debugger. Fix errors and return corrected code.',
      'Errors: ' + errors.join(', ') + '\n\nCode:\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(message: string, holoScript?: string): Promise<string> {
    const fullMessage = holoScript
      ? 'Context:\n' + holoScript + '\n\nQuestion: ' + message
      : message;
    return this.callAPI(HOLOSCRIPT_SYSTEM_PROMPT, fullMessage);
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(system: string, prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        system,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Ollama API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.response;
  }

  async getEmbeddings(text: string | string[]): Promise<number[][]> {
    const inputs = Array.isArray(text) ? text : [text];
    const results: number[][] = [];

    for (const input of inputs) {
      const response = await fetch(this.baseUrl + '/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: input,
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama Embeddings API error: ' + response.statusText);
      }

      const data = await response.json();
      results.push(data.embedding);
    }

    return results;
  }
}

// ============================================================================
// LM Studio Adapter (OpenAI-compatible local)
// ============================================================================

export interface LMStudioAdapterConfig {
  baseUrl?: string;
  model?: string;
}

/**
 * LM Studio adapter - uses OpenAI-compatible API running locally
 */
export class LMStudioAdapter implements AIAdapter {
  readonly id = 'lmstudio';
  readonly name = 'LM Studio (Local)';

  private openaiAdapter: OpenAIAdapter;

  constructor(config: LMStudioAdapterConfig = {}) {
    this.openaiAdapter = new OpenAIAdapter({
      apiKey: 'lm-studio', // LM Studio doesn't require an API key
      baseUrl: config.baseUrl || 'http://localhost:1234/v1',
      model: config.model || 'local-model',
    });
  }

  isReady(): boolean {
    return true; // Assume ready, will fail gracefully if not running
  }

  generateHoloScript(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    return this.openaiAdapter.generateHoloScript(prompt, options);
  }

  explainHoloScript(holoScript: string): Promise<ExplainResult> {
    return this.openaiAdapter.explainHoloScript(holoScript);
  }

  optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    return this.openaiAdapter.optimizeHoloScript(holoScript, target);
  }

  fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    return this.openaiAdapter.fixHoloScript(holoScript, errors);
  }

  chat(
    message: string,
    holoScript?: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    return this.openaiAdapter.chat(message, holoScript, history);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

import { registerAIAdapter } from './AIAdapter';

/**
 * Create and register an OpenAI adapter
 */
export function useOpenAI(config: OpenAIAdapterConfig): OpenAIAdapter {
  const adapter = new OpenAIAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

/**
 * Create and register an Anthropic adapter
 */
export function useAnthropic(config: AnthropicAdapterConfig): AnthropicAdapter {
  const adapter = new AnthropicAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

/**
 * Create and register an Ollama adapter (local)
 */
export function useOllama(config: OllamaAdapterConfig = {}): OllamaAdapter {
  const adapter = new OllamaAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

/**
 * Create and register an LM Studio adapter (local)
 */
export function useLMStudio(config: LMStudioAdapterConfig = {}): LMStudioAdapter {
  const adapter = new LMStudioAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

// ============================================================================
// Google Gemini Adapter
// ============================================================================

export interface GeminiAdapterConfig {
  apiKey: string;
  model?: string;
}

export class GeminiAdapter implements AIAdapter {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  private config: GeminiAdapterConfig;
  private model: string;

  constructor(config: GeminiAdapterConfig) {
    this.config = config;
    this.model = config.model || 'gemini-1.5-flash';
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  async generateHoloScript(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const response = await this.callAPI(
      'Create a HoloScript scene: ' + prompt,
      options
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.85,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI(
      'Explain this HoloScript code clearly:\n\n' + holoScript
    );
    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI(
      'Optimize this HoloScript for ' + target + '. Return only the optimized code:\n\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI(
      'Fix these errors in the HoloScript:\nErrors: ' + errors.join(', ') + '\n\nCode:\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(
    message: string,
    holoScript?: string,
    _history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const fullMessage = holoScript
      ? 'Context:\n' + holoScript + '\n\nQuestion: ' + message
      : message;
    return this.callAPI(fullMessage);
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(
    message: string,
    _options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: HOLOSCRIPT_SYSTEM_PROMPT },
              { text: message }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}

// ============================================================================
// XAI (Grok) Adapter
// ============================================================================

export interface XAIAdapterConfig {
  apiKey: string;
  model?: string;
}

export class XAIAdapter implements AIAdapter {
  readonly id = 'xai';
  readonly name = 'xAI Grok';

  private config: XAIAdapterConfig;
  private model: string;

  constructor(config: XAIAdapterConfig) {
    this.config = config;
    this.model = config.model || 'grok-beta';
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  async generateHoloScript(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const response = await this.callAPI(
      'Create a HoloScript scene: ' + prompt,
      options
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.85,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI(
      'Explain this HoloScript code clearly:\n\n' + holoScript
    );
    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI(
      'Optimize this HoloScript for ' + target + '. Return only the optimized code:\n\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI(
      'Fix these errors in the HoloScript:\nErrors: ' + errors.join(', ') + '\n\nCode:\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(
    message: string,
    holoScript?: string,
    _history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const fullMessage = holoScript
      ? 'Context:\n' + holoScript + '\n\nQuestion: ' + message
      : message;
    return this.callAPI(fullMessage);
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(
    message: string,
    _options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.config.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: HOLOSCRIPT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('xAI API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// ============================================================================
// Together AI Adapter
// ============================================================================

export interface TogetherAdapterConfig {
  apiKey: string;
  model?: string;
}

export class TogetherAdapter implements AIAdapter {
  readonly id = 'together';
  readonly name = 'Together AI';

  private config: TogetherAdapterConfig;
  private model: string;

  constructor(config: TogetherAdapterConfig) {
    this.config = config;
    this.model = config.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  async generateHoloScript(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const response = await this.callAPI(
      'Create a HoloScript scene: ' + prompt,
      options
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.80,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI(
      'Explain this HoloScript code clearly:\n\n' + holoScript
    );
    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI(
      'Optimize this HoloScript for ' + target + '. Return only the optimized code:\n\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI(
      'Fix these errors in the HoloScript:\nErrors: ' + errors.join(', ') + '\n\nCode:\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(
    message: string,
    holoScript?: string,
    _history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const fullMessage = holoScript
      ? 'Context:\n' + holoScript + '\n\nQuestion: ' + message
      : message;
    return this.callAPI(fullMessage);
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(
    message: string,
    _options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.config.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: HOLOSCRIPT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error('Together AI API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// ============================================================================
// Fireworks AI Adapter
// ============================================================================

export interface FireworksAdapterConfig {
  apiKey: string;
  model?: string;
}

export class FireworksAdapter implements AIAdapter {
  readonly id = 'fireworks';
  readonly name = 'Fireworks AI';

  private config: FireworksAdapterConfig;
  private model: string;

  constructor(config: FireworksAdapterConfig) {
    this.config = config;
    this.model = config.model || 'accounts/fireworks/models/llama-v3p1-70b-instruct';
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  async generateHoloScript(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const response = await this.callAPI(
      'Create a HoloScript scene: ' + prompt,
      options
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.80,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI(
      'Explain this HoloScript code clearly:\n\n' + holoScript
    );
    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI(
      'Optimize this HoloScript for ' + target + '. Return only the optimized code:\n\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI(
      'Fix these errors in the HoloScript:\nErrors: ' + errors.join(', ') + '\n\nCode:\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(
    message: string,
    holoScript?: string,
    _history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const fullMessage = holoScript
      ? 'Context:\n' + holoScript + '\n\nQuestion: ' + message
      : message;
    return this.callAPI(fullMessage);
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(
    message: string,
    _options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.config.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: HOLOSCRIPT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error('Fireworks AI API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// ============================================================================
// NVIDIA NIM Adapter
// ============================================================================

export interface NVIDIAAdapterConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class NVIDIAAdapter implements AIAdapter {
  readonly id = 'nvidia';
  readonly name = 'NVIDIA NIM';

  private config: NVIDIAAdapterConfig;
  private model: string;
  private baseUrl: string;

  constructor(config: NVIDIAAdapterConfig) {
    this.config = config;
    this.model = config.model || 'meta/llama-3.1-70b-instruct';
    this.baseUrl = config.baseUrl || 'https://integrate.api.nvidia.com/v1';
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  async generateHoloScript(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const response = await this.callAPI(
      'Create a HoloScript scene: ' + prompt,
      options
    );

    return {
      holoScript: this.extractCode(response),
      confidence: 0.85,
    };
  }

  async explainHoloScript(holoScript: string): Promise<ExplainResult> {
    const response = await this.callAPI(
      'Explain this HoloScript code clearly:\n\n' + holoScript
    );
    return { explanation: response };
  }

  async optimizeHoloScript(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr' | 'ar'
  ): Promise<OptimizeResult> {
    const response = await this.callAPI(
      'Optimize this HoloScript for ' + target + '. Return only the optimized code:\n\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      improvements: ['Optimized for ' + target],
    };
  }

  async fixHoloScript(holoScript: string, errors: string[]): Promise<FixResult> {
    const response = await this.callAPI(
      'Fix these errors in the HoloScript:\nErrors: ' + errors.join(', ') + '\n\nCode:\n' + holoScript
    );
    return {
      holoScript: this.extractCode(response),
      fixes: errors.map((e) => ({ line: 0, issue: e, fix: 'auto-fixed' })),
    };
  }

  async chat(
    message: string,
    holoScript?: string,
    _history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const fullMessage = holoScript
      ? 'Context:\n' + holoScript + '\n\nQuestion: ' + message
      : message;
    return this.callAPI(fullMessage);
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  private async callAPI(
    message: string,
    _options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch(this.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.config.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: HOLOSCRIPT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error('NVIDIA NIM API error: ' + response.statusText);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// ============================================================================
// Additional Factory Functions
// ============================================================================

/**
 * Create and register a Gemini adapter
 */
export function useGemini(config: GeminiAdapterConfig): GeminiAdapter {
  const adapter = new GeminiAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

/**
 * Create and register an xAI (Grok) adapter
 */
export function useXAI(config: XAIAdapterConfig): XAIAdapter {
  const adapter = new XAIAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

/** Alias for useXAI */
export const useGrok = useXAI;

/**
 * Create and register a Together AI adapter
 */
export function useTogether(config: TogetherAdapterConfig): TogetherAdapter {
  const adapter = new TogetherAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

/**
 * Create and register a Fireworks AI adapter
 */
export function useFireworks(config: FireworksAdapterConfig): FireworksAdapter {
  const adapter = new FireworksAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}

/**
 * Create and register an NVIDIA NIM adapter
 */
export function useNVIDIA(config: NVIDIAAdapterConfig): NVIDIAAdapter {
  const adapter = new NVIDIAAdapter(config);
  registerAIAdapter(adapter, true);
  return adapter;
}
