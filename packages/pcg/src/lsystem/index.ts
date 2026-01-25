/**
 * @holoscript/pcg - L-System (Lindenmayer System) Generator
 * Procedural vegetation, fractals, and branching structures
 */

import type { 
  LSystemConfig, 
  LSystemRule, 
  LSystemSegment, 
  LSystemResult, 
  LSystemContext,
  Vec3,
  BoundingBox 
} from '../types';
import { LSystemPreset } from '../types';
import { Mulberry32 } from '../noise';

// ============================================================================
// Preset L-System Configurations
// ============================================================================

export const LSYSTEM_PRESETS: Record<LSystemPreset, LSystemConfig> = {
  [LSystemPreset.Tree]: {
    axiom: 'X',
    rules: [
      { predecessor: 'X', successor: 'F+[[X]-X]-F[-FX]+X' },
      { predecessor: 'F', successor: 'FF' },
    ],
    iterations: 5,
    angle: 25,
    stepLength: 1,
    stepLengthScale: 0.7,
    angleVariation: 5,
    seed: 12345,
  },
  [LSystemPreset.Bush]: {
    axiom: 'F',
    rules: [
      { predecessor: 'F', successor: 'FF+[+F-F-F]-[-F+F+F]' },
    ],
    iterations: 4,
    angle: 22.5,
    stepLength: 0.5,
    stepLengthScale: 0.8,
    angleVariation: 3,
    seed: 12345,
  },
  [LSystemPreset.Fern]: {
    axiom: 'X',
    rules: [
      { predecessor: 'X', successor: 'F-[[X]+X]+F[+FX]-X' },
      { predecessor: 'F', successor: 'FF' },
    ],
    iterations: 5,
    angle: 22.5,
    stepLength: 1,
    stepLengthScale: 0.6,
    angleVariation: 2,
    seed: 12345,
  },
  [LSystemPreset.KochCurve]: {
    axiom: 'F',
    rules: [
      { predecessor: 'F', successor: 'F+F-F-F+F' },
    ],
    iterations: 4,
    angle: 90,
    stepLength: 1,
    stepLengthScale: 1,
    angleVariation: 0,
    seed: 12345,
  },
  [LSystemPreset.SierpinskiTriangle]: {
    axiom: 'F-G-G',
    rules: [
      { predecessor: 'F', successor: 'F-G+F+G-F' },
      { predecessor: 'G', successor: 'GG' },
    ],
    iterations: 6,
    angle: 120,
    stepLength: 1,
    stepLengthScale: 1,
    angleVariation: 0,
    seed: 12345,
  },
  [LSystemPreset.DragonCurve]: {
    axiom: 'FX',
    rules: [
      { predecessor: 'X', successor: 'X+YF+' },
      { predecessor: 'Y', successor: '-FX-Y' },
    ],
    iterations: 12,
    angle: 90,
    stepLength: 1,
    stepLengthScale: 1,
    angleVariation: 0,
    seed: 12345,
  },
  [LSystemPreset.HilbertCurve]: {
    axiom: 'A',
    rules: [
      { predecessor: 'A', successor: '-BF+AFA+FB-' },
      { predecessor: 'B', successor: '+AF-BFB-FA+' },
    ],
    iterations: 5,
    angle: 90,
    stepLength: 1,
    stepLengthScale: 1,
    angleVariation: 0,
    seed: 12345,
  },
};

// ============================================================================
// L-System Generator
// ============================================================================

export class LSystemGenerator {
  private config: LSystemConfig;
  private rng: Mulberry32;

  constructor(config: Partial<LSystemConfig> | LSystemPreset = {}) {
    if (typeof config === 'string') {
      this.config = { ...LSYSTEM_PRESETS[config] };
    } else {
      this.config = {
        axiom: 'F',
        rules: [],
        iterations: 3,
        angle: 25,
        stepLength: 1,
        stepLengthScale: 1,
        angleVariation: 0,
        seed: Date.now(),
        ...config,
      };
    }
    this.rng = new Mulberry32(this.config.seed);
  }

