import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachineInterpreter } from '../StateMachineInterpreter';
import { StateMachineNode } from '../../types';

describe('StateMachineInterpreter', () => {
  let interpreter: StateMachineInterpreter;

  const doorSM: StateMachineNode = {
    type: 'state-machine',
    name: 'Door',
    initialState: 'closed',
    states: [
      { type: 'state', name: 'closed', onExit: 'log("Opening door")' },
      { type: 'state', name: 'open', onEntry: 'log("Door is open")' }
    ],
    transitions: [
      { type: 'transition', from: 'closed', to: 'open', event: 'click' },
      { type: 'transition', from: 'open', to: 'closed', event: 'click' }
    ]
  };

  beforeEach(() => {
    interpreter = new StateMachineInterpreter();
  });

  it('should initialize to initial state', () => {
    const instance = interpreter.createInstance('door1', doorSM, {});
    expect(instance.currentState).toBe('closed');
  });

  it('should transition on valid event', () => {
    interpreter.createInstance('door1', doorSM, {});
    const transitioned = interpreter.sendEvent('door1', 'click');
    
    expect(transitioned).toBe(true);
    const instance = interpreter.getInstance('door1');
    expect(instance?.currentState).toBe('open');
  });

  it('should not transition on invalid event', () => {
    interpreter.createInstance('door1', doorSM, {});
    const transitioned = interpreter.sendEvent('door1', 'hover');
    
    expect(transitioned).toBe(false);
    const instance = interpreter.getInstance('door1');
    expect(instance?.currentState).toBe('closed');
  });

  it('should handle cyclic transitions', () => {
    interpreter.createInstance('door1', doorSM, {});
    interpreter.sendEvent('door1', 'click'); // open
    interpreter.sendEvent('door1', 'click'); // closed
    
    expect(interpreter.getInstance('door1')?.currentState).toBe('closed');
  });
});
