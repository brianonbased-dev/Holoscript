/**
 * Shader Graph Compiler
 *
 * Compiles shader graphs to WGSL shader code
 */

import { ShaderGraph } from './ShaderGraph';
import type {
  IShaderNode,
  IShaderConnection,
  ICompiledShader,
  ICompileOptions,
  IShaderUniform,
  IShaderTexture,
  ShaderDataType,
  INodeTemplate,
} from './ShaderGraphTypes';
import { getNodeTemplate, getTypeConversion } from './ShaderGraphTypes';

// ============================================================================
// Shader Compiler
// ============================================================================

/**
 * Compiles shader graphs to WGSL code
 */
export class ShaderGraphCompiler {
  private graph: ShaderGraph;
  private options: Required<ICompileOptions>;
  private variableCounter = 0;
  private nodeVariables: Map<string, Map<string, string>> = new Map();
  private uniforms: IShaderUniform[] = [];
  private textures: IShaderTexture[] = [];
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor(graph: ShaderGraph, options?: Partial<ICompileOptions>) {
    this.graph = graph;
    this.options = {
      target: options?.target ?? 'wgsl',
      optimize: options?.optimize ?? true,
      debug: options?.debug ?? false,
      defines: options?.defines ?? {},
    };
  }

  /**
   * Compile the shader graph
   */
  compile(): ICompiledShader {
    this.reset();

    // Validate graph
    const validation = this.graph.validate();
    if (!validation.valid) {
      return {
        vertexCode: '',
        fragmentCode: '',
        uniforms: [],
        textures: [],
        warnings: validation.warnings,
        errors: validation.errors,
      };
    }

    this.warnings = validation.warnings;

    // Get sorted nodes
    const sortedNodes = this.graph.getTopologicalOrder();

    // Generate code for each node
    const fragmentBody = this.generateFragmentBody(sortedNodes);
    const vertexBody = this.generateVertexBody(sortedNodes);

    // Generate complete shader code
    const vertexCode = this.generateVertexShader(vertexBody);
    const fragmentCode = this.generateFragmentShader(fragmentBody);

    return {
      vertexCode,
      fragmentCode,
      uniforms: this.uniforms,
      textures: this.textures,
      warnings: this.warnings,
      errors: this.errors,
    };
  }

  /**
   * Reset compilation state
   */
  private reset(): void {
    this.variableCounter = 0;
    this.nodeVariables.clear();
    this.uniforms = [];
    this.textures = [];
    this.warnings = [];
    this.errors = [];
  }

  /**
   * Generate a unique variable name
   */
  private generateVariable(): string {
    return `v_${this.variableCounter++}`;
  }

  /**
   * Get or create variable for a node output
   */
  private getOutputVariable(nodeId: string, portId: string): string {
    if (!this.nodeVariables.has(nodeId)) {
      this.nodeVariables.set(nodeId, new Map());
    }
    const nodeVars = this.nodeVariables.get(nodeId)!;

    if (!nodeVars.has(portId)) {
      nodeVars.set(portId, this.generateVariable());
    }

    return nodeVars.get(portId)!;
  }

  /**
   * Get input expression for a node input
   */
  private getInputExpression(
    node: IShaderNode,
    portId: string,
    connections: IShaderConnection[]
  ): string {
    const port = node.inputs.find((p) => p.id === portId);
    if (!port) {
      return '0.0';
    }

    // Check for connection
    const connection = connections.find(
      (c) => c.toNode === node.id && c.toPort === portId
    );

    if (connection) {
      const sourceNode = this.graph.getNode(connection.fromNode);
      const sourcePort = sourceNode?.outputs.find((p) => p.id === connection.fromPort);

      if (sourceNode && sourcePort) {
        const varName = this.getOutputVariable(connection.fromNode, connection.fromPort);

        // Add type conversion if needed
        if (sourcePort.type !== port.type) {
          return getTypeConversion(sourcePort.type, port.type, varName);
        }

        return varName;
      }
    }

    // Use default value
    return this.getDefaultValueCode(port.type, port.defaultValue);
  }

