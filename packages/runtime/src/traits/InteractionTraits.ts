import { TraitHandler, TraitContext } from './TraitSystem';
import * as THREE from 'three';

// ============================================================================
// Grabbable Trait
// ============================================================================

export const GrabbableTrait: TraitHandler = {
  name: 'grabbable',
  onApply: (context: TraitContext) => {
    context.object.userData.grabbable = true;
    context.data.originalMass = null;
    context.data.wasKinematic = false;
    
    if (context.config.snapToHand) {
      context.object.userData.snapToHand = true;
    }
    
    // Store grip offset
    context.data.gripOffset = context.config.gripOffset || { x: 0, y: 0, z: 0 };
  },
  onUpdate: (context: TraitContext, delta: number) => {
    const isHeld = context.object.userData.isHeld;
    const body = context.physicsWorld.getBody(context.object.name);
    
    if (isHeld && body) {
      // Store original mass on first grab
      if (context.data.originalMass === null) {
        context.data.originalMass = body.mass;
        context.data.wasKinematic = body.type === 4; // KINEMATIC
      }
      
      // Make kinematic while held
      context.physicsWorld.setKinematic(context.object.name, true);
      context.physicsWorld.setVelocity(context.object.name, [0, 0, 0]);
      
      // Sync physics to visual
      context.physicsWorld.setPosition(context.object.name, [
        context.object.position.x,
        context.object.position.y,
        context.object.position.z
      ]);
      context.physicsWorld.setRotation(context.object.name, [
        context.object.quaternion.x,
        context.object.quaternion.y,
        context.object.quaternion.z,
        context.object.quaternion.w
      ]);
    } else if (!isHeld && context.data.originalMass !== null && body) {
      // Restore physics on release
      if (!context.data.wasKinematic) {
        context.physicsWorld.setKinematic(context.object.name, false);
        context.physicsWorld.setMass(context.object.name, context.data.originalMass);
        context.physicsWorld.wakeUp(context.object.name);
      }
      context.data.originalMass = null;
    }
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.grabbable = false;
  }
};

// ============================================================================
// Throwable Trait
// ============================================================================

export const ThrowableTrait: TraitHandler = {
  name: 'throwable',
  onApply: (context: TraitContext) => {
    context.object.userData.throwable = true;
    context.data.velocityHistory = [];
    context.data.maxThrowSpeed = context.config.maxSpeed || 20;
    context.data.velocityScale = context.config.velocityScale || 1.5;
  },
  onUpdate: (context: TraitContext, delta: number) => {
    if (context.object.userData.isHeld) {
      // Track position history for velocity calculation
      const history = context.data.velocityHistory;
      history.push({ 
        pos: context.object.position.clone(), 
        time: performance.now() 
      });
      if (history.length > 10) history.shift();
    }
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.throwable = false;
  }
};

// Helper to calculate throw velocity on release
export function calculateThrowVelocity(context: TraitContext): [number, number, number] {
  const history = context.data.velocityHistory || [];
  if (history.length < 2) return [0, 0, 0];
  
  const recent = history.slice(-3);
  let vx = 0, vy = 0, vz = 0;
  
  for (let i = 1; i < recent.length; i++) {
    const dt = (recent[i].time - recent[i-1].time) / 1000;
    if (dt > 0) {
      vx += (recent[i].pos.x - recent[i-1].pos.x) / dt;
      vy += (recent[i].pos.y - recent[i-1].pos.y) / dt;
      vz += (recent[i].pos.z - recent[i-1].pos.z) / dt;
    }
  }
  
  const count = recent.length - 1;
  vx = (vx / count) * (context.data.velocityScale || 1.5);
  vy = (vy / count) * (context.data.velocityScale || 1.5);
  vz = (vz / count) * (context.data.velocityScale || 1.5);
  
  // Clamp to max speed
  const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);
  const maxSpeed = context.data.maxThrowSpeed || 20;
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    vx *= scale;
    vy *= scale;
    vz *= scale;
  }
  
  return [vx, vy, vz];
}

