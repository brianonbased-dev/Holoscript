/**
 * GaussianSplat Trait
 *
 * Load/render 3D Gaussian Splatting scenes with distance-based sorting
 * and view-dependent spherical harmonics.
 *
 * @version 2.0.0
 */

import type { TraitHandler } from './TraitTypes';

// =============================================================================
// TYPES
// =============================================================================

type SplatFormat = 'ply' | 'splat' | 'compressed';
type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';
type SortMode = 'distance' | 'depth' | 'radix';

interface GaussianSplatState {
  isLoaded: boolean;
  isLoading: boolean;
  splatCount: number;
  visibleSplats: number;
  memoryUsage: number;
  boundingBox: { min: [number, number, number]; max: [number, number, number] };
  renderHandle: unknown;
  lastCameraPosition: { x: number; y: number; z: number } | null;
  needsSort: boolean;
}

interface GaussianSplatConfig {
  source: string;
  format: SplatFormat;
  quality: QualityLevel;
  max_splats: number;
  sort_mode: SortMode;
  streaming: boolean;
  compression: boolean;
  sh_degree: number;  // 0-3 spherical harmonics degree
  cull_invisible: boolean;
  alpha_threshold: number;
  scale_modifier: number;
}

// =============================================================================
// HANDLER
// =============================================================================

export const gaussianSplatHandler: TraitHandler<GaussianSplatConfig> = {
  name: 'gaussian_splat' as any,

  defaultConfig: {
    source: '',
    format: 'ply',
    quality: 'medium',
    max_splats: 1000000,
    sort_mode: 'distance',
    streaming: false,
    compression: true,
    sh_degree: 3,
    cull_invisible: true,
    alpha_threshold: 0.01,
    scale_modifier: 1.0,
  },

  onAttach(node, config, context) {
    const state: GaussianSplatState = {
      isLoaded: false,
      isLoading: false,
      splatCount: 0,
      visibleSplats: 0,
      memoryUsage: 0,
      boundingBox: { min: [0, 0, 0], max: [0, 0, 0] },
      renderHandle: null,
      lastCameraPosition: null,
      needsSort: false,
    };
    (node as any).__gaussianSplatState = state;
    
    if (config.source) {
      loadSplatScene(node, state, config, context);
    }
  },

  onDetach(node, config, context) {
    const state = (node as any).__gaussianSplatState as GaussianSplatState;
    if (state?.renderHandle) {
      context.emit?.('splat_destroy', { node });
    }
    delete (node as any).__gaussianSplatState;
  },

  onUpdate(node, config, context, delta) {
    const state = (node as any).__gaussianSplatState as GaussianSplatState;
    if (!state || !state.isLoaded) return;
    
    // Check if camera moved and needs resort
    const cameraPos = context.camera?.position;
    if (cameraPos && state.lastCameraPosition) {
      const dx = cameraPos.x - state.lastCameraPosition.x;
      const dy = cameraPos.y - state.lastCameraPosition.y;
      const dz = cameraPos.z - state.lastCameraPosition.z;
      const distMoved = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distMoved > 0.1) {
        state.needsSort = true;
        state.lastCameraPosition = { ...cameraPos };
      }
    } else if (cameraPos) {
      state.lastCameraPosition = { ...cameraPos };
    }
    
    // Request sort if needed
    if (state.needsSort && config.sort_mode !== 'radix') {
      context.emit?.('splat_sort', {
        node,
        cameraPosition: state.lastCameraPosition,
        mode: config.sort_mode,
      });
      state.needsSort = false;
    }
  },

  onEvent(node, config, context, event) {
    const state = (node as any).__gaussianSplatState as GaussianSplatState;
    if (!state) return;
    
    if (event.type === 'splat_load_complete') {
      state.isLoading = false;
      state.isLoaded = true;
      state.splatCount = event.splatCount as number;
      state.memoryUsage = event.memoryUsage as number;
      state.boundingBox = event.boundingBox as typeof state.boundingBox;
      state.renderHandle = event.renderHandle;
      state.needsSort = true;
      
      context.emit?.('on_splat_loaded', {
        node,
        splatCount: state.splatCount,
        memoryUsage: state.memoryUsage,
      });
    } else if (event.type === 'splat_load_error') {
      state.isLoading = false;
      context.emit?.('on_splat_error', {
        node,
        error: event.error,
      });
    } else if (event.type === 'splat_load_progress') {
      context.emit?.('on_splat_progress', {
        node,
        progress: event.progress as number,
        loadedSplats: event.loadedSplats as number,
      });
    } else if (event.type === 'splat_visibility_update') {
      state.visibleSplats = event.visibleCount as number;
    } else if (event.type === 'splat_set_source') {
      const newSource = event.source as string;
      if (newSource !== config.source) {
        // Unload current
        if (state.renderHandle) {
          context.emit?.('splat_destroy', { node });
        }
        state.isLoaded = false;
        state.splatCount = 0;
        
        // Load new
        loadSplatScene(node, state, { ...config, source: newSource }, context);
      }
    } else if (event.type === 'splat_set_quality') {
      context.emit?.('splat_update_quality', {
        node,
        quality: event.quality as string,
      });
    } else if (event.type === 'splat_query') {
      context.emit?.('splat_info', {
        queryId: event.queryId,
        node,
        isLoaded: state.isLoaded,
        splatCount: state.splatCount,
        visibleSplats: state.visibleSplats,
        memoryUsage: state.memoryUsage,
        boundingBox: state.boundingBox,
      });
    }
  },
};

function loadSplatScene(
  node: unknown,
  state: GaussianSplatState,
  config: GaussianSplatConfig,
  context: { emit?: (event: string, data: unknown) => void }
): void {
  state.isLoading = true;
  
  context.emit?.('splat_load', {
    node,
    source: config.source,
    format: config.format,
    maxSplats: config.max_splats,
    compression: config.compression,
    shDegree: config.sh_degree,
    streaming: config.streaming,
    alphaThreshold: config.alpha_threshold,
    scaleModifier: config.scale_modifier,
  });
}

export default gaussianSplatHandler;