  /**
   * Get WGSL code for default value
   */
  private getDefaultValueCode(
    type: ShaderDataType,
    value?: number | number[]
  ): string {
    if (value === undefined) {
      return this.getZeroValue(type);
    }

    if (typeof value === 'number') {
      if (type === 'float') return `${value}`;
      if (type === 'int') return `${Math.floor(value)}i`;
      return `${value}`;
    }

    if (Array.isArray(value)) {
      switch (type) {
        case 'vec2':
          return `vec2<f32>(${value[0] ?? 0}, ${value[1] ?? 0})`;
        case 'vec3':
          return `vec3<f32>(${value[0] ?? 0}, ${value[1] ?? 0}, ${value[2] ?? 0})`;
        case 'vec4':
          return `vec4<f32>(${value[0] ?? 0}, ${value[1] ?? 0}, ${value[2] ?? 0}, ${value[3] ?? 1})`;
        default:
          return this.getZeroValue(type);
      }
    }

    return this.getZeroValue(type);
  }

  /**
   * Get zero value for a type
   */
  private getZeroValue(type: ShaderDataType): string {
    switch (type) {
      case 'float':
        return '0.0';
      case 'vec2':
        return 'vec2<f32>(0.0)';
      case 'vec3':
        return 'vec3<f32>(0.0)';
      case 'vec4':
        return 'vec4<f32>(0.0, 0.0, 0.0, 1.0)';
      case 'int':
        return '0i';
      case 'ivec2':
        return 'vec2<i32>(0)';
      case 'ivec3':
        return 'vec3<i32>(0)';
      case 'ivec4':
        return 'vec4<i32>(0)';
      case 'bool':
        return 'false';
      case 'mat2':
        return 'mat2x2<f32>(1.0, 0.0, 0.0, 1.0)';
      case 'mat3':
        return 'mat3x3<f32>(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0)';
      case 'mat4':
        return 'mat4x4<f32>(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)';
      default:
        return '0.0';
    }
  }

  /**
   * Get WGSL type name
   */
  private getWGSLType(type: ShaderDataType): string {
    switch (type) {
      case 'float':
        return 'f32';
      case 'vec2':
        return 'vec2<f32>';
      case 'vec3':
        return 'vec3<f32>';
      case 'vec4':
        return 'vec4<f32>';
      case 'int':
        return 'i32';
      case 'ivec2':
        return 'vec2<i32>';
      case 'ivec3':
        return 'vec3<i32>';
      case 'ivec4':
        return 'vec4<i32>';
      case 'bool':
        return 'bool';
      case 'mat2':
        return 'mat2x2<f32>';
      case 'mat3':
        return 'mat3x3<f32>';
      case 'mat4':
        return 'mat4x4<f32>';
      default:
        return 'f32';
    }
  }

  /**
   * Generate fragment shader body
   */
  private generateFragmentBody(nodes: IShaderNode[]): string {
    const lines: string[] = [];
    const connections = this.graph.connections;

    for (const node of nodes) {
      if (node.category === 'output' && node.type !== 'output_surface' && node.type !== 'output_unlit') {
        continue; // Skip non-surface outputs in fragment shader
      }

      const template = getNodeTemplate(node.type);
      if (!template) {
        this.warnings.push(`No template found for node type: ${node.type}`);
        continue;
      }

      // Build input expressions
      const inputs: Record<string, string> = {};
      for (const port of node.inputs) {
        inputs[port.id] = this.getInputExpression(node, port.id, connections);
      }

      // Generate code
      const code = template.generateCode(node, inputs);

      // Handle different node types
      if (node.type === 'output_surface') {
        lines.push(`// Surface output`);
        lines.push(`let baseColor = ${inputs.baseColor};`);
        lines.push(`let metallic = ${inputs.metallic};`);
        lines.push(`let roughness = ${inputs.roughness};`);
        lines.push(`let normal = ${inputs.normal};`);
        lines.push(`let emission = ${inputs.emission};`);
        lines.push(`let alpha = ${inputs.alpha};`);
        lines.push(`let ao = ${inputs.ao};`);
      } else if (node.type === 'output_unlit') {
        lines.push(`// Unlit output`);
        lines.push(`let finalColor = ${inputs.color};`);
      } else if (node.outputs.length > 0) {
        // Regular node with outputs
        if (this.options.debug) {
          lines.push(`// ${node.name} (${node.id})`);
        }

        // Handle nodes with multiple outputs
        if (node.outputs.length === 1) {
          const varName = this.getOutputVariable(node.id, node.outputs[0].id);
          const wgslType = this.getWGSLType(node.outputs[0].type);
          lines.push(`let ${varName}: ${wgslType} = ${code};`);
        } else {
          // Multiple outputs - need to generate intermediate
          this.generateMultiOutputCode(node, inputs, lines);
        }
      }
    }

    return lines.join('\n  ');
  }