// ============================================================================
// Collidable Trait
// ============================================================================

export const CollidableTrait: TraitHandler = {
  name: 'collidable',
  onApply: (context: TraitContext) => {
    context.object.userData.collidable = true;
    context.data.collisionCallbacks = [];
    
    // Subscribe to collision events
    const unsubscribe = context.physicsWorld.onCollision(context.object.name, (event) => {
      // Store collision for access
      context.object.userData.lastCollision = event;
      
      // Call registered callbacks
      for (const cb of context.data.collisionCallbacks) {
        cb(event);
      }
      
      // Dispatch custom event on the object (cast to any for custom event types)
      (context.object as any).dispatchEvent({ type: event.type, event });
    });
    
    context.data.unsubscribeCollision = unsubscribe;
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.collidable = false;
    if (context.data.unsubscribeCollision) {
      context.data.unsubscribeCollision();
    }
  }
};

// ============================================================================
// Physics Trait (adds rigidbody to object)
// ============================================================================

export const PhysicsTrait: TraitHandler = {
  name: 'physics',
  onApply: (context: TraitContext) => {
    const config = context.config;
    
    // Add physics body with configuration
    context.physicsWorld.addBodyWithConfig(context.object.name, context.object, {
      mass: config.mass ?? 1,
      type: config.static ? 'static' : (config.kinematic ? 'kinematic' : 'dynamic'),
      shape: config.shape || 'box',
      friction: config.friction ?? 0.3,
      restitution: config.bounciness ?? config.restitution ?? 0.3,
      linearDamping: config.drag ?? config.linearDamping ?? 0.01,
      angularDamping: config.angularDrag ?? config.angularDamping ?? 0.01,
      isTrigger: config.isTrigger ?? false,
      fixedRotation: config.fixedRotation ?? false,
    });
    
    // Apply initial velocity if specified
    if (config.velocity) {
      context.physicsWorld.setVelocity(context.object.name, config.velocity);
    }
    
    context.object.userData.hasPhysics = true;
  },
  onRemove: (context: TraitContext) => {
    context.physicsWorld.removeBody(context.object.name);
    context.object.userData.hasPhysics = false;
  }
};

// ============================================================================
// Gravity Trait (simplified physics with just gravity)
// ============================================================================

export const GravityTrait: TraitHandler = {
  name: 'gravity',
  onApply: (context: TraitContext) => {
    const mass = context.config.mass ?? 1;
    context.physicsWorld.addBodyWithConfig(context.object.name, context.object, {
      mass,
      type: 'dynamic',
      shape: 'box',
    });
    context.object.userData.hasGravity = true;
  },
  onRemove: (context: TraitContext) => {
    context.physicsWorld.removeBody(context.object.name);
    context.object.userData.hasGravity = false;
  }
};

// ============================================================================
// Trigger Trait (non-physical collision zone)
// ============================================================================

export const TriggerTrait: TraitHandler = {
  name: 'trigger',
  onApply: (context: TraitContext) => {
    context.physicsWorld.addBodyWithConfig(context.object.name, context.object, {
      mass: 0,
      type: 'static',
      shape: context.config.shape || 'box',
      isTrigger: true,
    });
    
    context.object.userData.isTrigger = true;
    context.data.enterCallbacks = [];
    context.data.exitCallbacks = [];
    
    // Subscribe to trigger events
    const unsubscribe = context.physicsWorld.onCollision(context.object.name, (event) => {
      if (event.type === 'trigger-enter') {
        for (const cb of context.data.enterCallbacks) cb(event);
        (context.object as any).dispatchEvent({ type: 'triggerEnter', event });
      } else if (event.type === 'trigger-exit') {
        for (const cb of context.data.exitCallbacks) cb(event);
        (context.object as any).dispatchEvent({ type: 'triggerExit', event });
      }
    });
    
    context.data.unsubscribe = unsubscribe;
  },
  onRemove: (context: TraitContext) => {
    context.physicsWorld.removeBody(context.object.name);
    context.object.userData.isTrigger = false;
    if (context.data.unsubscribe) context.data.unsubscribe();
  }
};

