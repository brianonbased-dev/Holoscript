import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createState } from '../state/ReactiveState';
import { eventBus } from '../runtime/EventBus';

describe('CRDT State Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
  });

  it('should synchronize state between two clients', () => {
    const stateA = createState({ count: 0 }, 'shared_session');
    const stateB = createState({ count: 0 }, 'shared_session');

    stateA.set('count', 10);

    // stateB should have updated via eventBus
    expect(stateB.get('count')).toBe(10);
  });

  it('should resolve conflicts using LWW (Last-Write-Wins)', async () => {
    const stateA = createState({ count: 0 }, 'shared_session');
    const stateB = createState({ count: 0 }, 'shared_session');

    // Simulate concurrent updates
    // We need to control timestamps or assume sequential execution is fast enough to have same ms
    // but the implementation uses Date.now().
    // To reliably test LWW, we can simulate an incoming op with a future timestamp.

    stateA.set('count', 5);
    expect(stateB.get('count')).toBe(5);

    // Incoming "remote" op with OLDER timestamp should be ignored
    eventBus.emit('state_sync:shared_session', {
      source: 'remote',
      op: {
        clientId: 'other_client',
        timestamp: Date.now() - 10000,
        key: 'count',
        value: 1,
        seq: 1,
      },
    });

    expect(stateA.get('count')).toBe(5);

    // Incoming "remote" op with NEWER timestamp should win
    eventBus.emit('state_sync:shared_session', {
      source: 'remote',
      op: {
        clientId: 'other_client',
        timestamp: Date.now() + 10000,
        key: 'count',
        value: 100,
        seq: 1,
      },
    });

    expect(stateA.get('count')).toBe(100);
  });

  it('should handle lexicographical clientId tie-breaking for same timestamp', () => {
    const now = Date.now();

    // We manually emit ops to test the CRDT logic directly via the state sync listeners
    const state = createState({ val: 0 }, 'session');

    // Client "Z" (higher) vs Client "A" (lower)
    eventBus.emit('state_sync:session', {
      op: { clientId: 'Client_A', timestamp: now, key: 'val', value: 10, seq: 1 },
    });
    expect(state.get('val')).toBe(10);

    eventBus.emit('state_sync:session', {
      op: { clientId: 'Client_Z', timestamp: now, key: 'val', value: 20, seq: 1 },
    });
    expect(state.get('val')).toBe(20);

    // Lower clientId should NOT override even if it arrives later
    eventBus.emit('state_sync:session', {
      op: { clientId: 'Client_B', timestamp: now, key: 'val', value: 15, seq: 1 },
    });
    expect(state.get('val')).toBe(20);
  });
});
