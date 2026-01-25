/**
 * @holoscript/lod - LOD Manager Module
 * Level of Detail management with automatic switching
 */

import {
  Vec3,
  BoundingSphere,
  Frustum,
  FrustumPlane,
  LODLevel,
  LODGroup,
  LODSelectionMode,
  LODManagerConfig,
  LODEvent,
  LODEventHandler,
  DEFAULT_LOD_MANAGER_CONFIG,
} from '../types';

// ============================================================================
// Utility Functions
// ============================================================================

function vec3Distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function sphereInFrustum(sphere: BoundingSphere, frustum: Frustum): boolean {
  for (const plane of frustum.planes) {
    const distance =
      vec3Dot(plane.normal, sphere.center) + plane.distance;
    if (distance < -sphere.radius) {
      return false;
    }
  }
  return true;
}

function calculateScreenCoverage(
  sphere: BoundingSphere,
  cameraPos: Vec3,
  fov: number,
  screenHeight: number
): number {
  const distance = vec3Distance(sphere.center, cameraPos);
  if (distance <= sphere.radius) return 1.0;
  
  const angularSize = 2 * Math.atan(sphere.radius / distance);
  const screenPixels = (angularSize / fov) * screenHeight;
  return screenPixels / screenHeight;
}

// ============================================================================
// LOD Group Manager
// ============================================================================

export class LODGroupManager {
  private groups: Map<string, LODGroup> = new Map();
  private lastCameraPos: Vec3 = { x: 0, y: 0, z: 0 };
  
  createGroup(
    id: string,
    name: string,
    position: Vec3,
    bounds: BoundingSphere,
    levels: LODLevel[],
    mode: LODSelectionMode = LODSelectionMode.Distance
  ): LODGroup {
    const sortedLevels = [...levels].sort((a, b) => a.distance - b.distance);
    
    const group: LODGroup = {
      id,
      name,
      position,
      bounds,
      levels: sortedLevels,
      currentLevel: 0,
      mode,
      lodBias: 1.0,
      isVisible: true,
      fadeTime: 100,
      forcedLevel: -1,
    };
    
    this.groups.set(id, group);
    return group;
  }
  
  removeGroup(id: string): boolean {
    return this.groups.delete(id);
  }
  
  getGroup(id: string): LODGroup | undefined {
    return this.groups.get(id);
  }
  
  getAllGroups(): LODGroup[] {
    return Array.from(this.groups.values());
  }
  
  updateGroupPosition(id: string, position: Vec3): void {
    const group = this.groups.get(id);
    if (group) {
      group.position = position;
      group.bounds.center = position;
    }
  }
  
  setGroupLODBias(id: string, bias: number): void {
    const group = this.groups.get(id);
    if (group) {
      group.lodBias = Math.max(0.1, Math.min(10, bias));
    }
  }
  
  forceGroupLevel(id: string, level: number): void {
    const group = this.groups.get(id);
    if (group) {
      group.forcedLevel = level;
    }
  }
  
  selectLevelForGroup(
    group: LODGroup,
    cameraPos: Vec3,
    globalBias: number,
    fov: number,
    screenHeight: number
  ): number {
    if (group.forcedLevel >= 0 && group.forcedLevel < group.levels.length) {
      return group.forcedLevel;
    }
    
    const effectiveBias = globalBias * group.lodBias;
    
    switch (group.mode) {
      case LODSelectionMode.Distance: {
        const distance = vec3Distance(cameraPos, group.position);
        const biasedDistance = distance / effectiveBias;
        
        for (let i = 0; i < group.levels.length; i++) {
          if (biasedDistance <= group.levels[i].distance) {
            return i;
          }
        }
        return group.levels.length - 1;
      }
      
      case LODSelectionMode.ScreenSize: {
        const coverage = calculateScreenCoverage(
          group.bounds,
          cameraPos,
          fov,
          screenHeight
        );
        const biasedCoverage = coverage * effectiveBias;
        
        for (let i = 0; i < group.levels.length; i++) {
          const threshold = group.levels[i].screenCoverage ?? 0;
          if (biasedCoverage >= threshold) {
            return i;
          }
        }
        return group.levels.length - 1;
      }
      
      case LODSelectionMode.Adaptive:
        // Could integrate with performance monitoring
        return this.selectLevelForGroup(
          group,
          cameraPos,
          globalBias,
          fov,
          screenHeight
        );
      
      case LODSelectionMode.Manual:
        return group.currentLevel;
      
      default:
        return 0;
    }
  }
}

// ============================================================================
// Adaptive LOD Controller
// ============================================================================

