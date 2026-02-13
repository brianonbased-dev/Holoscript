/**
 * HoloScriptCodeParser Tests
 *
 * Tests for the core .hs format parser: tokenization, AST generation,
 * error recovery, security validation, and object pooling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HoloScriptCodeParser, ParserPools } from './HoloScriptCodeParser';
import type { ParseResult } from './HoloScriptCodeParser';

describe('HoloScriptCodeParser', () => {
  let parser: HoloScriptCodeParser;

  beforeEach(() => {
    parser = new HoloScriptCodeParser();
  });

  // =========================================================================
  // Basic Parsing
  // =========================================================================
  describe('basic parsing', () => {
    it('should return success for empty input', () => {
      const result = parser.parse('');
      expect(result.success).toBe(true);
      expect(result.ast).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should parse a simple orb declaration', () => {
      const result = parser.parse('orb myOrb { }');
      expect(result.success).toBe(true);
      expect(result.ast.length).toBeGreaterThanOrEqual(1);
      const orb = result.ast[0];
      expect(orb.type).toBe('orb');
    });

    it('should parse orb with properties', () => {
      const code = `orb player {
  position: [0, 1, 0]
  color: "#ff0000"
  scale: 0.5
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      expect(result.ast.length).toBeGreaterThanOrEqual(1);
      expect(result.ast[0].type).toBe('orb');
    });

    it('should parse multiple orb declarations', () => {
      const code = `
orb first { }
orb second { }
orb third { }
`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const orbs = result.ast.filter((n) => n.type === 'orb');
      expect(orbs.length).toBe(3);
    });
  });

  // =========================================================================
  // Function Parsing
  // =========================================================================
  describe('function parsing', () => {
    it('should parse a simple function', () => {
      const code = `function greet(name) {
  return "hello"
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const func = result.ast.find((n) => n.type === 'method');
      expect(func).toBeDefined();
    });

    it('should parse function with multiple parameters', () => {
      const code = `function add(a, b) {
  return a
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const func = result.ast.find((n) => n.type === 'method');
      expect(func).toBeDefined();
    });
  });

  // =========================================================================
  // Connection Parsing
  // =========================================================================
  describe('connection parsing', () => {
    it('should parse a simple connection', () => {
      const code = 'connect source to target';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const conn = result.ast.find((n) => n.type === 'connection');
      expect(conn).toBeDefined();
    });

    it('should parse connection with type', () => {
      const code = 'connect source to target as data';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const conn = result.ast.find((n) => n.type === 'connection');
      expect(conn).toBeDefined();
    });
  });

  // =========================================================================
  // Gate Parsing
  // =========================================================================
  describe('gate parsing', () => {
    it('should parse a simple gate declaration', () => {
      const result = parser.parse('gate myGate { }');
      expect(result.success).toBe(true);
      const gate = result.ast.find((n) => n.type === 'gate');
      expect(gate).toBeDefined();
    });
  });

  // =========================================================================
  // Stream Parsing
  // =========================================================================
  describe('stream parsing', () => {
    it('should parse a stream declaration', () => {
      const code = 'stream dataFlow from sensor { }';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const stream = result.ast.find((n) => n.type === 'stream');
      expect(stream).toBeDefined();
    });
  });

  // =========================================================================
  // Composition Parsing
  // =========================================================================
  describe('composition parsing', () => {
    it('should parse a composition block', () => {
      const code = `composition "MyScene" {
  orb player { }
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const comp = result.ast.find((n) => n.type === 'composition');
      expect(comp).toBeDefined();
    });

    it('should parse composition with name', () => {
      const code = `composition "TestWorld" { }`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const comp = result.ast.find((n) => n.type === 'composition');
      expect(comp).toBeDefined();
      if (comp && 'name' in comp) {
        expect(comp.name).toBe('TestWorld');
      }
    });
  });

  // =========================================================================
  // Template Parsing
  // =========================================================================
  describe('template parsing', () => {
    it('should parse an empty template declaration', () => {
      const result = parser.parse('template Enemy { }');
      expect(result.success).toBe(true);
      const tmpl = result.ast.find((n) => n.type === 'template');
      expect(tmpl).toBeDefined();
    });
  });

  // =========================================================================
  // Control Flow
  // =========================================================================
  describe('control flow', () => {
    it('should parse for loops (C-style syntax)', () => {
      const code = 'for (i = 0; i < 10; i) { }';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const loop = result.ast.find((n) => n.type === 'for-loop');
      expect(loop).toBeDefined();
    });

    it('should parse while loops', () => {
      const code = 'while true { }';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const loop = result.ast.find((n) => n.type === 'while-loop');
      expect(loop).toBeDefined();
    });

    it('should parse gate as control flow', () => {
      const result = parser.parse('gate check { }');
      expect(result.success).toBe(true);
      expect(result.ast.find((n) => n.type === 'gate')).toBeDefined();
    });
  });

  // =========================================================================
  // Import/Export
  // =========================================================================
  describe('import/export', () => {
    it('should parse import statement', () => {
      const code = 'import { helper } from "./utils"';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const imp = result.ast.find((n) => n.type === 'import');
      expect(imp).toBeDefined();
    });

    it('should parse export statement', () => {
      const code = `export orb shared { }`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Variable Declarations
  // =========================================================================
  describe('variable declarations', () => {
    it('should parse const declaration', () => {
      const code = 'const speed = 10';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const decl = result.ast.find((n) => n.type === 'variable-declaration');
      expect(decl).toBeDefined();
      if (decl && 'kind' in decl) {
        expect((decl as any).kind).toBe('const');
      }
    });

    it('should parse let declaration', () => {
      const code = 'let counter = 0';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const decl = result.ast.find((n) => n.type === 'variable-declaration');
      expect(decl).toBeDefined();
      if (decl && 'kind' in decl) {
        expect((decl as any).kind).toBe('let');
      }
    });
  });

  // =========================================================================
  // Shape Keywords
  // =========================================================================
  describe('shape keywords', () => {
    it('should parse cube as orb with geometry', () => {
      const code = 'cube myCube { }';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const node = result.ast[0];
      expect(node).toBeDefined();
    });

    it('should parse sphere as orb with geometry', () => {
      const code = 'sphere mySphere { }';
      const result = parser.parse(code);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Comments
  // =========================================================================
  describe('comments', () => {
    it('should skip single-line comments', () => {
      const code = `// this is a comment
orb player { }`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const orb = result.ast.find((n) => n.type === 'orb');
      expect(orb).toBeDefined();
    });

    it('should skip multi-line comments', () => {
      const code = `/* block comment
still comment */
orb player { }`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const orb = result.ast.find((n) => n.type === 'orb');
      expect(orb).toBeDefined();
    });
  });

  // =========================================================================
  // Security
  // =========================================================================
  describe('security', () => {
    it('should reject code exceeding max length', () => {
      const longCode = 'a'.repeat(2_000_001);
      const result = parser.parse(longCode);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('HS009');
    });

    it('should detect suspicious keywords', () => {
      const code = 'eval("malicious")';
      const result = parser.parse(code);
      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('HS010');
    });
  });

  // =========================================================================
  // Error Recovery
  // =========================================================================
  describe('error recovery', () => {
    it('should collect errors but still produce a result', () => {
      const code = `orb valid { }