  /**
   * Generate code for nodes with multiple outputs
   */
  private generateMultiOutputCode(
    node: IShaderNode,
    inputs: Record<string, string>,
    lines: string[]
  ): void {
    const template = getNodeTemplate(node.type);
    if (!template) return;

    // Handle split nodes specially
    if (node.type.startsWith('vector_split_')) {
      const inputExpr = inputs.vector;
      for (const output of node.outputs) {
        const varName = this.getOutputVariable(node.id, output.id);
        const wgslType = this.getWGSLType(output.type);
        lines.push(`let ${varName}: ${wgslType} = (${inputExpr}).${output.id};`);
      }
      return;
    }

    // Generic multi-output handling
    const baseCode = template.generateCode(node, inputs);
    const tempVar = this.generateVariable();
    lines.push(`let ${tempVar} = ${baseCode};`);

    for (const output of node.outputs) {
      const varName = this.getOutputVariable(node.id, output.id);
      lines.push(`let ${varName} = ${tempVar}.${output.id};`);
    }
  }

  /**
   * Generate vertex shader body
   */
  private generateVertexBody(nodes: IShaderNode[]): string {
    const lines: string[] = [];
    const connections = this.graph.connections;

    // Find vertex offset output
    const vertexOffsetNode = nodes.find((n) => n.type === 'output_vertex_offset');

    if (vertexOffsetNode) {
      const template = getNodeTemplate(vertexOffsetNode.type);
      if (template) {
        const inputs: Record<string, string> = {};
        for (const port of vertexOffsetNode.inputs) {
          inputs[port.id] = this.getInputExpression(vertexOffsetNode, port.id, connections);
        }

        lines.push(`// Vertex offset`);
        lines.push(`let vertexOffset = ${inputs.offset};`);
        lines.push(`let worldPos = in.position + vertexOffset;`);
      }
    } else {
      lines.push(`let worldPos = in.position;`);
    }

    return lines.join('\n  ');
  }

  /**
   * Generate complete vertex shader
   */
  private generateVertexShader(body: string): string {
    return `// Generated by HoloScript Shader Graph Compiler
// Graph: ${this.graph.name}

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) tangent: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPosition: vec3<f32>,
  @location(1) worldNormal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
  position: vec3<f32>,
};

struct ModelUniforms {
  model: mat4x4<f32>,
  normalMatrix: mat3x3<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(1) @binding(0) var<uniform> model: ModelUniforms;

@vertex
fn main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  ${body}

  let worldPosition = (model.model * vec4<f32>(worldPos, 1.0)).xyz;
  let worldNormal = normalize(model.normalMatrix * in.normal);

  out.worldPosition = worldPosition;
  out.worldNormal = worldNormal;
  out.uv = in.uv;
  out.clipPosition = camera.viewProjection * vec4<f32>(worldPosition, 1.0);

  return out;
}
`;
  }

  /**
   * Generate complete fragment shader
   */
  private generateFragmentShader(body: string): string {
    const textureBindings = this.generateTextureBindings();
    const uniformBindings = this.generateUniformBindings();
    const helperFunctions = this.generateHelperFunctions();

    return `// Generated by HoloScript Shader Graph Compiler
// Graph: ${this.graph.name}

struct FragmentInput {
  @location(0) worldPosition: vec3<f32>,
  @location(1) worldNormal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
  position: vec3<f32>,
};

struct SceneUniforms {
  ambientColor: vec3<f32>,
  time: f32,
  deltaTime: f32,
};

struct LightData {
  position: vec3<f32>,
  color: vec3<f32>,
  intensity: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> scene: SceneUniforms;
@group(0) @binding(2) var<uniform> light: LightData;
${textureBindings}
${uniformBindings}

const PI: f32 = 3.14159265359;

${helperFunctions}

@fragment
fn main(in: FragmentInput) -> @location(0) vec4<f32> {
  ${body}

  // PBR lighting calculation
  let N = normalize(normal);
  let V = normalize(camera.position - in.worldPosition);
  let L = normalize(light.position - in.worldPosition);
  let H = normalize(V + L);

  let F0 = mix(vec3<f32>(0.04), baseColor, metallic);

  // Cook-Torrance BRDF
  let NDF = distributionGGX(N, H, roughness);
  let G = geometrySmith(N, V, L, roughness);
  let F = fresnelSchlick(max(dot(H, V), 0.0), F0);

  let numerator = NDF * G * F;
  let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
  let specular = numerator / denominator;

  let kS = F;
  let kD = (vec3<f32>(1.0) - kS) * (1.0 - metallic);
  let NdotL = max(dot(N, L), 0.0);

  let Lo = (kD * baseColor / PI + specular) * light.color * light.intensity * NdotL;
  var color = scene.ambientColor * baseColor * ao + Lo + emission;

  // Tone mapping (Reinhard)
  color = color / (color + vec3<f32>(1.0));

  // Gamma correction
  color = pow(color, vec3<f32>(1.0 / 2.2));

  return vec4<f32>(color, alpha);
}
`;
  }

