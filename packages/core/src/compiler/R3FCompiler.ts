import {
  HSPlusAST,
  ASTNode,
  HSPlusDirective,
  VRTraitName
} from '../types';

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
  'plastic': { roughness: 0.5, metalness: 0.0, clearcoat: 0.1 },
  'metal': { roughness: 0.2, metalness: 1.0 },
  'chrome': { roughness: 0.05, metalness: 1.0, envMapIntensity: 1.5 },
  'gold': { roughness: 0.3, metalness: 1.0, color: '#ffd700' },
  'copper': { roughness: 0.4, metalness: 1.0, color: '#b87333' },
  'glass': { roughness: 0.0, metalness: 0.0, transmission: 0.95, ior: 1.5, thickness: 0.5, transparent: true },
  'crystal': { roughness: 0.0, metalness: 0.1, transmission: 0.9, ior: 2.0, iridescence: 1.0, iridescenceIOR: 1.3 },
  'wood': { roughness: 0.8, metalness: 0.0 },
  'fabric': { roughness: 0.95, metalness: 0.0 },
  'rubber': { roughness: 0.9, metalness: 0.0 },
  'leather': { roughness: 0.7, metalness: 0.0 },
  'water': { roughness: 0.0, metalness: 0.0, transmission: 0.9, ior: 1.33, transparent: true, color: '#006994' },
  'emissive': { roughness: 0.5, metalness: 0.0, emissiveIntensity: 2.0 },
  'hologram': { roughness: 0.0, metalness: 0.3, transparent: true, opacity: 0.6, emissiveIntensity: 1.0 },
};

