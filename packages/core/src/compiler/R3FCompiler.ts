import { HSPlusAST, ASTNode, HSPlusDirective, VRTraitName } from '../types';
import { TraitVisualRegistry } from '../traits/visual/TraitVisualRegistry';
// Side-effect import: registers all preset visuals into the registry
import '../traits/visual';

export interface R3FNode {
  type: string;
  id?: string;
  props: Record<string, any>;
  children?: R3FNode[];
  traits?: Map<VRTraitName, any>;
  directives?: HSPlusDirective[];
}

/**
 * Material presets mapping surface names to Three.js PBR properties.
 */
export const MATERIAL_PRESETS: Record<string, Record<string, any>> = {
  plastic: { roughness: 0.5, metalness: 0.0, clearcoat: 0.1 },
  metal: { roughness: 0.2, metalness: 1.0 },
  chrome: { roughness: 0.05, metalness: 1.0, envMapIntensity: 1.5 },
  gold: { roughness: 0.3, metalness: 1.0, color: '#ffd700' },
  copper: { roughness: 0.4, metalness: 1.0, color: '#b87333' },
  glass: {
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.95,
    ior: 1.5,
    thickness: 0.5,
    transparent: true,
  },
  crystal: {
    roughness: 0.0,
    metalness: 0.1,
    transmission: 0.9,
    ior: 2.0,
    iridescence: 1.0,
    iridescenceIOR: 1.3,
  },
  wood: { roughness: 0.8, metalness: 0.0 },
  fabric: { roughness: 0.95, metalness: 0.0 },
  rubber: { roughness: 0.9, metalness: 0.0 },
  leather: { roughness: 0.7, metalness: 0.0 },
  water: {
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.9,
    ior: 1.33,
    transparent: true,
    color: '#006994',
  },
  emissive: { roughness: 0.5, metalness: 0.0, emissiveIntensity: 2.0 },
  hologram: {
    roughness: 0.0,
    metalness: 0.3,
    transparent: true,
    opacity: 0.6,
    emissiveIntensity: 1.0,
  },
};

export const ENVIRONMENT_PRESETS: Record<string, any> = {
  forest_sunset: {
    background: true,
    envPreset: 'sunset',
    fog: { color: '#ff9966', near: 10, far: 100 },
    ground: { color: '#2d5a27' },
    lighting: {
      ambient: { color: '#ffa366', intensity: 0.3 },
      directional: { color: '#ff7700', intensity: 1.5, position: [10, 20, 5], shadows: true },
    },
  },
  cyberpunk_city: {
    background: true,
    envPreset: 'night',
    fog: { color: '#0a0020', near: 5, far: 60 },
    ground: { color: '#1a1a2e' },
    lighting: {
      ambient: { color: '#220044', intensity: 0.2 },
      directional: { color: '#ff00ff', intensity: 0.5, position: [5, 15, 5], shadows: true },
      points: [
        { color: '#00ffff', intensity: 3, position: [-5, 3, -5], distance: 15 },
        { color: '#ff00ff', intensity: 3, position: [5, 3, 5], distance: 15 },
      ],
    },
    postprocessing: { bloom: { intensity: 1.5, luminanceThreshold: 0.1 } },
  },
  space_void: {
    background: true,
    envPreset: 'night',
    lighting: {
      ambient: { color: '#111133', intensity: 0.1 },
      directional: { color: '#ffffff', intensity: 0.5, position: [0, 10, 0], shadows: false },
    },
  },
  studio: {
    background: true,
    envPreset: 'studio',
    ground: { color: '#cccccc' },
    lighting: {
      ambient: { color: '#ffffff', intensity: 0.4 },
      directional: { color: '#ffffff', intensity: 1.0, position: [5, 10, 5], shadows: true },
    },
  },
  underwater: {
    background: true,
    envPreset: 'dawn',
    fog: { color: '#003366', near: 2, far: 40 },
    ground: { color: '#1a3a4a' },
    lighting: {
      ambient: { color: '#004488', intensity: 0.3 },
      directional: { color: '#66aacc', intensity: 0.8, position: [0, 20, 0], shadows: true },
    },
  },
  desert: {
    background: true,
    envPreset: 'sunset',
    fog: { color: '#d4a574', near: 20, far: 150 },
    ground: { color: '#c4a35a' },
    lighting: {
      ambient: { color: '#f5deb3', intensity: 0.4 },
      directional: { color: '#ffffcc', intensity: 2.0, position: [15, 30, 10], shadows: true },
    },
  },
};

// Geometry types that compile to <mesh> with a specific child geometry
const MESH_TYPES = new Set([
  'orb',
  'sphere',
  'cube',
  'box',
  'cylinder',
  'pyramid',
  'cone',
  'plane',
  'torus',
  'ring',
  'capsule',
  'object',
  'avatar',
  'dna',
  'gaussian_splat',
  'splat',
  'nerf',
  'volumetric_video',
]);

/**
 * UI Component presets for @react-three/uikit mapping.
 * Maps HoloScript UI components to uikit component configurations.
 */
export const UI_COMPONENT_PRESETS: Record<
  string,
  { component: string; defaultProps: Record<string, any> }
> = {
  UIPanel: {
    component: 'Container', // @react-three/uikit Container
    defaultProps: {
      flexDirection: 'column',
      padding: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 8,
    },
  },
  UIText: {
    component: 'Text', // @react-three/uikit Text
    defaultProps: {
      fontSize: 16,
      color: 'white',
    },
  },
  UIButton: {
    component: 'Button', // Custom button using Container with hover
    defaultProps: {
      padding: 12,
      paddingX: 24,
      backgroundColor: '#4a90d9',
      borderRadius: 4,
      cursor: 'pointer',
    },
  },
  UISlider: {
    component: 'Slider', // Custom slider implementation
    defaultProps: {
      width: 200,
      height: 20,
      trackColor: '#333',
      fillColor: '#4a90d9',
      thumbSize: 16,
    },
  },
  UIInput: {
    component: 'Input', // @react-three/uikit Input
    defaultProps: {
      width: 200,
      padding: 8,
      backgroundColor: '#222',
      borderColor: '#444',
      borderWidth: 1,
      borderRadius: 4,
      color: 'white',
    },
  },
  UIImage: {
    component: 'Image', // @react-three/uikit Image
    defaultProps: {
      objectFit: 'contain',
    },
  },
  UIChart: {
    component: 'Chart', // Custom chart component
    defaultProps: {
      width: 300,
      height: 200,
      backgroundColor: '#1a1a2e',
    },
  },
  UIGauge: {
    component: 'Gauge', // Custom gauge component
    defaultProps: {
      size: 100,
      strokeWidth: 8,
      trackColor: '#333',
      fillColor: '#4a90d9',
    },
  },
};

