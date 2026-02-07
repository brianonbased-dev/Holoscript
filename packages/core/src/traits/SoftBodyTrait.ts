/**
 * SoftBody Trait
 *
 * Deformable body physics for squishy objects.
 * Supports pressure simulation, volume conservation, and mesh deformation.
 *
 * @version 2.0.0
 */

import type { TraitHandler } from './TraitTypes';

// =============================================================================
// TYPES
// =============================================================================

interface SoftBodyVertex {
  position: { x: number; y: number; z: number };
  restPosition: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
}

interface SoftBodyState {
  isSimulating: boolean;
  isDeformed: boolean;
  deformationAmount: number;
  vertices: SoftBodyVertex[];
  currentVolume: number;
  restVolume: number;
  centerOfMass: { x: number; y: number; z: number };
  simulationHandle: unknown;
}

interface SoftBodyConfig {
  stiffness: number;  // 0-1
  damping: number;
  mass: number;
  pressure: number;  // Internal pressure
  volume_conservation: number;  // 0-1
  collision_margin: number;
  solver_iterations: number;
  tetrahedral: boolean;  // Use tetrahedral mesh
  surface_stiffness: number;
  bending_stiffness: number;
}

// =============================================================================
// HANDLER
// =============================================================================

export const softBodyHandler: TraitHandler<SoftBodyConfig> = {
  name: 'soft_body' as any,

  defaultConfig: {
    stiffness: 0.5,
    damping: 0.05,
    mass: 1.0,
    pressure: 1.0,
    volume_conservation: 0.9,
    collision_margin: 0.01,
    solver_iterations: 10,
    tetrahedral: false,
    surface_stiffness: 0.5,
    bending_stiffness: 0.3,
  },

  onAttach(node, config, context) {
    const state: SoftBodyState = {
      isSimulating: false,
      isDeformed: false,
      deformationAmount: 0,
      vertices: [],
      currentVolume: 1,
      restVolume: 1,
      centerOfMass: { x: 0, y: 0, z: 0 },
      simulationHandle: null,
    };
    (node as any).__softBodyState = state;
    
    // Create soft body physics
    context.emit?.('soft_body_create', {
      node,
      stiffness: config.stiffness,
      damping: config.damping,
      mass: config.mass,
      pressure: config.pressure,
      volumeConservation: config.volume_conservation,
      collisionMargin: config.collision_margin,
      solverIterations: config.solver_iterations,
      tetrahedral: config.tetrahedral,
      surfaceStiffness: config.surface_stiffness,
      bendingStiffness: config.bending_stiffness,
    });
    
    state.isSimulating = true;
  },

  onDetach(node, config, context) {
    const state = (node as any).__softBodyState as SoftBodyState;
    if (state?.isSimulating) {
      context.emit?.('soft_body_destroy', { node });
    }
    delete (node as any).__softBodyState;
  },

  onUpdate(node, config, context, delta) {
    const state = (node as any).__softBodyState as SoftBodyState;
    if (!state || !state.isSimulating) return;
    
    // Step simulation
    context.emit?.('soft_body_step', {
      node,
      deltaTime: delta,
    });
    
    // Volume conservation pressure
    if (config.volume_conservation > 0 && state.restVolume > 0) {
      const volumeRatio = state.currentVolume / state.restVolume;
      const pressureCorrection = (1 - volumeRatio) * config.volume_conservation * config.pressure;
      
      if (Math.abs(pressureCorrection) > 0.01) {
        context.emit?.('soft_body_apply_pressure', {
          node,
          pressure: pressureCorrection,
        });
      }
    }
  },

  onEvent(node, config, context, event) {
    const state = (node as any).__softBodyState as SoftBodyState;
    if (!state) return;
    
    if (event.type === 'soft_body_vertex_update') {
      const positions = event.positions as Array<{ x: number; y: number; z: number }>;
      const normals = event.normals as Array<{ x: number; y: number; z: number }> || [];
      
      // Update vertices
      for (let i = 0; i < positions.length; i++) {
        if (!state.vertices[i]) {
          state.vertices[i] = {
            position: positions[i],
            restPosition: { ...positions[i] },
            velocity: { x: 0, y: 0, z: 0 },
            normal: normals[i] || { x: 0, y: 1, z: 0 },
          };
        } else {
          state.vertices[i].position = positions[i];
          if (normals[i]) {
            state.vertices[i].normal = normals[i];
          }
        }
      }
      
      // Calculate deformation
      let totalDeform = 0;
      for (const vert of state.vertices) {
        const dx = vert.position.x - vert.restPosition.x;
        const dy = vert.position.y - vert.restPosition.y;
        const dz = vert.position.z - vert.restPosition.z;
        totalDeform += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      state.deformationAmount = state.vertices.length > 0 ? totalDeform / state.vertices.length : 0;
      state.isDeformed = state.deformationAmount > 0.01;
      
      state.currentVolume = event.volume as number || state.currentVolume;
      state.centerOfMass = event.centerOfMass as typeof state.centerOfMass || state.centerOfMass;
      
      // Update mesh
      context.emit?.('soft_body_mesh_update', {
        node,
        vertices: state.vertices.map(v => v.position),
        normals: state.vertices.map(v => v.normal),
      });
      
      if (state.isDeformed) {
        context.emit?.('on_soft_body_deform', {
          node,
          deformationAmount: state.deformationAmount,
        });
      }
    } else if (event.type === 'soft_body_apply_force') {
      const force = event.force as { x: number; y: number; z: number };
      const position = event.position as { x: number; y: number; z: number } | undefined;
      const radius = event.radius as number || 0.1;
      
      context.emit?.('soft_body_external_force', {
        node,
        force,
        position,
        radius,
      });
    } else if (event.type === 'soft_body_poke') {
      const position = event.position as { x: number; y: number; z: number };
      const force = event.force as number || 10;
      const direction = event.direction as { x: number; y: number; z: number } || { x: 0, y: -1, z: 0 };
      
      context.emit?.('soft_body_impulse', {
        node,
        position,
        force: {
          x: direction.x * force,
          y: direction.y * force,
          z: direction.z * force,
        },
      });
    } else if (event.type === 'soft_body_set_anchor') {
      const vertexIndex = event.vertexIndex as number;
      const targetPosition = event.targetPosition as { x: number; y: number; z: number } | undefined;
      
      context.emit?.('soft_body_anchor_vertex', {
        node,
        vertexIndex,
        targetPosition,
      });
    } else if (event.type === 'soft_body_release_anchor') {
      const vertexIndex = event.vertexIndex as number;
      
      context.emit?.('soft_body_unanchor_vertex', {
        node,
        vertexIndex,
      });
    } else if (event.type === 'soft_body_reset') {
      // Reset to rest shape
      for (const vert of state.vertices) {
        vert.position = { ...vert.restPosition };
        vert.velocity = { x: 0, y: 0, z: 0 };
      }
      state.isDeformed = false;
      state.deformationAmount = 0;
      state.currentVolume = state.restVolume;
      
      context.emit?.('soft_body_reset_shape', { node });
    } else if (event.type === 'soft_body_pause') {
      state.isSimulating = false;
    } else if (event.type === 'soft_body_resume') {
      state.isSimulating = true;
    } else if (event.type === 'soft_body_query') {
      context.emit?.('soft_body_info', {
        queryId: event.queryId,
        node,
        isSimulating: state.isSimulating,
        isDeformed: state.isDeformed,
        deformationAmount: state.deformationAmount,
        vertexCount: state.vertices.length,
        currentVolume: state.currentVolume,
        volumeRatio: state.restVolume > 0 ? state.currentVolume / state.restVolume : 1,
        centerOfMass: state.centerOfMass,
      });
    }
  },
};

export default softBodyHandler;
