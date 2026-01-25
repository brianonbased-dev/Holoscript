/**
 * @holoscript/lod - Culling Module
 * Frustum culling, occlusion culling, and visibility management
 */

import {
  Vec3,
  BoundingBox,
  BoundingSphere,
  Frustum,
  CullingMode,
  CullingConfig,
  CullableObject,
  CullingResult,
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

function boundingBoxFromSphere(sphere: BoundingSphere): BoundingBox {
  return {
    min: {
      x: sphere.center.x - sphere.radius,
      y: sphere.center.y - sphere.radius,
      z: sphere.center.z - sphere.radius,
    },
    max: {
      x: sphere.center.x + sphere.radius,
      y: sphere.center.y + sphere.radius,
      z: sphere.center.z + sphere.radius,
    },
  };
}

// ============================================================================
// Frustum Culler
// ============================================================================

export class FrustumCuller {
  private frustum: Frustum = { planes: [] };
  
  setFrustum(frustum: Frustum): void {
    this.frustum = frustum;
  }
  
  testSphere(sphere: BoundingSphere): boolean {
    for (const plane of this.frustum.planes) {
      const distance =
        vec3Dot(plane.normal, sphere.center) + plane.distance;
      if (distance < -sphere.radius) {
        return false;
      }
    }
    return true;
  }
  
  testBox(box: BoundingBox): boolean {
    for (const plane of this.frustum.planes) {
      // Get the positive vertex (furthest along normal direction)
      const pVertex: Vec3 = {
        x: plane.normal.x >= 0 ? box.max.x : box.min.x,
        y: plane.normal.y >= 0 ? box.max.y : box.min.y,
        z: plane.normal.z >= 0 ? box.max.z : box.min.z,
      };
      
      const distance = vec3Dot(plane.normal, pVertex) + plane.distance;
      if (distance < 0) {
        return false;
      }
    }
    return true;
  }
  
  testPoint(point: Vec3): boolean {
    for (const plane of this.frustum.planes) {
      const distance = vec3Dot(plane.normal, point) + plane.distance;
      if (distance < 0) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Classify a sphere against the frustum
   * @returns 'inside' | 'outside' | 'intersect'
   */
  classifySphere(sphere: BoundingSphere): 'inside' | 'outside' | 'intersect' {
    let intersecting = false;
    
    for (const plane of this.frustum.planes) {
      const distance =
        vec3Dot(plane.normal, sphere.center) + plane.distance;
      
      if (distance < -sphere.radius) {
        return 'outside';
      } else if (distance < sphere.radius) {
        intersecting = true;
      }
    }
    
    return intersecting ? 'intersect' : 'inside';
  }
}

// ============================================================================
// Distance Culler
// ============================================================================

export class DistanceCuller {
  private cameraPosition: Vec3 = { x: 0, y: 0, z: 0 };
  private maxDistance: number = 1000;
  
  setCameraPosition(position: Vec3): void {
    this.cameraPosition = position;
  }
  
  setMaxDistance(distance: number): void {
    this.maxDistance = distance;
  }
  
  testObject(obj: CullableObject): boolean {
    const distance = vec3Distance(this.cameraPosition, obj.position);
    return distance <= this.maxDistance + obj.bounds.radius;
  }
  
  testPosition(position: Vec3): boolean {
    return vec3Distance(this.cameraPosition, position) <= this.maxDistance;
  }
  
  getDistance(position: Vec3): number {
    return vec3Distance(this.cameraPosition, position);
  }
}

// ============================================================================
// Occlusion Culler (Software Rasterization)
// ============================================================================

export class OcclusionCuller {
  private depthBuffer: Float32Array;
  private resolution: number;
  private viewProjectionMatrix: number[] = [];
  
  constructor(resolution: number = 256) {
    this.resolution = resolution;
    this.depthBuffer = new Float32Array(resolution * resolution);
  }
  
  clear(): void {
    this.depthBuffer.fill(1.0);
  }
  
  setViewProjection(matrix: number[]): void {
    this.viewProjectionMatrix = matrix;
  }
  
  /**
   * Rasterize an occluder (blocking object) to the depth buffer
   */
  rasterizeOccluder(box: BoundingBox): void {
    const screenBox = this.projectBox(box);
    if (!screenBox) return;
    
    const { minX, maxX, minY, maxY, minZ } = screenBox;
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * this.resolution + x;
        if (minZ < this.depthBuffer[idx]) {
          this.depthBuffer[idx] = minZ;
        }
      }
    }
  }
  
  /**
   * Test if an object is occluded
   */
  testOcclusion(sphere: BoundingSphere): boolean {
    const box = boundingBoxFromSphere(sphere);
    const screenBox = this.projectBox(box);
    if (!screenBox) return true; // Behind camera
    
    const { minX, maxX, minY, maxY, maxZ } = screenBox;
    
    // Conservative test: if any pixel is visible, object is visible
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * this.resolution + x;
        if (maxZ < this.depthBuffer[idx]) {
          return false; // Visible
        }
      }
    }
    
    return true; // Fully occluded
  }
  
  private projectBox(
    box: BoundingBox
  ): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } | null {
    if (this.viewProjectionMatrix.length !== 16) return null;
    
    const corners = [
      { x: box.min.x, y: box.min.y, z: box.min.z },
      { x: box.max.x, y: box.min.y, z: box.min.z },
      { x: box.min.x, y: box.max.y, z: box.min.z },
      { x: box.max.x, y: box.max.y, z: box.min.z },
      { x: box.min.x, y: box.min.y, z: box.max.z },
      { x: box.max.x, y: box.min.y, z: box.max.z },
      { x: box.min.x, y: box.max.y, z: box.max.z },
      { x: box.max.x, y: box.max.y, z: box.max.z },
    ];
    
    let minX = this.resolution;
    let maxX = 0;
    let minY = this.resolution;
    let maxY = 0;
    let minZ = 1.0;
    let maxZ = 0.0;
    let allBehind = true;
    
    for (const corner of corners) {
      const projected = this.projectPoint(corner);
      if (!projected) continue;
      
      allBehind = false;
      minX = Math.min(minX, projected.x);
      maxX = Math.max(maxX, projected.x);
      minY = Math.min(minY, projected.y);
      maxY = Math.max(maxY, projected.y);
      minZ = Math.min(minZ, projected.z);
      maxZ = Math.max(maxZ, projected.z);
    }
    
    if (allBehind) return null;
    
    return {
      minX: Math.max(0, Math.floor(minX)),
      maxX: Math.min(this.resolution - 1, Math.ceil(maxX)),
      minY: Math.max(0, Math.floor(minY)),
      maxY: Math.min(this.resolution - 1, Math.ceil(maxY)),
      minZ,
      maxZ,
    };
  }
  
  private projectPoint(
    point: Vec3
  ): { x: number; y: number; z: number } | null {
    const m = this.viewProjectionMatrix;
    
    const x = m[0] * point.x + m[4] * point.y + m[8] * point.z + m[12];
    const y = m[1] * point.x + m[5] * point.y + m[9] * point.z + m[13];
    const z = m[2] * point.x + m[6] * point.y + m[10] * point.z + m[14];
    const w = m[3] * point.x + m[7] * point.y + m[11] * point.z + m[15];
    
    if (w <= 0) return null; // Behind camera
    
    const ndcX = x / w;
    const ndcY = y / w;
    const ndcZ = z / w;
    
    return {
      x: ((ndcX + 1) / 2) * this.resolution,
      y: ((ndcY + 1) / 2) * this.resolution,
      z: (ndcZ + 1) / 2,
    };
  }
}