/**
 * R3FCompiler
 *
 * Translates HoloScript AST into R3F node trees for React Three Fiber rendering.
 * Handles both HSPlusAST (from HoloScriptPlusParser) and HoloComposition AST
 * (from HoloCompositionParser/.holo files).
 */
export class R3FCompiler {
  // ─── Spread Expansion Utility ─────────────────────────────────────────

  /**
   * Expands spread expressions in a properties object.
   * Spreads are stored with keys like `__spread_0`, `__spread_1` and have
   * the structure: { type: 'spread', argument: <value> }
   *
   * @param props - The properties object potentially containing spreads
   * @param context - Optional context for resolving references (templates, state)
   * @returns A new object with spreads expanded and merged
   */
  private expandSpreads(
    props: Record<string, any>,
    context?: { templates?: Map<string, any>; state?: Record<string, any> }
  ): Record<string, any> {
    const result: Record<string, any> = {};
    const spreadKeys: string[] = [];

    // First pass: collect spread keys and non-spread properties
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('__spread_')) {
        spreadKeys.push(key);
      } else if (value && typeof value === 'object' && value.type === 'spread') {
        // Handle spread stored as a regular property value
        spreadKeys.push(key);
      } else {
        // Recursively expand spreads in nested objects
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !('__ref' in value) &&
          !('__expr' in value)
        ) {
          result[key] = this.expandSpreads(value, context);
        } else if (Array.isArray(value)) {
          // Handle arrays - expand spreads within array items
          result[key] = this.expandArraySpreads(value, context);
        } else {
          result[key] = value;
        }
      }
    }

    // Second pass: expand and merge spreads in order
    for (const spreadKey of spreadKeys) {
      const spreadValue = props[spreadKey];
      if (spreadValue && typeof spreadValue === 'object' && spreadValue.type === 'spread') {
        const resolved = this.resolveSpreadArgument(spreadValue.argument, context);
        if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
          // Merge spread properties - spread comes first, explicit props override
          Object.assign(result, this.expandSpreads(resolved, context));
        }
      }
    }

    // Re-apply non-spread properties to ensure they override spread values
    for (const [key, value] of Object.entries(props)) {
      if (
        !key.startsWith('__spread_') &&
        !(value && typeof value === 'object' && value.type === 'spread')
      ) {
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !('__ref' in value) &&
          !('__expr' in value)
        ) {
          result[key] = this.expandSpreads(value, context);
        } else if (Array.isArray(value)) {
          result[key] = this.expandArraySpreads(value, context);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Expands spread expressions within an array.
   * Spread elements have { type: 'spread', argument: <value> }
   */
  private expandArraySpreads(
    arr: any[],
    context?: { templates?: Map<string, any>; state?: Record<string, any> }
  ): any[] {
    const result: any[] = [];

    for (const item of arr) {
      if (item && typeof item === 'object' && item.type === 'spread') {
        const resolved = this.resolveSpreadArgument(item.argument, context);
        if (Array.isArray(resolved)) {
          result.push(...resolved);
        } else if (resolved !== undefined && resolved !== null) {
          // If spread target isn't an array, just include it as-is
          result.push(resolved);
        }
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        // Recursively expand spreads in nested objects
        result.push(this.expandSpreads(item, context));
      } else {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Resolves a spread argument to its value.
   * Handles: direct values, __ref references, template references
   */
  private resolveSpreadArgument(
    argument: any,
    context?: { templates?: Map<string, any>; state?: Record<string, any> }
  ): any {
    if (argument === null || argument === undefined) {
      return undefined;
    }

    // Direct object/array value
    if (typeof argument === 'object' && !('__ref' in argument)) {
      return argument;
    }

    // Reference: { __ref: 'path.to.value' }
    if (typeof argument === 'object' && '__ref' in argument) {
      const ref = argument.__ref as string;

      // Try to resolve from templates
      if (context?.templates) {
        const template = context.templates.get(ref);
        if (template) {
          return template.properties || template;
        }
      }

      // Try to resolve from state
      if (context?.state && ref in context.state) {
        return context.state[ref];
      }

      // Try dotted path resolution in state
      if (context?.state && ref.includes('.')) {
        const parts = ref.split('.');
        let value: any = context.state;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        if (value !== undefined) {
          return value;
        }
      }

      // Return the reference as-is for runtime resolution
      return argument;
    }

    // String reference (template name)
    if (typeof argument === 'string') {
      if (context?.templates) {
        const template = context.templates.get(argument);
        if (template) {
          return template.properties || template;
        }
      }
      // Return as reference for runtime resolution
      return { __ref: argument };
    }

    return argument;
  }

  // ─── HSPlusAST Compilation ────────────────────────────────────────────

  public compile(ast: HSPlusAST): R3FNode {
    const root = this.compileNode(ast.root);

    if (this.hasPostProcessing(root)) {
      root.children?.unshift({
        type: 'EffectComposer',
        props: {},
        children: this.extractPostProcessingNodes(root),
      });
    }

    this.injectDefaultLighting(root);
    return root;
  }

  public compileNode(node: ASTNode): R3FNode {
    const rawProps = (node as any).properties || {};
    const type = this.mapType(node.type, rawProps);

    const r3fNode: R3FNode = {
      type,
      id: (node as any).id || (node as any).name,
      props: this.compileProperties(node, rawProps),
      children: [],
      traits: new Map(),
      directives: node.directives || [],
    };

    if (node.directives) {
      for (const directive of node.directives) {
        if (directive.type === 'trait') {
          r3fNode.traits?.set(directive.name as any, directive.config);
        }
      }
    }

    const enhanced = node as any;
    if (enhanced.graphics) {
      this.applyGraphicsConfig(r3fNode, enhanced.graphics);
    }

    if (enhanced.children && Array.isArray(enhanced.children)) {
      r3fNode.children = enhanced.children.map((child: any) => this.compileNode(child as ASTNode));
    }

    return r3fNode;
  }

  // ─── HoloComposition Compilation (.holo files) ────────────────────────

  public compileComposition(composition: any): R3FNode {
    const root: R3FNode = {
      type: 'group',
      id: composition.name,
      props: {},
      children: [],
      traits: new Map(),
    };

    // Build template map for trait merging
    const templateMap = new Map<string, any>();
    if (composition.templates) {
      for (const tmpl of composition.templates) {
        templateMap.set(tmpl.name, tmpl);
      }
    }

    if (composition.environment) {
      root.children!.push(...this.compileEnvironmentBlock(composition.environment));
    }

    // Compile first-class light blocks
    if (composition.lights) {
      for (const light of composition.lights) {
        root.children!.push(this.compileLightBlock(light));
      }
    }

    if (composition.objects) {
      for (const obj of composition.objects) {
        root.children!.push(this.compileObjectDecl(obj, templateMap));
      }
    }

    if (composition.spatialGroups) {
      for (const group of composition.spatialGroups) {
        root.children!.push(this.compileSpatialGroup(group, templateMap));
      }
    }

    // Compile timelines
    if (composition.timelines) {
      for (const timeline of composition.timelines) {
        root.children!.push(this.compileTimelineBlock(timeline));
      }
    }

    // Compile audio blocks
    if (composition.audio) {
      for (const audio of composition.audio) {
        root.children!.push(this.compileAudioBlock(audio));
      }
    }

    // Compile zones
    if (composition.zones) {
      for (const zone of composition.zones) {
        root.children!.push(this.compileZoneBlock(zone));
      }
    }

    // Compile UI overlay
    if (composition.ui) {
      root.children!.push(this.compileUIBlock(composition.ui));
    }

    // Compile transitions
    if (composition.transitions) {
      for (const transition of composition.transitions) {
        root.children!.push(this.compileTransitionBlock(transition));
      }
    }

    // Compile conditional blocks
    if (composition.conditionals) {
      for (const cond of composition.conditionals) {
        root.children!.push(this.compileConditionalBlock(cond, templateMap));
      }
    }

    // Compile for-each blocks
    if (composition.iterators) {
      for (const iter of composition.iterators) {
        root.children!.push(this.compileForEachBlock(iter, templateMap));
      }
    }

    // Compile first-class camera block
    if (composition.camera) {
      root.children!.push(this.compileCameraBlock(composition.camera));
    }

    // Compile first-class effects block OR auto-detect post-processing
    if (composition.effects) {
      root.children!.unshift(this.compileEffectsBlock(composition.effects));
    } else if (this.hasPostProcessing(root)) {
      root.children!.unshift({
        type: 'EffectComposer',
        props: {},
        children: this.extractPostProcessingNodes(root),
      });
    }

    this.injectDefaultLighting(root);
    return root;
  }

  private compileLightBlock(light: any): R3FNode {
    const lightMapping: Record<string, string> = {
      directional: 'directionalLight',
      point: 'pointLight',
      spot: 'spotLight',
      hemisphere: 'hemisphereLight',
      ambient: 'ambientLight',
      area: 'rectAreaLight',
    };
    const type = lightMapping[light.lightType] || 'directionalLight';
    const props: Record<string, any> = {};

    if (light.properties) {
      for (const prop of light.properties) {
        const key = prop.key;
        const value = prop.value;
        if (key === 'cast_shadow' || key === 'castShadow') {
          props.castShadow = value;
        } else if (key === 'ground_color' || key === 'groundColor') {
          props.groundColor = value;
        } else if (key === 'shadow_map_size') {
          props['shadow-mapSize'] = Array.isArray(value) ? value : [value, value];
        } else {
          props[key] = value;
        }
      }
    }

    // Default castShadow for directional/spot
    if (
      (light.lightType === 'directional' || light.lightType === 'spot') &&
      props.castShadow === undefined
    ) {
      props.castShadow = true;
    }

    return { type, id: light.name, props };
  }

  private compileEffectsBlock(effects: any): R3FNode {
    const children: R3FNode[] = [];
    if (effects.effects) {
      for (const effect of effects.effects) {
        const effectMapping: Record<string, string> = {
          bloom: 'Bloom',
          ssao: 'SSAO',
          vignette: 'Vignette',
          dof: 'DepthOfField',
          chromatic_aberration: 'ChromaticAberration',
          tone_mapping: 'ToneMapping',
          noise: 'Noise',
        };
        const type = effectMapping[effect.effectType] || effect.effectType;
        children.push({ type, props: { ...effect.properties } });
      }
    }
    return { type: 'EffectComposer', props: {}, children };
  }

  private compileCameraBlock(camera: any): R3FNode {
    const props: Record<string, any> = {};
    if (camera.properties) {
      for (const prop of camera.properties) {
        if (prop.key === 'field_of_view' || prop.key === 'fov') {
          props.fov = prop.value;
        } else if (prop.key === 'look_at' || prop.key === 'lookAt') {
          props.lookAt = prop.value;
        } else {
          props[prop.key] = prop.value;
        }
      }
    }
    props.cameraType = camera.cameraType;
    return { type: 'Camera', id: '__camera', props };
  }

  private compileEnvironmentBlock(env: any): R3FNode[] {
    const nodes: R3FNode[] = [];
    const envProps: Record<string, any> = {};

    if (env.properties) {
      for (const prop of env.properties) {
        envProps[prop.key] = prop.value;
      }
    }

    // Environment preset (skybox or preset name)
    const presetName = envProps.skybox || envProps.preset;
    if (presetName) {
      const preset = ENVIRONMENT_PRESETS[presetName];
      if (preset) {
        nodes.push({
          type: 'Environment',
          props: { background: true, preset: preset.envPreset || presetName },
          children: [],
        });

        if (preset.lighting?.ambient) {
          nodes.push({
            type: 'ambientLight',
            props: {
              color: preset.lighting.ambient.color,
              intensity: preset.lighting.ambient.intensity,
            },
          });
        }
        if (preset.lighting?.directional) {
          const dl = preset.lighting.directional;
          nodes.push({
            type: 'directionalLight',
            props: {
              color: dl.color,
              intensity: dl.intensity,
              position: dl.position,
              castShadow: dl.shadows !== false,
              'shadow-mapSize': [2048, 2048],
            },
          });
        }
        if (preset.lighting?.points) {
          for (const pl of preset.lighting.points) {
            nodes.push({
              type: 'pointLight',
              props: {
                color: pl.color,
                intensity: pl.intensity,
                position: pl.position,
                distance: pl.distance,
              },
            });
          }
        }
        if (preset.fog) {
          nodes.push({
            type: 'fog',
            props: {
              attach: 'fog',
              color: preset.fog.color,
              near: preset.fog.near,
              far: preset.fog.far,
            },
          });
        }
        if (preset.ground) {
          nodes.push({
            type: 'mesh',
            id: '__ground',
            props: {
              hsType: 'plane',
              rotation: [-Math.PI / 2, 0, 0],
              position: [0, -0.01, 0],
              receiveShadow: true,
              args: [200, 200],
              color: preset.ground.color,
              materialProps: { roughness: 0.8, metalness: 0.0 },
            },
            children: [],
          });
        }
      } else {
        nodes.push({
          type: 'Environment',
          props: { background: true, preset: presetName },
          children: [],
        });
      }
    }

    // Explicit ambient_light
    if (envProps.ambient_light !== undefined) {
      nodes.push({
        type: 'ambientLight',
        props: {
          intensity: typeof envProps.ambient_light === 'number' ? envProps.ambient_light : 0.5,
        },
      });
    }

    // Explicit fog
    if (envProps.fog && typeof envProps.fog === 'object') {
      nodes.push({
        type: 'fog',
        props: {
          attach: 'fog',
          color: envProps.fog.color || '#cccccc',
          near: envProps.fog.near || 10,
          far: envProps.fog.far || 100,
        },
      });
    }

    return nodes;
  }

  private compileObjectDecl(obj: any, templateMap?: Map<string, any>): R3FNode {
    const props: Record<string, any> = {};
    let geometryType = 'cube';

    // Merge template traits onto the object if it uses a template
    if (obj.template && templateMap) {
      const tmpl = templateMap.get(obj.template);
      if (tmpl) {
        // Merge template traits (object's own traits take precedence)
        if (tmpl.traits && Array.isArray(tmpl.traits)) {
          const existingTraitNames = new Set((obj.traits || []).map((t: any) => t.name));
          obj.traits = [
            ...tmpl.traits.filter((t: any) => !existingTraitNames.has(t.name)),
            ...(obj.traits || []),
          ];
        }
        // Merge template properties (object's own properties take precedence)
        if (tmpl.properties && Array.isArray(tmpl.properties)) {
          const existingKeys = new Set((obj.properties || []).map((p: any) => p.key));
          const mergedProps = tmpl.properties
            .filter((p: any) => !existingKeys.has(p.key))
            .map((p: any) => ({ type: 'ObjectProperty', key: p.key, value: p.value }));
          obj.properties = [...mergedProps, ...(obj.properties || [])];
        }
      }
    }

    // Expand spread expressions in properties (for HoloComposition format)
    if (obj.properties && Array.isArray(obj.properties)) {
      const expandedProperties: any[] = [];
      for (const prop of obj.properties) {
        // Handle spread properties: { type: 'spread', target: 'TemplateName' }
        if (prop && prop.type === 'spread') {
          const resolved = this.resolveSpreadArgument(prop.target || prop.argument, {
            templates: templateMap,
          });
          if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
            // Convert resolved object to property array format
            for (const [key, value] of Object.entries(resolved)) {
              expandedProperties.push({ key, value });
            }
          } else if (Array.isArray(resolved)) {
            // If it's already a property array
            expandedProperties.push(...resolved);
          }
        } else {
          expandedProperties.push(prop);
        }
      }
      obj.properties = expandedProperties;
    }

    if (obj.properties) {
      for (const prop of obj.properties) {
        const key = prop.key;
        const value = prop.value;

        if (key === 'geometry' || key === 'mesh') {
          geometryType = value;
        } else if (key === 'type') {
          // Special types override geometry determination
          if (['text', 'sparkles', 'portal', 'audio'].includes(value)) {
            geometryType = value;
          } else if (
            ['directional', 'point', 'spot', 'hemisphere', 'ambient', 'area'].includes(value)
          ) {
            // Light-type shorthand: type: "directional" implies a light
            geometryType = 'light';
            props.lightType = value;
          } else {
            props[key] = value;
          }
        } else if (key === 'light_type') {
          props.lightType = value;
        } else if (key === 'position' && Array.isArray(value)) {
          props.position = value;
        } else if (key === 'rotation' && Array.isArray(value)) {
          props.rotation = value;
        } else if (key === 'scale') {
          props.scale = Array.isArray(value) ? value : [value, value, value];
        } else if (key === 'color') {
          props.color = value;
        } else if (key === 'src' || key === 'model') {
          props.src = value;
          geometryType = 'model';
        } else if (key === 'text') {
          props.children = this.resolveValue(value);
          props.text = this.resolveValue(value);
        } else if (key === 'font_size') {
          props.fontSize = value;
        } else if (key === 'material') {
          if (typeof value === 'string' && MATERIAL_PRESETS[value]) {
            props.materialProps = { ...MATERIAL_PRESETS[value], ...props.materialProps };
          } else if (typeof value === 'object') {
            // Handle material objects with a preset key: { preset: "glass", color: "#aaddff" }
            if (value.preset && MATERIAL_PRESETS[value.preset]) {
              const { preset: _, ...rest } = value;
              props.materialProps = {
                ...MATERIAL_PRESETS[value.preset],
                ...rest,
                ...props.materialProps,
              };
            } else {
              props.materialProps = { ...props.materialProps, ...value };
            }
          }
        } else if (key === 'roughness' || key === 'metalness' || key === 'metallic') {
          props.materialProps = props.materialProps || {};
          props.materialProps[key === 'metallic' ? 'metalness' : key] = value;
        } else if (key === 'opacity') {
          props.materialProps = props.materialProps || {};
          props.materialProps.opacity = value;
          props.materialProps.transparent = value < 1;
        } else if (key === 'emissive') {
          props.materialProps = { ...props.materialProps, emissive: value };
        } else if (key === 'emissiveIntensity' || key === 'emissive_intensity') {
          props.materialProps = { ...props.materialProps, emissiveIntensity: value };
        } else if (key === 'size') {
          if (Array.isArray(value)) {
            props.args = value;
          }
          props.size = value;
        } else if (key === 'radius') {
          props.size = value * 2;
        } else if (key === 'intensity') {
          props.intensity = value;
        } else if (key === 'cast_shadow' || key === 'castShadow') {
          props.castShadow = value;
        } else if (key === 'receiveShadow' || key === 'receive_shadow') {
          props.receiveShadow = value;
        } else if (key === 'visible') {
          props[key] = value;
        } else {
          props[key] = this.resolveValue(value);
        }
      }
    }

    // Apply traits from .holo format
    if (obj.traits && Array.isArray(obj.traits)) {
      for (const trait of obj.traits) {
        const name = trait.name;
        if (name === 'grabbable') {
          props.castShadow = true;
          props.grabbable = trait.config || true;
          if (!props.rigidBody) props.rigidBody = { type: 'dynamic' };
          if (!props.collider) props.collider = { type: 'auto' };
        } else if (name === 'hoverable') {
          props.hoverable = trait.config || true;
        } else if (name === 'collidable') {
          const bodyType = trait.config?.type || 'fixed';
          props.rigidBody = { type: bodyType };
          props.collider = { type: 'auto' };
          props.castShadow = true;
          props.receiveShadow = true;
        } else if (name === 'animated') {
          props.animated = trait.config || true;
        } else if (name === 'positional' || name === 'spatial_audio') {
          props.spatial = true;
        } else if (name === 'shadow') {
          props.castShadow = true;
          if (trait.config?.mapSize)
            props['shadow-mapSize'] = [trait.config.mapSize, trait.config.mapSize];
        } else if (name === 'material') {
          const presetName = trait.config?.preset;
          if (presetName && MATERIAL_PRESETS[presetName]) {
            const { preset: _, ...rest } = trait.config;
            props.materialProps = {
              ...MATERIAL_PRESETS[presetName],
              ...rest,
              ...props.materialProps,
            };
          } else {
            props.materialProps = { ...props.materialProps, ...trait.config };
          }
        } else if (name === 'networked') {
          props.networked = trait.config || true;
        } else if (name === 'moldable') {
          props.moldable = trait.config || true;
        } else if (name === 'stretchable') {
          props.stretchable = trait.config || true;
        } else if (name === 'bloom') {
          props.bloom = trait.config || { intensity: 1.0 };
        } else if (name === 'physics') {
          if (!props.rigidBody) props.rigidBody = { type: 'dynamic' };
          if (!props.collider) props.collider = { type: 'auto' };
          if (trait.config) Object.assign(props.rigidBody, trait.config);
        } else if (name === 'portal') {
          props.portal = trait.config || true;
        } else if (name === 'attach') {
          props.attach = trait.config || true;
        } else if (name === 'orbit') {
          props.orbit = trait.config || true;
        } else if (name === 'look_at') {
          props.lookAtTarget = trait.config || true;
        } else if (name === 'follow') {
          props.follow = trait.config || true;
        }
        // ── Environment Understanding ─────────────────────────────
        else if (name === 'plane_detection') {
          props.planeDetection = trait.config || { mode: 'all' };
        } else if (name === 'mesh_detection') {
          props.meshDetection = trait.config || { classification: true };
        } else if (name === 'anchor') {
          props.anchor = trait.config || { type: 'spatial' };
        } else if (name === 'persistent_anchor') {
          props.persistentAnchor = trait.config || { storage: 'local' };
        } else if (name === 'shared_anchor') {
          props.sharedAnchor = trait.config || { authority: 'creator' };
        } else if (name === 'occlusion') {
          props.occlusionMode = trait.config?.mode || 'environment';
          props.occlusion = trait.config || true;
        } else if (name === 'light_estimation') {
          props.lightEstimation = trait.config || { auto_apply: true };
        } else if (name === 'geospatial') {
          props.geospatial = trait.config || true;
        }
        // ── Gaussian Splatting & Volumetric ───────────────────────
        else if (name === 'gaussian_splat') {
          props.gaussianSplat = trait.config || true;
        } else if (name === 'nerf') {
          props.nerf = trait.config || true;
        } else if (name === 'volumetric_video') {
          props.volumetricVideo = trait.config || true;
        } else if (name === 'point_cloud') {
          props.pointCloud = trait.config || true;
        } else if (name === 'photogrammetry') {
          props.photogrammetry = trait.config || true;
        }
        // ── Physics Expansion ─────────────────────────────────────
        else if (name === 'cloth') {
          props.cloth = trait.config || { stiffness: 0.8 };
          if (!props.rigidBody) props.rigidBody = { type: 'dynamic' };
        } else if (name === 'fluid') {
          props.fluid = trait.config || { viscosity: 0.01 };
        } else if (name === 'soft_body') {
          props.softBody = trait.config || { elasticity: 0.5 };
          if (!props.rigidBody) props.rigidBody = { type: 'dynamic' };
        } else if (name === 'rope') {
          props.rope = trait.config || { segments: 20 };
        } else if (name === 'chain') {
          props.chain = trait.config || { link_count: 20 };
        } else if (name === 'wind') {
          props.wind = trait.config || { strength: 5.0 };
        } else if (name === 'buoyancy') {
          props.buoyancy = trait.config || { water_level: 0 };
        } else if (name === 'destruction') {
          props.destruction = trait.config || { health: 100 };
          if (!props.rigidBody) props.rigidBody = { type: 'dynamic' };
          if (!props.collider) props.collider = { type: 'auto' };
        }
        // ── Advanced Spatial Audio ────────────────────────────────
        else if (name === 'ambisonics') {
          props.ambisonics = trait.config || { order: 1 };
          props.spatial = true;
        } else if (name === 'hrtf') {
          props.hrtf = trait.config || true;
          props.spatial = true;
        } else if (name === 'reverb_zone') {
          props.reverbZone = trait.config || { preset: 'room' };
        } else if (name === 'audio_occlusion') {
          props.audioOcclusion = trait.config || true;
        } else if (name === 'audio_portal') {
          props.audioPortal = trait.config || true;
        } else if (name === 'head_tracked_audio') {
          props.headTrackedAudio = trait.config || true;
          props.spatial = true;
        }
        // ── Accessibility ─────────────────────────────────────────
        else if (name === 'accessible') {
          props.accessible = trait.config || { role: 'generic' };
        } else if (name === 'alt_text') {
          props.altText = trait.config?.text || '';
        } else if (name === 'magnifiable') {
          props.magnifiable = trait.config || { max_scale: 3.0 };
        } else if (name === 'high_contrast') {
          props.highContrast = trait.config || { mode: 'outline' };
        } else if (name === 'motion_reduced') {
          props.motionReduced = trait.config || true;
          if (props.animated) props.animated = false;
        }
        // ── WebGPU Compute ────────────────────────────────────────
        else if (name === 'compute') {
          props.compute = trait.config || true;
        } else if (name === 'gpu_particle') {
          props.gpuParticle = trait.config || { count: 10000 };
        } else if (name === 'gpu_physics') {
          props.gpuPhysics = trait.config || true;
        }
        // ── Digital Twin & IoT ────────────────────────────────────
        else if (name === 'digital_twin') {
          props.digitalTwin = trait.config || true;
        } else if (name === 'sensor') {
          props.sensor = trait.config || true;
        } else if (name === 'data_binding') {
          props.dataBinding = trait.config || true;
        }
        // ── Autonomous Agents ─────────────────────────────────────
        else if (name === 'behavior_tree') {
          props.behaviorTree = trait.config || true;
        } else if (name === 'llm_agent') {
          props.llmAgent = trait.config || true;
        } else if (name === 'neural_link') {
          props.neuralLink = trait.config || { model: 'brittney-v4.gguf', temperature: 0.7 };
        } else if (name === 'perception') {
          props.perception = trait.config || { sight_range: 20 };
        } else if (name === 'patrol') {
          props.patrol = trait.config || true;
        }
        // ── Co-Presence ───────────────────────────────────────────
        else if (name === 'co_located') {
          props.coLocated = trait.config || true;
        } else if (name === 'shared_world') {
          props.sharedWorld = trait.config || true;
        } else if (name === 'voice_proximity') {
          props.voiceProximity = trait.config || { max_distance: 20 };
          props.spatial = true;
        }
        // ── Visual registry lookup for remaining traits ────────────
        else {
          const visual = TraitVisualRegistry.getInstance().get(name);
          if (visual) {
            if (visual.material) {
              props.materialProps = { ...props.materialProps, ...visual.material };
            }
            if (visual.emissive) {
              props.materialProps = {
                ...props.materialProps,
                emissive: visual.emissive.color,
                emissiveIntensity: visual.emissive.intensity,
              };
            }
            if (visual.opacity !== undefined) {
              props.materialProps = {
                ...props.materialProps,
                opacity: visual.opacity,
                transparent: visual.opacity < 1,
              };
            }
            if (visual.scale) {
              props.scale = visual.scale;
            }
          }
          props[name] = trait.config || true;
        }
      }
    }

    // Determine node type
    let type: string;
    if (geometryType === 'model' && props.src) {
      type = 'gltfModel';
    } else if (geometryType === 'light') {
      const lightType = props.lightType || props.type || 'directional';
      const lightMapping: Record<string, string> = {
        directional: 'directionalLight',
        point: 'pointLight',
        spot: 'spotLight',
        hemisphere: 'hemisphereLight',
        ambient: 'ambientLight',
        area: 'rectAreaLight',
      };
      type = lightMapping[lightType] || 'directionalLight';
      delete props.lightType;
    } else if (geometryType === 'text') {
      type = 'Text';
    } else if (geometryType === 'sparkles') {
      type = 'Sparkles';
    } else if (geometryType === 'portal') {
      type = 'Portal';
    } else {
      type = 'mesh';
      props.hsType = geometryType;
      if (!props.args) {
        const size = typeof props.size === 'number' ? props.size : 1;
        props.args = this.getGeometryArgs(geometryType, { size });
      }
    }

    const r3fNode: R3FNode = { type, id: obj.name, props, children: [], traits: new Map() };

    if (obj.children) {
      for (const child of obj.children) {
        r3fNode.children!.push(this.compileObjectDecl(child));
      }
    }

    return r3fNode;
  }

  private compileSpatialGroup(group: any, templateMap?: Map<string, any>): R3FNode {
    const props: Record<string, any> = {};
    if (group.properties) {
      for (const prop of group.properties) {
        if (prop.key === 'position') props.position = prop.value;
        else if (prop.key === 'rotation') props.rotation = prop.value;
        else if (prop.key === 'scale')
          props.scale = Array.isArray(prop.value)
            ? prop.value
            : [prop.value, prop.value, prop.value];
      }
    }

    const node: R3FNode = { type: 'group', id: group.name, props, children: [], traits: new Map() };

    if (group.objects) {
      for (const obj of group.objects)
        node.children!.push(this.compileObjectDecl(obj, templateMap));
    }
    if (group.groups) {
      for (const sub of group.groups)
        node.children!.push(this.compileSpatialGroup(sub, templateMap));
    }

    return node;
  }

  private compileTimelineBlock(timeline: any): R3FNode {
    const entries: R3FNode[] = [];
    if (timeline.entries) {
      for (const entry of timeline.entries) {
        const action = entry.action;
        const entryProps: Record<string, any> = { time: entry.time, actionKind: action.kind };
        if (action.kind === 'animate') {
          entryProps.target = action.target;
          entryProps.properties = action.properties;
        } else if (action.kind === 'emit') {
          entryProps.event = action.event;
          if (action.data !== undefined) entryProps.data = action.data;
        } else if (action.kind === 'call') {
          entryProps.method = action.method;
          if (action.args) entryProps.args = action.args;
        }
        entries.push({ type: 'TimelineEntry', props: entryProps });
      }
    }
    return {
      type: 'Timeline',
      id: timeline.name,
      props: { autoplay: timeline.autoplay, loop: timeline.loop },
      children: entries,
    };
  }

  private compileAudioBlock(audio: any): R3FNode {
    const props: Record<string, any> = {};
    if (audio.properties) {
      for (const prop of audio.properties) {
        if (prop.key === 'src' || prop.key === 'source') {
          props.src = prop.value;
        } else if (prop.key === 'rolloff') {
          props.rolloffFactor = prop.value;
        } else {
          props[prop.key] = prop.value;
        }
      }
    }
    return { type: 'Audio', id: audio.name, props };
  }

  private compileZoneBlock(zone: any): R3FNode {
    const props: Record<string, any> = {};
    if (zone.properties) {
      for (const prop of zone.properties) {
        props[prop.key] = prop.value;
      }
    }
    // Attach handlers as props
    if (zone.handlers && zone.handlers.length > 0) {
      props.handlers = zone.handlers.map((h: any) => ({
        event: h.event,
        parameters: h.parameters,
        body: h.body,
      }));
    }
    return { type: 'Zone', id: zone.name, props };
  }

  private compileUIBlock(ui: any): R3FNode {
    const children: R3FNode[] = [];
    if (ui.elements) {
      for (const el of ui.elements) {
        const elProps: Record<string, any> = {};
        if (el.properties) {
          for (const prop of el.properties) {
            if (prop.key === 'font_size') {
              elProps.fontSize = prop.value;
            } else {
              elProps[prop.key] = this.resolveValue(prop.value);
            }
          }
        }
        children.push({ type: 'UIElement', id: el.name, props: elProps });
      }
    }
    return { type: 'UI', id: '__ui', props: {}, children };
  }

  private compileTransitionBlock(transition: any): R3FNode {
    const props: Record<string, any> = {};
    if (transition.properties) {
      for (const prop of transition.properties) {
        props[prop.key] = prop.value;
      }
    }
    return { type: 'Transition', id: transition.name, props };
  }

  private compileConditionalBlock(cond: any, templateMap?: Map<string, any>): R3FNode {
    const children: R3FNode[] = [];
    if (cond.objects) {
      for (const obj of cond.objects) children.push(this.compileObjectDecl(obj, templateMap));
    }
    if (cond.spatialGroups) {
      for (const g of cond.spatialGroups) children.push(this.compileSpatialGroup(g, templateMap));
    }

    const elseChildren: R3FNode[] = [];
    if (cond.elseObjects) {
      for (const obj of cond.elseObjects)
        elseChildren.push(this.compileObjectDecl(obj, templateMap));
    }
    if (cond.elseSpatialGroups) {
      for (const g of cond.elseSpatialGroups)
        elseChildren.push(this.compileSpatialGroup(g, templateMap));
    }

    return {
      type: 'ConditionalGroup',
      props: {
        condition: cond.condition,
        elseChildren: elseChildren.length > 0 ? elseChildren : undefined,
      },
      children,
    };
  }

  private compileForEachBlock(iter: any, templateMap?: Map<string, any>): R3FNode {
    const templateChildren: R3FNode[] = [];
    if (iter.objects) {
      for (const obj of iter.objects)
        templateChildren.push(this.compileObjectDecl(obj, templateMap));
    }
    if (iter.spatialGroups) {
      for (const g of iter.spatialGroups)
        templateChildren.push(this.compileSpatialGroup(g, templateMap));
    }

    return {
      type: 'ForEachGroup',
      props: { variable: iter.variable, iterable: iter.iterable },
      children: templateChildren,
    };
  }

  /**
   * Resolve a property value, converting bind expressions into runtime-reactive markers.
   */
  private resolveValue(value: any): any {
    if (value && typeof value === 'object' && value.__bind) {
      return { __bind: true, source: value.source, transform: value.transform };
    }
    return value;
  }

  // ─── Shared Helpers ───────────────────────────────────────────────────

  private injectDefaultLighting(root: R3FNode): void {
    if (!this.treeHasLights(root)) {
      root.children?.unshift(
        { type: 'ambientLight', props: { intensity: 0.4, color: '#ffffff' } },
        {
          type: 'directionalLight',
          props: {
            intensity: 1.0,
            position: [5, 10, 5],
            castShadow: true,
            'shadow-mapSize': [2048, 2048],
            color: '#ffffff',
          },
        }
      );
    }
  }

  private treeHasLights(node: R3FNode): boolean {
    if (node.type.toLowerCase().includes('light')) return true;
    return node.children?.some((c) => this.treeHasLights(c)) || false;
  }

  private hasPostProcessing(node: R3FNode): boolean {
    if (node.traits?.has('bloom' as any) || node.traits?.has('postprocessing' as any)) return true;
    if (node.props.bloom) return true;
    return node.children?.some((c) => this.hasPostProcessing(c)) || false;
  }

  private extractPostProcessingNodes(node: R3FNode): R3FNode[] {
    const effects: R3FNode[] = [];

    const ppTrait = node.traits?.get('postprocessing' as any);
    if (ppTrait) {
      if (ppTrait.bloom) effects.push({ type: 'Bloom', props: ppTrait.bloom });
      if (ppTrait.ssao) effects.push({ type: 'SSAO', props: ppTrait.ssao });
      if (ppTrait.vignette) effects.push({ type: 'Vignette', props: ppTrait.vignette });
    }
    if (node.props.bloom) {
      effects.push({
        type: 'Bloom',
        props: typeof node.props.bloom === 'object' ? node.props.bloom : { intensity: 1.0 },
      });
    }

    node.children?.forEach((child) => effects.push(...this.extractPostProcessingNodes(child)));
    return effects;
  }

  private mapType(type: string, props: Record<string, any>): string {
    if (type === 'environment') {
      if (props.name && ENVIRONMENT_PRESETS[props.name]) {
        Object.assign(props, ENVIRONMENT_PRESETS[props.name]);
      }
      return 'Environment';
    }

    if (type === 'light') {
      const lightType = props.type || 'directional';
      const lightMapping: Record<string, string> = {
        directional: 'directionalLight',
        point: 'pointLight',
        spot: 'spotLight',
        hemisphere: 'hemisphereLight',
        ambient: 'ambientLight',
        area: 'rectAreaLight',
      };
      return lightMapping[lightType] || 'directionalLight';
    }

    if (type === 'portal') return 'Portal';
    if (type === 'sparkles') return 'Sparkles';

    // Mesh types — set hsType so renderer knows which geometry to create
    if (MESH_TYPES.has(type)) {
      props.hsType = type;
      return 'mesh';
    }

    const mapping: Record<string, string> = {
      ambient_light: 'ambientLight',
      model: 'gltfModel',
      audio: 'positionalAudio',
      composition: 'group',
      scale: 'group',
      focus: 'group',
      spatial_agent: 'SpatialAgent',
      spatial_container: 'group',
      ui_panel: 'UIPanel',
      ui_text: 'UIText',
      ui_button: 'UIButton',
      ui_slider: 'UISlider',
      ui_input: 'UIInput',
      ui_image: 'UIImage',
      ui_chart: 'UIChart',
      ui_gauge: 'UIGauge',
      ui_value: 'UIValue',
      ui_status_indicator: 'UIStatusIndicator',
      tool_slot: 'ToolSlot',
      behavior: 'group',
      avatar: 'Avatar',
      dna: 'DNA',
      gaussian_splat: 'GaussianSplat',
      splat: 'GaussianSplat',
      nerf: 'NeRF',
      volumetric_video: 'VolumetricVideo',
    };
    return mapping[type] || type;
  }

  private compileProperties(node: ASTNode, rawProps: Record<string, any>): Record<string, any> {
    // Expand spread expressions first
    const expandedProps = this.expandSpreads(rawProps);
    const props: Record<string, any> = { ...expandedProps };

    if (node.position) {
      props.position = [node.position.x, node.position.y, node.position.z];
    }
    if (rawProps.position && Array.isArray(rawProps.position)) {
      props.position = rawProps.position;
    }

    if (node.hologram) {
      const h = node.hologram;
      if (h.color) props.color = h.color;
      if (MESH_TYPES.has(node.type)) {
        props.args = this.getGeometryArgs(node.type, h);
        props.hsType = node.type;
      }
    }

    if (rawProps.scale !== undefined && !props.scale) {
      props.scale = Array.isArray(rawProps.scale)
        ? rawProps.scale
        : [rawProps.scale, rawProps.scale, rawProps.scale];
    }

    if (rawProps.geometry && !props.hsType) {
      props.hsType = rawProps.geometry;
      props.args = this.getGeometryArgs(rawProps.geometry, { size: rawProps.size || 1 });
    }

    if (
      rawProps.material &&
      typeof rawProps.material === 'string' &&
      MATERIAL_PRESETS[rawProps.material]
    ) {
      props.materialProps = { ...MATERIAL_PRESETS[rawProps.material], ...props.materialProps };
    }

    if (node.directives) {
      for (const d of node.directives) {
        if (d.type === 'trait') {
          if (d.name === 'grabbable') {
            props.castShadow = true;
            props.grabbable = d.config || true;
            if (!props.rigidBody) props.rigidBody = { type: 'dynamic' };
            if (!props.collider) props.collider = { type: 'auto' };
          } else if ((d.name as any) === 'animated') {
            props.animated = d.config || true;
          } else if ((d.name as any) === 'spatial_audio' || (d.name as any) === 'voice') {
            props.spatial = true;
          } else if (d.name === 'networked') {
            props.networked = d.config || true;
          } else if (d.name === ('moldable' as any)) {
            props.moldable = d.config || true;
          } else if (d.name === ('stretchable' as any)) {
            props.stretchable = d.config || true;
          } else if (d.name === ('ai_driven' as any)) {
            props.ai_driven = d.config || true;
          } else if (d.name === ('dialogue' as any)) {
            props.dialogue = d.config || true;
          } else if (d.name === ('gesture' as any)) {
            props.gesture = d.config || true;
          } else if (d.name === ('haptic' as any)) {
            props.haptic = d.config || true;
          } else if (d.name === ('avatar_embodiment' as any)) {
            props.avatarEmbodiment = d.config || true;
          } else if (d.name === ('lip_sync' as any)) {
            props.lipSync = d.config || true;
          } else if (d.name === ('emotion_directive' as any)) {
            props.emotionDirective = d.config || true;
          } else if (d.name === ('stt' as any)) {
            props.stt = d.config || true;
          } else if (d.name === ('tts' as any)) {
            props.tts = d.config || true;
          } else if (d.name === ('generate' as any)) {
            props.generate = d.config;
          } else if (d.name === 'skeleton') {
            props.skeleton = d.config || true;
          } else if (d.name === 'body') {
            props.body = d.config || true;
          } else if (d.name === 'gaussian_splat') {
            props.gaussianSplat = d.config || true;
          } else if (d.name === 'nerf') {
            props.nerf = d.config || true;
          } else if (d.name === 'volumetric_video') {
            props.volumetricVideo = d.config || true;
          }
        }
      }
    }

    delete props.type;
    delete props.geometry;
    return props;
  }

  private applyGraphicsConfig(r3fNode: R3FNode, graphics: any): void {
    if (graphics.material) {
      const m = graphics.material;
      const materialProps: Record<string, any> = {};

      if (m.preset && MATERIAL_PRESETS[m.preset]) {
        Object.assign(materialProps, MATERIAL_PRESETS[m.preset]);
      }
      if (m.type === 'pbr' && m.pbr) {
        if (m.pbr.baseColor) materialProps.color = this.mapColor(m.pbr.baseColor);
        if (m.pbr.metallic !== undefined) materialProps.metalness = m.pbr.metallic;
        if (m.pbr.roughness !== undefined) materialProps.roughness = m.pbr.roughness;
        if (m.pbr.emission) materialProps.emissive = this.mapColor(m.pbr.emission);
        if (m.pbr.emissionStrength) materialProps.emissiveIntensity = m.pbr.emissionStrength;
        if (m.pbr.clearcoat !== undefined) materialProps.clearcoat = m.pbr.clearcoat;
        if (m.pbr.transmission !== undefined) materialProps.transmission = m.pbr.transmission;
        if (m.pbr.ior !== undefined) materialProps.ior = m.pbr.ior;
        if (m.pbr.iridescence !== undefined) materialProps.iridescence = m.pbr.iridescence;
      }

      r3fNode.props.materialProps = { ...r3fNode.props.materialProps, ...materialProps };
    }

    if (graphics.lighting) {
      const l = graphics.lighting;
      if (r3fNode.type.toLowerCase().includes('light')) {
        if (l.shadows) r3fNode.props.castShadow = true;
        if (l.intensity !== undefined) r3fNode.props.intensity = l.intensity;
        if (l.color) r3fNode.props.color = this.mapColor(l.color);
      }
      if (r3fNode.type === 'Environment' && l.preset) {
        r3fNode.props.preset = l.preset;
      }
    }

    if (graphics.networked) {
      r3fNode.props.networked = graphics.networked;
    }
  }

  private mapColor(c: any): string {
    if (typeof c === 'string') return c;
    if (typeof c === 'number') return `#${c.toString(16).padStart(6, '0')}`;
    if (c.r !== undefined) {
      const r = c.r > 1 ? c.r : Math.floor(c.r * 255);
      const g = c.g > 1 ? c.g : Math.floor(c.g * 255);
      const b = c.b > 1 ? c.b : Math.floor(c.b * 255);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return '#ffffff';
  }

  private getGeometryArgs(type: string, hologram: any): any[] {
    const size = hologram.size || 1;
    switch (type) {
      case 'sphere':
      case 'orb':
        return [size * 0.5, 32, 32];
      case 'cube':
      case 'box':
        return [size, size, size];
      case 'cylinder':
        return [size * 0.5, size * 0.5, size, 32];
      case 'pyramid':
      case 'cone':
        return [size * 0.5, 0, size, 4];
      case 'plane':
        return [size, size];
      case 'torus':
        return [size * 0.5, size * 0.15, 16, 32];
      case 'ring':
        return [size * 0.3, size * 0.5, 32];
      case 'capsule':
        return [size * 0.3, size * 0.5, 4, 16];
      default:
        return [size, size, size];
    }
  }
}
