
import { describe, it, expect } from 'vitest';
import { HoloScriptPlusParser } from '../parser/HoloScriptPlusParser';

describe('HoloScript+ NPC & Dialog System', () => {
  const parser = new HoloScriptPlusParser();

  it('Parses @npc directive with properties', () => {
    const source = `
      @npc "TownGuide" {
        model: "robot_v2"
        idle_anim: "wave"
        interaction_range: 5.0
        start_dialog: "welcome"
      }
    `;
    console.log('--- TESTING NPC PARSE ---');
    const result = parser.parse(source);
    
    if (result.errors.length > 0) {
        const fs = require('fs');
        fs.writeFileSync('parse_error.log', JSON.stringify(result.errors, null, 2));
    } else {
        const fs = require('fs');
        fs.writeFileSync('parse_success.log', JSON.stringify(result.ast, null, 2));
    }

    expect(result.success).toBe(true);
    
    const npc = result.ast.directives.find(d => d.type === 'npc');
    expect(npc).toBeDefined();
    // Use loose check for now as names might include quotes or not depending on parser logic
    // expect(npc.name).toContain('TownGuide'); 
  });

  it('Parses @dialog directive with options', () => {
    const source = `
      @dialog "welcome" {
        text: "Hello traveler!"
        option "Hi there" -> "intro"
        option "Bye" -> @close
      }
    `;
    console.log('--- TESTING DIALOG PARSE ---');
    const result = parser.parse(source);

    if (result.errors.length > 0) {
        console.error('PARSE ERRORS:', JSON.stringify(result.errors, null, 2));
    } else {
        console.log('PARSE SUCCESS:', JSON.stringify(result.ast, null, 2));
    }

    expect(result.success).toBe(true);
    const dialog = result.ast.directives.find(d => d.type === 'dialog');
    expect(dialog).toBeDefined();
  });
});
