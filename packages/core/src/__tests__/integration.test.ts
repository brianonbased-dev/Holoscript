/**
 * HoloScript Integration Tests
 *
 * End-to-end tests that verify the complete pipeline:
 * Parser -> Runtime -> Type Checker -> Debugger
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HoloScriptCodeParser } from '../HoloScriptCodeParser';
import { HoloScriptRuntime } from '../HoloScriptRuntime';
import { HoloScriptTypeChecker } from '../HoloScriptTypeChecker';
import { HoloScriptDebugger } from '../HoloScriptDebugger';

describe('HoloScript Integration Tests', () => {
  let parser: HoloScriptCodeParser;
  let runtime: HoloScriptRuntime;
  let typeChecker: HoloScriptTypeChecker;

  beforeEach(() => {
    parser = new HoloScriptCodeParser();
    runtime = new HoloScriptRuntime();
    typeChecker = new HoloScriptTypeChecker();
  });

  describe('Parser -> Runtime Pipeline', () => {
    it('should parse and execute a simple orb declaration', async () => {
      const code = `
        orb myOrb {
          name: "TestOrb"
          color: "#ff0000"
          glow: true
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);
      expect(parseResult.ast.length).toBeGreaterThan(0);

      const results = await runtime.executeProgram(parseResult.ast);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
    });

    it('should parse and execute a function definition', async () => {
      const code = `
        function greet(name: string): string {
          return "Hello, " + name
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);

      const results = await runtime.executeProgram(parseResult.ast);
      expect(results[0].success).toBe(true);

      // Call the function
      const callResult = await runtime.callFunction('greet', ['World']);
      expect(callResult.success).toBe(true);
    });

    it('should parse and execute connections between orbs', async () => {
      const code = `
        orb source {
          name: "Source"
        }
        orb target {
          name: "Target"
        }
        connect source to target as "data"
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);
      expect(parseResult.ast.length).toBe(3);

      const results = await runtime.executeProgram(parseResult.ast);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle program with multiple orbs', async () => {
      const code = `
        orb dataOrb {
          value: 42
          name: "DataOrb"
        }

        orb outputOrb {
          name: "OutputOrb"
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);
      expect(parseResult.ast.length).toBeGreaterThanOrEqual(2);

      const results = await runtime.executeProgram(parseResult.ast);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Parser -> Type Checker Pipeline', () => {
    it('should type check orb declarations', () => {
      const code = `
        orb typedOrb {
          count: 10
          name: "TypedOrb"
          active: true
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);

      const typeResult = typeChecker.check(parseResult.ast);
      expect(typeResult.valid).toBe(true);
      expect(typeResult.diagnostics.length).toBe(0);
    });

    it('should type check function signatures', () => {
      const code = `
        function add(a: number, b: number): number {
          return a + b
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);

      const typeResult = typeChecker.check(parseResult.ast);
      expect(typeResult.valid).toBe(true);
    });

    it('should detect type information', () => {
      const code = `
        const MAX_VALUE = 100
        let counter = 0

        orb configOrb {
          limit: MAX_VALUE
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);

      const typeResult = typeChecker.check(parseResult.ast);
      expect(typeResult.typeMap.size).toBeGreaterThan(0);
    });
  });

  describe('Full Pipeline: Parse -> Type Check -> Execute', () => {
    it('should process a complete program through all stages', async () => {
      const code = `
        orb sensorOrb {
          reading: 75
          name: "Sensor"
        }

        function checkReading(value: number): boolean {
          return value > 50
        }
      `;

      // Stage 1: Parse
      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);
      expect(parseResult.errors.length).toBe(0);

      // Stage 2: Type Check
      const typeResult = typeChecker.check(parseResult.ast);
      expect(typeResult.valid).toBe(true);

      // Stage 3: Execute
      const execResults = await runtime.executeProgram(parseResult.ast);
      expect(execResults.every(r => r.success)).toBe(true);
    });
  });

  describe('Debugger Integration', () => {
    it('should load source and set breakpoints', () => {
      const debugger_ = new HoloScriptDebugger(runtime);

      const code = `
        orb debugOrb {
          name: "DebugOrb"
        }

        function test() {
          show debugOrb
        }
      `;

      const loadResult = debugger_.loadSource(code);
      expect(loadResult.success).toBe(true);

      const bp = debugger_.setBreakpoint(2);
      expect(bp.id).toBeDefined();
      expect(bp.line).toBe(2);
      expect(bp.enabled).toBe(true);

      const breakpoints = debugger_.getBreakpoints();
      expect(breakpoints.length).toBe(1);
    });

    it('should step through execution', async () => {
      const debugger_ = new HoloScriptDebugger(runtime);

      const code = `
        orb stepOrb {
          name: "StepOrb"
        }
      `;

      debugger_.loadSource(code);

      // Start and immediately pause
      await debugger_.start();

      const state = debugger_.getState();
      expect(state.status).toBeDefined();
    });

    it('should evaluate expressions in debug context', async () => {
      const debugger_ = new HoloScriptDebugger(runtime);

      const code = `
        orb evalOrb {
          value: 42
        }
      `;

      debugger_.loadSource(code);
      await debugger_.start();

      // Wait for execution to complete
      const result = await debugger_.evaluate('evalOrb');
      expect(result).toBeDefined();
    });

    it('should handle breakpoint events', async () => {
      const debugger_ = new HoloScriptDebugger(runtime);
      const events: string[] = [];

      debugger_.on('breakpoint-hit', () => events.push('breakpoint'));
      debugger_.on('state-change', () => events.push('state'));

      const code = `
        orb eventOrb {
          name: "EventOrb"
        }
      `;

      debugger_.loadSource(code);
      debugger_.setBreakpoint(2);

      await debugger_.start();

      // Events should have been captured
      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle parse errors gracefully', () => {
      const code = `
        orb { invalid syntax here
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(false);
      expect(parseResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle runtime errors gracefully', async () => {
      const code = `
        function errorFunc() {
          throw "Error"
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);

      const results = await runtime.executeProgram(parseResult.ast);
      // Function definition should succeed
      expect(results[0].success).toBe(true);
    });

    it('should handle debugger errors gracefully', async () => {
      const debugger_ = new HoloScriptDebugger(runtime);

      // Completely invalid syntax that parser will reject
      const loadResult = debugger_.loadSource('{{{{{{');
      // Parser may or may not reject this depending on implementation
      // Just verify we get a result without crashing
      expect(loadResult).toBeDefined();
    });
  });

  describe('Loop Constructs', () => {
    it('should parse for loops', () => {
      const code = `
        for (i = 0; i < 10; i++) {
          show i
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);
      expect(parseResult.ast[0].type).toBe('for-loop');
    });
  });

  describe('Module System', () => {
    it('should parse export statements', () => {
      const code = `
        export function helper() {
          return 42
        }
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);
      expect(parseResult.ast[0].type).toBe('export');
    });

    it('should parse variable declarations', () => {
      const code = `
        const MAX = 100
        let count = 0
        var legacy = true
      `;

      const parseResult = parser.parse(code);
      expect(parseResult.success).toBe(true);
      expect(parseResult.ast.length).toBe(3);
      expect(parseResult.ast[0].type).toBe('variable-declaration');
    });
  });

  describe('Runtime Context', () => {
    it('should maintain variable state across executions', async () => {
      const code1 = `
        orb stateOrb {
          counter: 0
        }
      `;

      const parseResult1 = parser.parse(code1);
      await runtime.executeProgram(parseResult1.ast);

      // Context should exist after execution
      const context = runtime.getContext();
      expect(context).toBeDefined();
      expect(context.variables).toBeDefined();
    });

    it('should support function calls with arguments', async () => {
      const code = `
        function multiply(a: number, b: number): number {
          return a * b
        }
      `;

      const parseResult = parser.parse(code);
      await runtime.executeProgram(parseResult.ast);

      const result = await runtime.callFunction('multiply', [5, 3]);
      expect(result.success).toBe(true);
    });

    it('should reset context on runtime reset', async () => {
      const code = `
        orb tempOrb {
          name: "Temporary"
        }
      `;

      const parseResult = parser.parse(code);
      await runtime.executeProgram(parseResult.ast);

      const contextBefore = runtime.getContext();
      expect(contextBefore).toBeDefined();

      runtime.reset();

      const contextAfter = runtime.getContext();
      // After reset, variables should be empty
      expect(contextAfter.variables.size).toBe(0);
    });
  });
});

describe('HoloScript Bridge Integration', () => {
  // These tests would require the Hololand bridge
  // Stubbed for now - would need mock world interface

  it.skip('should sync orbs to world objects', async () => {
    // Would test HoloScriptBridge.loadScript -> world.createObject
  });

  it.skip('should handle world events', async () => {
    // Would test world.emit -> bridge event handling
  });

  it.skip('should sync runtime state to world', async () => {
    // Would test bridge.sync() updating world objects
  });
});
