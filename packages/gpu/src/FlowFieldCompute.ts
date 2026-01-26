/**
 * @holoscript/gpu - FlowFieldCompute
 * GPU-accelerated flow field computation using WebGPU compute shaders
 */

import { GPUContext } from './GPUContext';

export interface FlowFieldComputeConfig {
  /** Grid width */
  width: number;
  /** Grid height */
  height: number;
  /** Cell size in world units */
  cellSize: number;
}

const FLOW_FIELD_SHADER = /* wgsl */ `
struct Params {
  width: u32,
  height: u32,
  goalX: u32,
  goalZ: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> costField: array<f32>;
@group(0) @binding(2) var<storage, read_write> flowField: array<vec2f>;
@group(0) @binding(3) var<storage, read> obstacles: array<u32>;

fn getIndex(x: u32, z: u32) -> u32 {
  return z * params.width + x;
}

fn isBlocked(x: u32, z: u32) -> bool {
  if (x >= params.width || z >= params.height) { return true; }
  return obstacles[getIndex(x, z)] == 1u;
}

@compute @workgroup_size(8, 8)
fn computeCost(@builtin(global_invocation_id) id: vec3u) {
  let x = id.x;
  let z = id.y;
  
  if (x >= params.width || z >= params.height) { return; }
  
  let idx = getIndex(x, z);
  
  if (isBlocked(x, z)) {
    costField[idx] = 999999.0;
    return;
  }
  
  // Distance to goal (simplified - real impl uses Dijkstra wavefront)
  let dx = f32(i32(x) - i32(params.goalX));
  let dz = f32(i32(z) - i32(params.goalZ));
  costField[idx] = sqrt(dx * dx + dz * dz);
}

@compute @workgroup_size(8, 8)
fn computeFlow(@builtin(global_invocation_id) id: vec3u) {
  let x = id.x;
  let z = id.y;
  
  if (x >= params.width || z >= params.height) { return; }
  
  let idx = getIndex(x, z);
  
  if (isBlocked(x, z)) {
    flowField[idx] = vec2f(0.0, 0.0);
    return;
  }
  
  let currentCost = costField[idx];
  var bestDir = vec2f(0.0, 0.0);
  var bestCost = currentCost;
  
  // Check 8 neighbors
  for (var dx: i32 = -1; dx <= 1; dx++) {
    for (var dz: i32 = -1; dz <= 1; dz++) {
      if (dx == 0 && dz == 0) { continue; }
      
      let nx = u32(i32(x) + dx);
      let nz = u32(i32(z) + dz);
      
      if (nx >= params.width || nz >= params.height) { continue; }
      if (isBlocked(nx, nz)) { continue; }
      
      let neighborCost = costField[getIndex(nx, nz)];
      if (neighborCost < bestCost) {
        bestCost = neighborCost;
        bestDir = normalize(vec2f(f32(dx), f32(dz)));
      }
    }
  }
  
  flowField[idx] = bestDir;
}
`;

/**
 * FlowFieldCompute
 * 
 * GPU-accelerated flow field generation using WebGPU compute shaders.
 * Much faster than CPU version for large grids.
 */
export class FlowFieldCompute {
  private config: FlowFieldComputeConfig;
  private gpuContext: GPUContext;
  private initialized: boolean = false;
  
  // GPU resources
  private paramsBuffer: GPUBuffer | null = null;
  private costBuffer: GPUBuffer | null = null;
  private flowBuffer: GPUBuffer | null = null;
  private obstaclesBuffer: GPUBuffer | null = null;
  private readbackBuffer: GPUBuffer | null = null;
  private costPipeline: GPUComputePipeline | null = null;
  private flowPipeline: GPUComputePipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;
  
  // CPU-side data (explicitly typed with ArrayBuffer for WebGPU compatibility)
  private obstacles: Uint32Array<ArrayBuffer>;
  private flowData: Float32Array<ArrayBuffer>;
  
  constructor(config: FlowFieldComputeConfig) {
    this.config = config;
    this.gpuContext = new GPUContext({ powerPreference: 'high-performance' });
    
    const size = config.width * config.height;
    this.obstacles = new Uint32Array(new ArrayBuffer(size * 4));
    this.flowData = new Float32Array(new ArrayBuffer(size * 2 * 4));
  }
  
