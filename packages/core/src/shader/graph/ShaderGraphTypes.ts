/**
 * Shader Graph Type Definitions
 *
 * Node-based visual shader programming system for HoloScript
 */

// ============================================================================
// Node Value Types
// ============================================================================

/**
 * Shader data types
 */
export type ShaderDataType =
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'int'
  | 'ivec2'
  | 'ivec3'
  | 'ivec4'
  | 'bool'
  | 'sampler2D'
  | 'samplerCube';

/**
 * Type compatibility map for connections
 */
export const TYPE_SIZES: Record<ShaderDataType, number> = {
  float: 1,
  vec2: 2,
  vec3: 3,
  vec4: 4,
  mat2: 4,
  mat3: 9,
  mat4: 16,
  int: 1,
  ivec2: 2,
  ivec3: 3,
  ivec4: 4,
  bool: 1,
  sampler2D: 0,
  samplerCube: 0,
};

/**
 * Check if types are compatible for connection
 */
export function areTypesCompatible(from: ShaderDataType, to: ShaderDataType): boolean {
  // Same type always compatible
  if (from === to) return true;

  // Samplers only connect to same type
  if (from === 'sampler2D' || from === 'samplerCube') return false;
  if (to === 'sampler2D' || to === 'samplerCube') return false;

  // Float can promote to vec types
  if (from === 'float' && (to === 'vec2' || to === 'vec3' || to === 'vec4')) return true;

  // Int can promote to float types
  if (from === 'int' && to === 'float') return true;

  // Vec3 can connect to vec4 (with alpha = 1)
  if (from === 'vec3' && to === 'vec4') return true;

  // Vec4 can connect to vec3 (drops alpha)
  if (from === 'vec4' && to === 'vec3') return true;

  return false;
}

/**
 * Get type conversion code
 */
export function getTypeConversion(from: ShaderDataType, to: ShaderDataType, expr: string): string {
  if (from === to) return expr;

  // Float to vec
  if (from === 'float') {
    if (to === 'vec2') return `vec2<f32>(${expr})`;
    if (to === 'vec3') return `vec3<f32>(${expr})`;
    if (to === 'vec4') return `vec4<f32>(${expr})`;
  }

  // Int to float
  if (from === 'int' && to === 'float') return `f32(${expr})`;

  // Vec3 to vec4
  if (from === 'vec3' && to === 'vec4') return `vec4<f32>(${expr}, 1.0)`;

  // Vec4 to vec3
  if (from === 'vec4' && to === 'vec3') return `(${expr}).xyz`;

  return expr;
}

// ============================================================================
// Node Definitions
// ============================================================================

/**
 * Port direction
 */
export type PortDirection = 'input' | 'output';

/**
 * Node port definition
 */
export interface IShaderPort {
  /** Port identifier */
  id: string;
  /** Display name */
  name: string;
  /** Port direction */
  direction: PortDirection;
  /** Data type */
  type: ShaderDataType;
  /** Default value for inputs */
  defaultValue?: number | number[];
  /** Whether this port is required */
  required?: boolean;
  /** Connected port reference */
  connected?: {
    nodeId: string;
    portId: string;
  };
}

/**
 * Node categories
 */
export type NodeCategory =
  | 'input'
  | 'output'
  | 'math'
  | 'vector'
  | 'color'
  | 'texture'
  | 'utility'
  | 'custom';

/**
 * Base shader node
 */
export interface IShaderNode {
  /** Unique node ID */
  id: string;
  /** Node type identifier */
  type: string;
  /** Display name */
  name: string;
  /** Category */
  category: NodeCategory;
  /** Input ports */
  inputs: IShaderPort[];
  /** Output ports */
  outputs: IShaderPort[];
  /** Position in graph editor */
  position: { x: number; y: number };
  /** Custom properties */
  properties?: Record<string, unknown>;
  /** Preview enabled */
  preview?: boolean;
}

/**
 * Connection between nodes
 */
export interface IShaderConnection {
  /** Connection ID */
  id: string;
  /** Source node ID */
  fromNode: string;
  /** Source port ID */
  fromPort: string;
  /** Target node ID */
  toNode: string;
  /** Target port ID */
  toPort: string;
}

/**
 * Complete shader graph
 */
