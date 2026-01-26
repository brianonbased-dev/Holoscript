/**
 * @holoscript/gpu - GPUContext
 * WebGPU device initialization and context management
 */

export interface GPUContextConfig {
  /** Preferred power preference */
  powerPreference: 'low-power' | 'high-performance';
  /** Required features */
  requiredFeatures?: GPUFeatureName[];
  /** Required limits */
  requiredLimits?: Record<string, GPUSize64>;
  /** Enable debug labels */
  debug: boolean;
}

const DEFAULT_CONFIG: GPUContextConfig = {
  powerPreference: 'high-performance',
  debug: false,
};

/**
 * GPUContext
 * 
 * Manages WebGPU device initialization and provides compute utilities.
 * This is a foundational class for GPU-accelerated features.
 */
export class GPUContext {
  private config: GPUContextConfig;
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private initialized: boolean = false;
  
  constructor(config: Partial<GPUContextConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Check if WebGPU is supported
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }
  
  /**
   * Initialize the GPU context
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    if (!GPUContext.isSupported()) {
      console.warn('WebGPU is not supported in this environment');
      return false;
    }
    
    try {
      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: this.config.powerPreference,
      });
      
      if (!this.adapter) {
        console.error('Failed to get GPU adapter');
        return false;
      }
      
      // Request device
      const deviceDescriptor: GPUDeviceDescriptor = {};
      
      if (this.config.requiredFeatures) {
        deviceDescriptor.requiredFeatures = this.config.requiredFeatures;
      }
      
      if (this.config.requiredLimits) {
        deviceDescriptor.requiredLimits = this.config.requiredLimits;
      }
      
      this.device = await this.adapter.requestDevice(deviceDescriptor);
      
      // Setup error handling
      this.device.lost.then((info) => {
        console.error('GPU device lost:', info.message);
        this.initialized = false;
        this.device = null;
      });
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
      return false;
    }
  }
  
  /**
   * Get the GPU device (throws if not initialized)
   */
  getDevice(): GPUDevice {
    if (!this.device) {
      throw new Error('GPUContext not initialized. Call initialize() first.');
    }
    return this.device;
  }
  
  /**
   * Get the GPU adapter info
   */
  getAdapterInfo(): GPUAdapterInfo | null {
    if (!this.adapter) return null;
    // Modern WebGPU uses the `info` property instead of deprecated `requestAdapterInfo()`
    return this.adapter.info;
  }
  
  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Create a compute shader module
   */
  createShaderModule(code: string, label?: string): GPUShaderModule {
    const device = this.getDevice();
    return device.createShaderModule({
      code,
      label: this.config.debug ? label : undefined,
    });
  }
  
  /**
   * Create a buffer
   */
  createBuffer(
    size: number,
    usage: GPUBufferUsageFlags,
    label?: string
  ): GPUBuffer {
    const device = this.getDevice();
    return device.createBuffer({
      size,
      usage,
      label: this.config.debug ? label : undefined,
    });
  }
  
  /**
   * Create a compute pipeline
   */
  createComputePipeline(
    shader: GPUShaderModule,
    entryPoint: string = 'main',
    bindGroupLayout?: GPUBindGroupLayout
  ): GPUComputePipeline {
    const device = this.getDevice();
    
    const descriptor: GPUComputePipelineDescriptor = {
      compute: {
        module: shader,
        entryPoint,
      },
      layout: bindGroupLayout ? device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }) : 'auto',
    };
    
    return device.createComputePipeline(descriptor);
  }
  
  /**
   * Destroy the context and release resources
   */
  destroy(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.initialized = false;
  }
}
