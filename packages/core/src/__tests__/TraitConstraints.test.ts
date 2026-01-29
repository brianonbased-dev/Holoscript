import { describe, it, expect, beforeEach } from 'vitest';
import { HoloScriptPlusParser } from '../parser/HoloScriptPlusParser';
import { HoloScriptTypeChecker } from '../HoloScriptTypeChecker';
import fs from 'fs';

describe('Trait Constraints Validation', () => {
  let parser: HoloScriptPlusParser;
  let typeChecker: HoloScriptTypeChecker;

  beforeEach(() => {
    fs.writeFileSync('checkpoint.log', 'BEFORE_EACH_START\n');
    parser = new HoloScriptPlusParser();
    typeChecker = new HoloScriptTypeChecker();
    fs.appendFileSync('checkpoint.log', 'BEFORE_EACH_END\n');
  });

  it('should report error when @physics is missing @collidable', () => {
    fs.appendFileSync('checkpoint.log', 'TEST_START\n');
    const code = `
      orb test {
        @physics(mass: 1.0)
      }
    `;
    fs.appendFileSync('checkpoint.log', 'BEFORE_PARSE\n');
    const parseResult = parser.parse(code);
    fs.appendFileSync('checkpoint.log', `AFTER_PARSE_SUCCESS_${parseResult.success}_NODES_${parseResult.ast.body.length}\n`);
    parseResult.ast.body.forEach((node, i) => {
      fs.appendFileSync('checkpoint.log', `NODE_${i}_TYPE_${node.type}\n`);
    });
    
    fs.appendFileSync('checkpoint.log', 'BEFORE_CHECK\n');
    const checkResult = typeChecker.check(parseResult.ast.body);
    fs.appendFileSync('checkpoint.log', `AFTER_CHECK_VALID_${checkResult.valid}_DIAGS_${checkResult.diagnostics.length}\n`);
    
    fs.writeFileSync('debug_ast.log', JSON.stringify(parseResult.ast.body[0], (key, value) => {
      if (key === 'traits' && value instanceof Map) return Array.from(value.entries());
      return value;
    }, 2));

    if (checkResult.valid) {
      fs.appendFileSync('checkpoint.log', 'VALID_WHEN_EXPECTED_INVALID\n');
      expect.fail('Valid when it should be invalid. Diagnostics: ' + JSON.stringify(checkResult.diagnostics));
    }
    fs.appendFileSync('checkpoint.log', 'TEST_END\n');
  });
});
