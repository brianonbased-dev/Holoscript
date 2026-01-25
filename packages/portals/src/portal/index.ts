/**
 * @holoscript/portals - Portal Module
 * VR portal creation, rendering, and traversal
 */

import {
  Vec3,
  Quaternion,
  Transform,
  Color,
  Portal,
  PortalPair,
  PortalType,
  PortalShape,
  PortalConfig,
  PortalDestination,
  PortalEvent,
  PortalEventHandler,
  DEFAULT_PORTAL_CONFIG,
} from '../types';

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return 'portal_' + Math.random().toString(36).substring(2, 11);
}

function vec3Distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function quaternionMultiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function quaternionInverse(q: Quaternion): Quaternion {
  const lengthSq = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
  return {
    x: -q.x / lengthSq,
    y: -q.y / lengthSq,
    z: -q.z / lengthSq,
    w: q.w / lengthSq,
  };
}

function rotateVector(v: Vec3, q: Quaternion): Vec3 {
  const qv: Quaternion = { x: v.x, y: v.y, z: v.z, w: 0 };
  const qInv = quaternionInverse(q);
  const result = quaternionMultiply(quaternionMultiply(q, qv), qInv);
  return { x: result.x, y: result.y, z: result.z };
}

// ============================================================================
// Portal Factory
// ============================================================================

export class PortalFactory {
  static create(
    name: string,
    transform: Transform,
    destination: PortalDestination,
    config: Partial<PortalConfig> = {}
  ): Portal {
    const fullConfig: PortalConfig = { ...DEFAULT_PORTAL_CONFIG, ...config };
    
    return {
      id: generateId(),
      name,
      transform,
      config: fullConfig,
      destination,
      isActive: true,
      isOpen: true,
      cooldown: 500,
      lastTraversalTime: 0,
      allowedUsers: [],
      metadata: {},
    };
  }
  
  static createPair(
    nameA: string,
    transformA: Transform,
    nameB: string,
    transformB: Transform,
    config: Partial<PortalConfig> = {},
    bidirectional: boolean = true
  ): PortalPair {
    const portalA = this.create(
      nameA,
      transformA,
      {
        position: transformB.position,
        rotation: transformB.rotation,
        spawnOffset: { x: 0, y: 0, z: 1 },
        preserveOrientation: true,
        preserveVelocity: true,
        scaleMultiplier: 1,
      },
      config
    );
    
    const portalB = this.create(
      nameB,
      transformB,
      {
        position: transformA.position,
        rotation: transformA.rotation,
        spawnOffset: { x: 0, y: 0, z: 1 },
        preserveOrientation: true,
        preserveVelocity: true,
        scaleMultiplier: 1,
      },
      config
    );
    
    portalA.linkedPortalId = portalB.id;
    portalB.linkedPortalId = portalA.id;
    
    return {
      id: generateId().replace('portal_', 'pair_'),
      portalA,
      portalB,
      bidirectional,
      sharedStyle: true,
    };
  }
  
  static createSceneTransition(
    name: string,
    transform: Transform,
    destinationSceneId: string,
    spawnPosition: Vec3,
    spawnRotation: Quaternion,
    config: Partial<PortalConfig> = {}
  ): Portal {
    return this.create(
      name,
      transform,
      {
        sceneId: destinationSceneId,
        position: spawnPosition,
        rotation: spawnRotation,
        spawnOffset: { x: 0, y: 0, z: 0 },
        preserveOrientation: false,
        preserveVelocity: false,
        scaleMultiplier: 1,
      },
      {
        ...config,
        type: PortalType.SceneTransition,
      }
    );
  }
}

// ============================================================================
// Portal Collision Detection
// ============================================================================

export class PortalCollider {
  private portal: Portal;
  private enteredObjects: Set<string> = new Set();
  
  constructor(portal: Portal) {
    this.portal = portal;
  }
  
  updatePortal(portal: Portal): void {
    this.portal = portal;
  }
  