  /**
   * Initialize GPU resources
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    if (!await this.gpuContext.initialize()) {
      console.warn('WebGPU not available, falling back to CPU');
      return false;
    }
    
    const device = this.gpuContext.getDevice();
    const size = this.config.width * this.config.height;
    
    // Create buffers
    this.paramsBuffer = device.createBuffer({
      size: 16, // 4 x u32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    this.costBuffer = device.createBuffer({
      size: size * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    
    this.flowBuffer = device.createBuffer({
      size: size * 8, // vec2f per cell
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    
    this.obstaclesBuffer = device.createBuffer({
      size: size * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    this.readbackBuffer = device.createBuffer({
      size: size * 8,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    
    // Create shader module
    const shaderModule = device.createShaderModule({
      code: FLOW_FIELD_SHADER,
    });
    
    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      ],
    });
    
    // Create pipelines
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
    
    this.costPipeline = device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module: shaderModule, entryPoint: 'computeCost' },
    });
    
    this.flowPipeline = device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module: shaderModule, entryPoint: 'computeFlow' },
    });
    
    // Create bind group
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.costBuffer } },
        { binding: 2, resource: { buffer: this.flowBuffer } },
        { binding: 3, resource: { buffer: this.obstaclesBuffer } },
      ],
    });
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Set obstacle at grid position
   */
  setObstacle(x: number, z: number, blocked: boolean): void {
    if (x < 0 || x >= this.config.width || z < 0 || z >= this.config.height) return;
    this.obstacles[z * this.config.width + x] = blocked ? 1 : 0;
  }
  
  /**
   * Compute flow field with goal position
   */
  async compute(goalX: number, goalZ: number): Promise<Float32Array> {
    if (!this.initialized) {
      throw new Error('FlowFieldCompute not initialized');
    }
    
    const device = this.gpuContext.getDevice();
    
    // Upload params
    const params = new Uint32Array([
      this.config.width,
      this.config.height,
      Math.floor(goalX),
      Math.floor(goalZ),
    ]);
    device.queue.writeBuffer(this.paramsBuffer!, 0, params);
    
    // Upload obstacles
    device.queue.writeBuffer(this.obstaclesBuffer!, 0, this.obstacles);
    
    // Dispatch compute
    const encoder = device.createCommandEncoder();
    
    const workgroupsX = Math.ceil(this.config.width / 8);
    const workgroupsZ = Math.ceil(this.config.height / 8);
    
    // Cost pass
    const costPass = encoder.beginComputePass();
    costPass.setPipeline(this.costPipeline!);
    costPass.setBindGroup(0, this.bindGroup!);
    costPass.dispatchWorkgroups(workgroupsX, workgroupsZ);
    costPass.end();
    
    // Flow pass
    const flowPass = encoder.beginComputePass();
    flowPass.setPipeline(this.flowPipeline!);
    flowPass.setBindGroup(0, this.bindGroup!);
    flowPass.dispatchWorkgroups(workgroupsX, workgroupsZ);
    flowPass.end();
    
    // Copy to readback
    encoder.copyBufferToBuffer(
      this.flowBuffer!,
      0,
      this.readbackBuffer!,
      0,
      this.config.width * this.config.height * 8
    );
    
    device.queue.submit([encoder.finish()]);
    
    // Read back results
    await this.readbackBuffer!.mapAsync(GPUMapMode.READ);
    const mappedData = new Float32Array(this.readbackBuffer!.getMappedRange());
    // Copy to our own ArrayBuffer for type safety
    const data = new Float32Array(new ArrayBuffer(mappedData.byteLength));
    data.set(mappedData);
    this.readbackBuffer!.unmap();
    
    this.flowData = data;
    return data;
  }
  
  /**
   * Get flow vector at world position
   */
  getVector(x: number, z: number): { x: number; y: number } {
    const cellX = Math.floor(x / this.config.cellSize);
    const cellZ = Math.floor(z / this.config.cellSize);
    
    if (cellX < 0 || cellX >= this.config.width || cellZ < 0 || cellZ >= this.config.height) {
      return { x: 0, y: 0 };
    }
    
    const idx = (cellZ * this.config.width + cellX) * 2;
    return {
      x: this.flowData[idx] || 0,
      y: this.flowData[idx + 1] || 0,
    };
  }
  
  /**
   * Destroy GPU resources
   */
  destroy(): void {
    this.paramsBuffer?.destroy();
    this.costBuffer?.destroy();
    this.flowBuffer?.destroy();
    this.obstaclesBuffer?.destroy();
    this.readbackBuffer?.destroy();
    this.gpuContext.destroy();
    this.initialized = false;
  }
}