@@@ invalid syntax
orb alsoValid { }`;
      const result = parser.parse(code);
      // Should have at least one valid node and possibly errors
      expect(result).toBeDefined();
      expect(result.ast).toBeDefined();
    });

    it('should provide error context with source lines', () => {
      const code = `orb test {
  invalid!!! syntax
}`;
      const result = parser.parse(code);
      // Check that errors include context information
      if (result.errors.length > 0) {
        // Parser should have recovered or reported a structured error
        expect(result.errors[0]).toHaveProperty('line');
        expect(result.errors[0]).toHaveProperty('message');
      }
    });
  });

  // =========================================================================
  // ParseResult Structure
  // =========================================================================
  describe('ParseResult structure', () => {
    it('should always return well-formed ParseResult', () => {
      const result = parser.parse('orb x { }');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('ast');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.ast)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // =========================================================================
  // Object Pool
  // =========================================================================
  describe('ParserPools', () => {
    it('should expose pool statistics', () => {
      expect(ParserPools).toBeDefined();
      expect(ParserPools).toHaveProperty('clearAll');
    });

    it('should clear all pools without error', () => {
      expect(() => ParserPools.clearAll()).not.toThrow();
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('edge cases', () => {
    it('should handle whitespace-only input', () => {
      const result = parser.parse('   \n\n\t  ');
      expect(result.success).toBe(true);
      expect(result.ast).toEqual([]);
    });

    it('should handle comments-only input', () => {
      const result = parser.parse('// just a comment\n/* another */');
      expect(result.success).toBe(true);
      expect(result.ast).toEqual([]);
    });

    it('should handle string values with special characters', () => {
      const code = `orb test {
  name: "hello world"
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
    });

    it('should handle numeric property values', () => {
      const code = `orb test {
  speed: 42
  ratio: 3.14
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
    });

    it('should handle array property values', () => {
      const code = `orb test {
  position: [1, 2, 3]
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
    });

    it('should handle nested blocks', () => {
      const code = `composition "Test" {
  orb inner {
    color: "blue"
  }
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Environment
  // =========================================================================
  describe('environment', () => {
    it('should parse environment block', () => {
      const code = `environment {
  skybox: "sunset"
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const env = result.ast.find((n) => n.type === 'environment');
      expect(env).toBeDefined();
    });
  });

  // =========================================================================
  // Zone Parsing
  // =========================================================================
  describe('zone parsing', () => {
    it('should parse zone declaration', () => {
      const code = `zone safeArea {
  position: [0, 0, 0]
}`;
      const result = parser.parse(code);
      expect(result.success).toBe(true);
      const zone = result.ast.find((n) => n.type === 'zone');
      expect(zone).toBeDefined();
    });
  });
});
