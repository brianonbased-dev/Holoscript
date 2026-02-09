/**
 * WebGPU Renderer
 *
 * High-performance WebGPU-based renderer for HoloScript
 */

import type {
  IWebGPUInitOptions,
  IWebGPUContext,
  IDeviceCapabilities,
  IRenderPipelineDescriptor,
  IShaderModule,
  IBufferDescriptor,
  ITextureDescriptor,
  ISamplerDescriptor,
  IGPUTexture,
  IRenderPassDescriptor,
  IRenderMesh,
  IRenderMaterial,
  IDrawCall,
  ICameraUniforms,
  ISceneUniforms,
  IFrameStats,
  IRendererStats,
  IVertexBuffer,
  IIndexBuffer,
} from './WebGPUTypes';

// ============================================================================
// WebGPU Renderer
// ============================================================================

/**
 * WebGPU-based renderer for HoloScript scenes
 */
export class WebGPURenderer {
  private context: IWebGPUContext | null = null;
  private pipelines: Map<string, GPURenderPipeline> = new Map();
  private shaderModules: Map<string, GPUShaderModule> = new Map();
  private bindGroupLayouts: Map<string, GPUBindGroupLayout> = new Map();
  private pipelineLayouts: Map<string, GPUPipelineLayout> = new Map();
  private depthTexture: GPUTexture | null = null;
  private msaaTexture: GPUTexture | null = null;
  private options: Required<IWebGPUInitOptions>;