  /** Generate the production string */
  produce(): string {
    let current = this.config.axiom;

    for (let i = 0; i < this.config.iterations; i++) {
      let next = '';
      
      for (const char of current) {
        let matched = false;
        
        for (const rule of this.config.rules) {
          if (rule.predecessor === char) {
            // Check probability
            if (rule.probability !== undefined && this.rng.next() > rule.probability) {
              continue;
            }
            
            // Check condition
            if (rule.condition) {
              const context: LSystemContext = {
                iteration: i,
                position: { x: 0, y: 0, z: 0 },
                direction: { x: 0, y: 1, z: 0 },
                depth: 0,
              };
              if (!rule.condition(context)) {
                continue;
              }
            }
            
            next += rule.successor;
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          next += char;
        }
      }
      
      current = next;
    }

    return current;
  }

  /** Interpret the production string into 3D geometry */
  interpret(production?: string): LSystemResult {
    const str = production || this.produce();
    const segments: LSystemSegment[] = [];
    const leaves: Vec3[] = [];
    
    // Turtle state
    interface TurtleState {
      position: Vec3;
      heading: Vec3;
      up: Vec3;
      right: Vec3;
      stepLength: number;
      thickness: number;
      depth: number;
    }

    const normalizeVec3 = (v: Vec3): Vec3 => {
      const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 1, z: 0 };
    };

    const rotateAroundAxis = (v: Vec3, axis: Vec3, angle: number): Vec3 => {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const t = 1 - c;
      const { x, y, z } = v;
      const { x: ax, y: ay, z: az } = axis;
      
      return {
        x: (t * ax * ax + c) * x + (t * ax * ay - s * az) * y + (t * ax * az + s * ay) * z,
        y: (t * ax * ay + s * az) * x + (t * ay * ay + c) * y + (t * ay * az - s * ax) * z,
        z: (t * ax * az - s * ay) * x + (t * ay * az + s * ax) * y + (t * az * az + c) * z,
      };
    };

    const crossProduct = (a: Vec3, b: Vec3): Vec3 => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    });

    const initialState: TurtleState = {
      position: { x: 0, y: 0, z: 0 },
      heading: { x: 0, y: 1, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      right: { x: 1, y: 0, z: 0 },
      stepLength: this.config.stepLength,
      thickness: 1,
      depth: 0,
    };

    let state = { ...initialState };
    const stack: TurtleState[] = [];

    const angleToRad = (deg: number): number => (deg * Math.PI) / 180;
    const baseAngle = angleToRad(this.config.angle);

    const bounds: BoundingBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };

    const updateBounds = (p: Vec3): void => {
      bounds.min.x = Math.min(bounds.min.x, p.x);
      bounds.min.y = Math.min(bounds.min.y, p.y);
      bounds.min.z = Math.min(bounds.min.z, p.z);
      bounds.max.x = Math.max(bounds.max.x, p.x);
      bounds.max.y = Math.max(bounds.max.y, p.y);
      bounds.max.z = Math.max(bounds.max.z, p.z);
    };

    for (const char of str) {
      const angle = baseAngle + angleToRad(this.rng.nextFloat(-this.config.angleVariation, this.config.angleVariation));

      switch (char) {
        case 'F': // Move forward, drawing line
        case 'G': {
          const start = { ...state.position };
          state.position = {
            x: state.position.x + state.heading.x * state.stepLength,
            y: state.position.y + state.heading.y * state.stepLength,
            z: state.position.z + state.heading.z * state.stepLength,
          };
          
          segments.push({
            start,
            end: { ...state.position },
            depth: state.depth,
            thickness: state.thickness,
          });
          
          updateBounds(state.position);
          break;
        }

        case 'f': // Move forward without drawing
          state.position = {
            x: state.position.x + state.heading.x * state.stepLength,
            y: state.position.y + state.heading.y * state.stepLength,
            z: state.position.z + state.heading.z * state.stepLength,
          };
          updateBounds(state.position);
          break;

        case '+': // Turn left (yaw)
          state.heading = normalizeVec3(rotateAroundAxis(state.heading, state.up, angle));
          state.right = normalizeVec3(crossProduct(state.heading, state.up));
          break;

        case '-': // Turn right (yaw)
          state.heading = normalizeVec3(rotateAroundAxis(state.heading, state.up, -angle));
          state.right = normalizeVec3(crossProduct(state.heading, state.up));
          break;

        case '^': // Pitch up
          state.heading = normalizeVec3(rotateAroundAxis(state.heading, state.right, angle));
          state.up = normalizeVec3(crossProduct(state.right, state.heading));
          break;

        case '&': // Pitch down
          state.heading = normalizeVec3(rotateAroundAxis(state.heading, state.right, -angle));
          state.up = normalizeVec3(crossProduct(state.right, state.heading));
          break;

        case '\\': // Roll left
          state.up = normalizeVec3(rotateAroundAxis(state.up, state.heading, angle));
          state.right = normalizeVec3(crossProduct(state.heading, state.up));
          break;

        case '/': // Roll right
          state.up = normalizeVec3(rotateAroundAxis(state.up, state.heading, -angle));
          state.right = normalizeVec3(crossProduct(state.heading, state.up));
          break;

        case '|': // Turn 180 degrees
          state.heading = { x: -state.heading.x, y: -state.heading.y, z: -state.heading.z };
          state.right = { x: -state.right.x, y: -state.right.y, z: -state.right.z };
          break;

        case '[': // Push state
          stack.push({
            ...state,
            position: { ...state.position },
            heading: { ...state.heading },
            up: { ...state.up },
            right: { ...state.right },
          });
          state.depth++;
          state.stepLength *= this.config.stepLengthScale;
          state.thickness *= 0.8;
          break;

        case ']': // Pop state
          if (stack.length > 0) {
            // Current position might be a leaf
            if (state.depth > 2) {
              leaves.push({ ...state.position });
            }
            state = stack.pop()!;
          }
          break;

        case 'L': // Mark leaf
          leaves.push({ ...state.position });
          break;

        case '!': // Decrement diameter
          state.thickness *= 0.9;
          break;

        case "'": // Increment step length
          state.stepLength *= 1.1;
          break;

        case '"': // Decrement step length
          state.stepLength *= 0.9;
          break;

        // Skip non-drawing characters
        case 'X':
        case 'Y':
        case 'A':
        case 'B':
          break;
      }
    }

    return { segments, leaves, bounds };
  }

  /** Generate a complete tree structure */
  generateTree(preset: LSystemPreset = LSystemPreset.Tree): LSystemResult {
    const treeConfig = LSYSTEM_PRESETS[preset];
    const generator = new LSystemGenerator({ ...treeConfig, seed: this.config.seed });
    return generator.interpret();
  }
}

// Export factory function
export function createLSystem(config?: Partial<LSystemConfig> | LSystemPreset): LSystemGenerator {
  return new LSystemGenerator(config);
}

// Re-export types
export type { LSystemConfig, LSystemRule, LSystemSegment, LSystemResult, LSystemContext };
export { LSystemPreset };