export const ENVIRONMENT_PRESETS: Record<string, any> = {
  'forest_sunset': {
    background: true,
    envPreset: 'sunset',
    fog: { color: '#ff9966', near: 10, far: 100 },
    ground: { color: '#2d5a27' },
    lighting: {
      ambient: { color: '#ffa366', intensity: 0.3 },
      directional: { color: '#ff7700', intensity: 1.5, position: [10, 20, 5], shadows: true },
    },
  },
  'cyberpunk_city': {
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
  'space_void': {
    background: true,
    envPreset: 'night',
    lighting: {
      ambient: { color: '#111133', intensity: 0.1 },
      directional: { color: '#ffffff', intensity: 0.5, position: [0, 10, 0], shadows: false },
    },
  },
  'studio': {
    background: true,
    envPreset: 'studio',
    ground: { color: '#cccccc' },
    lighting: {
      ambient: { color: '#ffffff', intensity: 0.4 },
      directional: { color: '#ffffff', intensity: 1.0, position: [5, 10, 5], shadows: true },
    },
  },
  'underwater': {
    background: true,
    envPreset: 'dawn',
    fog: { color: '#003366', near: 2, far: 40 },
    ground: { color: '#1a3a4a' },
    lighting: {
      ambient: { color: '#004488', intensity: 0.3 },
      directional: { color: '#66aacc', intensity: 0.8, position: [0, 20, 0], shadows: true },
    },
  },
  'desert': {
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
  'orb', 'sphere', 'cube', 'box', 'cylinder', 'pyramid', 'cone',
  'plane', 'torus', 'ring', 'capsule', 'object',
]);

/**
 * R3FCompiler
 *
 * Translates HoloScript AST into R3F node trees for React Three Fiber rendering.
 * Handles both HSPlusAST (from HoloScriptPlusParser) and HoloComposition AST
 * (from HoloCompositionParser/.holo files).
 */
export class R3FCompiler {

  // ─── HSPlusAST Compilation ────────────────────────────────────────────

  public compile(ast: HSPlusAST): R3FNode {
    const root = this.compileNode(ast.root);

    if (this.hasPostProcessing(root)) {
      root.children?.unshift({
        type: 'EffectComposer',
        props: {},
        children: this.extractPostProcessingNodes(root)
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
      directives: node.directives || []
    };

    if (node.directives) {
      for (const directive of node.directives) {
        if (directive.type === 'trait') {
          r3fNode.traits?.set(directive.name, directive.config);
        }
      }
    }

    const enhanced = node as any;
    if (enhanced.graphics) {
      this.applyGraphicsConfig(r3fNode, enhanced.graphics);
    }

    if (enhanced.children && Array.isArray(enhanced.children)) {
      r3fNode.children = enhanced.children.map((child: ASTNode) => this.compileNode(child));
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

    if (composition.environment) {
      root.children!.push(...this.compileEnvironmentBlock(composition.environment));
    }

    if (composition.objects) {
      for (const obj of composition.objects) {
        root.children!.push(this.compileObjectDecl(obj));
      }
    }

    if (composition.spatialGroups) {
      for (const group of composition.spatialGroups) {
        root.children!.push(this.compileSpatialGroup(group));
      }
    }

    if (this.hasPostProcessing(root)) {
      root.children!.unshift({
        type: 'EffectComposer',
        props: {},
        children: this.extractPostProcessingNodes(root)
      });
    }

    this.injectDefaultLighting(root);
    return root;
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
        nodes.push({ type: 'Environment', props: { background: true, preset: preset.envPreset || presetName }, children: [] });

        if (preset.lighting?.ambient) {
          nodes.push({ type: 'ambientLight', props: { color: preset.lighting.ambient.color, intensity: preset.lighting.ambient.intensity } });
        }
        if (preset.lighting?.directional) {
          const dl = preset.lighting.directional;
          nodes.push({ type: 'directionalLight', props: { color: dl.color, intensity: dl.intensity, position: dl.position, castShadow: dl.shadows !== false, 'shadow-mapSize': [2048, 2048] } });
        }
        if (preset.lighting?.points) {
          for (const pl of preset.lighting.points) {
            nodes.push({ type: 'pointLight', props: { color: pl.color, intensity: pl.intensity, position: pl.position, distance: pl.distance } });
          }
        }
        if (preset.fog) {
          nodes.push({ type: 'fog', props: { attach: 'fog', color: preset.fog.color, near: preset.fog.near, far: preset.fog.far } });
        }
        if (preset.ground) {
          nodes.push({
            type: 'mesh', id: '__ground',
            props: { hsType: 'plane', rotation: [-Math.PI / 2, 0, 0], position: [0, -0.01, 0], receiveShadow: true, args: [200, 200], color: preset.ground.color, materialProps: { roughness: 0.8, metalness: 0.0 } },
            children: [],
          });
        }
      } else {
        nodes.push({ type: 'Environment', props: { background: true, preset: presetName }, children: [] });
      }
    }

    // Explicit ambient_light
    if (envProps.ambient_light !== undefined) {
      nodes.push({ type: 'ambientLight', props: { intensity: typeof envProps.ambient_light === 'number' ? envProps.ambient_light : 0.5 } });
    }

    // Explicit fog
    if (envProps.fog && typeof envProps.fog === 'object') {
      nodes.push({ type: 'fog', props: { attach: 'fog', color: envProps.fog.color || '#cccccc', near: envProps.fog.near || 10, far: envProps.fog.far || 100 } });
    }

    return nodes;
  }

  private compileObjectDecl(obj: any): R3FNode {
    const props: Record<string, any> = {};
    let geometryType = 'cube';

    if (obj.properties) {
      for (const prop of obj.properties) {
        const key = prop.key;
        const value = prop.value;

        if (key === 'geometry' || key === 'mesh') { geometryType = value; }
        else if (key === 'type') {
          // Special types override geometry determination
          if (['text', 'sparkles', 'portal', 'audio'].includes(value)) {
            geometryType = value;
          } else if (['directional', 'point', 'spot', 'hemisphere', 'ambient', 'area'].includes(value)) {
            // Light-type shorthand: type: "directional" implies a light
            geometryType = 'light';
            props.lightType = value;
          } else {
            props[key] = value;
          }
        }
        else if (key === 'light_type') { props.lightType = value; }
        else if (key === 'position' && Array.isArray(value)) { props.position = value; }
        else if (key === 'rotation' && Array.isArray(value)) { props.rotation = value; }
        else if (key === 'scale') { props.scale = Array.isArray(value) ? value : [value, value, value]; }
        else if (key === 'color') { props.color = value; }
        else if (key === 'src' || key === 'model') { props.src = value; geometryType = 'model'; }
        else if (key === 'text') { props.children = value; }
        else if (key === 'font_size') { props.fontSize = value; }
        else if (key === 'material') {
          if (typeof value === 'string' && MATERIAL_PRESETS[value]) {
            props.materialProps = { ...MATERIAL_PRESETS[value], ...props.materialProps };
          } else if (typeof value === 'object') {
            // Handle material objects with a preset key: { preset: "glass", color: "#aaddff" }
            if (value.preset && MATERIAL_PRESETS[value.preset]) {
              const { preset: _, ...rest } = value;
              props.materialProps = { ...MATERIAL_PRESETS[value.preset], ...rest, ...props.materialProps };
            } else {
              props.materialProps = { ...props.materialProps, ...value };
            }
          }
        }
        else if (key === 'roughness' || key === 'metalness' || key === 'metallic') {
          props.materialProps = props.materialProps || {};
          props.materialProps[key === 'metallic' ? 'metalness' : key] = value;
        }
        else if (key === 'opacity') {
          props.materialProps = props.materialProps || {};
          props.materialProps.opacity = value;
          props.materialProps.transparent = value < 1;
        }
        else if (key === 'emissive') { props.materialProps = { ...props.materialProps, emissive: value }; }
        else if (key === 'emissiveIntensity' || key === 'emissive_intensity') {
          props.materialProps = { ...props.materialProps, emissiveIntensity: value };
        }
        else if (key === 'size') {
          if (Array.isArray(value)) { props.args = value; }
          props.size = value;
        }
        else if (key === 'radius') { props.size = value * 2; }
        else if (key === 'intensity') { props.intensity = value; }
        else if (key === 'cast_shadow' || key === 'castShadow') { props.castShadow = value; }
        else if (key === 'receiveShadow' || key === 'receive_shadow') { props.receiveShadow = value; }
        else if (key === 'visible') { props[key] = value; }
        else { props[key] = value; }
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
        }
        else if (name === 'hoverable') { props.hoverable = trait.config || true; }
        else if (name === 'collidable') {
          const bodyType = trait.config?.type || 'fixed';
          props.rigidBody = { type: bodyType };
          props.collider = { type: 'auto' };
          props.castShadow = true;
          props.receiveShadow = true;
        }
        else if (name === 'animated') { props.animated = trait.config || true; }
        else if (name === 'positional' || name === 'spatial_audio') { props.spatial = true; }
        else if (name === 'shadow') {
          props.castShadow = true;
          if (trait.config?.mapSize) props['shadow-mapSize'] = [trait.config.mapSize, trait.config.mapSize];
        }
        else if (name === 'material') {
          const presetName = trait.config?.preset;
          if (presetName && MATERIAL_PRESETS[presetName]) {
            const { preset: _, ...rest } = trait.config;
            props.materialProps = { ...MATERIAL_PRESETS[presetName], ...rest, ...props.materialProps };
          } else {
            props.materialProps = { ...props.materialProps, ...trait.config };
          }
        }
        else if (name === 'networked') { props.networked = trait.config || true; }
        else if (name === 'moldable') { props.moldable = trait.config || true; }
        else if (name === 'stretchable') { props.stretchable = trait.config || true; }
        else if (name === 'bloom') { props.bloom = trait.config || { intensity: 1.0 }; }
        else if (name === 'physics') {
          if (!props.rigidBody) props.rigidBody = { type: 'dynamic' };
          if (!props.collider) props.collider = { type: 'auto' };
          if (trait.config) Object.assign(props.rigidBody, trait.config);
        }
        else if (name === 'portal') {
          props.portal = trait.config || true;
        }
        else { props[name] = trait.config || true; }
      }
    }

    // Determine node type
    let type: string;
    if (geometryType === 'model' && props.src) {
      type = 'gltfModel';
    } else if (geometryType === 'light') {
      const lightType = props.lightType || props.type || 'directional';
      const lightMapping: Record<string, string> = {
        'directional': 'directionalLight', 'point': 'pointLight', 'spot': 'spotLight',
        'hemisphere': 'hemisphereLight', 'ambient': 'ambientLight', 'area': 'rectAreaLight',
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

  private compileSpatialGroup(group: any): R3FNode {
    const props: Record<string, any> = {};
    if (group.properties) {
      for (const prop of group.properties) {
        if (prop.key === 'position') props.position = prop.value;
        else if (prop.key === 'rotation') props.rotation = prop.value;
        else if (prop.key === 'scale') props.scale = Array.isArray(prop.value) ? prop.value : [prop.value, prop.value, prop.value];
      }
    }

    const node: R3FNode = { type: 'group', id: group.name, props, children: [], traits: new Map() };

    if (group.objects) {
      for (const obj of group.objects) node.children!.push(this.compileObjectDecl(obj));
    }
    if (group.groups) {
      for (const sub of group.groups) node.children!.push(this.compileSpatialGroup(sub));
    }

    return node;
  }

  // ─── Shared Helpers ───────────────────────────────────────────────────

  private injectDefaultLighting(root: R3FNode): void {
    if (!this.treeHasLights(root)) {
      root.children?.unshift(
        { type: 'ambientLight', props: { intensity: 0.4, color: '#ffffff' } },
        { type: 'directionalLight', props: { intensity: 1.0, position: [5, 10, 5], castShadow: true, 'shadow-mapSize': [2048, 2048], color: '#ffffff' } }
      );
    }
  }

  private treeHasLights(node: R3FNode): boolean {
    if (node.type.toLowerCase().includes('light')) return true;
    return node.children?.some(c => this.treeHasLights(c)) || false;
  }

  private hasPostProcessing(node: R3FNode): boolean {
    if (node.traits?.has('bloom' as any) || node.traits?.has('postprocessing' as any)) return true;
    if (node.props.bloom) return true;
    return node.children?.some(c => this.hasPostProcessing(c)) || false;
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
      effects.push({ type: 'Bloom', props: typeof node.props.bloom === 'object' ? node.props.bloom : { intensity: 1.0 } });
    }

    node.children?.forEach(child => effects.push(...this.extractPostProcessingNodes(child)));
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
        'directional': 'directionalLight', 'point': 'pointLight', 'spot': 'spotLight',
        'hemisphere': 'hemisphereLight', 'ambient': 'ambientLight', 'area': 'rectAreaLight'
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
      'ambient_light': 'ambientLight', 'model': 'gltfModel',
      'audio': 'positionalAudio', 'composition': 'group', 'scale': 'group', 'focus': 'group',
    };
    return mapping[type] || type;
  }

  private compileProperties(node: ASTNode, rawProps: Record<string, any>): Record<string, any> {
    const props: Record<string, any> = { ...rawProps };

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
      props.scale = Array.isArray(rawProps.scale) ? rawProps.scale : [rawProps.scale, rawProps.scale, rawProps.scale];
    }

    if (rawProps.geometry && !props.hsType) {
      props.hsType = rawProps.geometry;
      props.args = this.getGeometryArgs(rawProps.geometry, { size: rawProps.size || 1 });
    }

    if (rawProps.material && typeof rawProps.material === 'string' && MATERIAL_PRESETS[rawProps.material]) {
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
          }
          else if ((d.name as any) === 'animated') { props.animated = d.config || true; }
          else if ((d.name as any) === 'spatial_audio' || (d.name as any) === 'voice') { props.spatial = true; }
          else if (d.name === 'networked') { props.networked = d.config || true; }
          else if (d.name === 'moldable' as any) { props.moldable = d.config || true; }
          else if (d.name === 'stretchable' as any) { props.stretchable = d.config || true; }
          else if (d.name === 'ai_driven' as any) { props.ai_driven = d.config || true; }
          else if (d.name === 'dialogue' as any) { props.dialogue = d.config || true; }
          else if (d.name === 'gesture' as any) { props.gesture = d.config || true; }
          else if (d.name === 'haptic' as any) { props.haptic = d.config || true; }
          else if (d.name === 'generate' as any) { props.generate = d.config; }
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
      case 'sphere': case 'orb': return [size * 0.5, 32, 32];
      case 'cube': case 'box': return [size, size, size];
      case 'cylinder': return [size * 0.5, size * 0.5, size, 32];
      case 'pyramid': case 'cone': return [size * 0.5, 0, size, 4];
      case 'plane': return [size, size];
      case 'torus': return [size * 0.5, size * 0.15, 16, 32];
      case 'ring': return [size * 0.3, size * 0.5, 32];
      case 'capsule': return [size * 0.3, size * 0.5, 4, 16];
      default: return [size, size, size];
    }
  }
}