// ============================================================================
// Pointable Trait
// ============================================================================

export const PointableTrait: TraitHandler = {
  name: 'pointable',
  onApply: (context: TraitContext) => {
    context.object.userData.pointable = true;
    context.object.userData.isPointed = false;
    context.data.highlightColor = context.config.highlightColor || 0x4488ff;
    context.data.originalEmissive = null;
  },
  onUpdate: (context: TraitContext, delta: number) => {
    const mesh = context.object as THREE.Mesh;
    if (mesh.material && 'emissive' in mesh.material) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      
      if (context.object.userData.isPointed) {
        if (context.data.originalEmissive === null) {
          context.data.originalEmissive = mat.emissive.getHex();
        }
        mat.emissive.setHex(context.data.highlightColor);
      } else if (context.data.originalEmissive !== null) {
        mat.emissive.setHex(context.data.originalEmissive);
        context.data.originalEmissive = null;
      }
    }
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.pointable = false;
  }
};

// ============================================================================
// Hoverable Trait
// ============================================================================

export const HoverableTrait: TraitHandler = {
  name: 'hoverable',
  onApply: (context: TraitContext) => {
    context.object.userData.hoverable = true;
    context.object.userData.isHovered = false;
    context.data.hoverScale = context.config.hoverScale || 1.1;
    context.data.originalScale = context.object.scale.clone();
  },
  onUpdate: (context: TraitContext, delta: number) => {
    const targetScale = context.object.userData.isHovered 
      ? context.data.hoverScale 
      : 1.0;
    const origScale = context.data.originalScale;
    
    // Smooth scale transition
    const currentScale = context.object.scale.x / origScale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 10);
    context.object.scale.set(
      origScale.x * newScale,
      origScale.y * newScale,
      origScale.z * newScale
    );
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.hoverable = false;
    const orig = context.data.originalScale;
    if (orig) context.object.scale.copy(orig);
  }
};

// ============================================================================
// Clickable Trait
// ============================================================================

export const ClickableTrait: TraitHandler = {
  name: 'clickable',
  onApply: (context: TraitContext) => {
    context.object.userData.clickable = true;
    context.data.onClick = context.config.onClick || null;
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.clickable = false;
  }
};

// ============================================================================
// Draggable Trait
// ============================================================================

export const DraggableTrait: TraitHandler = {
  name: 'draggable',
  onApply: (context: TraitContext) => {
    context.object.userData.draggable = true;
    context.data.dragPlane = context.config.plane || 'xz'; // xz, xy, or yz
    context.data.isDragging = false;
    context.data.dragOffset = new THREE.Vector3();
  },
  onUpdate: (context: TraitContext, delta: number) => {
    // Drag logic handled by InputManager
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.draggable = false;
  }
};

// ============================================================================
// Scalable Trait (two-handed scaling)
// ============================================================================

export const ScalableTrait: TraitHandler = {
  name: 'scalable',
  onApply: (context: TraitContext) => {
    context.object.userData.scalable = true;
    context.data.minScale = context.config.minScale || 0.1;
    context.data.maxScale = context.config.maxScale || 10;
    context.data.isScaling = false;
    context.data.initialDistance = 0;
    context.data.initialScale = 1;
  },
  onUpdate: (context: TraitContext, delta: number) => {
    // Two-handed scaling logic
    if (context.data.isScaling && context.data.hands) {
      const hands = context.data.hands;
      const currentDistance = hands.left.position.distanceTo(hands.right.position);
      const scaleFactor = currentDistance / context.data.initialDistance;
      const newScale = THREE.MathUtils.clamp(
        context.data.initialScale * scaleFactor,
        context.data.minScale,
        context.data.maxScale
      );
      context.object.scale.setScalar(newScale);
    }
  },
  onRemove: (context: TraitContext) => {
    context.object.userData.scalable = false;
  }
};
