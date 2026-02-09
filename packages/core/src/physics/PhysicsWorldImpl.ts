/**
 * PhysicsWorldImpl.ts
 *
 * Physics world implementation with broadphase collision detection,
 * constraint solving, and spatial queries.
 *
 * @module physics
 */

import {
  IVector3,
  IQuaternion,
  ITransform,
  IRigidBodyConfig,
  IRigidBodyState,
  IPhysicsWorld,
  IPhysicsWorldConfig,
  Constraint,
  ICollisionEvent,
  ITriggerEvent,
  ICollisionFilter,
  IRay,
  IRaycastHit,
  IRaycastOptions,
  IOverlapResult,
  PHYSICS_DEFAULTS,
  zeroVector,
} from './PhysicsTypes';
import { RigidBody } from './PhysicsBody';
import { IslandDetector } from './IslandDetector';

/**
 * AABB for broadphase
 */
interface IAABB {
  min: IVector3;
  max: IVector3;
}

/**
 * Collision pair
 */
interface ICollisionPair {
  bodyA: RigidBody;
  bodyB: RigidBody;
}

/**
 * Constraint instance
 */
interface IConstraintInstance {
  config: Constraint;
  bodyA: RigidBody;
  bodyB: RigidBody | null;
  enabled: boolean;
}

/**
 * Physics world implementation
 */
export class PhysicsWorldImpl implements IPhysicsWorld {
  private config: Required<IPhysicsWorldConfig>;
  private bodies: Map<string, RigidBody> = new Map();
  private constraints: Map<string, IConstraintInstance> = new Map();
  private collisionEvents: ICollisionEvent[] = [];
  private triggerEvents: ITriggerEvent[] = [];
  private islandDetector: IslandDetector;
  private accumulator: number = 0;

  // Cached for iteration
  private bodiesArray: RigidBody[] = [];
  private collisionPairs: ICollisionPair[] = [];
  private activeContacts: Map<string, boolean> = new Map();