// ============================================================================
// Small Object Culler
// ============================================================================

export class SmallObjectCuller {
  private cameraPosition: Vec3 = { x: 0, y: 0, z: 0 };
  private fov: number = Math.PI / 2;
  private screenHeight: number = 1080;
  private threshold: number = 4; // pixels
  
  setCameraPosition(position: Vec3): void {
    this.cameraPosition = position;
  }
  
  setParameters(fov: number, screenHeight: number, threshold: number): void {
    this.fov = fov;
    this.screenHeight = screenHeight;
    this.threshold = threshold;
  }
  
  testObject(sphere: BoundingSphere): boolean {
    const distance = vec3Distance(this.cameraPosition, sphere.center);
    if (distance <= sphere.radius) return true;
    
    const angularSize = 2 * Math.atan(sphere.radius / distance);
    const screenPixels = (angularSize / this.fov) * this.screenHeight;
    
    return screenPixels >= this.threshold;
  }
  
  getScreenSize(sphere: BoundingSphere): number {
    const distance = vec3Distance(this.cameraPosition, sphere.center);
    if (distance <= sphere.radius) return this.screenHeight;
    
    const angularSize = 2 * Math.atan(sphere.radius / distance);
    return (angularSize / this.fov) * this.screenHeight;
  }
}

// ============================================================================
// Combined Culling System
// ============================================================================

export class CullingSystem {
  private config: CullingConfig;
  private frustumCuller: FrustumCuller;
  private distanceCuller: DistanceCuller;
  private occlusionCuller: OcclusionCuller;
  private smallObjectCuller: SmallObjectCuller;
  
  private objects: Map<string, CullableObject> = new Map();
  private frameNumber: number = 0;
  