export interface IShaderGraph {
  /** Graph ID */
  id: string;
  /** Graph name */
  name: string;
  /** Description */
  description?: string;
  /** All nodes */
  nodes: Map<string, IShaderNode>;
  /** All connections */
  connections: IShaderConnection[];
  /** Graph version */
  version: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Node Templates
// ============================================================================

/**
 * Node template for creating new nodes
 */
export interface INodeTemplate {
  /** Node type identifier */
  type: string;
  /** Display name */
  name: string;
  /** Category */
  category: NodeCategory;
  /** Description */
  description: string;
  /** Input port definitions */
  inputs: Omit<IShaderPort, 'direction' | 'connected'>[];
  /** Output port definitions */
  outputs: Omit<IShaderPort, 'direction' | 'connected'>[];
  /** Default properties */
  defaultProperties?: Record<string, unknown>;
  /** WGSL code generator */
  generateCode: (node: IShaderNode, inputs: Record<string, string>) => string;
}

// ============================================================================
// Built-in Node Templates
// ============================================================================

/**
 * Input nodes
 */
export const INPUT_NODES: INodeTemplate[] = [
  {
    type: 'input_position',
    name: 'World Position',
    category: 'input',
    description: 'World space position',
    inputs: [],
    outputs: [{ id: 'position', name: 'Position', type: 'vec3' }],
    generateCode: () => 'in.worldPosition',
  },
  {
    type: 'input_normal',
    name: 'World Normal',
    category: 'input',
    description: 'World space normal',
    inputs: [],
    outputs: [{ id: 'normal', name: 'Normal', type: 'vec3' }],
    generateCode: () => 'in.worldNormal',
  },
  {
    type: 'input_uv',
    name: 'UV Coordinates',
    category: 'input',
    description: 'Texture coordinates',
    inputs: [],
    outputs: [{ id: 'uv', name: 'UV', type: 'vec2' }],
    generateCode: () => 'in.uv',
  },
  {
    type: 'input_time',
    name: 'Time',
    category: 'input',
    description: 'Scene time in seconds',
    inputs: [],
    outputs: [{ id: 'time', name: 'Time', type: 'float' }],
    generateCode: () => 'scene.time',
  },
  {
    type: 'input_camera_position',
    name: 'Camera Position',
    category: 'input',
    description: 'Camera world position',
    inputs: [],
    outputs: [{ id: 'position', name: 'Position', type: 'vec3' }],
    generateCode: () => 'camera.position',
  },
  {
    type: 'input_view_direction',
    name: 'View Direction',
    category: 'input',
    description: 'Direction from surface to camera',
    inputs: [],
    outputs: [{ id: 'direction', name: 'Direction', type: 'vec3' }],
    generateCode: () => 'normalize(camera.position - in.worldPosition)',
  },
  {
    type: 'constant_float',
    name: 'Float',
    category: 'input',
    description: 'Constant float value',
    inputs: [],
    outputs: [{ id: 'value', name: 'Value', type: 'float' }],
    defaultProperties: { value: 0 },
    generateCode: (node) => `${node.properties?.value ?? 0}`,
  },
  {
    type: 'constant_vec2',
    name: 'Vector2',
    category: 'input',
    description: 'Constant vec2 value',
    inputs: [],
    outputs: [{ id: 'value', name: 'Value', type: 'vec2' }],
    defaultProperties: { x: 0, y: 0 },
    generateCode: (node) => {
      const x = node.properties?.x ?? 0;
      const y = node.properties?.y ?? 0;
      return `vec2<f32>(${x}, ${y})`;
    },
  },
  {
    type: 'constant_vec3',
    name: 'Vector3',
    category: 'input',
    description: 'Constant vec3 value',
    inputs: [],
    outputs: [{ id: 'value', name: 'Value', type: 'vec3' }],
    defaultProperties: { x: 0, y: 0, z: 0 },
    generateCode: (node) => {
      const x = node.properties?.x ?? 0;
      const y = node.properties?.y ?? 0;
      const z = node.properties?.z ?? 0;
      return `vec3<f32>(${x}, ${y}, ${z})`;
    },
  },
  {
    type: 'constant_color',
    name: 'Color',
    category: 'input',
    description: 'Constant color value',
    inputs: [],
    outputs: [{ id: 'color', name: 'Color', type: 'vec4' }],
    defaultProperties: { r: 1, g: 1, b: 1, a: 1 },
    generateCode: (node) => {
      const r = node.properties?.r ?? 1;
      const g = node.properties?.g ?? 1;
      const b = node.properties?.b ?? 1;
      const a = node.properties?.a ?? 1;
      return `vec4<f32>(${r}, ${g}, ${b}, ${a})`;
    },
  },
];

/**
 * Math nodes
 */
export const MATH_NODES: INodeTemplate[] = [
  {
    type: 'math_add',
    name: 'Add',
    category: 'math',
    description: 'Add two values',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `(${inputs.a} + ${inputs.b})`,
  },
  {
    type: 'math_subtract',
    name: 'Subtract',
    category: 'math',
    description: 'Subtract two values',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `(${inputs.a} - ${inputs.b})`,
  },
  {
    type: 'math_multiply',
    name: 'Multiply',
    category: 'math',
    description: 'Multiply two values',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 1 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `(${inputs.a} * ${inputs.b})`,
  },
  {
    type: 'math_divide',
    name: 'Divide',
    category: 'math',
    description: 'Divide two values',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 1 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `(${inputs.a} / max(${inputs.b}, 0.0001))`,
  },
  {
    type: 'math_power',
    name: 'Power',
    category: 'math',
    description: 'Raise to power',
    inputs: [
      { id: 'base', name: 'Base', type: 'float', defaultValue: 2 },
      { id: 'exp', name: 'Exponent', type: 'float', defaultValue: 2 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `pow(${inputs.base}, ${inputs.exp})`,
  },
  {
    type: 'math_sqrt',
    name: 'Square Root',
    category: 'math',
    description: 'Square root',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 1 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `sqrt(max(${inputs.value}, 0.0))`,
  },
  {
    type: 'math_abs',
    name: 'Absolute',
    category: 'math',
    description: 'Absolute value',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `abs(${inputs.value})`,
  },
  {
    type: 'math_negate',
    name: 'Negate',
    category: 'math',
    description: 'Negate value',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `(-${inputs.value})`,
  },
  {
    type: 'math_min',
    name: 'Minimum',
    category: 'math',
    description: 'Minimum of two values',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `min(${inputs.a}, ${inputs.b})`,
  },
  {
    type: 'math_max',
    name: 'Maximum',
    category: 'math',
    description: 'Maximum of two values',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `max(${inputs.a}, ${inputs.b})`,
  },
  {
    type: 'math_clamp',
    name: 'Clamp',
    category: 'math',
    description: 'Clamp value between min and max',
    inputs: [
      { id: 'value', name: 'Value', type: 'float', defaultValue: 0 },
      { id: 'min', name: 'Min', type: 'float', defaultValue: 0 },
      { id: 'max', name: 'Max', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `clamp(${inputs.value}, ${inputs.min}, ${inputs.max})`,
  },
  {
    type: 'math_saturate',
    name: 'Saturate',
    category: 'math',
    description: 'Clamp between 0 and 1',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `saturate(${inputs.value})`,
  },
  {
    type: 'math_lerp',
    name: 'Lerp',
    category: 'math',
    description: 'Linear interpolation',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
      { id: 't', name: 'T', type: 'float', defaultValue: 0.5 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `mix(${inputs.a}, ${inputs.b}, ${inputs.t})`,
  },
  {
    type: 'math_smoothstep',
    name: 'Smoothstep',
    category: 'math',
    description: 'Smooth Hermite interpolation',
    inputs: [
      { id: 'edge0', name: 'Edge0', type: 'float', defaultValue: 0 },
      { id: 'edge1', name: 'Edge1', type: 'float', defaultValue: 1 },
      { id: 'x', name: 'X', type: 'float', defaultValue: 0.5 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `smoothstep(${inputs.edge0}, ${inputs.edge1}, ${inputs.x})`,
  },
  {
    type: 'math_step',
    name: 'Step',
    category: 'math',
    description: 'Step function',
    inputs: [
      { id: 'edge', name: 'Edge', type: 'float', defaultValue: 0.5 },
      { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `step(${inputs.edge}, ${inputs.x})`,
  },
  {
    type: 'math_fract',
    name: 'Fraction',
    category: 'math',
    description: 'Fractional part',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `fract(${inputs.value})`,
  },
  {
    type: 'math_floor',
    name: 'Floor',
    category: 'math',
    description: 'Floor value',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `floor(${inputs.value})`,
  },
  {
    type: 'math_ceil',
    name: 'Ceiling',
    category: 'math',
    description: 'Ceiling value',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `ceil(${inputs.value})`,
  },
  {
    type: 'math_round',
    name: 'Round',
    category: 'math',
    description: 'Round value',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `round(${inputs.value})`,
  },
  {
    type: 'math_mod',
    name: 'Modulo',
    category: 'math',
    description: 'Modulo operation',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `(${inputs.a} % ${inputs.b})`,
  },
];

/**
 * Trigonometry nodes
 */
export const TRIG_NODES: INodeTemplate[] = [
  {
    type: 'trig_sin',
    name: 'Sine',
    category: 'math',
    description: 'Sine function',
    inputs: [{ id: 'angle', name: 'Angle', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `sin(${inputs.angle})`,
  },
  {
    type: 'trig_cos',
    name: 'Cosine',
    category: 'math',
    description: 'Cosine function',
    inputs: [{ id: 'angle', name: 'Angle', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `cos(${inputs.angle})`,
  },
  {
    type: 'trig_tan',
    name: 'Tangent',
    category: 'math',
    description: 'Tangent function',
    inputs: [{ id: 'angle', name: 'Angle', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `tan(${inputs.angle})`,
  },
  {
    type: 'trig_asin',
    name: 'Arcsine',
    category: 'math',
    description: 'Arcsine function',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `asin(${inputs.value})`,
  },
  {
    type: 'trig_acos',
    name: 'Arccosine',
    category: 'math',
    description: 'Arccosine function',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `acos(${inputs.value})`,
  },
  {
    type: 'trig_atan',
    name: 'Arctangent',
    category: 'math',
    description: 'Arctangent function',
    inputs: [{ id: 'value', name: 'Value', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `atan(${inputs.value})`,
  },
  {
    type: 'trig_atan2',
    name: 'Arctangent2',
    category: 'math',
    description: 'Two-argument arctangent',
    inputs: [
      { id: 'y', name: 'Y', type: 'float', defaultValue: 0 },
      { id: 'x', name: 'X', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `atan2(${inputs.y}, ${inputs.x})`,
  },
  {
    type: 'trig_radians',
    name: 'Degrees to Radians',
    category: 'math',
    description: 'Convert degrees to radians',
    inputs: [{ id: 'degrees', name: 'Degrees', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Radians', type: 'float' }],
    generateCode: (_, inputs) => `radians(${inputs.degrees})`,
  },
  {
    type: 'trig_degrees',
    name: 'Radians to Degrees',
    category: 'math',
    description: 'Convert radians to degrees',
    inputs: [{ id: 'radians', name: 'Radians', type: 'float', defaultValue: 0 }],
    outputs: [{ id: 'result', name: 'Degrees', type: 'float' }],
    generateCode: (_, inputs) => `degrees(${inputs.radians})`,
  },
];

/**
 * Vector nodes
 */
export const VECTOR_NODES: INodeTemplate[] = [
  {
    type: 'vector_make_vec2',
    name: 'Make Vec2',
    category: 'vector',
    description: 'Create vec2 from components',
    inputs: [
      { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
      { id: 'y', name: 'Y', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'vector', name: 'Vector', type: 'vec2' }],
    generateCode: (_, inputs) => `vec2<f32>(${inputs.x}, ${inputs.y})`,
  },
  {
    type: 'vector_make_vec3',
    name: 'Make Vec3',
    category: 'vector',
    description: 'Create vec3 from components',
    inputs: [
      { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
      { id: 'y', name: 'Y', type: 'float', defaultValue: 0 },
      { id: 'z', name: 'Z', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'vector', name: 'Vector', type: 'vec3' }],
    generateCode: (_, inputs) => `vec3<f32>(${inputs.x}, ${inputs.y}, ${inputs.z})`,
  },
  {
    type: 'vector_make_vec4',
    name: 'Make Vec4',
    category: 'vector',
    description: 'Create vec4 from components',
    inputs: [
      { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
      { id: 'y', name: 'Y', type: 'float', defaultValue: 0 },
      { id: 'z', name: 'Z', type: 'float', defaultValue: 0 },
      { id: 'w', name: 'W', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'vector', name: 'Vector', type: 'vec4' }],
    generateCode: (_, inputs) =>
      `vec4<f32>(${inputs.x}, ${inputs.y}, ${inputs.z}, ${inputs.w})`,
  },
  {
    type: 'vector_split_vec2',
    name: 'Split Vec2',
    category: 'vector',
    description: 'Split vec2 into components',
    inputs: [{ id: 'vector', name: 'Vector', type: 'vec2', defaultValue: [0, 0] }],
    outputs: [
      { id: 'x', name: 'X', type: 'float' },
      { id: 'y', name: 'Y', type: 'float' },
    ],
    generateCode: (_, inputs) => inputs.vector,
  },
  {
    type: 'vector_split_vec3',
    name: 'Split Vec3',
    category: 'vector',
    description: 'Split vec3 into components',
    inputs: [{ id: 'vector', name: 'Vector', type: 'vec3', defaultValue: [0, 0, 0] }],
    outputs: [
      { id: 'x', name: 'X', type: 'float' },
      { id: 'y', name: 'Y', type: 'float' },
      { id: 'z', name: 'Z', type: 'float' },
    ],
    generateCode: (_, inputs) => inputs.vector,
  },
  {
    type: 'vector_split_vec4',
    name: 'Split Vec4',
    category: 'vector',
    description: 'Split vec4 into components',
    inputs: [{ id: 'vector', name: 'Vector', type: 'vec4', defaultValue: [0, 0, 0, 1] }],
    outputs: [
      { id: 'x', name: 'X', type: 'float' },
      { id: 'y', name: 'Y', type: 'float' },
      { id: 'z', name: 'Z', type: 'float' },
      { id: 'w', name: 'W', type: 'float' },
    ],
    generateCode: (_, inputs) => inputs.vector,
  },
  {
    type: 'vector_normalize',
    name: 'Normalize',
    category: 'vector',
    description: 'Normalize vector',
    inputs: [{ id: 'vector', name: 'Vector', type: 'vec3', defaultValue: [1, 0, 0] }],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => `normalize(${inputs.vector})`,
  },
  {
    type: 'vector_length',
    name: 'Length',
    category: 'vector',
    description: 'Vector length',
    inputs: [{ id: 'vector', name: 'Vector', type: 'vec3', defaultValue: [0, 0, 0] }],
    outputs: [{ id: 'length', name: 'Length', type: 'float' }],
    generateCode: (_, inputs) => `length(${inputs.vector})`,
  },
  {
    type: 'vector_distance',
    name: 'Distance',
    category: 'vector',
    description: 'Distance between vectors',
    inputs: [
      { id: 'a', name: 'A', type: 'vec3', defaultValue: [0, 0, 0] },
      { id: 'b', name: 'B', type: 'vec3', defaultValue: [0, 0, 0] },
    ],
    outputs: [{ id: 'distance', name: 'Distance', type: 'float' }],
    generateCode: (_, inputs) => `distance(${inputs.a}, ${inputs.b})`,
  },
  {
    type: 'vector_dot',
    name: 'Dot Product',
    category: 'vector',
    description: 'Dot product',
    inputs: [
      { id: 'a', name: 'A', type: 'vec3', defaultValue: [1, 0, 0] },
      { id: 'b', name: 'B', type: 'vec3', defaultValue: [1, 0, 0] },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => `dot(${inputs.a}, ${inputs.b})`,
  },
  {
    type: 'vector_cross',
    name: 'Cross Product',
    category: 'vector',
    description: 'Cross product',
    inputs: [
      { id: 'a', name: 'A', type: 'vec3', defaultValue: [1, 0, 0] },
      { id: 'b', name: 'B', type: 'vec3', defaultValue: [0, 1, 0] },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => `cross(${inputs.a}, ${inputs.b})`,
  },
  {
    type: 'vector_reflect',
    name: 'Reflect',
    category: 'vector',
    description: 'Reflect vector',
    inputs: [
      { id: 'incident', name: 'Incident', type: 'vec3', defaultValue: [1, 0, 0] },
      { id: 'normal', name: 'Normal', type: 'vec3', defaultValue: [0, 1, 0] },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => `reflect(${inputs.incident}, ${inputs.normal})`,
  },
  {
    type: 'vector_refract',
    name: 'Refract',
    category: 'vector',
    description: 'Refract vector',
    inputs: [
      { id: 'incident', name: 'Incident', type: 'vec3', defaultValue: [1, 0, 0] },
      { id: 'normal', name: 'Normal', type: 'vec3', defaultValue: [0, 1, 0] },
      { id: 'eta', name: 'Eta', type: 'float', defaultValue: 1.0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => `refract(${inputs.incident}, ${inputs.normal}, ${inputs.eta})`,
  },
];

/**
 * Color nodes
 */
export const COLOR_NODES: INodeTemplate[] = [
  {
    type: 'color_blend',
    name: 'Blend',
    category: 'color',
    description: 'Blend two colors',
    inputs: [
      { id: 'a', name: 'A', type: 'vec4', defaultValue: [0, 0, 0, 1] },
      { id: 'b', name: 'B', type: 'vec4', defaultValue: [1, 1, 1, 1] },
      { id: 'factor', name: 'Factor', type: 'float', defaultValue: 0.5 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec4' }],
    generateCode: (_, inputs) => `mix(${inputs.a}, ${inputs.b}, ${inputs.factor})`,
  },
  {
    type: 'color_hue_shift',
    name: 'Hue Shift',
    category: 'color',
    description: 'Shift hue of color',
    inputs: [
      { id: 'color', name: 'Color', type: 'vec3', defaultValue: [1, 0, 0] },
      { id: 'shift', name: 'Shift', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => `hueShift(${inputs.color}, ${inputs.shift})`,
  },
  {
    type: 'color_saturation',
    name: 'Saturation',
    category: 'color',
    description: 'Adjust color saturation',
    inputs: [
      { id: 'color', name: 'Color', type: 'vec3', defaultValue: [1, 0.5, 0.5] },
      { id: 'saturation', name: 'Saturation', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => {
      return `mix(vec3<f32>(dot(${inputs.color}, vec3<f32>(0.299, 0.587, 0.114))), ${inputs.color}, ${inputs.saturation})`;
    },
  },
  {
    type: 'color_brightness',
    name: 'Brightness',
    category: 'color',
    description: 'Adjust color brightness',
    inputs: [
      { id: 'color', name: 'Color', type: 'vec3', defaultValue: [0.5, 0.5, 0.5] },
      { id: 'brightness', name: 'Brightness', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => `(${inputs.color} * ${inputs.brightness})`,
  },
  {
    type: 'color_contrast',
    name: 'Contrast',
    category: 'color',
    description: 'Adjust color contrast',
    inputs: [
      { id: 'color', name: 'Color', type: 'vec3', defaultValue: [0.5, 0.5, 0.5] },
      { id: 'contrast', name: 'Contrast', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) =>
      `((${inputs.color} - vec3<f32>(0.5)) * ${inputs.contrast} + vec3<f32>(0.5))`,
  },
  {
    type: 'color_invert',
    name: 'Invert',
    category: 'color',
    description: 'Invert color',
    inputs: [{ id: 'color', name: 'Color', type: 'vec3', defaultValue: [0.5, 0.5, 0.5] }],
    outputs: [{ id: 'result', name: 'Result', type: 'vec3' }],
    generateCode: (_, inputs) => `(vec3<f32>(1.0) - ${inputs.color})`,
  },
  {
    type: 'color_grayscale',
    name: 'Grayscale',
    category: 'color',
    description: 'Convert to grayscale',
    inputs: [{ id: 'color', name: 'Color', type: 'vec3', defaultValue: [1, 0, 0] }],
    outputs: [{ id: 'result', name: 'Gray', type: 'float' }],
    generateCode: (_, inputs) => `dot(${inputs.color}, vec3<f32>(0.299, 0.587, 0.114))`,
  },
];

/**
 * Texture nodes
 */
export const TEXTURE_NODES: INodeTemplate[] = [
  {
    type: 'texture_sample',
    name: 'Sample Texture',
    category: 'texture',
    description: 'Sample a 2D texture',
    inputs: [
      { id: 'texture', name: 'Texture', type: 'sampler2D' },
      { id: 'uv', name: 'UV', type: 'vec2', defaultValue: [0, 0] },
    ],
    outputs: [{ id: 'color', name: 'Color', type: 'vec4' }],
    generateCode: (node, inputs) => {
      const textureId = node.properties?.textureId ?? 'defaultTexture';
      return `textureSample(${textureId}, ${textureId}Sampler, ${inputs.uv})`;
    },
  },
  {
    type: 'texture_sample_level',
    name: 'Sample Texture Level',
    category: 'texture',
    description: 'Sample texture at specific mip level',
    inputs: [
      { id: 'texture', name: 'Texture', type: 'sampler2D' },
      { id: 'uv', name: 'UV', type: 'vec2', defaultValue: [0, 0] },
      { id: 'level', name: 'Level', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'color', name: 'Color', type: 'vec4' }],
    generateCode: (node, inputs) => {
      const textureId = node.properties?.textureId ?? 'defaultTexture';
      return `textureSampleLevel(${textureId}, ${textureId}Sampler, ${inputs.uv}, ${inputs.level})`;
    },
  },
  {
    type: 'texture_tiling_offset',
    name: 'Tiling and Offset',
    category: 'texture',
    description: 'Apply tiling and offset to UVs',
    inputs: [
      { id: 'uv', name: 'UV', type: 'vec2', defaultValue: [0, 0] },
      { id: 'tiling', name: 'Tiling', type: 'vec2', defaultValue: [1, 1] },
      { id: 'offset', name: 'Offset', type: 'vec2', defaultValue: [0, 0] },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'vec2' }],
    generateCode: (_, inputs) => `(${inputs.uv} * ${inputs.tiling} + ${inputs.offset})`,
  },
];

/**
 * Utility nodes
 */
export const UTILITY_NODES: INodeTemplate[] = [
  {
    type: 'utility_fresnel',
    name: 'Fresnel',
    category: 'utility',
    description: 'Fresnel effect',
    inputs: [
      { id: 'normal', name: 'Normal', type: 'vec3', defaultValue: [0, 1, 0] },
      { id: 'viewDir', name: 'View Dir', type: 'vec3', defaultValue: [0, 0, 1] },
      { id: 'power', name: 'Power', type: 'float', defaultValue: 5 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) =>
      `pow(1.0 - saturate(dot(${inputs.normal}, ${inputs.viewDir})), ${inputs.power})`,
  },
  {
    type: 'utility_noise_simple',
    name: 'Simple Noise',
    category: 'utility',
    description: 'Simple value noise',
    inputs: [{ id: 'uv', name: 'UV', type: 'vec2', defaultValue: [0, 0] }],
    outputs: [{ id: 'noise', name: 'Noise', type: 'float' }],
    generateCode: (_, inputs) => `simpleNoise(${inputs.uv})`,
  },
  {
    type: 'utility_gradient_noise',
    name: 'Gradient Noise',
    category: 'utility',
    description: 'Perlin-like gradient noise',
    inputs: [{ id: 'uv', name: 'UV', type: 'vec2', defaultValue: [0, 0] }],
    outputs: [{ id: 'noise', name: 'Noise', type: 'float' }],
    generateCode: (_, inputs) => `gradientNoise(${inputs.uv})`,
  },
  {
    type: 'utility_voronoi',
    name: 'Voronoi',
    category: 'utility',
    description: 'Voronoi noise',
    inputs: [
      { id: 'uv', name: 'UV', type: 'vec2', defaultValue: [0, 0] },
      { id: 'scale', name: 'Scale', type: 'float', defaultValue: 5 },
    ],
    outputs: [
      { id: 'cells', name: 'Cells', type: 'float' },
      { id: 'distance', name: 'Distance', type: 'float' },
    ],
    generateCode: (_, inputs) => `voronoi(${inputs.uv} * ${inputs.scale})`,
  },
  {
    type: 'utility_remap',
    name: 'Remap',
    category: 'utility',
    description: 'Remap value from one range to another',
    inputs: [
      { id: 'value', name: 'Value', type: 'float', defaultValue: 0 },
      { id: 'inMin', name: 'In Min', type: 'float', defaultValue: 0 },
      { id: 'inMax', name: 'In Max', type: 'float', defaultValue: 1 },
      { id: 'outMin', name: 'Out Min', type: 'float', defaultValue: 0 },
      { id: 'outMax', name: 'Out Max', type: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) => {
      return `(${inputs.outMin} + (${inputs.value} - ${inputs.inMin}) * (${inputs.outMax} - ${inputs.outMin}) / (${inputs.inMax} - ${inputs.inMin}))`;
    },
  },
  {
    type: 'utility_if',
    name: 'Branch',
    category: 'utility',
    description: 'Conditional selection',
    inputs: [
      { id: 'condition', name: 'Condition', type: 'float', defaultValue: 0 },
      { id: 'true', name: 'True', type: 'float', defaultValue: 1 },
      { id: 'false', name: 'False', type: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    generateCode: (_, inputs) =>
      `select(${inputs.false}, ${inputs.true}, ${inputs.condition} > 0.5)`,
  },
  {
    type: 'utility_compare',
    name: 'Compare',
    category: 'utility',
    description: 'Compare two values',
    inputs: [
      { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
    ],
    outputs: [
      { id: 'equal', name: 'A == B', type: 'float' },
      { id: 'less', name: 'A < B', type: 'float' },
      { id: 'greater', name: 'A > B', type: 'float' },
    ],
    generateCode: (_, inputs) => `compareValues(${inputs.a}, ${inputs.b})`,
  },
];

/**
 * Output nodes
 */
export const OUTPUT_NODES: INodeTemplate[] = [
  {
    type: 'output_surface',
    name: 'Surface Output',
    category: 'output',
    description: 'PBR surface output',
    inputs: [
      { id: 'baseColor', name: 'Base Color', type: 'vec3', defaultValue: [1, 1, 1] },
      { id: 'metallic', name: 'Metallic', type: 'float', defaultValue: 0 },
      { id: 'roughness', name: 'Roughness', type: 'float', defaultValue: 0.5 },
      { id: 'normal', name: 'Normal', type: 'vec3', defaultValue: [0, 0, 1] },
      { id: 'emission', name: 'Emission', type: 'vec3', defaultValue: [0, 0, 0] },
      { id: 'alpha', name: 'Alpha', type: 'float', defaultValue: 1 },
      { id: 'ao', name: 'AO', type: 'float', defaultValue: 1 },
    ],
    outputs: [],
    generateCode: (_, inputs) => {
      return `SurfaceOutput(
        ${inputs.baseColor},
        ${inputs.metallic},
        ${inputs.roughness},
        ${inputs.normal},
        ${inputs.emission},
        ${inputs.alpha},
        ${inputs.ao}
      )`;
    },
  },
  {
    type: 'output_unlit',
    name: 'Unlit Output',
    category: 'output',
    description: 'Unlit color output',
    inputs: [
      { id: 'color', name: 'Color', type: 'vec4', defaultValue: [1, 1, 1, 1] },
    ],
    outputs: [],
    generateCode: (_, inputs) => `${inputs.color}`,
  },
  {
    type: 'output_vertex_offset',
    name: 'Vertex Offset',
    category: 'output',
    description: 'Vertex position offset',
    inputs: [{ id: 'offset', name: 'Offset', type: 'vec3', defaultValue: [0, 0, 0] }],
    outputs: [],
    generateCode: (_, inputs) => inputs.offset,
  },
];

/**
 * All built-in node templates
 */
export const ALL_NODE_TEMPLATES: INodeTemplate[] = [
  ...INPUT_NODES,
  ...MATH_NODES,
  ...TRIG_NODES,
  ...VECTOR_NODES,
  ...COLOR_NODES,
  ...TEXTURE_NODES,
  ...UTILITY_NODES,
  ...OUTPUT_NODES,
];

/**
 * Get node template by type
 */
export function getNodeTemplate(type: string): INodeTemplate | undefined {
  return ALL_NODE_TEMPLATES.find((t) => t.type === type);
}

// ============================================================================
// Compilation Types
// ============================================================================

/**
 * Compiled shader output
 */
export interface ICompiledShader {
  /** Vertex shader code */
  vertexCode: string;
  /** Fragment shader code */
  fragmentCode: string;
  /** Required uniforms */
  uniforms: IShaderUniform[];
  /** Required textures */
  textures: IShaderTexture[];
  /** Compilation warnings */
  warnings: string[];
  /** Compilation errors */
  errors: string[];
}

/**
 * Shader uniform
 */
export interface IShaderUniform {
  name: string;
  type: ShaderDataType;
  defaultValue?: number | number[];
}

/**
 * Shader texture
 */
export interface IShaderTexture {
  name: string;
  type: 'texture_2d' | 'texture_cube';
  binding: number;
}

/**
 * Compilation options
 */
export interface ICompileOptions {
  /** Target shader format */
  target: 'wgsl' | 'glsl' | 'hlsl';
  /** Enable optimizations */
  optimize?: boolean;
  /** Include debug info */
  debug?: boolean;
  /** Custom defines */
  defines?: Record<string, string>;
}