  constructor(config?: IPhysicsWorldConfig) {
    this.config = {
      gravity: config?.gravity ?? { ...PHYSICS_DEFAULTS.gravity },
      fixedTimestep: config?.fixedTimestep ?? PHYSICS_DEFAULTS.fixedTimestep,
      maxSubsteps: config?.maxSubsteps ?? PHYSICS_DEFAULTS.maxSubsteps,
      solverIterations: config?.solverIterations ?? PHYSICS_DEFAULTS.solverIterations,
      allowSleep: config?.allowSleep ?? true,
      broadphase: config?.broadphase ?? 'aabb',
    };

    this.islandDetector = new IslandDetector();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  public setGravity(gravity: IVector3): void {
    this.config.gravity = { ...gravity };
  }

  public getGravity(): IVector3 {
    return { ...this.config.gravity };
  }

  // ============================================================================
  // Body Management
  // ============================================================================

  public createBody(config: IRigidBodyConfig): string {
    if (this.bodies.has(config.id)) {
      throw new Error(`Body with id '${config.id}' already exists`);
    }

    const body = new RigidBody(config);
    this.bodies.set(config.id, body);
    this.bodiesArray.push(body);

    return body.id;
  }

  public removeBody(id: string): boolean {
    const body = this.bodies.get(id);
    if (!body) return false;

    // Remove associated constraints
    for (const [constraintId, constraint] of this.constraints) {
      if (constraint.bodyA === body || constraint.bodyB === body) {
        this.constraints.delete(constraintId);
      }
    }

    this.bodies.delete(id);
    this.bodiesArray = this.bodiesArray.filter(b => b.id !== id);

    return true;
  }

  public getBody(id: string): IRigidBodyState | undefined {
    const body = this.bodies.get(id);
    return body?.getState();
  }

  public getAllBodies(): IRigidBodyState[] {
    return this.bodiesArray.map(b => b.getState());
  }

  // ============================================================================
  // Body Manipulation
  // ============================================================================

  public setPosition(id: string, position: IVector3): void {
    const body = this.bodies.get(id);
    if (body) body.position = position;
  }

  public setRotation(id: string, rotation: IQuaternion): void {
    const body = this.bodies.get(id);
    if (body) body.rotation = rotation;
  }

  public setTransform(id: string, transform: ITransform): void {
    const body = this.bodies.get(id);
    if (body) body.setTransform(transform);
  }

  public setLinearVelocity(id: string, velocity: IVector3): void {
    const body = this.bodies.get(id);
    if (body) body.linearVelocity = velocity;
  }

  public setAngularVelocity(id: string, velocity: IVector3): void {
    const body = this.bodies.get(id);
    if (body) body.angularVelocity = velocity;
  }

  public applyForce(id: string, force: IVector3, worldPoint?: IVector3): void {
    const body = this.bodies.get(id);
    if (!body) return;

    if (worldPoint) {
      body.applyForceAtPoint(force, worldPoint);
    } else {
      body.applyForce(force);
    }
  }

  public applyImpulse(id: string, impulse: IVector3, worldPoint?: IVector3): void {
    const body = this.bodies.get(id);
    if (!body) return;

    if (worldPoint) {
      body.applyImpulseAtPoint(impulse, worldPoint);
    } else {
      body.applyImpulse(impulse);
    }
  }

  public applyTorque(id: string, torque: IVector3): void {
    const body = this.bodies.get(id);
    if (body) body.applyTorque(torque);
  }

  public applyTorqueImpulse(id: string, impulse: IVector3): void {
    const body = this.bodies.get(id);
    if (body) body.applyTorqueImpulse(impulse);
  }

  // ============================================================================
  // Constraint Management
  // ============================================================================

  public createConstraint(constraint: Constraint): string {
    if (this.constraints.has(constraint.id)) {
      throw new Error(`Constraint with id '${constraint.id}' already exists`);
    }

    const bodyA = this.bodies.get(constraint.bodyA);
    if (!bodyA) {
      throw new Error(`Body A '${constraint.bodyA}' not found`);
    }

    let bodyB: RigidBody | null = null;
    if (constraint.bodyB) {
      bodyB = this.bodies.get(constraint.bodyB) ?? null;
      if (!bodyB) {
        throw new Error(`Body B '${constraint.bodyB}' not found`);
      }
    }

    this.constraints.set(constraint.id, {
      config: constraint,
      bodyA,
      bodyB,
      enabled: true,
    });

    return constraint.id;
  }

  public removeConstraint(id: string): boolean {
    return this.constraints.delete(id);
  }

  public setConstraintEnabled(id: string, enabled: boolean): void {
    const constraint = this.constraints.get(id);
    if (constraint) constraint.enabled = enabled;
  }

  // ============================================================================
  // Simulation
  // ============================================================================

  public step(deltaTime: number): void {
    // Clear events
    this.collisionEvents = [];
    this.triggerEvents = [];

    // Fixed timestep with accumulator
    this.accumulator += deltaTime;
    let substeps = 0;

    while (this.accumulator >= this.config.fixedTimestep &&
           substeps < this.config.maxSubsteps) {
      this.fixedStep(this.config.fixedTimestep);
      this.accumulator -= this.config.fixedTimestep;
      substeps++;
    }
  }

  private fixedStep(dt: number): void {
    // Broadphase collision detection
    this.broadphase();

    // Narrowphase collision detection and generate contacts
    this.narrowphase();

    // Detect islands for sleeping
    if (this.config.allowSleep) {
      this.detectIslands();
    }

    // Integrate forces (gravity + accumulated user forces)
    for (const body of this.bodiesArray) {
      body.integrateForces(dt, this.config.gravity);
    }

    // Clear forces after integration
    for (const body of this.bodiesArray) {
      body.clearForces();
    }

    // Solve constraints
    this.solveConstraints(dt);

    // Integrate velocities
    for (const body of this.bodiesArray) {
      body.integrateVelocities(dt);
    }

    // Update sleep state
    if (this.config.allowSleep) {
      for (const body of this.bodiesArray) {
        body.updateSleep(dt);
      }
    }
  }

  // ============================================================================
  // Collision Detection
  // ============================================================================

  private broadphase(): void {
    this.collisionPairs = [];

    // Simple O(n²) AABB check
    for (let i = 0; i < this.bodiesArray.length; i++) {
      const bodyA = this.bodiesArray[i];
      if (!bodyA.isActive) continue;

      const aabbA = this.getBodyAABB(bodyA);

      for (let j = i + 1; j < this.bodiesArray.length; j++) {
        const bodyB = this.bodiesArray[j];
        if (!bodyB.isActive) continue;

        // Skip if both static
        if (bodyA.type === 'static' && bodyB.type === 'static') continue;

        // Check collision filter
        if (!bodyA.canCollideWith(bodyB)) continue;

        const aabbB = this.getBodyAABB(bodyB);

        if (this.aabbOverlap(aabbA, aabbB)) {
          this.collisionPairs.push({ bodyA, bodyB });
        }
      }
    }
  }

  private narrowphase(): void {
    const newContacts = new Map<string, boolean>();

    for (const pair of this.collisionPairs) {
      const contactKey = this.getContactKey(pair.bodyA.id, pair.bodyB.id);
      const wasContacting = this.activeContacts.has(contactKey);

      // Simple sphere-sphere or AABB check (placeholder for full GJK/EPA)
      const collision = this.checkCollision(pair.bodyA, pair.bodyB);

      if (collision) {
        newContacts.set(contactKey, true);

        const eventType = wasContacting ? 'persist' : 'begin';
        this.collisionEvents.push({
          type: eventType,
          bodyA: pair.bodyA.id,
          bodyB: pair.bodyB.id,
          contacts: collision.contacts,
        });

        // Apply collision response
        this.resolveCollision(pair.bodyA, pair.bodyB, collision);
      }
    }

    // Detect ended collisions
    for (const [key] of this.activeContacts) {
      if (!newContacts.has(key)) {
        const [idA, idB] = key.split('|');
        this.collisionEvents.push({
          type: 'end',
          bodyA: idA,
          bodyB: idB,
          contacts: [],
        });
      }
    }

    this.activeContacts = newContacts;
  }

  private checkCollision(
    bodyA: RigidBody,
    bodyB: RigidBody,
  ): { contacts: Array<{ position: IVector3; normal: IVector3; penetration: number; impulse: number }> } | null {
    // Simplified sphere-sphere collision for now
    if (bodyA.shape.type === 'sphere' && bodyB.shape.type === 'sphere') {
      const posA = bodyA.position;
      const posB = bodyB.position;
      const radiusA = bodyA.shape.radius;
      const radiusB = bodyB.shape.radius;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dz = posB.z - posA.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const radiusSum = radiusA + radiusB;

      if (distSq < radiusSum * radiusSum) {
        const dist = Math.sqrt(distSq);
        const penetration = radiusSum - dist;

        const normal = dist > 0
          ? { x: dx / dist, y: dy / dist, z: dz / dist }
          : { x: 0, y: 1, z: 0 };

        const contactPoint = {
          x: posA.x + normal.x * radiusA,
          y: posA.y + normal.y * radiusA,
          z: posA.z + normal.z * radiusA,
        };

        return {
          contacts: [{
            position: contactPoint,
            normal,
            penetration,
            impulse: 0,
          }],
        };
      }
    }

    // AABB collision for boxes
    if (bodyA.shape.type === 'box' && bodyB.shape.type === 'box') {
      const aabbA = this.getBodyAABB(bodyA);
      const aabbB = this.getBodyAABB(bodyB);

      if (this.aabbOverlap(aabbA, aabbB)) {
        // Calculate penetration and contact normal
        const overlapX = Math.min(aabbA.max.x - aabbB.min.x, aabbB.max.x - aabbA.min.x);
        const overlapY = Math.min(aabbA.max.y - aabbB.min.y, aabbB.max.y - aabbA.min.y);
        const overlapZ = Math.min(aabbA.max.z - aabbB.min.z, aabbB.max.z - aabbA.min.z);

        let normal: IVector3;
        let penetration: number;

        if (overlapX <= overlapY && overlapX <= overlapZ) {
          penetration = overlapX;
          normal = bodyA.position.x < bodyB.position.x
            ? { x: -1, y: 0, z: 0 }
            : { x: 1, y: 0, z: 0 };
        } else if (overlapY <= overlapZ) {
          penetration = overlapY;
          normal = bodyA.position.y < bodyB.position.y
            ? { x: 0, y: -1, z: 0 }
            : { x: 0, y: 1, z: 0 };
        } else {
          penetration = overlapZ;
          normal = bodyA.position.z < bodyB.position.z
            ? { x: 0, y: 0, z: -1 }
            : { x: 0, y: 0, z: 1 };
        }

        const contactPoint = {
          x: (bodyA.position.x + bodyB.position.x) / 2,
          y: (bodyA.position.y + bodyB.position.y) / 2,
          z: (bodyA.position.z + bodyB.position.z) / 2,
        };

        return {
          contacts: [{
            position: contactPoint,
            normal,
            penetration,
            impulse: 0,
          }],
        };
      }
    }

    return null;
  }

  private resolveCollision(
    bodyA: RigidBody,
    bodyB: RigidBody,
    collision: { contacts: Array<{ position: IVector3; normal: IVector3; penetration: number; impulse: number }> },
  ): void {
    for (const contact of collision.contacts) {
      // Simple impulse-based resolution
      const normal = contact.normal;
      const relativeVelocity = {
        x: bodyB.linearVelocity.x - bodyA.linearVelocity.x,
        y: bodyB.linearVelocity.y - bodyA.linearVelocity.y,
        z: bodyB.linearVelocity.z - bodyA.linearVelocity.z,
      };

      const normalVelocity =
        relativeVelocity.x * normal.x +
        relativeVelocity.y * normal.y +
        relativeVelocity.z * normal.z;

      // Don't resolve if separating
      if (normalVelocity > 0) continue;

      // Calculate restitution
      const restitution = Math.min(bodyA.material.restitution, bodyB.material.restitution);

      // Calculate impulse magnitude
      const invMassSum = bodyA.inverseMass + bodyB.inverseMass;
      if (invMassSum === 0) continue;

      const impulseMag = -(1 + restitution) * normalVelocity / invMassSum;

      // Apply impulse
      const impulse = {
        x: normal.x * impulseMag,
        y: normal.y * impulseMag,
        z: normal.z * impulseMag,
      };

      bodyA.applyImpulse({ x: -impulse.x, y: -impulse.y, z: -impulse.z });
      bodyB.applyImpulse(impulse);

      // Position correction (penetration resolution)
      const percent = 0.8; // Correction percentage
      const slop = 0.01; // Penetration allowance

      const correctionMag = Math.max(contact.penetration - slop, 0) / invMassSum * percent;
      const correction = {
        x: normal.x * correctionMag,
        y: normal.y * correctionMag,
        z: normal.z * correctionMag,
      };

      if (bodyA.type === 'dynamic') {
        const posA = bodyA.position;
        bodyA.position = {
          x: posA.x - correction.x * bodyA.inverseMass,
          y: posA.y - correction.y * bodyA.inverseMass,
          z: posA.z - correction.z * bodyA.inverseMass,
        };
      }

      if (bodyB.type === 'dynamic') {
        const posB = bodyB.position;
        bodyB.position = {
          x: posB.x + correction.x * bodyB.inverseMass,
          y: posB.y + correction.y * bodyB.inverseMass,
          z: posB.z + correction.z * bodyB.inverseMass,
        };
      }

      // Store impulse
      contact.impulse = impulseMag;
    }
  }

  // ============================================================================
  // Constraints
  // ============================================================================

  private solveConstraints(_dt: number): void {
    for (let iter = 0; iter < this.config.solverIterations; iter++) {
      for (const [, constraint] of this.constraints) {
        if (!constraint.enabled) continue;
        this.solveConstraint(constraint);
      }
    }
  }

  private solveConstraint(constraint: IConstraintInstance): void {
    const { config, bodyA, bodyB } = constraint;

    switch (config.type) {
      case 'distance': {
        if (!bodyB) return;

        const posA = bodyA.position;
        const posB = bodyB.position;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const dz = posB.z - posA.z;
        const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (currentDist === 0) return;

        const diff = (currentDist - config.distance) / currentDist;
        const correction = {
          x: dx * diff * 0.5,
          y: dy * diff * 0.5,
          z: dz * diff * 0.5,
        };

        if (bodyA.type === 'dynamic') {
          bodyA.position = {
            x: posA.x + correction.x,
            y: posA.y + correction.y,
            z: posA.z + correction.z,
          };
        }

        if (bodyB.type === 'dynamic') {
          bodyB.position = {
            x: posB.x - correction.x,
            y: posB.y - correction.y,
            z: posB.z - correction.z,
          };
        }
        break;
      }

      // Add more constraint solvers as needed
      default:
        break;
    }
  }

  // ============================================================================
  // Island Detection
  // ============================================================================

  private detectIslands(): void {
    this.islandDetector.reset();

    // Add active dynamic bodies
    for (const body of this.bodiesArray) {
      if (body.type === 'dynamic' && body.isActive) {
        this.islandDetector.addBody(body.id);
      }
    }

    // Add connections from contacts
    for (const [contactKey] of this.activeContacts) {
      const [idA, idB] = contactKey.split('|');
      const bodyA = this.bodies.get(idA);
      const bodyB = this.bodies.get(idB);

      if (bodyA?.type === 'dynamic' && bodyB?.type === 'dynamic') {
        this.islandDetector.addConnection(idA, idB);
      }
    }

    // Detect islands (can be used for parallel solving)
    const _islands = this.islandDetector.detectIslands();
    // For now, just detect - parallel solving would use these islands
  }

  // ============================================================================
  // Events
  // ============================================================================

  public getContacts(): ICollisionEvent[] {
    return this.collisionEvents;
  }

  public getTriggers(): ITriggerEvent[] {
    return this.triggerEvents;
  }

  // ============================================================================
  // Spatial Queries
  // ============================================================================

  public raycast(ray: IRay, options?: IRaycastOptions): IRaycastHit[] {
    const hits: IRaycastHit[] = [];
    const maxDistance = ray.maxDistance ?? Infinity;

    for (const body of this.bodiesArray) {
      if (!body.isActive) continue;
      if (options?.excludeBodies?.includes(body.id)) continue;
      if (options?.filter && !this.filterMatches(body.filter, options.filter)) continue;

      const hit = this.raycastBody(ray, body, maxDistance);
      if (hit) {
        hits.push(hit);
      }
    }

    // Sort by distance
    hits.sort((a, b) => a.distance - b.distance);

    if (options?.closestOnly && hits.length > 0) {
      return [hits[0]];
    }

    return hits;
  }

  public raycastClosest(ray: IRay, options?: IRaycastOptions): IRaycastHit | null {
    const hits = this.raycast(ray, { ...options, closestOnly: true });
    return hits.length > 0 ? hits[0] : null;
  }

  private raycastBody(ray: IRay, body: RigidBody, maxDistance: number): IRaycastHit | null {
    const aabb = this.getBodyAABB(body);

    // Ray-AABB intersection
    let tmin = 0;
    let tmax = maxDistance;

    const invDirX = ray.direction.x !== 0 ? 1 / ray.direction.x : Infinity;
    const invDirY = ray.direction.y !== 0 ? 1 / ray.direction.y : Infinity;
    const invDirZ = ray.direction.z !== 0 ? 1 / ray.direction.z : Infinity;

    // X axis
    let t1 = (aabb.min.x - ray.origin.x) * invDirX;
    let t2 = (aabb.max.x - ray.origin.x) * invDirX;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;

    // Y axis
    t1 = (aabb.min.y - ray.origin.y) * invDirY;
    t2 = (aabb.max.y - ray.origin.y) * invDirY;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;

    // Z axis
    t1 = (aabb.min.z - ray.origin.z) * invDirZ;
    t2 = (aabb.max.z - ray.origin.z) * invDirZ;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;

    // Calculate hit point
    const distance = tmin >= 0 ? tmin : tmax;
    if (distance < 0 || distance > maxDistance) return null;

    const point = {
      x: ray.origin.x + ray.direction.x * distance,
      y: ray.origin.y + ray.direction.y * distance,
      z: ray.origin.z + ray.direction.z * distance,
    };

    // Approximate normal (from AABB face)
    const normal = this.calculateAABBHitNormal(point, body.position, aabb);

    return {
      bodyId: body.id,
      point,
      normal,
      distance,
      fraction: distance / maxDistance,
    };
  }

  private calculateAABBHitNormal(point: IVector3, center: IVector3, aabb: IAABB): IVector3 {
    const epsilon = 0.001;

    if (Math.abs(point.x - aabb.min.x) < epsilon) return { x: -1, y: 0, z: 0 };
    if (Math.abs(point.x - aabb.max.x) < epsilon) return { x: 1, y: 0, z: 0 };
    if (Math.abs(point.y - aabb.min.y) < epsilon) return { x: 0, y: -1, z: 0 };
    if (Math.abs(point.y - aabb.max.y) < epsilon) return { x: 0, y: 1, z: 0 };
    if (Math.abs(point.z - aabb.min.z) < epsilon) return { x: 0, y: 0, z: -1 };
    if (Math.abs(point.z - aabb.max.z) < epsilon) return { x: 0, y: 0, z: 1 };

    // Default: direction from center to point
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dz = point.z - center.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return len > 0 ? { x: dx / len, y: dy / len, z: dz / len } : { x: 0, y: 1, z: 0 };
  }

  public sphereOverlap(
    center: IVector3,
    radius: number,
    filter?: ICollisionFilter,
  ): IOverlapResult[] {
    const results: IOverlapResult[] = [];

    for (const body of this.bodiesArray) {
      if (!body.isActive) continue;
      if (filter && !this.filterMatches(body.filter, filter)) continue;

      const aabb = this.getBodyAABB(body);

      // Find closest point on AABB to sphere center
      const closest = {
        x: Math.max(aabb.min.x, Math.min(center.x, aabb.max.x)),
        y: Math.max(aabb.min.y, Math.min(center.y, aabb.max.y)),
        z: Math.max(aabb.min.z, Math.min(center.z, aabb.max.z)),
      };

      const dx = center.x - closest.x;
      const dy = center.y - closest.y;
      const dz = center.z - closest.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        results.push({
          bodyId: body.id,
          penetration: radius - dist,
          direction: dist > 0
            ? { x: dx / dist, y: dy / dist, z: dz / dist }
            : { x: 0, y: 1, z: 0 },
        });
      }
    }

    return results;
  }