export class AdaptiveLODController {
  private targetFrameTime: number;
  private currentBias: number = 1.0;
  private smoothingFactor: number = 0.1;
  private minBias: number = 0.25;
  private maxBias: number = 2.0;
  private frameTimeHistory: number[] = [];
  private historySize: number = 30;
  
  constructor(targetFPS: number = 72) {
    this.targetFrameTime = 1000 / targetFPS;
  }
  
  updateFrameTime(frameTimeMs: number): void {
    this.frameTimeHistory.push(frameTimeMs);
    if (this.frameTimeHistory.length > this.historySize) {
      this.frameTimeHistory.shift();
    }
    
    const avgFrameTime =
      this.frameTimeHistory.reduce((a, b) => a + b, 0) /
      this.frameTimeHistory.length;
    
    const ratio = this.targetFrameTime / avgFrameTime;
    
    const targetBias = this.currentBias * ratio;
    const clampedTarget = Math.max(
      this.minBias,
      Math.min(this.maxBias, targetBias)
    );
    
    this.currentBias =
      this.currentBias +
      (clampedTarget - this.currentBias) * this.smoothingFactor;
  }
  
  getCurrentBias(): number {
    return this.currentBias;
  }
  
  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return this.targetFrameTime;
    return (
      this.frameTimeHistory.reduce((a, b) => a + b, 0) /
      this.frameTimeHistory.length
    );
  }
  
  setTargetFPS(fps: number): void {
    this.targetFrameTime = 1000 / fps;
  }
  
  setBiasLimits(min: number, max: number): void {
    this.minBias = min;
    this.maxBias = max;
    this.currentBias = Math.max(min, Math.min(max, this.currentBias));
  }
}

// ============================================================================
// Main LOD Manager
// ============================================================================

export class LODManager {
  private config: LODManagerConfig;
  private groupManager: LODGroupManager;
  private adaptiveController: AdaptiveLODController;
  private eventHandlers: Set<LODEventHandler> = new Set();
  
  private cameraPosition: Vec3 = { x: 0, y: 0, z: 0 };
  private cameraFrustum: Frustum = { planes: [] };
  private cameraFOV: number = Math.PI / 2;
  
  private lastUpdateTime: number = 0;
  private frameNumber: number = 0;
  
  constructor(config: Partial<LODManagerConfig> = {}) {
    this.config = { ...DEFAULT_LOD_MANAGER_CONFIG, ...config };
    this.groupManager = new LODGroupManager();
    this.adaptiveController = new AdaptiveLODController(72);
  }
  
  // Configuration
  
  getConfig(): LODManagerConfig {
    return { ...this.config };
  }
  
