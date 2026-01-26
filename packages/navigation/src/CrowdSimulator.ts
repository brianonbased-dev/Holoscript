/**
 * @holoscript/navigation - CrowdSimulator
 * Mass NPC movement using flow fields with local avoidance
 * 
 * Handles 50-200+ agents at 90fps by:
 * - Sharing flow fields between agents with same destination
 * - Local steering avoidance (no per-agent pathfinding)
 * - Spatial partitioning for neighbor queries
 */

import { FlowFieldGenerator, Vec2 } from './FlowFieldGenerator';

// ============================================================================
// Types
// ============================================================================

export interface CrowdConfig {
  /** Maximum agents in simulation */
  maxAgents: number;
  /** Agent radius for collision */
  agentRadius: number;
  /** Maximum agent speed */
  maxSpeed: number;
  /** How strongly agents avoid each other */
  separationWeight: number;
  /** How strongly agents follow flow field */
  flowWeight: number;
  /** Neighbor detection radius */
  neighborRadius: number;
  /** Spatial partition cell size */
  partitionCellSize: number;
  /** Maximum neighbors to consider */
  maxNeighbors: number;
}

const DEFAULT_CROWD_CONFIG: CrowdConfig = {
  maxAgents: 200,
  agentRadius: 0.5,
  maxSpeed: 3.0,
  separationWeight: 1.5,
  flowWeight: 2.0,
  neighborRadius: 3.0,
  partitionCellSize: 3.0,
  maxNeighbors: 8,
};

export interface Agent {
  id: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  speed: number;
  destinationId: string | null;
  group: string;
}

interface SpatialCell {
  agents: Agent[];
}

// ============================================================================
// Crowd Simulator
// ============================================================================

export class CrowdSimulator {
  private config: CrowdConfig;
  private agents: Map<string, Agent> = new Map();
  private flowFields: Map<string, FlowFieldGenerator> = new Map();
  private spatialGrid: Map<string, SpatialCell> = new Map();
  
  constructor(config: Partial<CrowdConfig> = {}) {
    this.config = { ...DEFAULT_CROWD_CONFIG, ...config };
  }
  
  // --------------------------------------------------------------------------
  // Agent Management
  // --------------------------------------------------------------------------
  
  /**
   * Add an agent to the simulation
   */
  addAgent(agent: Omit<Agent, 'vx' | 'vz'> & Partial<Pick<Agent, 'vx' | 'vz'>>): Agent {
    if (this.agents.size >= this.config.maxAgents) {
      console.warn(`CrowdSimulator: Max agents (${this.config.maxAgents}) reached`);
      return agent as Agent;
    }
    
    const fullAgent: Agent = {
      ...agent,
      vx: agent.vx ?? 0,
      vz: agent.vz ?? 0,
      radius: agent.radius ?? this.config.agentRadius,
      speed: agent.speed ?? this.config.maxSpeed,
    };
    
    this.agents.set(agent.id, fullAgent);
    this.addToSpatialGrid(fullAgent);
    
    return fullAgent;
  }
  
