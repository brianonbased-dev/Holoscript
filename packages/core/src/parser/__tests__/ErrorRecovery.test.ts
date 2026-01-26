import { describe, it, expect } from 'vitest';
import { HoloScriptPlusParser } from '../HoloScriptPlusParser';

describe('HoloScriptPlusParser Error Recovery', () => {
  it('should report multiple errors in a single file', () => {
    const parser = new HoloScriptPlusParser();
    const source = `
      orb#valid {
        color: "#ffffff"
      }

      orb#invalid_prop {
        color "#ff0000" // Missing colon
        scale 1.0       // Missing colon
      }

      orb#valid_after {
        position: [0, 0, 0]
      }
    `;

    const result = parser.parse(source);
    
    // We expect multiple errors
    expect(result.errors.length).toBeGreaterThan(1);
    
    // We expect the parser to have recovered and found the third node
    expect(result.ast.children.length).toBe(3);
    expect(result.ast.children[0].id).toBe('valid');
    expect(result.ast.children[1].id).toBe('invalid_prop');
    expect(result.ast.children[2].id).toBe('valid_after');
  });

  it('should recover from missing braces', () => {
    const parser = new HoloScriptPlusParser();
    const source = `
      orb#missing_brace 
        color: "#ffffff"
      

      orb#next {
        scale: 2.0
      }
    `;

    const result = parser.parse(source);
    expect(result.errors.length).toBeGreaterThan(0);
    // Depending on recovery, 'color' might be parsed as a node or skipped
    // We mainly want to ensure 'orb#next' is found
    const ids = result.ast.children.map((c: any) => c.id);
    expect(ids).toContain('next');
  });
});
