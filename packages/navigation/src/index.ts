/**
 * @holoscript/navigation
 * Navigation and pathfinding system for HoloScript
 * 
 * Features:
 * - Flow fields for mass NPC movement (50-200+ agents at 90fps)
 * - Crowd simulation with local avoidance
 * - Hierarchical pathfinding (zone → cluster → cell)
 * - Path caching for performance
 */

// Flow Fields
export { FlowFieldGenerator, type FlowFieldConfig, type Vec2 } from './FlowFieldGenerator';

// Crowd Simulation
export {
  CrowdSimulator,
  createCrowdSimulator,
  type CrowdConfig,
  type Agent,
} from './CrowdSimulator';

// Hierarchical Pathfinding
export {
  HierarchicalPathfinder,
  createHierarchicalPathfinder,
  type HierarchyConfig,
  type Vec3,
} from './HierarchicalPathfinder';