  updateConfig(config: Partial<LODManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  setGlobalLODBias(bias: number): void {
    this.config.globalLodBias = Math.max(0.1, Math.min(10, bias));
  }
  
  // Camera
  
  updateCamera(position: Vec3, frustum: Frustum, fov: number): void {
    this.cameraPosition = position;
    this.cameraFrustum = frustum;
    this.cameraFOV = fov;
  }
  
  // Group Management (delegate)
  
  createGroup(
    id: string,
    name: string,
    position: Vec3,
    bounds: BoundingSphere,
    levels: LODLevel[]
  ): LODGroup {
    return this.groupManager.createGroup(
      id,
      name,
      position,
      bounds,
      levels,
      this.config.selectionMode
    );
  }
  
  removeGroup(id: string): boolean {
    return this.groupManager.removeGroup(id);
  }
  
  getGroup(id: string): LODGroup | undefined {
    return this.groupManager.getGroup(id);
  }
  
  getAllGroups(): LODGroup[] {
    return this.groupManager.getAllGroups();
  }
  
  // Update
  
  update(deltaTime: number): void {
    const startTime = performance.now();
    const budget = this.config.updateBudget;
    
    this.frameNumber++;
    
    if (this.config.selectionMode === LODSelectionMode.Adaptive) {
      this.adaptiveController.updateFrameTime(deltaTime * 1000);
    }
    
    const effectiveBias =
      this.config.selectionMode === LODSelectionMode.Adaptive
        ? this.adaptiveController.getCurrentBias() * this.config.globalLodBias
        : this.config.globalLodBias;
    
    for (const group of this.groupManager.getAllGroups()) {
      if (performance.now() - startTime > budget) break;
      
      // Frustum culling
      if (this.config.culling.frustumCulling) {
        const wasVisible = group.isVisible;
        group.isVisible = sphereInFrustum(group.bounds, this.cameraFrustum);
        
        if (wasVisible && !group.isVisible) {
          this.emit({
            type: 'object_culled',
            objectId: group.id,
            reason: 'frustum',
          });
        } else if (!wasVisible && group.isVisible) {
          this.emit({ type: 'object_visible', objectId: group.id });
        }
      }
      
      // Distance culling
      if (this.config.culling.mode === 'distance' || this.config.culling.mode === 'full') {
        const distance = vec3Distance(this.cameraPosition, group.position);
        if (distance > this.config.culling.maxDistance) {
          if (group.isVisible) {
            group.isVisible = false;
            this.emit({
              type: 'object_culled',
              objectId: group.id,
              reason: 'distance',
            });
          }
        }
      }
      
      if (!group.isVisible) continue;
      
      // LOD selection
      const newLevel = this.groupManager.selectLevelForGroup(
        group,
        this.cameraPosition,
        effectiveBias,
        this.cameraFOV,
        this.config.referenceScreenHeight
      );
      
      if (newLevel !== group.currentLevel) {
        const previousLevel = group.currentLevel;
        group.currentLevel = newLevel;
        this.emit({
          type: 'level_changed',
          groupId: group.id,
          previousLevel,
          newLevel,
        });
      }
    }
    
    this.lastUpdateTime = performance.now() - startTime;
  }
  
  // Stats
  
  getStats(): {
    totalGroups: number;
    visibleGroups: number;
    levelDistribution: Map<number, number>;
    lastUpdateTime: number;
    currentBias: number;
  } {
    const groups = this.groupManager.getAllGroups();
    const levelDistribution = new Map<number, number>();
    let visibleCount = 0;
    
    for (const group of groups) {
      if (group.isVisible) {
        visibleCount++;
        const count = levelDistribution.get(group.currentLevel) ?? 0;
        levelDistribution.set(group.currentLevel, count + 1);
      }
    }
    
    return {
      totalGroups: groups.length,
      visibleGroups: visibleCount,
      levelDistribution,
      lastUpdateTime: this.lastUpdateTime,
      currentBias:
        this.config.selectionMode === LODSelectionMode.Adaptive
          ? this.adaptiveController.getCurrentBias()
          : this.config.globalLodBias,
    };
  }
  
  // Events
  
  on(handler: LODEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: LODEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('LOD event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Frustum Builder
// ============================================================================

export class FrustumBuilder {
  static fromViewProjection(
    viewMatrix: number[],
    projMatrix: number[]
  ): Frustum {
    // Combine view and projection matrices
    const vp = this.multiplyMatrices(projMatrix, viewMatrix);
    
    return {
      planes: [
        this.extractPlane(vp, 0, 'left'),
        this.extractPlane(vp, 0, 'right'),
        this.extractPlane(vp, 1, 'bottom'),
        this.extractPlane(vp, 1, 'top'),
        this.extractPlane(vp, 2, 'near'),
        this.extractPlane(vp, 2, 'far'),
      ],
    };
  }
  
  private static extractPlane(
    m: number[],
    _component: number,
    side: 'left' | 'right' | 'bottom' | 'top' | 'near' | 'far'
  ): FrustumPlane {
    let plane: Vec3 & { w: number };
    
    switch (side) {
      case 'left':
        plane = {
          x: m[3] + m[0],
          y: m[7] + m[4],
          z: m[11] + m[8],
          w: m[15] + m[12],
        };
        break;
      case 'right':
        plane = {
          x: m[3] - m[0],
          y: m[7] - m[4],
          z: m[11] - m[8],
          w: m[15] - m[12],
        };
        break;
      case 'bottom':
        plane = {
          x: m[3] + m[1],
          y: m[7] + m[5],
          z: m[11] + m[9],
          w: m[15] + m[13],
        };
        break;
      case 'top':
        plane = {
          x: m[3] - m[1],
          y: m[7] - m[5],
          z: m[11] - m[9],
          w: m[15] - m[13],
        };
        break;
      case 'near':
        plane = {
          x: m[3] + m[2],
          y: m[7] + m[6],
          z: m[11] + m[10],
          w: m[15] + m[14],
        };
        break;
      case 'far':
        plane = {
          x: m[3] - m[2],
          y: m[7] - m[6],
          z: m[11] - m[10],
          w: m[15] - m[14],
        };
        break;
    }
    
    // Normalize
    const length = Math.sqrt(
      plane.x * plane.x + plane.y * plane.y + plane.z * plane.z
    );
    
    return {
      normal: {
        x: plane.x / length,
        y: plane.y / length,
        z: plane.z / length,
      },
      distance: plane.w / length,
    };
  }
  
  private static multiplyMatrices(a: number[], b: number[]): number[] {
    const result = new Array(16).fill(0);
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        for (let k = 0; k < 4; k++) {
          result[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
        }
      }
    }
    
    return result;
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  vec3Distance,
  sphereInFrustum,
  calculateScreenCoverage,
};