  /**
   * Remove an agent from the simulation
   */
  removeAgent(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      this.removeFromSpatialGrid(agent);
      this.agents.delete(id);
    }
  }
  
  /**
   * Get an agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }
  
  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
  
  // --------------------------------------------------------------------------
  // Destinations
  // --------------------------------------------------------------------------
  
  /**
   * Set a destination for an agent (shares flow field with others going there)
   */
  setDestination(agentId: string, x: number, z: number, destinationId?: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    // Use position as ID if not provided
    const destId = destinationId ?? `${Math.round(x)},${Math.round(z)}`;
    agent.destinationId = destId;
    
    // Get or create flow field for this destination
    let flowField = this.flowFields.get(destId);
    if (!flowField) {
      flowField = new FlowFieldGenerator({
        cellSize: 1.0,
        width: 128,
        height: 128,
      });
      flowField.setGoal(x, z);
      flowField.update();
      this.flowFields.set(destId, flowField);
    }
  }
  
  /**
   * Clear an agent's destination
   */
  clearDestination(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.destinationId = null;
    }
  }
  
  /**
   * Set destination for all agents in a group
   */
  setGroupDestination(group: string, x: number, z: number): void {
    for (const agent of this.agents.values()) {
      if (agent.group === group) {
        this.setDestination(agent.id, x, z, `group:${group}`);
      }
    }
  }
  
  // --------------------------------------------------------------------------
  // Simulation
  // --------------------------------------------------------------------------
  
  /**
   * Update all agents (call every frame)
   */
  update(dt: number): void {
    // Rebuild spatial grid
    this.rebuildSpatialGrid();
    
    // Calculate desired velocities
    const desiredVelocities = new Map<string, Vec2>();
    
    for (const agent of this.agents.values()) {
      const desired = this.calculateDesiredVelocity(agent);
      desiredVelocities.set(agent.id, desired);
    }
    
    // Apply velocities and update positions
    for (const agent of this.agents.values()) {
      const desired = desiredVelocities.get(agent.id)!;
      
      // Smooth velocity change
      const smoothing = 0.3;
      agent.vx = agent.vx * (1 - smoothing) + desired.x * smoothing;
      agent.vz = agent.vz * (1 - smoothing) + desired.y * smoothing;
      
      // Clamp speed
      const speed = Math.sqrt(agent.vx * agent.vx + agent.vz * agent.vz);
      if (speed > agent.speed) {
        const scale = agent.speed / speed;
        agent.vx *= scale;
        agent.vz *= scale;
      }
      
      // Update position
      agent.x += agent.vx * dt;
      agent.z += agent.vz * dt;
    }
  }
  
  private calculateDesiredVelocity(agent: Agent): Vec2 {
    let desiredX = 0;
    let desiredZ = 0;
    
    // 1. Flow field direction
    if (agent.destinationId) {
      const flowField = this.flowFields.get(agent.destinationId);
      if (flowField) {
        const direction = flowField.getVector(agent.x, agent.z);
        desiredX += direction.x * this.config.flowWeight;
        desiredZ += direction.y * this.config.flowWeight;
      }
    }
    
    // 2. Separation from neighbors
    const neighbors = this.getNeighbors(agent);
    
    for (const neighbor of neighbors) {
      const dx = agent.x - neighbor.x;
      const dz = agent.z - neighbor.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < 0.001) continue;
      
      const minDist = agent.radius + neighbor.radius;
      
      if (dist < minDist * 2) {
        // Separation force (stronger when closer)
        const force = (minDist * 2 - dist) / (minDist * 2);
        desiredX += (dx / dist) * force * this.config.separationWeight;
        desiredZ += (dz / dist) * force * this.config.separationWeight;
      }
    }
    
    // Normalize and scale to speed
    const magnitude = Math.sqrt(desiredX * desiredX + desiredZ * desiredZ);
    if (magnitude > 0.001) {
      desiredX = (desiredX / magnitude) * agent.speed;
      desiredZ = (desiredZ / magnitude) * agent.speed;
    }
    
    return { x: desiredX, y: desiredZ };
  }
  
  // --------------------------------------------------------------------------
  // Spatial Partitioning
  // --------------------------------------------------------------------------
  
  private getSpatialKey(x: number, z: number): string {
    const cellX = Math.floor(x / this.config.partitionCellSize);
    const cellZ = Math.floor(z / this.config.partitionCellSize);
    return `${cellX},${cellZ}`;
  }
  
  private addToSpatialGrid(agent: Agent): void {
    const key = this.getSpatialKey(agent.x, agent.z);
    let cell = this.spatialGrid.get(key);
    if (!cell) {
      cell = { agents: [] };
      this.spatialGrid.set(key, cell);
    }
    cell.agents.push(agent);
  }
  
  private removeFromSpatialGrid(agent: Agent): void {
    const key = this.getSpatialKey(agent.x, agent.z);
    const cell = this.spatialGrid.get(key);
    if (cell) {
      cell.agents = cell.agents.filter(a => a.id !== agent.id);
    }
  }
  
  private rebuildSpatialGrid(): void {
    this.spatialGrid.clear();
    for (const agent of this.agents.values()) {
      this.addToSpatialGrid(agent);
    }
  }
  
  private getNeighbors(agent: Agent): Agent[] {
    const neighbors: Agent[] = [];
    const cellX = Math.floor(agent.x / this.config.partitionCellSize);
    const cellZ = Math.floor(agent.z / this.config.partitionCellSize);
    
    // Check 3x3 grid of cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${cellX + dx},${cellZ + dz}`;
        const cell = this.spatialGrid.get(key);
        
        if (cell) {
          for (const other of cell.agents) {
            if (other.id === agent.id) continue;
            
            const distSq = 
              (agent.x - other.x) ** 2 + 
              (agent.z - other.z) ** 2;
            
            if (distSq < this.config.neighborRadius ** 2) {
              neighbors.push(other);
              
              if (neighbors.length >= this.config.maxNeighbors) {
                return neighbors;
              }
            }
          }
        }
      }
    }
    
    return neighbors;
  }
  
  // --------------------------------------------------------------------------
  // Obstacles
  // --------------------------------------------------------------------------
  
  /**
   * Add obstacle to all flow fields
   */
  addObstacle(x: number, z: number): void {
    for (const flowField of this.flowFields.values()) {
      flowField.addObstacle(x, z);
    }
  }
  
  /**
   * Remove obstacle from all flow fields
   */
  removeObstacle(x: number, z: number): void {
    for (const flowField of this.flowFields.values()) {
      flowField.removeObstacle(x, z);
    }
  }
  
  /**
   * Regenerate all flow fields (call after obstacle changes)
   */
  regenerateFlowFields(): void {
    for (const flowField of this.flowFields.values()) {
      flowField.update();
    }
  }
  
  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  
  /**
   * Get simulation stats
   */
  getStats(): {
    agentCount: number;
    flowFieldCount: number;
    spatialCellCount: number;
  } {
    return {
      agentCount: this.agents.size,
      flowFieldCount: this.flowFields.size,
      spatialCellCount: this.spatialGrid.size,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createCrowdSimulator(
  config?: Partial<CrowdConfig>
): CrowdSimulator {
  return new CrowdSimulator(config);
}
