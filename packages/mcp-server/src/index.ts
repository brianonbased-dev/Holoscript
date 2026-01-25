#!/usr/bin/env node
/**
 * @holoscript/mcp-server
 * 
 * Model Context Protocol server for HoloScript language tooling.
 * Enables AI agents to parse, validate, and generate HoloScript code.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  HoloScriptPlusParser,
  HoloCompositionParser,
  HoloScriptValidator,
  HoloScriptCodeParser,
  VR_TRAITS,
} from '@holoscript/core';

// =====================================================
// TOOL DEFINITIONS
// =====================================================

const tools: Tool[] = [
  // =====================================================
  // PARSING TOOLS
  // =====================================================
  {
    name: 'parse_hs',
    description: 'Parse .hs or .hsplus HoloScript code and return the AST. Use for object-centric syntax (orb {}, connect, function).',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript (.hs/.hsplus) code to parse',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'parse_holo',
    description: 'Parse .holo composition code and return the AST. Use for scene-centric syntax (composition {}, environment {}, template {}).',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '.holo composition code to parse',
        },
        strict: {
          type: 'boolean',
          description: 'If true, throws on errors. If false, returns partial AST with errors.',
          default: false,
        },
      },
      required: ['code'],
    },
  },

  // =====================================================
  // VALIDATION TOOLS
  // =====================================================
  {
    name: 'validate_holoscript',
    description: 'Validate HoloScript code for syntax errors, unknown traits, and semantic issues. Works with .hs, .hsplus, and .holo files.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to validate',
        },
        format: {
          type: 'string',
          enum: ['hs', 'hsplus', 'holo'],
          description: 'File format (defaults to auto-detect)',
        },
      },
      required: ['code'],
    },
  },

  // =====================================================
  // TRAIT TOOLS
  // =====================================================
  {
    name: 'list_traits',
    description: 'List all available VR traits with descriptions. Use to discover what traits can be applied to objects.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['interaction', 'physics', 'visual', 'networking', 'behavior', 'spatial', 'audio', 'state', 'all'],
          description: 'Filter by trait category',
          default: 'all',
        },
      },
    },
  },
  {
    name: 'explain_trait',
    description: 'Get detailed documentation for a specific VR trait including parameters and examples.',
    inputSchema: {
      type: 'object',
      properties: {
        trait: {
          type: 'string',
          description: 'Trait name (e.g., "grabbable", "collidable", "networked")',
        },
      },
      required: ['trait'],
    },
  },
  {
    name: 'suggest_traits',
    description: 'Suggest appropriate VR traits based on object description or use case.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of what the object should do (e.g., "a sword the player can pick up and swing")',
        },
      },
      required: ['description'],
    },
  },

  // =====================================================
  // CODE GENERATION TOOLS
  // =====================================================
  {
    name: 'generate_object',
    description: 'Generate a HoloScript object definition from a natural language description.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Natural language description of the object (e.g., "a glowing blue orb that can be grabbed")',
        },
        format: {
          type: 'string',
          enum: ['hs', 'hsplus', 'holo'],
          description: 'Output format',
          default: 'hsplus',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'generate_scene',
    description: 'Generate a complete .holo scene composition from a description.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the scene (e.g., "a medieval marketplace with NPCs selling potions")',
        },
        includeLogic: {
          type: 'boolean',
          description: 'Include event handlers and logic',
          default: true,
        },
      },
      required: ['description'],
    },
  },

  // =====================================================
  // DOCUMENTATION TOOLS
  // =====================================================
  {
    name: 'get_syntax_reference',
    description: 'Get syntax reference for HoloScript constructs.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['orb', 'function', 'connect', 'state', 'template', 'composition', 'environment', 'spatial_group', 'logic', 'traits', 'all'],
          description: 'Syntax topic to get reference for',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'get_examples',
    description: 'Get example HoloScript code for common patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          enum: ['hello_world', 'grabbable_object', 'networked_player', 'npc_behavior', 'ui_panel', 'physics_simulation', 'procedural_generation', 'all'],
          description: 'Pattern to get examples for',
        },
      },
      required: ['pattern'],
    },
  },

  // =====================================================
  // ANALYSIS TOOLS
  // =====================================================
  {
    name: 'analyze_code',
    description: 'Analyze HoloScript code and return statistics, complexity metrics, and improvement suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to analyze',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'explain_code',
    description: 'Explain what a HoloScript code snippet does in plain English.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to explain',
        },
      },
      required: ['code'],
    },
  },
];

// =====================================================
// TRAIT DATA
// =====================================================

const traitCategories: Record<string, string[]> = {
  interaction: ['grabbable', 'throwable', 'holdable', 'clickable', 'hoverable', 'draggable'],
  physics: ['collidable', 'physics', 'rigid', 'kinematic', 'trigger', 'gravity'],
  visual: ['glowing', 'emissive', 'transparent', 'reflective', 'animated', 'billboard'],
  networking: ['networked', 'synced', 'persistent', 'owned', 'host_only'],
  behavior: ['stackable', 'attachable', 'equippable', 'consumable', 'destructible'],
  spatial: ['anchor', 'tracked', 'world_locked', 'hand_tracked', 'eye_tracked'],
  audio: ['spatial_audio', 'ambient', 'voice_activated'],
  state: ['state', 'reactive', 'observable', 'computed'],
};

const traitDocs: Record<string, { description: string; params?: Record<string, string>; example: string }> = {
  grabbable: {
    description: 'Makes an object grabbable by VR controllers or hand tracking.',
    params: {
      snap_to_hand: 'If true, object snaps to hand position when grabbed',
      two_handed: 'Requires both hands to grab',
      grab_distance: 'Maximum distance from which object can be grabbed',
    },
    example: `orb item {
  @grabbable(snap_to_hand: true)
  position: [0, 1, 0]
}`,
  },
  throwable: {
    description: 'Allows a grabbed object to be thrown with physics.',
    params: {
      velocity_multiplier: 'Multiplier for throw velocity',
      bounce: 'If true, object bounces on collision',
    },
    example: `orb ball {
  @grabbable
  @throwable(velocity_multiplier: 1.5, bounce: true)
  position: [0, 1, 0]
}`,
  },
  collidable: {
    description: 'Enables collision detection with other objects.',
    params: {
      layer: 'Collision layer for filtering',
      on_collide: 'Event handler for collision',
    },
    example: `orb wall {
  @collidable(layer: "solid")
  position: [0, 0, 0]
  scale: [10, 3, 0.5]
}`,
  },
  networked: {
    description: 'Synchronizes object state across network for multiplayer.',
    params: {
      sync_rate: 'Updates per second (e.g., "20hz")',
      interpolation: 'Interpolation method for smooth movement',
    },
    example: `orb player {
  @networked(sync_rate: "20hz")
  @grabbable
  position: synced
}`,
  },
  glowing: {
    description: 'Makes object emit light/glow effect.',
    params: {
      intensity: 'Glow intensity (0-1)',
      color: 'Glow color',
    },
    example: `orb crystal {
  @glowing(intensity: 0.8, color: "#00ffff")
  position: [0, 1, 0]
}`,
  },
  // Add more as needed
};

const syntaxReference: Record<string, string> = {
  orb: `## orb {} - Object Definition

The fundamental building block in HoloScript. Defines a 3D object with properties.

\`\`\`hsplus
orb <name> {
  position: [x, y, z]
  rotation: [rx, ry, rz]
  scale: [sx, sy, sz] | <scalar>
  color: "<hex>" | [r, g, b]
  model: "<path.glb>"
  @trait(param: value)
}
\`\`\`

Example:
\`\`\`hsplus
orb player {
  position: [0, 1.6, 0]
  color: "#00ffff"
  @grabbable
  @collidable
}
\`\`\``,

  function: `## function - Reusable Logic

Define reusable functions.

\`\`\`hsplus
function <name>(<params>) {
  // statements
}
\`\`\`

Example:
\`\`\`hsplus
function attack(target, damage) {
  target.health -= damage
  if target.health <= 0 {
    target.destroy()
  }
}
\`\`\``,

  connect: `## connect - Wire Objects Together

Create relationships between objects.

\`\`\`hsplus
connect <source> to <target> as "<relationship>"
\`\`\`

Example:
\`\`\`hsplus
connect inventory to player as "items"
connect sword to player.rightHand as "equipped"
\`\`\``,

  state: `## state {} - Reactive State

Define reactive state that automatically updates UI/logic.

\`\`\`hsplus
orb player {
  state {
    health: 100
    isAlive: true
    inventory: []
  }
}
\`\`\``,

  composition: `## composition {} - Scene Container (.holo)

Root container for .holo files. Defines entire scene.

\`\`\`holo
composition "Scene Name" {
  environment { ... }
  template "Type" { ... }
  spatial_group "Area" { ... }
  logic { ... }
}
\`\`\``,

  environment: `## environment {} - World Settings

Define skybox, lighting, physics for scene.

\`\`\`holo
environment {
  skybox: "nebula" | "sunset" | "studio"
  ambient_light: 0.3
  gravity: [0, -9.8, 0]
  fog: { color: "#ffffff", density: 0.01 }
}
\`\`\``,

  template: `## template {} - Reusable Object Blueprints

Define templates for object instantiation.

\`\`\`holo
template "Enemy" {
  state { health: 100, damage: 10 }
  action attack(target) {
    target.health -= this.damage
  }
}

object "Goblin" using "Enemy" {
  position: [0, 0, 5]
  health: 50  // Override default
}
\`\`\``,

  spatial_group: `## spatial_group {} - Object Grouping

Group objects by location or purpose.

\`\`\`holo
spatial_group "Marketplace" {
  position: [100, 0, 50]
  
  object "Vendor_1" { position: [0, 0, 0] }
  object "Vendor_2" { position: [5, 0, 0] }
  object "Stall_Items" { ... }
}
\`\`\``,

  logic: `## logic {} - Event Handlers

Define event-driven behavior.

\`\`\`holo
logic {
  on_start {
    spawn_enemies(5)
  }
  
  on_player_attack(enemy) {
    enemy.health -= player.damage
    play_sound("hit.wav")
  }
  
  on_enemy_death(enemy) {
    drop_loot(enemy.position)
    player.xp += enemy.xp_value
  }
}
\`\`\``,

  traits: `## @traits - VR Behavior Annotations

Apply traits to objects for VR interactions.

**Interaction:** @grabbable, @throwable, @holdable, @clickable, @hoverable, @draggable
**Physics:** @collidable, @physics, @rigid, @kinematic, @trigger, @gravity
**Visual:** @glowing, @emissive, @transparent, @reflective, @animated, @billboard
**Networking:** @networked, @synced, @persistent, @owned, @host_only
**Behavior:** @stackable, @attachable, @equippable, @consumable, @destructible

Example:
\`\`\`hsplus
orb sword {
  @grabbable(two_handed: true)
  @collidable(layer: "weapon")
  @glowing(color: "#ff4444")
  model: "sword.glb"
}
\`\`\``,

  all: '', // Will be populated dynamically
};

const codeExamples: Record<string, string> = {
  hello_world: `// Hello World - Basic .hsplus
orb greeting {
  position: [0, 1.5, -2]
  color: "#00ffff"
  @glowing(intensity: 0.5)
}

orb text_label {
  position: [0, 2, -2]
  text: "Hello, VR World!"
  font_size: 0.3
}`,

  grabbable_object: `// Grabbable Object with Physics
orb ball {
  position: [0, 1, -1]
  scale: 0.1
  color: "#ff6600"
  
  @grabbable(snap_to_hand: false)
  @throwable(velocity_multiplier: 1.5)
  @collidable
  @physics(mass: 0.5)
  @glowing(intensity: 0.3)
}`,

  networked_player: `// Networked Multiplayer Player
orb player {
  position: synced
  rotation: synced
  
  @networked(sync_rate: "30hz")
  @collidable(layer: "player")
  
  state {
    health: 100
    name: ""
    team: "none"
  }
  
  model: "player_avatar.glb"
}`,

  npc_behavior: `// NPC with Behavior (.holo)
composition "NPC Demo" {
  template "NPC" {
    state {
      health: 100
      mood: "neutral"
      dialogue: []
    }
    
    action greet(player) {
      this.mood = "friendly"
      speak(this.dialogue.greeting)
    }
    
    action take_damage(amount) {
      this.health -= amount
      this.mood = "hostile"
    }
  }
  
  object "Shopkeeper" using "NPC" {
    position: [0, 0, 5]
    dialogue: {
      greeting: "Welcome to my shop!"
      farewell: "Come again!"
    }
  }
  
  logic {
    on_player_approach(npc, distance) {
      if distance < 2 {
        npc.greet(player)
      }
    }
  }
}`,

  ui_panel: `// UI Panel with Buttons
orb ui_panel {
  position: [0, 1.5, -1]
  @billboard  // Always faces user
  
  children: [
    orb title {
      text: "Settings"
      font_size: 0.15
      position: [0, 0.3, 0]
    },
    orb button_sound {
      @clickable
      text: "Sound: ON"
      position: [0, 0.1, 0]
      on_click: toggle_sound
    },
    orb button_music {
      @clickable
      text: "Music: ON"
      position: [0, -0.1, 0]
      on_click: toggle_music
    }
  ]
}`,

  physics_simulation: `// Physics Simulation
composition "Physics Demo" {
  environment {
    gravity: [0, -9.8, 0]
  }
  
  spatial_group "Dominoes" {
    @for i in 0..10: {
      object "Domino_\${i}" {
        position: [i * 0.15, 0.5, 0]
        scale: [0.05, 0.2, 0.1]
        @physics(mass: 0.1)
        @collidable
        color: "#3366ff"
      }
    }
  }
  
  object "Trigger_Ball" {
    position: [-0.5, 1, 0]
    scale: 0.1
    @grabbable
    @throwable
    @physics(mass: 0.5)
    @collidable
    color: "#ff3333"
  }
}`,

  procedural_generation: `// Procedural Forest Generation
composition "Procedural Forest" {
  environment {
    skybox: "sunset"
    ambient_light: 0.4
  }
  
  template "Tree" {
    model: "tree_pine.glb"
    @collidable
    scale: random(0.8, 1.5)
  }
  
  spatial_group "Forest" {
    @for i in 0..50: {
      object "Tree_\${i}" using "Tree" {
        position: [
          random(-20, 20),
          0,
          random(-20, 20)
        ]
        rotation: [0, random(0, 360), 0]
      }
    }
  }
}`,

  all: '', // Will be populated dynamically
};

// =====================================================
// TOOL HANDLERS
// =====================================================

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    // PARSING
    case 'parse_hs': {
      const parser = new HoloScriptPlusParser();
      const result = parser.parse(args.code as string);
      return JSON.stringify(result, null, 2);
    }

    case 'parse_holo': {
      const parser = new HoloCompositionParser();
      const result = parser.parse(args.code as string);
      return JSON.stringify(result, null, 2);
    }

    // VALIDATION
    case 'validate_holoscript': {
      const code = args.code as string;
      const format = args.format as string | undefined;
      
      // Auto-detect format
      const detectedFormat = format || (
        code.includes('composition') ? 'holo' :
        code.includes('@') ? 'hsplus' : 'hs'
      );
      
      const errors: Array<{ line: number; message: string; severity: string }> = [];
      
      try {
        if (detectedFormat === 'holo') {
          const parser = new HoloCompositionParser();
          const result = parser.parse(code);
          if (result.errors) {
            errors.push(...result.errors.map(e => ({
              line: e.loc?.line || 0,
              message: e.message,
              severity: 'error',
            })));
          }
        } else {
          const parser = new HoloScriptPlusParser();
          const result = parser.parse(code);
          if (result.errors) {
            errors.push(...result.errors.map((e: any) => ({
              line: e.line || 0,
              message: e.message || String(e),
              severity: 'error',
            })));
          }
        }
      } catch (e: any) {
        errors.push({ line: 0, message: e.message, severity: 'error' });
      }
      
      return JSON.stringify({
        valid: errors.length === 0,
        format: detectedFormat,
        errors,
        message: errors.length === 0 ? 'Code is valid!' : `Found ${errors.length} issue(s)`,
      }, null, 2);
    }

    // TRAITS
    case 'list_traits': {
      const category = (args.category as string) || 'all';
      
      if (category === 'all') {
        return JSON.stringify(traitCategories, null, 2);
      }
      
      const traits = traitCategories[category];
      if (!traits) {
        return JSON.stringify({ error: `Unknown category: ${category}` });
      }
      
      return JSON.stringify({ [category]: traits }, null, 2);
    }

    case 'explain_trait': {
      const trait = (args.trait as string).replace('@', '').toLowerCase();
      const docs = traitDocs[trait];
      
      if (!docs) {
        // Check if trait exists in categories
        const exists = Object.values(traitCategories).flat().includes(trait);
        if (exists) {
          return JSON.stringify({
            trait: `@${trait}`,
            description: `The @${trait} trait. (Documentation pending)`,
            example: `orb obj {\n  @${trait}\n  position: [0, 0, 0]\n}`,
          }, null, 2);
        }
        return JSON.stringify({ error: `Unknown trait: @${trait}` });
      }
      
      return JSON.stringify({
        trait: `@${trait}`,
        ...docs,
      }, null, 2);
    }

    case 'suggest_traits': {
      const desc = (args.description as string).toLowerCase();
      const suggestions: string[] = [];
      
      // Simple keyword matching
      if (desc.includes('grab') || desc.includes('pick up') || desc.includes('hold')) {
        suggestions.push('@grabbable');
      }
      if (desc.includes('throw') || desc.includes('toss')) {
        suggestions.push('@throwable');
      }
      if (desc.includes('glow') || desc.includes('light') || desc.includes('emit')) {
        suggestions.push('@glowing');
      }
      if (desc.includes('collide') || desc.includes('solid') || desc.includes('wall')) {
        suggestions.push('@collidable');
      }
      if (desc.includes('physics') || desc.includes('fall') || desc.includes('bounce')) {
        suggestions.push('@physics');
      }
      if (desc.includes('network') || desc.includes('multiplayer') || desc.includes('sync')) {
        suggestions.push('@networked');
      }
      if (desc.includes('click') || desc.includes('button') || desc.includes('press')) {
        suggestions.push('@clickable');
      }
      if (desc.includes('drag') || desc.includes('move')) {
        suggestions.push('@draggable');
      }
      if (desc.includes('equip') || desc.includes('wear') || desc.includes('sword') || desc.includes('weapon')) {
        suggestions.push('@equippable');
      }
      if (desc.includes('destroy') || desc.includes('break')) {
        suggestions.push('@destructible');
      }
      
      return JSON.stringify({
        description: args.description,
        suggested_traits: suggestions.length > 0 ? suggestions : ['@collidable (default)'],
        note: 'These are suggestions based on keywords. Consider your specific use case.',
      }, null, 2);
    }

    // CODE GENERATION
    case 'generate_object': {
      const desc = (args.description as string).toLowerCase();
      const format = (args.format as string) || 'hsplus';
      
      // Extract object type from description
      const objectName = desc.match(/(?:a |an |the )?(\w+)/)?.[1] || 'object';
      
      // Suggest traits based on description
      const traits: string[] = [];
      if (desc.includes('grab') || desc.includes('pick')) traits.push('@grabbable');
      if (desc.includes('throw')) traits.push('@throwable');
      if (desc.includes('glow') || desc.includes('glowing')) traits.push('@glowing(intensity: 0.5)');
      if (desc.includes('blue')) traits.push('color: "#0066ff"');
      if (desc.includes('red')) traits.push('color: "#ff3333"');
      if (desc.includes('green')) traits.push('color: "#33ff33"');
      if (desc.includes('gold') || desc.includes('yellow')) traits.push('color: "#ffcc00"');
      
      const code = `orb ${objectName} {
  position: [0, 1, -2]
${traits.map(t => `  ${t}`).join('\n')}
}`;
      
      return JSON.stringify({
        description: args.description,
        format,
        code,
      }, null, 2);
    }

    case 'generate_scene': {
      const desc = args.description as string;
      const includeLogic = args.includeLogic !== false;
      
      // Generate a basic scene structure
      const sceneName = desc.slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, '');
      
      const code = `composition "${sceneName}" {
  environment {
    skybox: "studio"
    ambient_light: 0.4
  }

  // TODO: Add templates based on description
  template "Object" {
    state { }
  }

  spatial_group "Main" {
    object "Object_1" using "Object" {
      position: [0, 0, 0]
    }
  }
${includeLogic ? `
  logic {
    on_start {
      // Initialize scene
    }
  }` : ''}
}`;
      
      return JSON.stringify({
        description: args.description,
        code,
        note: 'This is a basic scaffold. Customize templates and objects as needed.',
      }, null, 2);
    }

    // DOCUMENTATION
    case 'get_syntax_reference': {
      const topic = args.topic as string;
      
      if (topic === 'all') {
        const allTopics = Object.entries(syntaxReference)
          .filter(([k]) => k !== 'all')
          .map(([k, v]) => v)
          .join('\n\n---\n\n');
        return allTopics;
      }
      
      const ref = syntaxReference[topic];
      if (!ref) {
        return JSON.stringify({ error: `Unknown topic: ${topic}. Available: ${Object.keys(syntaxReference).join(', ')}` });
      }
      
      return ref;
    }

    case 'get_examples': {
      const pattern = args.pattern as string;
      
      if (pattern === 'all') {
        return Object.entries(codeExamples)
          .filter(([k]) => k !== 'all')
          .map(([k, v]) => `## ${k}\n\n\`\`\`hsplus\n${v}\n\`\`\``)
          .join('\n\n---\n\n');
      }
      
      const example = codeExamples[pattern];
      if (!example) {
        return JSON.stringify({ error: `Unknown pattern: ${pattern}. Available: ${Object.keys(codeExamples).join(', ')}` });
      }
      
      return `\`\`\`hsplus\n${example}\n\`\`\``;
    }

    // ANALYSIS
    case 'analyze_code': {
      const code = args.code as string;
      
      // Simple analysis
      const lines = code.split('\n').length;
      const orbCount = (code.match(/orb\s+\w+/g) || []).length;
      const functionCount = (code.match(/function\s+\w+/g) || []).length;
      const traitCount = (code.match(/@\w+/g) || []).length;
      const templateCount = (code.match(/template\s+"/g) || []).length;
      const hasComposition = code.includes('composition');
      
      return JSON.stringify({
        lines,
        objects: orbCount,
        functions: functionCount,
        traits: traitCount,
        templates: templateCount,
        format: hasComposition ? 'holo' : 'hsplus',
        complexity: orbCount + functionCount * 2 + templateCount * 3,
        suggestions: [
          orbCount > 20 ? 'Consider using templates to reduce duplication' : null,
          traitCount === 0 ? 'Add VR traits for interactivity (@grabbable, @collidable, etc.)' : null,
          !hasComposition && orbCount > 5 ? 'Consider using .holo format for better scene organization' : null,
        ].filter(Boolean),
      }, null, 2);
    }

    case 'explain_code': {
      const code = args.code as string;
      const lines = code.split('\n');
      
      const explanations: string[] = [];
      
      // Simple pattern matching for explanation
      if (code.includes('composition')) {
        const name = code.match(/composition\s+"([^"]+)"/)?.[1];
        explanations.push(`This is a .holo scene composition${name ? ` named "${name}"` : ''}.`);
      }
      
      const orbs = code.match(/orb\s+(\w+)/g) || [];
      if (orbs.length > 0) {
        explanations.push(`Defines ${orbs.length} object(s): ${orbs.map(o => o.replace('orb ', '')).join(', ')}.`);
      }
      
      const traits = code.match(/@(\w+)/g) || [];
      if (traits.length > 0) {
        const uniqueTraits = [...new Set(traits)];
        explanations.push(`Uses VR traits: ${uniqueTraits.join(', ')}.`);
      }
      
      if (code.includes('state {')) {
        explanations.push('Contains reactive state for dynamic behavior.');
      }
      
      if (code.includes('function ')) {
        const funcs = code.match(/function\s+(\w+)/g) || [];
        explanations.push(`Defines ${funcs.length} function(s).`);
      }
      
      if (code.includes('logic {')) {
        explanations.push('Includes event handlers for interactive behavior.');
      }
      
      return explanations.length > 0 
        ? explanations.join('\n')
        : 'This appears to be HoloScript code. Parse it for detailed structure.';
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// =====================================================
// SERVER SETUP
// =====================================================

const server = new Server(
  {
    name: 'holoscript-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs || {}) as Record<string, unknown>;

  try {
    const result = await handleTool(name, args);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HoloScript MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
