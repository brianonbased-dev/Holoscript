import { TraitHandler, TraitContext } from './TraitSystem';
import * as THREE from 'three';

export const GrabbableTrait: TraitHandler = {
  name: 'grabbable',
  onApply: (context: TraitContext) => {
    // Mark as grabbable for input system
    context.object.userData.grabbable = true;
    
    // Set cursor style when hovered (if we had access to DOM, handled by InputManager)
    
    if (context.config.snapToHand) {
        context.object.userData.snapToHand = true;
    }
  },
  onUpdate: (context: TraitContext, delta: number) => {
    // If being held, update physics kinematic state?
    // This requires knowing IF it is held.
    // The InputManager should update the object state or call a method on the trait.
    
    const isHeld = context.object.userData.isHeld;
    if (isHeld) {
        // Disable physics gravity/simulation while held if it has a body
        const body = context.physicsWorld['bodies'].get(context.object.name); // Access private bodies map workaround
        if (body) {
            body.mass = 0; // Make static-ish
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            
            // Sync body to mesh (which is moved by hand)
            body.position.copy(context.object.position as any);
            body.quaternion.copy(context.object.quaternion as any);
        }
    }
  }
};

export const ThrowableTrait: TraitHandler = {
  name: 'throwable',
  onApply: (context: TraitContext) => {
    context.object.userData.throwable = true;
    context.data.velocityHistory = [];
  },
  onUpdate: (context: TraitContext, delta: number) => {
    if (context.object.userData.isHeld) {
        // Track velocity for throwing
        const history = context.data.velocityHistory;
        history.push({ 
            pos: context.object.position.clone(), 
            time: performance.now() 
        });
        if (history.length > 5) history.shift();
    }
  }
  // Logic for release needs to be triggered by InputManager
};
