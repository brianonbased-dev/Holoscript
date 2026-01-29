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
    const config = node.traits.get('networked');
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
    const apiDirective = node.directives.find((d: any) => d.type === 'external_api');
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
    const whileDirective = node.directives.find((d: any) => d.type === 'while');
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
    const forEachDirective = node.directives.find((d: any) => d.type === 'forEach');
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
    const forDirective = node.directives.find((d: any) => d.type === 'for');
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

describe('HoloScriptPlusParser - Semantic Annotations', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses @manifest directive correctly', () => {
    const source = `composition "Gallery" {
      @manifest("gallery-assets") {
        assets: [
          { id: "hero-model", path: "models/hero.glb", type: "model" }
        ]
      }
      object "Item" { position: [0, 0, 0] }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });

  it('Parses @semantic directive correctly', () => {
    const source = `composition "Demo" {
      @semantic("player-character") {
        category: "character"
        type: "player"
        capabilities: ["movement", "jumping"]
      }
      object "Player" { position: [0, 0, 0] }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });

  it('Parses @bindings directive correctly', () => {
    const source = `composition "UI" {
      @state {
        health: 100
      }
      @bindings {
        bind(@state.health / 100) -> HealthBar.fill_amount
      }
      object "HealthBar" { fill_amount: 1.0 }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });
});

describe('HoloScriptPlusParser - World Definition', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses @world_metadata directive correctly', () => {
    const source = `composition "Arena" {
      @world_metadata {
        id: "battle-arena"
        name: "Battle Arena"
        max_users: 16
        tags: ["pvp", "arena"]
      }
      object "Floor" { geometry: "box" }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });

  it('Parses @world_config directive correctly', () => {
    const source = `composition "Arena" {
      @world_config {
        physics: { engine: "rapier", gravity: [0, -9.81, 0] }
        rendering: { target_fps: 72, shadows: true }
      }
      object "Floor" { geometry: "box" }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });

  it('Parses @zones directive correctly', () => {
    const source = `composition "Arena" {
      @zones {
        zone "safe-zone" {
          name: "Spawn Safe Zone"
          bounds: { type: "sphere", center: [0, 0, 0], radius: 15 }
          priority: 10
        }
      }
      object "Floor" { geometry: "box" }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });

  it('Parses @spawn_points directive correctly', () => {
    const source = `composition "Arena" {
      @spawn_points {
        spawn "team-a-spawn" {
          name: "Team A Primary"
          position: [-40, 1, 0]
          type: "default"
        }
      }
      object "Floor" { geometry: "box" }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });
});

describe('HoloScriptPlusParser - Environment & Lighting', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses environment block with lighting directives', () => {
    const source = `composition "Scene" {
      environment {
        @skybox { type: "procedural", turbidity: 10 }
        @ambient_light { color: "#ffffff", intensity: 0.4 }
        @directional_light("sun") { color: "#fffaf0", intensity: 1.2 }
        @fog { type: "exponential2", color: "#8899cc" }
      }
      object "Floor" { geometry: "box" }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });

  it('Parses simple environment properties', () => {
    const source = `composition "Scene" {
      environment {
        skybox: "gradient"
        ambient_light: 0.7
      }
      object "Floor" { geometry: "box" }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });
});

describe('HoloScriptPlusParser - Logic Block', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses logic block with functions', () => {
    const source = `composition "Game" {
      logic {
        function take_damage(amount) {
          @state.health = @state.health - amount
        }
        function heal(amount) {
          @state.health = @state.health + amount
        }
      }
      object "Player" { position: [0, 0, 0] }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    const logicNode = result.ast.root.children?.find((c: any) => c.type === 'logic');
    expect(logicNode).toBeDefined();
    expect(logicNode.body.functions.length).toBe(2);
    expect(logicNode.body.functions[0].name).toBe('take_damage');
  });

  it('Parses logic block with on_tick handler', () => {
    const source = `composition "Game" {
      logic {
        on_tick(1.0) {
          @state.timer = @state.timer + 1
        }
      }
      object "Timer" { text: "0" }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    const logicNode = result.ast.root.children?.find((c: any) => c.type === 'logic');
    expect(logicNode).toBeDefined();
    expect(logicNode.body.tickHandlers.length).toBe(1);
    expect(logicNode.body.tickHandlers[0].interval).toBe(1.0);
  });

  it('Parses logic block with on_scene_load handler', () => {
    const source = `composition "Game" {
      logic {
        on_scene_load {
          initialize_game()
        }
      }
      object "GameManager" { }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    const logicNode = result.ast.root.children?.find((c: any) => c.type === 'logic');
    expect(logicNode).toBeDefined();
    expect(logicNode.body.eventHandlers.length).toBe(1);
    expect(logicNode.body.eventHandlers[0].event).toBe('scene_load');
  });
});

describe('HoloScriptPlusParser - Templates', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses template definition', () => {
    const source = `composition "UI" {
      template "NavButton" {
        @clickable
        @hoverable
        geometry: "box"
        scale: [0.2, 0.2, 0.05]
        color: "#4ecdc4"
      }
      object "Item" { position: [0, 0, 0] }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    const templateNode = result.ast.root.children?.find((c: any) => c.type === 'template');
    expect(templateNode).toBeDefined();
    expect(templateNode.name).toBe('NavButton');
  });

  it('Parses object using template', () => {
    const source = `composition "UI" {
      object "PrevButton" using "NavButton" {
        position: [-0.5, 0, 0]
        text: "<"
      }
    }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    const objNode = result.ast.root.children?.find((c: any) => c.type === 'object');
    expect(objNode).toBeDefined();
    expect(objNode.properties.__templateRef).toBe('NavButton');
  });
});

describe('HoloScriptPlusParser - Simple Traits', () => {
  const parser = new HoloScriptPlusParser({ enableVRTraits: true });

  it('Parses @animated trait', () => {
    const source = `object "Character" @animated(default: "idle") { model: "char.glb" }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    expect(result.ast.root.traits.has('animated')).toBe(true);
  });

  it('Parses @billboard trait', () => {
    const source = `object "Label" @billboard(axis: "y") { text: "Hello" }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    expect(result.ast.root.traits.has('billboard')).toBe(true);
  });

  it('Parses @rotating trait', () => {
    const source = `object "Spinner" @rotating(speed: 20, axis: "y") { geometry: "box" }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    expect(result.ast.root.traits.has('rotating')).toBe(true);
  });

  it('Parses @collidable trait', () => {
    const source = `object "Floor" @collidable { geometry: "box" }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
    expect(result.ast.root.traits.has('collidable')).toBe(true);
  });

  it('Parses @lod trait with config', () => {
    const source = `object "Building" @lod { distances: [25, 50, 100] }`;
    const result = parser.parse(source);
    expect(result.success).toBe(true);
  });
});
