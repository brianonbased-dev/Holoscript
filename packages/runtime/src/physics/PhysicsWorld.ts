import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface PhysicsOptions {
  gravity?: [number, number, number];
  iterations?: number;
  stepSize?: number;
}

export class PhysicsWorld {
  private world: CANNON.World;
  private bodies: Map<string, CANNON.Body> = new Map();
  private meshes: Map<string, THREE.Object3D> = new Map();
  private lastCallTime: number = 0;
  private stepSize: number;

  constructor(options: PhysicsOptions = {}) {
    this.world = new CANNON.World();
    
    // Default gravity: Earth's gravity
    const gravity = options.gravity || [0, -9.82, 0];
    this.world.gravity.set(gravity[0], gravity[1], gravity[2]);
    
    // Performance settings
    (this.world.solver as CANNON.GSSolver).iterations = options.iterations || 10;
    this.stepSize = options.stepSize || 1 / 60;
    
    // Default material
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.3, // Bounciness
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
  }

  addBody(
    id: string, 
    mesh: THREE.Object3D, 
    type: 'box' | 'sphere' | 'plane' = 'box',
    mass: number = 1
  ): CANNON.Body {
    // Determine shape and dimensions based on mesh
    let shape: CANNON.Shape;
    let position = new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z);
    let quaternion = new CANNON.Quaternion(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
    
    // Simplistic shape generation based on type
    // In a real implementation, we would inspect mesh geometry bounding box
    const scale = mesh.scale;
    
    if (type === 'sphere') {
      // Assuming radius 0.5 (default sphere geometry) * max scale
      const radius = 0.5 * Math.max(scale.x, scale.y, scale.z);
      shape = new CANNON.Sphere(radius);
    } else if (type === 'plane') {
      shape = new CANNON.Plane();
      // Rotate plane to match Three.js plane (which faces Z) vs Cannon plane (which faces Z)
      // Actually Cannon plane is infinite on X/Y, facing Z. 
      // Often planes in Three are floor, rotated -90 on X.
      // We'll trust the mesh rotation.
      mass = 0; // Planes are usually static
    } else {
      // Box
      const halfExtents = new CANNON.Vec3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5);
      shape = new CANNON.Box(halfExtents);
    }

    const body = new CANNON.Body({
      mass: mass, // 0 = static, >0 = dynamic
      shape: shape,
      position: position,
      quaternion: quaternion
    });

    this.world.addBody(body);
    this.bodies.set(id, body);
    this.meshes.set(id, mesh);

    return body;
  }

  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(id);
      this.meshes.delete(id);
    }
  }

  step(timeSinceLastCall: number): void {
    // Fixed time step
    this.world.step(this.stepSize, timeSinceLastCall, 3);
    
    // Sync visual meshes with physics bodies
    this.bodies.forEach((body, id) => {
      const mesh = this.meshes.get(id);
      if (mesh) {
        mesh.position.copy(body.position as any);
        mesh.quaternion.copy(body.quaternion as any);
      }
    });
  }

  applyImpulse(id: string, impulse: [number, number, number], worldPoint?: [number, number, number]): void {
    const body = this.bodies.get(id);
    if (body) {
      const imp = new CANNON.Vec3(impulse[0], impulse[1], impulse[2]);
      const point = worldPoint 
        ? new CANNON.Vec3(worldPoint[0], worldPoint[1], worldPoint[2]) 
        : body.position;
      body.applyImpulse(imp, point);
    }
  }

  setVelocity(id: string, velocity: [number, number, number]): void {
    const body = this.bodies.get(id);
    if (body) {
      body.velocity.set(velocity[0], velocity[1], velocity[2]);
    }
  }
}