  constructor(config: CullingConfig) {
    this.config = config;
    this.frustumCuller = new FrustumCuller();
    this.distanceCuller = new DistanceCuller();
    this.occlusionCuller = new OcclusionCuller(config.occlusionResolution);
    this.smallObjectCuller = new SmallObjectCuller();
    
    this.distanceCuller.setMaxDistance(config.maxDistance);
  }
  
  addObject(obj: CullableObject): void {
    this.objects.set(obj.id, obj);
  }
  
  removeObject(id: string): boolean {
    return this.objects.delete(id);
  }
  
  getObject(id: string): CullableObject | undefined {
    return this.objects.get(id);
  }
  
  updateCamera(
    position: Vec3,
    frustum: Frustum,
    viewProjection: number[],
    fov: number,
    screenHeight: number
  ): void {
    this.frustumCuller.setFrustum(frustum);
    this.distanceCuller.setCameraPosition(position);
    this.occlusionCuller.setViewProjection(viewProjection);
    this.smallObjectCuller.setCameraPosition(position);
    this.smallObjectCuller.setParameters(
      fov,
      screenHeight,
      this.config.smallObjectThreshold
    );
  }
  
  cull(): CullingResult {
    const startTime = performance.now();
    this.frameNumber++;
    
    const visible: string[] = [];
    const culled: string[] = [];
    let frustumCulled = 0;
    let occlusionCulled = 0;
    let distanceCulled = 0;
    let smallObjectCulled = 0;
    
    // Clear occlusion buffer
    if (this.config.occlusionCulling) {
      this.occlusionCuller.clear();
      
      // First pass: render occluders
      const occluders = Array.from(this.objects.values())
        .filter((o) => o.isOccluder)
        .sort((a, b) => b.occlusionPriority - a.occlusionPriority);
      
      for (const occluder of occluders) {
        if (this.frustumCuller.testSphere(occluder.bounds)) {
          const box = boundingBoxFromSphere(occluder.bounds);
          this.occlusionCuller.rasterizeOccluder(box);
        }
      }
    }
    
    // Main culling pass
    for (const obj of this.objects.values()) {
      let isCulled = false;
      let reason: 'frustum' | 'occlusion' | 'distance' | 'small' = 'frustum';
      
      // Distance culling (cheapest first)
      if (!isCulled && this.config.mode !== CullingMode.None) {
        if (!this.distanceCuller.testObject(obj)) {
          isCulled = true;
          reason = 'distance';
          distanceCulled++;
        }
      }
      
      // Small object culling
      if (!isCulled && this.config.smallObjectThreshold > 0) {
        if (!this.smallObjectCuller.testObject(obj.bounds)) {
          isCulled = true;
          reason = 'small';
          smallObjectCulled++;
        }
      }
      
      // Frustum culling
      if (!isCulled && this.config.frustumCulling) {
        if (!this.frustumCuller.testSphere(obj.bounds)) {
          isCulled = true;
          reason = 'frustum';
          frustumCulled++;
        }
      }
      
      // Occlusion culling
      if (!isCulled && this.config.occlusionCulling && !obj.isOccluder) {
        if (this.occlusionCuller.testOcclusion(obj.bounds)) {
          isCulled = true;
          reason = 'occlusion';
          occlusionCulled++;
        }
      }
      
      if (isCulled) {
        culled.push(obj.id);
      } else {
        visible.push(obj.id);
        obj.lastVisibleFrame = this.frameNumber;
      }
    }
    
    return {
      visible,
      culled,
      frustumCulled,
      occlusionCulled,
      distanceCulled,
      smallObjectCulled,
      processingTime: performance.now() - startTime,
    };
  }
}

// ============================================================================
// Visibility Query
// ============================================================================

export class VisibilityQuery {
  private cullingSystem: CullingSystem;
  
  constructor(cullingSystem: CullingSystem) {
    this.cullingSystem = cullingSystem;
  }
  
  isVisible(id: string): boolean {
    const obj = this.cullingSystem.getObject(id);
    if (!obj) return false;
    
    // Quick check using last visible frame
    // (proper implementation would do full test)
    return true; // Placeholder
  }
  
  getVisibleInRadius(
    center: Vec3,
    radius: number,
    visible: string[]
  ): string[] {
    return visible.filter((id) => {
      const obj = this.cullingSystem.getObject(id);
      if (!obj) return false;
      
      const dx = obj.position.x - center.x;
      const dy = obj.position.y - center.y;
      const dz = obj.position.z - center.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const maxDist = radius + obj.bounds.radius;
      
      return distSq <= maxDist * maxDist;
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export { boundingBoxFromSphere };
