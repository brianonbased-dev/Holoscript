import { StateMachineNode, StateNode, TransitionNode } from '../types';
import { logger } from '../logger';

export interface StateMachineInstance {
  definition: StateMachineNode;
  currentState: string;
  context: Record<string, any>;
}

/**
 * StateMachineInterpreter - Handles runtime execution of spatial state machines
 */
export class StateMachineInterpreter {
  private instances: Map<string, StateMachineInstance> = new Map();

  /**
   * Initialize a new state machine instance
   */
  public createInstance(id: string, definition: StateMachineNode, context: Record<string, any>): StateMachineInstance {
    const instance: StateMachineInstance = {
      definition,
      currentState: definition.initialState,
      context
    };
    
    this.instances.set(id, instance);
    logger.debug(`[StateMachine] Initialized ${definition.name} for ${id} in state: ${definition.initialState}`);
    
    // Trigger initial state entry if it exists
    const state = definition.states.find(s => s.name === definition.initialState);
    if (state && state.onEntry) {
      this.executeHook(id, state.onEntry, instance.context);
    }
    
    return instance;
  }

  /**
   * Process an event and trigger transitions
   */
  public sendEvent(id: string, event: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) return false;

    const transition = instance.definition.transitions.find(
      t => t.from === instance.currentState && t.event === event
    );

    if (transition) {
      this.transitionTo(id, transition.to);
      return true;
    }

    return false;
  }

  /**
   * Force transition to a specific state
   */
  public transitionTo(id: string, targetStateName: string): void {
    const instance = this.instances.get(id);
    if (!instance) return;

    if (instance.currentState === targetStateName) return;

    const currentStateDef = instance.definition.states.find(s => s.name === instance.currentState);
    const targetStateDef = instance.definition.states.find(s => s.name === targetStateName);

    if (!targetStateDef) {
       logger.error(`[StateMachine] Target state ${targetStateName} not found in ${instance.definition.name}`);
       return;
    }

    logger.debug(`[StateMachine] ${id} transitioning: ${instance.currentState} -> ${targetStateName}`);

    // 1. Execute Exit Hook
    if (currentStateDef && currentStateDef.onExit) {
      this.executeHook(id, currentStateDef.onExit, instance.context);
    }

    // 2. Change State
    instance.currentState = targetStateName;

    // 3. Execute Entry Hook
    if (targetStateDef.onEntry) {
      this.executeHook(id, targetStateDef.onEntry, instance.context);
    }
  }

  /**
   * Execute code block (to be integrated with actual runtime evaluator)
   */
  private executeHook(id: string, code: string, context: Record<string, any>): void {
    logger.debug(`[StateMachine] Executing hook for ${id}: ${code.substring(0, 50)}...`);
    // NOTE: This will be connected to the true evaluateCode() in HoloScriptRuntime
  }

  public getInstance(id: string): StateMachineInstance | undefined {
    return this.instances.get(id);
  }

  public removeInstance(id: string): void {
    this.instances.delete(id);
  }
}

export const stateMachineInterpreter = new StateMachineInterpreter();
