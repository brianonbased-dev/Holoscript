'use client';

import { useMemo } from 'react';
import { HoloScriptPlusParser, HoloCompositionParser, R3FCompiler } from '@holoscript/core';
import type { PipelineResult } from '@/types';

/**
 * Parses HoloScript source code and compiles it to an R3FNode tree for rendering.
 * Detects format (.holo composition vs .hsplus) automatically.
 */
export function useScenePipeline(code: string): PipelineResult {
  return useMemo(() => {
    if (!code.trim()) {
      return { r3fTree: null, errors: [] };
    }

    try {
      const compiler = new R3FCompiler();
      const trimmed = code.trimStart();

      // Detect .holo composition format
      if (trimmed.startsWith('composition')) {
        const parser = new HoloCompositionParser();
        const result = parser.parse(code);

        if (result.errors && result.errors.length > 0) {
          return {
            r3fTree: null,
            errors: result.errors.map((e: any) => ({
              message: typeof e === 'string' ? e : e.message || String(e),
              line: e.line,
            })),
          };
        }

        const tree = compiler.compileComposition(result.ast ?? result);
        return { r3fTree: tree, errors: [] };
      }

      // Default: .hsplus format
      const parser = new HoloScriptPlusParser();
      const result = parser.parse(code);

      if (result.errors && result.errors.length > 0) {
        return {
          r3fTree: null,
          errors: result.errors.map((e: any) => ({
            message: typeof e === 'string' ? e : e.message || String(e),
            line: e.line,
          })),
        };
      }

      const tree = compiler.compile(result.ast ?? result);
      return { r3fTree: tree, errors: [] };
    } catch (err) {
      return {
        r3fTree: null,
        errors: [{ message: err instanceof Error ? err.message : String(err) }],
      };
    }
  }, [code]);
}
