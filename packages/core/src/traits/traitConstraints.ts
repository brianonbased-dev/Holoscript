import { TraitConstraint } from '../types';

export const BUILTIN_CONSTRAINTS: TraitConstraint[] = [
  // Physics & Interaction
  { 
    type: 'requires', 
    source: 'physics', 
    targets: ['collidable'],
    message: 'Physics enabled objects must be collidable.'
  },
  { 
    type: 'requires', 
    source: 'grabbable', 
    targets: ['physics'],
    message: 'Grabbable objects require physics to handle movement and collisions.'
  },
  
  // Conflict Rules
  { 
    type: 'conflicts', 
    source: 'static', 
    targets: ['physics', 'grabbable', 'throwable'],
    message: 'Static objects cannot have physics or be interactive (grabbable/throwable).'
  },
  
  // Platform Exclusivity
  { 
    type: 'conflicts', 
    source: 'vr_only', 
    targets: ['ar_only'],
    message: 'An object cannot be marked as both VR-only and AR-only.'
  },

  // Material logical dependencies
  {
    type: 'requires',
    source: 'cloth',
    targets: ['mesh'],
    message: 'Cloth physics requires a mesh to deform.'
  },
  {
    type: 'requires',
    source: 'soft_body',
    targets: ['mesh'],
    message: 'Soft body physics requires a mesh.'
  }
];
