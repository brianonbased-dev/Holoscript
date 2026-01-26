/**
 * @holoscript/multiplayer - StateSyncNetworkManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateSyncNetworkManager } from '../src/room/StateSyncNetworkManager';

describe('StateSyncNetworkManager', () => {
  let manager: StateSyncNetworkManager;

  beforeEach(() => {
    manager = new StateSyncNetworkManager('test-node-1');
  });

  describe('initialization', () => {
    it('should create with node ID', () => {
      expect(manager.getNodeId()).toBe('test-node-1');
    });

    it('should start with no pending operations', () => {
      expect(manager.getPendingCount()).toBe(0);
    });
  });

  describe('queueOperation', () => {
    it('should queue operations', () => {
      manager.queueOperation({
        type: 'set',
        path: ['count'],
        value: 42,
      });
      expect(manager.getPendingCount()).toBe(1);
    });

    it('should flush operations when callback is set', () => {
      const callback = vi.fn();
      manager.setSendCallback(callback);
      
      // Disable batching for immediate flush
      manager = new StateSyncNetworkManager('test-node-2', { enableBatching: false });
      manager.setSendCallback(callback);
      
      manager.queueOperation({
        type: 'set',
        path: ['test'],
        value: 'hello',
      });
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('receiveMessage', () => {
    it('should deduplicate received operations', () => {
      const syncMessage = {
        type: 'sync' as const,
        operations: [
          { id: 'op1', type: 'set' as const, path: ['test'], value: 1, timestamp: 123, nodeId: 'other' },
          { id: 'op1', type: 'set' as const, path: ['test'], value: 1, timestamp: 123, nodeId: 'other' },
        ],
        clock: {},
        nodeId: 'other',
        timestamp: 123,
      };

      const ops1 = manager.receiveMessage(syncMessage);
      expect(ops1).toHaveLength(1);

      const ops2 = manager.receiveMessage(syncMessage);
      expect(ops2).toHaveLength(0);
    });
  });

  describe('handleNetworkMessage', () => {
    it('should ignore non-state_sync messages', () => {
      const ops = manager.handleNetworkMessage({
        type: 'other',
        payload: {},
        timestamp: Date.now(),
        reliable: true,
        channel: 0,
      });
      expect(ops).toHaveLength(0);
    });

    it('should process state_sync messages', () => {
      const ops = manager.handleNetworkMessage({
        type: 'state_sync',
        payload: {
          type: 'sync',
          operations: [
            { id: 'op2', type: 'set', path: ['x'], value: 10, timestamp: 123, nodeId: 'other' },
          ],
          clock: {},
          nodeId: 'other',
          timestamp: 123,
        },
        timestamp: Date.now(),
        reliable: true,
        channel: 3,
      });
      expect(ops).toHaveLength(1);
    });
  });

  describe('event handling', () => {
    it('should emit events for received operations', () => {
      const handler = vi.fn();
      manager.on(handler);

      manager.receiveMessage({
        type: 'sync',
        operations: [
          { id: 'op3', type: 'set', path: ['test'], value: 'x', timestamp: 123, nodeId: 'other' },
        ],
        clock: {},
        nodeId: 'other',
        timestamp: 123,
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const handler = vi.fn();
      const unsub = manager.on(handler);
      unsub();

      manager.receiveMessage({
        type: 'sync',
        operations: [
          { id: 'op4', type: 'set', path: ['test'], value: 'y', timestamp: 123, nodeId: 'other' },
        ],
        clock: {},
        nodeId: 'other',
        timestamp: 123,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
