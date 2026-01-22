import { describe, it, expect } from 'vitest';
import { HoloScriptPlusParser } from './HoloScriptPlusParser';

describe('HoloScriptPlusParser - Extended Features', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses @networked trait correctly', () => {
    const source = `cube#networked_box @networked(sync_mode: "reliable", authority: "owner") { position: [1, 2, 3] }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);

    const node = result.ast.root;
    expect(node.traits.has('networked')).toBe(true);
    const config = node.traits.get('networked') as any;
    expect(config.sync_mode).toBe('reliable');
    expect(config.authority).toBe('owner');
  });

  it('Parses @external_api directive correctly', () => {
    const source = `object api_sensor @external_api(url: "https://api.iot.com/sensor", method: "GET", interval: "10s") {
      @on_data_update(data) => state.val = data.value
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);

    const node = result.ast.root;
    const apiDirective = node.directives.find((d: any) => d.type === 'external_api') as any;
    expect(apiDirective).toBeDefined();
    expect(apiDirective.url).toBe('https://api.iot.com/sensor');
    expect(apiDirective.interval).toBe('10s');
  });

  it('Handles multiple directives and traits', () => {
    const source = `light#living_room @networked(sync_mode: "state-only") @external_api(url: "https://api.home.com/light", interval: "5m") @grabbable { color: "#ffffff" }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);

    const node = result.ast.root;
    expect(node.traits.has('networked')).toBe(true);
    expect(node.traits.has('grabbable')).toBe(true);
    expect(node.directives.some((d: any) => d.type === 'external_api')).toBe(true);
  });
});

describe('HoloScriptPlusParser - Control Flow', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses @while loop correctly', () => {
    const source = `scene#main {
      @while count < 10 {
        orb#item { size: 1 }
      }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);

    const node = result.ast.root;
    const whileDirective = node.directives.find((d: any) => d.type === 'while') as any;
    expect(whileDirective).toBeDefined();
    expect(whileDirective.condition).toContain('count');
  });

  it('Parses @forEach loop correctly', () => {
    const source = `scene#main {
      @forEach item in items {
        orb#item { size: 1 }
      }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);

    const node = result.ast.root;
    const forEachDirective = node.directives.find((d: any) => d.type === 'forEach') as any;
    expect(forEachDirective).toBeDefined();
    expect(forEachDirective.variable).toBe('item');
    expect(forEachDirective.collection).toContain('items');
  });

  it('Parses @for loop correctly', () => {
    const source = `scene#main {
      @for i in range(5) {
        orb#item { size: 1 }
      }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);

    const node = result.ast.root;
    const forDirective = node.directives.find((d: any) => d.type === 'for') as any;
    expect(forDirective).toBeDefined();
    expect(forDirective.variable).toBe('i');
  });
});

describe('HoloScriptPlusParser - Import Statements', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true, enableTypeScriptImports: true });

  it('Parses @import with path', () => {
    const source = `@import "./utils/helpers.ts"
    scene#main { size: 1 }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    expect(result.ast.imports.length).toBe(1);
    expect(result.ast.imports[0].path).toBe('./utils/helpers.ts');
    expect(result.ast.imports[0].alias).toBe('helpers');
  });

  it('Parses @import with alias', () => {
    const source = `@import "./utils/math-helpers.ts" as MathUtils
    scene#main { size: 1 }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    expect(result.ast.imports.length).toBe(1);
    expect(result.ast.imports[0].path).toBe('./utils/math-helpers.ts');
    expect(result.ast.imports[0].alias).toBe('MathUtils');
  });

  it('Parses multiple @import statements', () => {
    const source = `@import "./utils.ts"
    @import "./helpers.ts" as H
    @import "./config.ts"
    scene#main { size: 1 }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    expect(result.ast.imports.length).toBe(3);
    expect(result.ast.imports[0].alias).toBe('utils');
    expect(result.ast.imports[1].alias).toBe('H');
    expect(result.ast.imports[2].alias).toBe('config');
  });

  it('Disables @import when enableTypeScriptImports is false', () => {
    const disabledParser = new HoloScriptPlusParser({ enableTypeScriptImports: false });
    const source = `@import "./utils.ts"
    scene#main { size: 1 }`;
    const result = disabledParser.parse(source);
    expect(result.ast.imports.length).toBe(0);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });
});