  // Frame statistics
  private stats: IRendererStats = {
    currentFrame: this.createEmptyFrameStats(),
    average: this.createEmptyFrameStats(),
    totalFrames: 0,
    fps: 0,
  };
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];

  // Uniform buffers
  private cameraUniformBuffer: GPUBuffer | null = null;
  private sceneUniformBuffer: GPUBuffer | null = null;

  // Default resources
  private defaultSampler: GPUSampler | null = null;
  private defaultTexture: IGPUTexture | null = null;

  constructor(options?: Partial<IWebGPUInitOptions>) {
    this.options = {
      canvas: options?.canvas ?? '',
      powerPreference: options?.powerPreference ?? 'high-performance',
      requiredFeatures: options?.requiredFeatures ?? [],
      requiredLimits: options?.requiredLimits ?? {},
      debug: options?.debug ?? false,
      preferredFormat: options?.preferredFormat ?? 'bgra8unorm',
      sampleCount: options?.sampleCount ?? 1,
      alphaMode: options?.alphaMode ?? 'premultiplied',
    };
  }

  /**
   * Check if WebGPU is supported
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  /**
   * Initialize the WebGPU renderer
   */
  async initialize(options?: Partial<IWebGPUInitOptions>): Promise<IWebGPUContext> {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    if (!WebGPURenderer.isSupported()) {
      throw new Error('WebGPU is not supported in this environment');
    }

    // Get canvas element
    const canvas = this.resolveCanvas(this.options.canvas);

    // Request adapter
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: this.options.powerPreference,
    });

    if (!adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    // Check required features
    for (const feature of this.options.requiredFeatures) {
      if (!adapter.features.has(feature)) {
        throw new Error(`Required feature not supported: ${feature}`);
      }
    }

    // Request device
    const device = await adapter.requestDevice({
      requiredFeatures: this.options.requiredFeatures,
      requiredLimits: this.options.requiredLimits,
    });

    // Handle device loss
    device.lost.then((info) => {
      console.error('WebGPU device lost:', info.message);
      if (info.reason !== 'destroyed') {
        // Attempt to reinitialize
        this.initialize(this.options);
      }
    });

    // Configure canvas context
    const context = canvas.getContext('webgpu');
    if (!context) {
      throw new Error('Failed to get WebGPU canvas context');
    }

    const format = this.options.preferredFormat || navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: this.options.alphaMode,
    });

    // Get capabilities
    const capabilities = this.getDeviceCapabilities(adapter, device);

    this.context = {
      adapter,
      device,
      context,
      format,
      canvas,
      capabilities,
    };

    // Create default resources
    this.createDefaultResources();

    // Create depth buffer
    this.createDepthBuffer();

    if (this.options.debug) {
      console.log('WebGPU initialized:', capabilities);
    }

    return this.context;
  }

  /**
   * Resolve canvas from element or selector
   */
  private resolveCanvas(canvasOrSelector: HTMLCanvasElement | string): HTMLCanvasElement {
    if (typeof canvasOrSelector === 'string') {
      const element = document.querySelector(canvasOrSelector);
      if (!element || !('getContext' in element)) {
        throw new Error(`Canvas not found: ${canvasOrSelector}`);
      }
      return element as HTMLCanvasElement;
    }
    return canvasOrSelector;
  }

  /**
   * Get device capabilities
   */
  private getDeviceCapabilities(adapter: GPUAdapter, device: GPUDevice): IDeviceCapabilities {
    const limits = device.limits;
    return {
      maxTextureDimension2D: limits.maxTextureDimension2D,
      maxTextureArrayLayers: limits.maxTextureArrayLayers,
      maxBindGroups: limits.maxBindGroups,
      maxBindingsPerBindGroup: limits.maxBindingsPerBindGroup,
      maxBufferSize: limits.maxBufferSize,
      maxUniformBufferBindingSize: limits.maxUniformBufferBindingSize,
      maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize,
      maxVertexBuffers: limits.maxVertexBuffers,
      maxVertexAttributes: limits.maxVertexAttributes,
      maxComputeWorkgroupsPerDimension: limits.maxComputeWorkgroupsPerDimension,
      features: new Set(adapter.features),
    };
  }

  /**
   * Create default resources
   */
  private createDefaultResources(): void {
    if (!this.context) return;
    const { device } = this.context;

    // Create default sampler
    this.defaultSampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    });

    // Create 1x1 white texture as default
    const texture = device.createTexture({
      size: [1, 1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    device.queue.writeTexture(
      { texture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      { width: 1, height: 1 }
    );

    this.defaultTexture = {
      texture,
      view: texture.createView(),
      sampler: this.defaultSampler,
      width: 1,
      height: 1,
      format: 'rgba8unorm',
      mipLevels: 1,
    };

    // Create camera uniform buffer
    this.cameraUniformBuffer = device.createBuffer({
      size: 256, // Enough for camera matrices
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create scene uniform buffer
    this.sceneUniformBuffer = device.createBuffer({
      size: 64, // Enough for scene uniforms
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  /**
   * Create depth buffer
   */
  private createDepthBuffer(): void {
    if (!this.context) return;
    const { device, canvas } = this.context;

    // Destroy existing depth texture
    this.depthTexture?.destroy();

    this.depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this.options.sampleCount,
    });

    // Create MSAA texture if needed
    if (this.options.sampleCount > 1) {
      this.msaaTexture?.destroy();
      this.msaaTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: this.context.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: this.options.sampleCount,
      });
    }
  }

  /**
   * Handle canvas resize
   */
  resize(width: number, height: number): void {
    if (!this.context) return;
    const { canvas } = this.context;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      this.createDepthBuffer();
    }
  }

  /**
   * Create a shader module
   */
  createShaderModule(descriptor: IShaderModule): GPUShaderModule {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    const cacheKey = descriptor.label || descriptor.code.substring(0, 100);
    const cached = this.shaderModules.get(cacheKey);
    if (cached) return cached;

    const module = this.context.device.createShaderModule({
      label: descriptor.label,
      code: descriptor.code,
    });

    this.shaderModules.set(cacheKey, module);
    return module;
  }

  /**
   * Create a render pipeline
   */
  createRenderPipeline(id: string, descriptor: IRenderPipelineDescriptor): GPURenderPipeline {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    const cached = this.pipelines.get(id);
    if (cached) return cached;

    const { device, format } = this.context;

    const vertexModule = this.createShaderModule(descriptor.vertexShader);
    const fragmentModule = this.createShaderModule(descriptor.fragmentShader);

    // Create pipeline layout
    let pipelineLayout: GPUPipelineLayout | 'auto' = 'auto';
    if (descriptor.bindGroupLayouts) {
      pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: descriptor.bindGroupLayouts,
      });
    }

    const pipeline = device.createRenderPipeline({
      label: descriptor.label || id,
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: descriptor.vertexShader.entryPoint,
        buffers: descriptor.vertexBufferLayouts.map((layout) => ({
          arrayStride: layout.arrayStride,
          stepMode: layout.stepMode ?? 'vertex',
          attributes: layout.attributes.map((attr) => ({
            format: attr.format,
            offset: attr.offset,
            shaderLocation: attr.shaderLocation,
          })),
        })),
      },
      fragment: {
        module: fragmentModule,
        entryPoint: descriptor.fragmentShader.entryPoint,
        targets: descriptor.colorTargets.map((target) => ({
          format: target.format || format,
          blend: target.blend
            ? {
                color: {
                  operation: target.blend.color.operation ?? 'add',
                  srcFactor: target.blend.color.srcFactor ?? 'one',
                  dstFactor: target.blend.color.dstFactor ?? 'zero',
                },
                alpha: {
                  operation: target.blend.alpha.operation ?? 'add',
                  srcFactor: target.blend.alpha.srcFactor ?? 'one',
                  dstFactor: target.blend.alpha.dstFactor ?? 'zero',
                },
              }
            : undefined,
          writeMask: target.writeMask ?? GPUColorWrite.ALL,
        })),
      },
      primitive: {
        topology: descriptor.topology ?? 'triangle-list',
        cullMode: descriptor.cullMode ?? 'back',
        frontFace: descriptor.frontFace ?? 'ccw',
      },
      depthStencil: descriptor.depthStencil
        ? {
            format: descriptor.depthStencil.format,
            depthWriteEnabled: descriptor.depthStencil.depthWriteEnabled,
            depthCompare: descriptor.depthStencil.depthCompare,
            depthBias: descriptor.depthStencil.depthBias,
            depthBiasSlopeScale: descriptor.depthStencil.depthBiasSlopeScale,
            depthBiasClamp: descriptor.depthStencil.depthBiasClamp,
          }
        : undefined,
      multisample: {
        count: descriptor.sampleCount ?? this.options.sampleCount,
      },
    });

    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  /**
   * Create a GPU buffer
   */
  createBuffer(descriptor: IBufferDescriptor): GPUBuffer {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    return this.context.device.createBuffer({
      label: descriptor.label,
      size: descriptor.size,
      usage: descriptor.usage,
      mappedAtCreation: descriptor.mappedAtCreation,
    });
  }

  /**
   * Create a vertex buffer from typed array
   */
  createVertexBuffer(data: Float32Array | Uint16Array | Uint32Array, slot = 0): IVertexBuffer {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    const buffer = this.context.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.context.device.queue.writeBuffer(buffer, 0, data);

    return {
      buffer,
      vertexCount: data.length,
      stride: data.BYTES_PER_ELEMENT,
      slot,
    };
  }

  /**
   * Create an index buffer
   */
  createIndexBuffer(data: Uint16Array | Uint32Array): IIndexBuffer {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    const buffer = this.context.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    this.context.device.queue.writeBuffer(buffer, 0, data);

    return {
      buffer,
      indexCount: data.length,
      format: data instanceof Uint16Array ? 'uint16' : 'uint32',
    };
  }

  /**
   * Create a texture
   */
  createTexture(descriptor: ITextureDescriptor): GPUTexture {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    return this.context.device.createTexture({
      label: descriptor.label,
      size: [descriptor.width, descriptor.height, descriptor.depthOrArrayLayers ?? 1],
      mipLevelCount: descriptor.mipLevelCount ?? 1,
      sampleCount: descriptor.sampleCount ?? 1,
      dimension: descriptor.dimension ?? '2d',
      format: descriptor.format,
      usage: descriptor.usage,
    });
  }

  /**
   * Create a GPU texture from image data
   */
  async createTextureFromImage(
    source: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
    options?: Partial<ITextureDescriptor>
  ): Promise<IGPUTexture> {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    const { device } = this.context;
    const width = source.width;
    const height = source.height;
    const format: GPUTextureFormat = options?.format ?? 'rgba8unorm';

    // Calculate mip levels
    const mipLevels = options?.mipLevelCount ?? Math.floor(Math.log2(Math.max(width, height))) + 1;

    const texture = device.createTexture({
      label: options?.label,
      size: [width, height, 1],
      mipLevelCount: mipLevels,
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Copy image to texture
    device.queue.copyExternalImageToTexture({ source }, { texture }, [width, height]);

    // Generate mipmaps if needed
    if (mipLevels > 1) {
      await this.generateMipmaps(texture, width, height);
    }

    const sampler = this.defaultSampler!;

    return {
      texture,
      view: texture.createView(),
      sampler,
      width,
      height,
      format,
      mipLevels,
    };
  }

  /**
   * Generate mipmaps for a texture
   */
  private async generateMipmaps(texture: GPUTexture, width: number, height: number): Promise<void> {
    // Mipmap generation would require a compute or render pass
    // For now, this is a placeholder - implement with blit pipeline
    if (!this.context) return;

    // TODO: Implement mipmap generation with blit pipeline
    console.warn('Mipmap generation not yet implemented');
  }

  /**
   * Create a sampler
   */
  createSampler(descriptor?: ISamplerDescriptor): GPUSampler {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    return this.context.device.createSampler({
      label: descriptor?.label,
      addressModeU: descriptor?.addressModeU ?? 'repeat',
      addressModeV: descriptor?.addressModeV ?? 'repeat',
      addressModeW: descriptor?.addressModeW ?? 'repeat',
      magFilter: descriptor?.magFilter ?? 'linear',
      minFilter: descriptor?.minFilter ?? 'linear',
      mipmapFilter: descriptor?.mipmapFilter ?? 'linear',
      lodMinClamp: descriptor?.lodMinClamp ?? 0,
      lodMaxClamp: descriptor?.lodMaxClamp ?? 32,
      compare: descriptor?.compare,
      maxAnisotropy: descriptor?.maxAnisotropy ?? 1,
    });
  }

  /**
   * Create a bind group
   */
  createBindGroup(
    layout: GPUBindGroupLayout,
    entries: GPUBindGroupEntry[],
    label?: string
  ): GPUBindGroup {
    if (!this.context) {
      throw new Error('Renderer not initialized');
    }

    return this.context.device.createBindGroup({
      label,
      layout,
      entries,
    });
  }

  /**
   * Update camera uniforms
   */
  updateCameraUniforms(uniforms: ICameraUniforms): void {
    if (!this.context || !this.cameraUniformBuffer) return;

    // Pack camera uniforms into buffer
    const data = new Float32Array(64); // 256 bytes / 4

    // viewProjectionMatrix (16 floats)
    data.set(uniforms.viewProjectionMatrix, 0);
    // cameraPosition (3 floats + 1 padding)
    data.set(uniforms.cameraPosition, 16);
    // viewMatrix (16 floats)
    data.set(uniforms.viewMatrix, 20);
    // projectionMatrix (16 floats)
    data.set(uniforms.projectionMatrix, 36);
    // inverseViewMatrix (16 floats) - if space allows
    // ...

    this.context.device.queue.writeBuffer(this.cameraUniformBuffer, 0, data);
  }

  /**
   * Update scene uniforms
   */
  updateSceneUniforms(uniforms: ISceneUniforms): void {
    if (!this.context || !this.sceneUniformBuffer) return;

    const data = new Float32Array(16);
    data.set(uniforms.ambientColor, 0);
    data[4] = uniforms.time;
    data[5] = uniforms.deltaTime;
    data[6] = uniforms.frameNumber;

    this.context.device.queue.writeBuffer(this.sceneUniformBuffer, 0, data);
  }

  /**
   * Begin a render frame
   */
  beginFrame(): GPUCommandEncoder | null {
    if (!this.context) return null;

    const startTime = performance.now();
    if (this.lastFrameTime > 0) {
      const deltaTime = startTime - this.lastFrameTime;
      this.frameTimeHistory.push(deltaTime);
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
    }
    this.lastFrameTime = startTime;

    // Reset frame stats
    this.stats.currentFrame = this.createEmptyFrameStats();

    return this.context.device.createCommandEncoder();
  }

  /**
   * Begin a render pass
   */
  beginRenderPass(encoder: GPUCommandEncoder, clearColor?: GPUColor): GPURenderPassEncoder {
    if (!this.context || !this.depthTexture) {
      throw new Error('Renderer not initialized');
    }

    const colorView =
      this.options.sampleCount > 1
        ? this.msaaTexture!.createView()
        : this.context.context.getCurrentTexture().createView();

    const resolveTarget =
      this.options.sampleCount > 1
        ? this.context.context.getCurrentTexture().createView()
        : undefined;

    return encoder.beginRenderPass({
      colorAttachments: [
        {
          view: colorView,
          resolveTarget,
          clearValue: clearColor ?? { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });
  }

  /**
   * Submit draw calls
   */
  submitDrawCalls(pass: GPURenderPassEncoder, drawCalls: IDrawCall[]): void {
    // Sort draw calls: opaque first, then transparent by distance
    const sorted = this.sortDrawCalls(drawCalls);

    let currentPipeline: string | null = null;
    let currentMaterial: string | null = null;

    for (const drawCall of sorted) {
      const { mesh, material } = drawCall;

      // Switch pipeline if needed
      if (material.pipelineId !== currentPipeline) {
        const pipeline = this.pipelines.get(material.pipelineId);
        if (pipeline) {
          pass.setPipeline(pipeline);
          currentPipeline = material.pipelineId;
          this.stats.currentFrame.pipelineSwitches++;
        }
      }

      // Switch bind group if needed
      if (material.id !== currentMaterial) {
        pass.setBindGroup(1, material.bindGroup);
        currentMaterial = material.id;
        this.stats.currentFrame.bindGroupSwitches++;
      }

      // Set vertex buffers
      for (const vb of mesh.vertexBuffers) {
        pass.setVertexBuffer(vb.slot, vb.buffer);
      }

      // Draw
      if (mesh.indexBuffer) {
        pass.setIndexBuffer(mesh.indexBuffer.buffer, mesh.indexBuffer.format);
        pass.drawIndexed(mesh.indexBuffer.indexCount, mesh.instanceCount);
        this.stats.currentFrame.triangles += mesh.indexBuffer.indexCount / 3;
        this.stats.currentFrame.vertices += mesh.indexBuffer.indexCount;
      } else {
        pass.draw(mesh.vertexCount, mesh.instanceCount);
        this.stats.currentFrame.triangles += mesh.vertexCount / 3;
        this.stats.currentFrame.vertices += mesh.vertexCount;
      }

      this.stats.currentFrame.drawCalls++;
    }
  }

  /**
   * Sort draw calls for optimal rendering
   */
  private sortDrawCalls(drawCalls: IDrawCall[]): IDrawCall[] {
    return drawCalls.sort((a, b) => {
      // Opaque before transparent
      if (a.material.transparent !== b.material.transparent) {
        return a.material.transparent ? 1 : -1;
      }

      // For transparent, sort back-to-front
      if (a.material.transparent) {
        return (b.cameraDistance ?? 0) - (a.cameraDistance ?? 0);
      }

      // For opaque, sort by pipeline then material
      if (a.material.pipelineId !== b.material.pipelineId) {
        return a.material.pipelineId.localeCompare(b.material.pipelineId);
      }

      return a.sortKey - b.sortKey;
    });
  }

  /**
   * End render pass
   */
  endRenderPass(pass: GPURenderPassEncoder): void {
    pass.end();
  }

  /**
   * End frame and submit
   */
  endFrame(encoder: GPUCommandEncoder): void {
    if (!this.context) return;

    this.context.device.queue.submit([encoder.finish()]);

    // Update stats
    const endTime = performance.now();
    this.stats.currentFrame.frameTime = endTime - this.lastFrameTime;
    this.stats.totalFrames++;

    // Calculate FPS
    if (this.frameTimeHistory.length > 0) {
      const avgFrameTime =
        this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.stats.fps = 1000 / avgFrameTime;
      this.stats.average.frameTime = avgFrameTime;
    }
  }

  /**
   * Get render statistics
   */
  getStats(): IRendererStats {
    return { ...this.stats };
  }

  /**
   * Get the WebGPU context
   */
  getContext(): IWebGPUContext | null {
    return this.context;
  }

  /**
   * Get the GPU device
   */
  getDevice(): GPUDevice | null {
    return this.context?.device ?? null;
  }

  /**
   * Get the canvas
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.context?.canvas ?? null;
  }

  /**
   * Get the default texture
   */
  getDefaultTexture(): IGPUTexture | null {
    return this.defaultTexture;
  }

  /**
   * Get the default sampler
   */
  getDefaultSampler(): GPUSampler | null {
    return this.defaultSampler;
  }

  /**
   * Create empty frame stats
   */
  private createEmptyFrameStats(): IFrameStats {
    return {
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      pipelineSwitches: 0,
      bindGroupSwitches: 0,
      bufferUploads: 0,
      textureUploads: 0,
    };
  }

  /**
   * Destroy the renderer and release resources
   */
  destroy(): void {
    this.pipelines.forEach((pipeline) => {
      // Pipelines don't have destroy method
    });
    this.pipelines.clear();
    this.shaderModules.clear();

    this.depthTexture?.destroy();
    this.msaaTexture?.destroy();
    this.defaultTexture?.texture.destroy();
    this.cameraUniformBuffer?.destroy();
    this.sceneUniformBuffer?.destroy();

    this.context?.device.destroy();
    this.context = null;
  }
}