  /**
   * Generate texture bindings
   */
  private generateTextureBindings(): string {
    if (this.textures.length === 0) return '';

    const lines: string[] = [];
    for (const tex of this.textures) {
      const binding = tex.binding;
      lines.push(`@group(2) @binding(${binding}) var ${tex.name}: texture_2d<f32>;`);
      lines.push(`@group(2) @binding(${binding + 1}) var ${tex.name}Sampler: sampler;`);
    }
    return lines.join('\n');
  }

  /**
   * Generate uniform bindings
   */
  private generateUniformBindings(): string {
    if (this.uniforms.length === 0) return '';

    const lines: string[] = ['struct MaterialUniforms {'];
    for (const uniform of this.uniforms) {
      const wgslType = this.getWGSLType(uniform.type);
      lines.push(`  ${uniform.name}: ${wgslType},`);
    }
    lines.push('};');
    lines.push('@group(2) @binding(100) var<uniform> material: MaterialUniforms;');
    return lines.join('\n');
  }

  /**
   * Generate helper functions
   */
  private generateHelperFunctions(): string {
    return `
// PBR helper functions
fn distributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let NdotH = max(dot(N, H), 0.0);
  let NdotH2 = NdotH * NdotH;

  let num = a2;
  let denom = (NdotH2 * (a2 - 1.0) + 1.0);
  let denom2 = PI * denom * denom;

  return num / denom2;
}

fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
  let r = roughness + 1.0;
  let k = (r * r) / 8.0;

  let num = NdotV;
  let denom = NdotV * (1.0 - k) + k;

  return num / denom;
}

fn geometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
  let NdotV = max(dot(N, V), 0.0);
  let NdotL = max(dot(N, L), 0.0);
  let ggx2 = geometrySchlickGGX(NdotV, roughness);
  let ggx1 = geometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

fn fresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
  return F0 + (vec3<f32>(1.0) - F0) * pow(saturate(1.0 - cosTheta), 5.0);
}

fn hueShift(color: vec3<f32>, shift: f32) -> vec3<f32> {
  let k = vec3<f32>(0.57735);
  let cosAngle = cos(shift);
  return color * cosAngle + cross(k, color) * sin(shift) + k * dot(k, color) * (1.0 - cosAngle);
}

fn simpleNoise(uv: vec2<f32>) -> f32 {
  return fract(sin(dot(uv, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn gradientNoise(uv: vec2<f32>) -> f32 {
  let i = floor(uv);
  let f = fract(uv);
  let u = f * f * (3.0 - 2.0 * f);

  let n00 = simpleNoise(i);
  let n10 = simpleNoise(i + vec2<f32>(1.0, 0.0));
  let n01 = simpleNoise(i + vec2<f32>(0.0, 1.0));
  let n11 = simpleNoise(i + vec2<f32>(1.0, 1.0));

  return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
}

fn voronoi(uv: vec2<f32>) -> vec2<f32> {
  let n = floor(uv);
  let f = fract(uv);

  var minDist = 1.0;
  var cellId = 0.0;

  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let neighbor = vec2<f32>(f32(i), f32(j));
      let point = simpleNoise(n + neighbor);
      let diff = neighbor + point - f;
      let dist = length(diff);
      if (dist < minDist) {
        minDist = dist;
        cellId = simpleNoise(n + neighbor);
      }
    }
  }

  return vec2<f32>(cellId, minDist);
}
`;
  }
}

/**
 * Compile a shader graph
 */
export function compileShaderGraph(
  graph: ShaderGraph,
  options?: Partial<ICompileOptions>
): ICompiledShader {
  const compiler = new ShaderGraphCompiler(graph, options);
  return compiler.compile();
}