  public boxOverlap(
    center: IVector3,
    halfExtents: IVector3,
    _rotation?: IQuaternion,
    filter?: ICollisionFilter,
  ): IOverlapResult[] {
    const results: IOverlapResult[] = [];

    const queryAABB: IAABB = {
      min: {
        x: center.x - halfExtents.x,
        y: center.y - halfExtents.y,
        z: center.z - halfExtents.z,
      },
      max: {
        x: center.x + halfExtents.x,
        y: center.y + halfExtents.y,
        z: center.z + halfExtents.z,
      },
    };

    for (const body of this.bodiesArray) {
      if (!body.isActive) continue;
      if (filter && !this.filterMatches(body.filter, filter)) continue;

      const bodyAABB = this.getBodyAABB(body);

      if (this.aabbOverlap(queryAABB, bodyAABB)) {
        // Calculate penetration
        const overlapX = Math.min(queryAABB.max.x - bodyAABB.min.x, bodyAABB.max.x - queryAABB.min.x);
        const overlapY = Math.min(queryAABB.max.y - bodyAABB.min.y, bodyAABB.max.y - queryAABB.min.y);
        const overlapZ = Math.min(queryAABB.max.z - bodyAABB.min.z, bodyAABB.max.z - queryAABB.min.z);
        const penetration = Math.min(overlapX, overlapY, overlapZ);

        const dx = body.position.x - center.x;
        const dy = body.position.y - center.y;
        const dz = body.position.z - center.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

        results.push({
          bodyId: body.id,
          penetration,
          direction: len > 0
            ? { x: dx / len, y: dy / len, z: dz / len }
            : { x: 0, y: 1, z: 0 },
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getBodyAABB(body: RigidBody): IAABB {
    const pos = body.position;
    let halfExtents: IVector3;

    switch (body.shape.type) {
      case 'box':
        halfExtents = body.shape.halfExtents;
        break;
      case 'sphere':
        halfExtents = {
          x: body.shape.radius,
          y: body.shape.radius,
          z: body.shape.radius,
        };
        break;
      case 'capsule':
        halfExtents = {
          x: body.shape.radius,
          y: body.shape.height / 2 + body.shape.radius,
          z: body.shape.radius,
        };
        break;
      default:
        halfExtents = { x: 1, y: 1, z: 1 };
    }

    return {
      min: { x: pos.x - halfExtents.x, y: pos.y - halfExtents.y, z: pos.z - halfExtents.z },
      max: { x: pos.x + halfExtents.x, y: pos.y + halfExtents.y, z: pos.z + halfExtents.z },
    };
  }

  private aabbOverlap(a: IAABB, b: IAABB): boolean {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }

  private getContactKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
  }

  private filterMatches(bodyFilter: ICollisionFilter, queryFilter: ICollisionFilter): boolean {
    return (bodyFilter.group & queryFilter.mask) !== 0;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  public dispose(): void {
    this.bodies.clear();
    this.constraints.clear();
    this.bodiesArray = [];
    this.collisionPairs = [];
    this.collisionEvents = [];
    this.triggerEvents = [];
    this.activeContacts.clear();
  }
}

/**
 * Create a physics world
 */
export function createPhysicsWorld(config?: IPhysicsWorldConfig): IPhysicsWorld {
  return new PhysicsWorldImpl(config);
}