  /**
   * Check if a point is inside the portal surface
   */
  isInsidePortal(worldPosition: Vec3): boolean {
    // Transform to portal local space
    const local = this.worldToLocal(worldPosition);
    
    // Check if in front/behind
    if (Math.abs(local.z) > 0.5) return false;
    
    const config = this.portal.config;
    const halfWidth = config.size.width / 2;
    const halfHeight = config.size.height / 2;
    
    switch (config.shape) {
      case PortalShape.Rectangle:
        return (
          Math.abs(local.x) <= halfWidth && Math.abs(local.y) <= halfHeight
        );
      
      case PortalShape.Ellipse:
        const nx = local.x / halfWidth;
        const ny = local.y / halfHeight;
        return nx * nx + ny * ny <= 1;
      
      case PortalShape.Custom:
        // Would need mesh intersection test
        return false;
      
      default:
        return false;
    }
  }
  
  /**
   * Check if an object crossed through the portal
   */
  checkTraversal(
    objectId: string,
    previousPosition: Vec3,
    currentPosition: Vec3
  ): boolean {
    const prevLocal = this.worldToLocal(previousPosition);
    const currLocal = this.worldToLocal(currentPosition);
    
    // Check if crossed the portal plane (z = 0 in local space)
    if (prevLocal.z > 0 && currLocal.z <= 0) {
      // Find intersection point
      const t = prevLocal.z / (prevLocal.z - currLocal.z);
      const intersectX = prevLocal.x + t * (currLocal.x - prevLocal.x);
      const intersectY = prevLocal.y + t * (currLocal.y - prevLocal.y);
      
      const intersectPoint: Vec3 = { x: intersectX, y: intersectY, z: 0 };
      
      // Check if within portal bounds
      if (this.isPointInBounds(intersectPoint)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Track objects entering/exiting portal proximity
   */
  updateProximity(
    objectId: string,
    position: Vec3,
    onEnter: () => void,
    onExit: () => void
  ): void {
    const distance = vec3Distance(position, this.portal.transform.position);
    const maxDist = Math.max(
      this.portal.config.size.width,
      this.portal.config.size.height
    );
    
    const wasInside = this.enteredObjects.has(objectId);
    const isInside = distance <= maxDist;
    
    if (!wasInside && isInside) {
      this.enteredObjects.add(objectId);
      onEnter();
    } else if (wasInside && !isInside) {
      this.enteredObjects.delete(objectId);
      onExit();
    }
  }
  
  private worldToLocal(world: Vec3): Vec3 {
    const portalPos = this.portal.transform.position;
    const relativePos: Vec3 = {
      x: world.x - portalPos.x,
      y: world.y - portalPos.y,
      z: world.z - portalPos.z,
    };
    
    const invRotation = quaternionInverse(this.portal.transform.rotation);
    return rotateVector(relativePos, invRotation);
  }
  
  private isPointInBounds(local: Vec3): boolean {
    const config = this.portal.config;
    const halfWidth = config.size.width / 2;
    const halfHeight = config.size.height / 2;
    
    switch (config.shape) {
      case PortalShape.Rectangle:
        return (
          Math.abs(local.x) <= halfWidth && Math.abs(local.y) <= halfHeight
        );
      
      case PortalShape.Ellipse:
        const nx = local.x / halfWidth;
        const ny = local.y / halfHeight;
        return nx * nx + ny * ny <= 1;
      
      default:
        return false;
    }
  }
}

// ============================================================================
// Portal Traversal Calculator
// ============================================================================

export class PortalTraversal {
  /**
   * Calculate exit transform after traversing a portal
   */
  static calculateExitTransform(
    entryTransform: Transform,
    entryPortal: Portal,
    exitPortal: Portal | PortalDestination
  ): Transform {
    const dest =
      'config' in exitPortal ? this.portalToDestination(exitPortal) : exitPortal;
    
    // Get relative position to entry portal
    const entryPos = entryPortal.transform.position;
    const relPos: Vec3 = {
      x: entryTransform.position.x - entryPos.x,
      y: entryTransform.position.y - entryPos.y,
      z: entryTransform.position.z - entryPos.z,
    };
    
    // Transform to entry portal local space
    const invEntryRot = quaternionInverse(entryPortal.transform.rotation);
    const localPos = rotateVector(relPos, invEntryRot);
    
    // Flip through portal (negate z)
    localPos.z = -localPos.z;
    
    // Apply scale
    localPos.x *= dest.scaleMultiplier;
    localPos.y *= dest.scaleMultiplier;
    localPos.z *= dest.scaleMultiplier;
    
    // Transform to exit space
    const exitWorldPos = rotateVector(localPos, dest.rotation);
    
    // Apply spawn offset
    const offset = rotateVector(dest.spawnOffset, dest.rotation);
    
    const exitPosition: Vec3 = {
      x: dest.position.x + exitWorldPos.x + offset.x,
      y: dest.position.y + exitWorldPos.y + offset.y,
      z: dest.position.z + exitWorldPos.z + offset.z,
    };
    
    // Calculate exit rotation
    let exitRotation: Quaternion;
    
    if (dest.preserveOrientation) {
      // Maintain relative orientation
      const relativeRot = quaternionMultiply(
        invEntryRot,
        entryTransform.rotation
      );
      // Flip 180 degrees around Y
      const flip: Quaternion = { x: 0, y: 1, z: 0, w: 0 };
      const flipped = quaternionMultiply(flip, relativeRot);
      exitRotation = quaternionMultiply(dest.rotation, flipped);
    } else {
      exitRotation = dest.rotation;
    }
    
    return {
      position: exitPosition,
      rotation: exitRotation,
      scale: {
        x: entryTransform.scale.x * dest.scaleMultiplier,
        y: entryTransform.scale.y * dest.scaleMultiplier,
        z: entryTransform.scale.z * dest.scaleMultiplier,
      },
    };
  }
  
  /**
   * Calculate exit velocity after traversing
   */
  static calculateExitVelocity(
    entryVelocity: Vec3,
    entryPortal: Portal,
    exitRotation: Quaternion,
    destination: PortalDestination
  ): Vec3 {
    if (!destination.preserveVelocity) {
      return { x: 0, y: 0, z: 0 };
    }
    
    // Transform velocity to exit portal space
    const invEntryRot = quaternionInverse(entryPortal.transform.rotation);
    const localVel = rotateVector(entryVelocity, invEntryRot);
    
    // Flip Z
    localVel.z = -localVel.z;
    
    // Apply scale
    localVel.x *= destination.scaleMultiplier;
    localVel.y *= destination.scaleMultiplier;
    localVel.z *= destination.scaleMultiplier;
    
    return rotateVector(localVel, exitRotation);
  }
  
  private static portalToDestination(portal: Portal): PortalDestination {
    return {
      position: portal.transform.position,
      rotation: portal.transform.rotation,
      spawnOffset: { x: 0, y: 0, z: 1 },
      preserveOrientation: true,
      preserveVelocity: true,
      scaleMultiplier: 1,
    };
  }
}

// ============================================================================
// Portal Manager
// ============================================================================

export class PortalManager {
  private portals: Map<string, Portal> = new Map();
  private pairs: Map<string, PortalPair> = new Map();
  private colliders: Map<string, PortalCollider> = new Map();
  private eventHandlers: Set<PortalEventHandler> = new Set();
  
  private maxConcurrentRenders: number;
  private currentlyRendering: Set<string> = new Set();
  
  constructor(maxConcurrentRenders: number = 2) {
    this.maxConcurrentRenders = maxConcurrentRenders;
  }
  
  // Portal Management
  
  addPortal(portal: Portal): void {
    this.portals.set(portal.id, portal);
    this.colliders.set(portal.id, new PortalCollider(portal));
    this.emit({ type: 'portal_created', portalId: portal.id });
  }
  
  removePortal(id: string): boolean {
    const portal = this.portals.get(id);
    if (!portal) return false;
    
    this.portals.delete(id);
    this.colliders.delete(id);
    this.emit({ type: 'portal_destroyed', portalId: id });
    
    return true;
  }
  
  getPortal(id: string): Portal | undefined {
    return this.portals.get(id);
  }
  
  getAllPortals(): Portal[] {
    return Array.from(this.portals.values());
  }
  
  addPair(pair: PortalPair): void {
    this.pairs.set(pair.id, pair);
    this.addPortal(pair.portalA);
    this.addPortal(pair.portalB);
  }
  
  // Portal State
  
  activatePortal(id: string): void {
    const portal = this.portals.get(id);
    if (portal && !portal.isActive) {
      portal.isActive = true;
      this.emit({ type: 'portal_activated', portalId: id });
    }
  }
  
  deactivatePortal(id: string): void {
    const portal = this.portals.get(id);
    if (portal && portal.isActive) {
      portal.isActive = false;
      this.emit({ type: 'portal_deactivated', portalId: id });
    }
  }
  
  openPortal(id: string): void {
    const portal = this.portals.get(id);
    if (portal) {
      portal.isOpen = true;
    }
  }
  
  closePortal(id: string): void {
    const portal = this.portals.get(id);
    if (portal) {
      portal.isOpen = false;
    }
  }
  
  // Traversal
  
  canTraverse(portalId: string, userId: string): boolean {
    const portal = this.portals.get(portalId);
    if (!portal) return false;
    
    if (!portal.isActive || !portal.isOpen) return false;
    
    const now = Date.now();
    if (now - portal.lastTraversalTime < portal.cooldown) return false;
    
    if (
      portal.allowedUsers.length > 0 &&
      !portal.allowedUsers.includes(userId)
    ) {
      return false;
    }
    
    return true;
  }
  
  traverse(
    portalId: string,
    userId: string,
    entryTransform: Transform,
    velocity?: Vec3
  ): { transform: Transform; velocity: Vec3 } | null {
    const portal = this.portals.get(portalId);
    if (!portal || !this.canTraverse(portalId, userId)) return null;
    
    const linkedPortal = portal.linkedPortalId
      ? this.portals.get(portal.linkedPortalId)
      : undefined;
    
    const destination = linkedPortal || portal.destination;
    
    const exitTransform = PortalTraversal.calculateExitTransform(
      entryTransform,
      portal,
      'config' in destination
        ? destination
        : (destination as PortalDestination)
    );
    
    const exitVelocity = velocity
      ? PortalTraversal.calculateExitVelocity(
          velocity,
          portal,
          exitTransform.rotation,
          portal.destination
        )
      : { x: 0, y: 0, z: 0 };
    
    portal.lastTraversalTime = Date.now();
    
    this.emit({
      type: 'portal_traversed',
      portalId,
      userId,
      destinationSceneId: portal.destination.sceneId,
    });
    
    return { transform: exitTransform, velocity: exitVelocity };
  }
  
  // Rendering Priority
  
  getPortalsToRender(cameraPosition: Vec3): Portal[] {
    const activePortals = Array.from(this.portals.values()).filter(
      (p) => p.isActive && p.config.renderDestination
    );
    
    // Sort by distance
    activePortals.sort((a, b) => {
      const distA = vec3Distance(cameraPosition, a.transform.position);
      const distB = vec3Distance(cameraPosition, b.transform.position);
      return distA - distB;
    });
    
    return activePortals.slice(0, this.maxConcurrentRenders);
  }
  
  // Events
  
  on(handler: PortalEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: PortalEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Portal event handler error:', e);
      }
    }
  }
  
  // Collider access
  
  getCollider(portalId: string): PortalCollider | undefined {
    return this.colliders.get(portalId);
  }
}

// ============================================================================
// Exports
// ============================================================================

export { generateId, vec3Distance, quaternionMultiply, quaternionInverse, rotateVector };
