/**
 * Network Sync Tests
 *
 * Tests for network client, state synchronization, and messaging.
 *
 * @module network
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // Types
  INetworkMessage,
  INetworkEvent,
  IPeerInfo,
  ISyncStateEntry,
  IStateSnapshot,
  ConnectionState,

  // Defaults
  NETWORK_DEFAULTS,
  CONNECTION_DEFAULTS,
  SYNC_DEFAULTS,

  // Helper functions
  generateMessageId,
  generatePeerId,
  generateEntityId,
  createMessage,
  createPeerInfo,
  createSpawnRequest,
  createReplicatedEntity,
  createEntityDelta,
  createRPCInvocation,
  createInputCommand,
  lerpVector3,
  slerpQuaternion,
  distanceVector3,
  isMessageForPeer,
  serializeState,
  deserializeState,
  validateConnectionConfig,

  // Implementations
  NetworkClientImpl,
  createNetworkClient,
  StateSynchronizerImpl,
  createStateSynchronizer,
} from '../network';

// ============================================================================
// Default Configuration Tests
// ============================================================================

describe('Network Defaults', () => {
  describe('NETWORK_DEFAULTS', () => {
    it('should have sensible default values', () => {
      expect(NETWORK_DEFAULTS.tickRate).toBe(60);
      expect(NETWORK_DEFAULTS.sendRate).toBe(20);
      expect(NETWORK_DEFAULTS.maxMessageSize).toBe(65536);
      expect(NETWORK_DEFAULTS.compression).toBe(false);
      expect(NETWORK_DEFAULTS.encryption).toBe(false);
    });
  });

  describe('CONNECTION_DEFAULTS', () => {
    it('should have sensible connection defaults', () => {
      expect(CONNECTION_DEFAULTS.topology).toBe('client-server');
      expect(CONNECTION_DEFAULTS.maxPeers).toBe(16);
      expect(CONNECTION_DEFAULTS.timeout).toBe(10000);
      expect(CONNECTION_DEFAULTS.reconnectAttempts).toBe(5);
      expect(CONNECTION_DEFAULTS.heartbeatInterval).toBe(5000);
    });
  });

  describe('SYNC_DEFAULTS', () => {
    it('should have sensible sync defaults', () => {
      expect(SYNC_DEFAULTS.mode).toBe('authoritative');
      expect(SYNC_DEFAULTS.frequency).toBe('tick');
      expect(SYNC_DEFAULTS.interpolate).toBe(true);
      expect(SYNC_DEFAULTS.maxHistorySize).toBe(128);
    });
  });
});

// ============================================================================
// ID Generation Tests
// ============================================================================

describe('ID Generation', () => {
  describe('generateMessageId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      expect(id1).not.toBe(id2);
    });

    it('should start with msg_ prefix', () => {
      const id = generateMessageId();
      expect(id.startsWith('msg_')).toBe(true);
    });
  });

  describe('generatePeerId', () => {
    it('should generate unique peer IDs', () => {
      const id1 = generatePeerId();
      const id2 = generatePeerId();
      expect(id1).not.toBe(id2);
    });

    it('should start with peer_ prefix', () => {
      const id = generatePeerId();
      expect(id.startsWith('peer_')).toBe(true);
    });
  });

  describe('generateEntityId', () => {
    it('should generate unique entity IDs', () => {
      const id1 = generateEntityId();
      const id2 = generateEntityId();
      expect(id1).not.toBe(id2);
    });

    it('should start with entity_ prefix', () => {
      const id = generateEntityId();
      expect(id.startsWith('entity_')).toBe(true);
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Helper Functions', () => {
  describe('createMessage', () => {
    it('should create message with defaults', () => {
      const msg = createMessage('test', { data: 123 }, 'peer1');
      expect(msg.type).toBe('test');
      expect(msg.payload).toEqual({ data: 123 });
      expect(msg.senderId).toBe('peer1');
      expect(msg.targetId).toBe('all');
      expect(msg.delivery).toBe('reliable');
    });

    it('should accept custom target', () => {
      const msg = createMessage('test', {}, 'peer1', 'peer2');
      expect(msg.targetId).toBe('peer2');
    });
  });

  describe('createPeerInfo', () => {
    it('should create peer info', () => {
      const peer = createPeerInfo('peer1', 'Player 1', true, false);
      expect(peer.id).toBe('peer1');
      expect(peer.name).toBe('Player 1');
      expect(peer.isHost).toBe(true);
      expect(peer.isLocal).toBe(false);
      expect(peer.latency).toBe(0);
    });
  });

  describe('createSpawnRequest', () => {
    it('should create spawn request', () => {
      const req = createSpawnRequest('Player');
      expect(req.prefabId).toBe('Player');
      expect(req.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(req.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });

    it('should accept custom position', () => {
      const req = createSpawnRequest('Player', { position: { x: 1, y: 2, z: 3 } });
      expect(req.position).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('createReplicatedEntity', () => {
    it('should create replicated entity', () => {
      const entity = createReplicatedEntity('e1', 'peer1');
      expect(entity.id).toBe('e1');
      expect(entity.ownerId).toBe('peer1');
      expect(entity.components).toEqual([]);
      expect(entity.createdAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('createEntityDelta', () => {
    it('should create entity delta', () => {
      const delta = createEntityDelta('e1', 42, { position: { x: 1, y: 2, z: 3 } });
      expect(delta.entityId).toBe('e1');
      expect(delta.tick).toBe(42);
      expect(delta.position).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('createRPCInvocation', () => {
    it('should create RPC invocation', () => {
      const rpc = createRPCInvocation('damage', [50], 'peer1', 'server');
      expect(rpc.name).toBe('damage');
      expect(rpc.args).toEqual([50]);
      expect(rpc.senderId).toBe('peer1');
      expect(rpc.targetId).toBe('server');
    });
  });

  describe('createInputCommand', () => {
    it('should create input command', () => {
      const cmd = createInputCommand(100, { moveX: 1, jump: true }, 5);
      expect(cmd.tick).toBe(100);
      expect(cmd.inputs).toEqual({ moveX: 1, jump: true });
      expect(cmd.sequenceNumber).toBe(5);
    });
  });
});

// ============================================================================
// Vector Math Tests
// ============================================================================

describe('Vector Math', () => {
  describe('lerpVector3', () => {
    it('should interpolate between vectors', () => {
      const a = { x: 0, y: 0, z: 0 };
      const b = { x: 10, y: 20, z: 30 };
      const result = lerpVector3(a, b, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
      expect(result.z).toBe(15);
    });

    it('should return a when t=0', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 10, y: 20, z: 30 };
      const result = lerpVector3(a, b, 0);
      expect(result).toEqual(a);
    });

    it('should return b when t=1', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 10, y: 20, z: 30 };
      const result = lerpVector3(a, b, 1);
      expect(result).toEqual(b);
    });
  });

  describe('slerpQuaternion', () => {
    it('should interpolate between quaternions', () => {
      const a = { x: 0, y: 0, z: 0, w: 1 }; // Identity
      const b = { x: 0, y: 0.707, z: 0, w: 0.707 }; // 90° around Y
      const result = slerpQuaternion(a, b, 0.5);
      expect(result.w).toBeGreaterThan(0.5);
    });

    it('should return identity when both are identity', () => {
      const a = { x: 0, y: 0, z: 0, w: 1 };
      const result = slerpQuaternion(a, a, 0.5);
      expect(result.w).toBeCloseTo(1, 4);
    });
  });

  describe('distanceVector3', () => {
    it('should calculate distance between vectors', () => {
      const a = { x: 0, y: 0, z: 0 };
      const b = { x: 3, y: 4, z: 0 };
      expect(distanceVector3(a, b)).toBe(5);
    });

    it('should return 0 for same point', () => {
      const a = { x: 5, y: 5, z: 5 };
      expect(distanceVector3(a, a)).toBe(0);
    });
  });
});

// ============================================================================
// Message Targeting Tests
// ============================================================================

describe('Message Targeting', () => {
  describe('isMessageForPeer', () => {
    const baseMsg: INetworkMessage = {
      id: 'msg1',
      type: 'test',
      payload: {},
      senderId: 'peer1',
      targetId: 'all',
      timestamp: Date.now(),
    };

    it('should accept all messages', () => {
      const msg = { ...baseMsg, targetId: 'all' as const };
      expect(isMessageForPeer(msg, 'peer2', false)).toBe(true);
    });

    it('should accept host-targeted for host', () => {
      const msg = { ...baseMsg, targetId: 'host' as const };
      expect(isMessageForPeer(msg, 'peer2', true)).toBe(true);
      expect(isMessageForPeer(msg, 'peer2', false)).toBe(false);
    });

    it('should accept others-targeted for non-sender', () => {
      const msg = { ...baseMsg, targetId: 'others' as const };
      expect(isMessageForPeer(msg, 'peer2', false)).toBe(true);
      expect(isMessageForPeer(msg, 'peer1', false)).toBe(false);
    });

    it('should accept specific peer target', () => {
      const msg = { ...baseMsg, targetId: 'peer2' };
      expect(isMessageForPeer(msg, 'peer2', false)).toBe(true);
      expect(isMessageForPeer(msg, 'peer3', false)).toBe(false);
    });

    it('should accept array of peers', () => {
      const msg = { ...baseMsg, targetId: ['peer2', 'peer3'] };
      expect(isMessageForPeer(msg, 'peer2', false)).toBe(true);
      expect(isMessageForPeer(msg, 'peer3', false)).toBe(true);
      expect(isMessageForPeer(msg, 'peer4', false)).toBe(false);
    });
  });
});

// ============================================================================
// State Serialization Tests
// ============================================================================

describe('State Serialization', () => {
  describe('serializeState', () => {
    it('should serialize state map to array', () => {
      const state = new Map<string, ISyncStateEntry>();
      state.set('health', {
        key: 'health',
        value: 100,
        version: 1,
        timestamp: 12345,
        origin: 'local',
      });

      const serialized = serializeState(state);
      expect(serialized).toHaveLength(1);
      expect(serialized[0].key).toBe('health');
      expect(serialized[0].value).toBe(100);
    });
  });

  describe('deserializeState', () => {
    it('should deserialize array to state map', () => {
      const entries = [
        { key: 'health', value: 100, version: 1, timestamp: 12345 },
        { key: 'score', value: 500, version: 2, timestamp: 12346 },
      ];

      const state = deserializeState(entries);
      expect(state.size).toBe(2);
      expect(state.get('health')?.value).toBe(100);
      expect(state.get('score')?.value).toBe(500);
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('Validation', () => {
  describe('validateConnectionConfig', () => {
    it('should validate valid config', () => {
      const result = validateConnectionConfig({
        maxPeers: 8,
        timeout: 5000,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid maxPeers', () => {
      const result = validateConnectionConfig({ maxPeers: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxPeers must be at least 1');
    });

    it('should reject negative timeout', () => {
      const result = validateConnectionConfig({ timeout: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('timeout must be non-negative');
    });

    it('should reject low heartbeat interval', () => {
      const result = validateConnectionConfig({ heartbeatInterval: 50 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('heartbeatInterval must be at least 100ms');
    });
  });
});

// ============================================================================
// NetworkClient Tests
// ============================================================================

describe('NetworkClient', () => {
  let client: NetworkClientImpl;

  beforeEach(() => {
    client = new NetworkClientImpl();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  describe('lifecycle', () => {
    it('should start in disconnected state', () => {
      expect(client.state).toBe('disconnected');
    });

    it('should connect successfully', async () => {
      await client.connect({ url: 'ws://test' });
      expect(client.state).toBe('connected');
    });

    it('should have a peer ID', () => {
      expect(client.peerId).toBeTruthy();
      expect(client.peerId.startsWith('peer_')).toBe(true);
    });

    it('should disconnect', async () => {
      await client.connect({ url: 'ws://test' });
      await client.disconnect();
      expect(client.state).toBe('disconnected');
    });
  });

  describe('peers', () => {
    beforeEach(async () => {
      await client.connect({ url: 'ws://test' });
    });

    it('should get local peer', () => {
      const local = client.getLocalPeer();
      expect(local.id).toBe(client.peerId);
      expect(local.isLocal).toBe(true);
    });

    it('should add peer', () => {
      client.addPeer(createPeerInfo('peer2', 'Player 2'));
      expect(client.getPeer('peer2')).toBeDefined();
    });

    it('should get all peers', () => {
      client.addPeer(createPeerInfo('peer2'));
      client.addPeer(createPeerInfo('peer3'));
      const peers = client.getPeers();
      expect(peers).toHaveLength(2);
    });

    it('should remove peer', () => {
      client.addPeer(createPeerInfo('peer2'));
      client.removePeer('peer2');
      expect(client.getPeer('peer2')).toBeUndefined();
    });

    it('should set peer metadata', () => {
      client.setPeerMetadata({ team: 'blue' });
      const local = client.getLocalPeer();
      expect(local.metadata.team).toBe('blue');
    });
  });

  describe('messaging', () => {
    beforeEach(async () => {
      await client.connect({ url: 'ws://test' });
    });

    it('should send message', () => {
      const handler = vi.fn();
      client.on('test', handler);
      client.send('test', { value: 42 });

      // Allow async delivery
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(handler).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });

    it('should broadcast message', () => {
      const handler = vi.fn();
      client.on('broadcast-test', handler);
      client.broadcast('broadcast-test', { msg: 'hello' });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(handler).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });

    it('should unregister handler', () => {
      const handler = vi.fn();
      client.on('test', handler);
      client.off('test', handler);
      client.send('test', {});

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(handler).not.toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });
  });

  describe('events', () => {
    it('should emit connected event', async () => {
      const callback = vi.fn();
      client.addEventListener('connected', callback);
      await client.connect({ url: 'ws://test' });
      expect(callback).toHaveBeenCalled();
    });

    it('should emit disconnected event', async () => {
      const callback = vi.fn();
      await client.connect({ url: 'ws://test' });
      client.addEventListener('disconnected', callback);
      await client.disconnect();
      expect(callback).toHaveBeenCalled();
    });

    it('should emit peerJoined event', async () => {
      const callback = vi.fn();
      await client.connect({ url: 'ws://test' });
      client.addEventListener('peerJoined', callback);
      client.addPeer(createPeerInfo('peer2'));
      expect(callback).toHaveBeenCalled();
    });

    it('should emit peerLeft event', async () => {
      const callback = vi.fn();
      await client.connect({ url: 'ws://test' });
      client.addPeer(createPeerInfo('peer2'));
      client.addEventListener('peerLeft', callback);
      client.removePeer('peer2');
      expect(callback).toHaveBeenCalled();
    });

    it('should remove event listener', async () => {
      const callback = vi.fn();
      client.addEventListener('connected', callback);
      client.removeEventListener('connected', callback);
      await client.connect({ url: 'ws://test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('channels', () => {
    beforeEach(async () => {
      await client.connect({ url: 'ws://test' });
    });

    it('should create channel', () => {
      client.createChannel('voice', { reliable: false });
      // No error means success
    });

    it('should close channel', () => {
      client.createChannel('data');
      client.closeChannel('data');
      // No error means success
    });
  });

  describe('stats', () => {
    beforeEach(async () => {
      await client.connect({ url: 'ws://test' });
    });

    it('should get stats', () => {
      const stats = client.getStats();
      expect(stats.bytesSent).toBeGreaterThanOrEqual(0);
      expect(stats.bytesReceived).toBeGreaterThanOrEqual(0);
    });

    it('should track sent messages', () => {
      client.send('test', { data: 'test' });
      const stats = client.getStats();
      expect(stats.messagesSent).toBeGreaterThan(0);
    });

    it('should get latency to peer', () => {
      client.addPeer(createPeerInfo('peer2'));
      const latency = client.getLatencyTo('peer2');
      expect(latency).toBe(0); // New peer has 0 latency
    });

    it('should return -1 for unknown peer', () => {
      expect(client.getLatencyTo('unknown')).toBe(-1);
    });

    it('should reset stats', () => {
      client.send('test', {});
      client.resetStats();
      const stats = client.getStats();
      expect(stats.messagesSent).toBe(0);
    });
  });
});

// ============================================================================
// StateSynchronizer Tests
// ============================================================================

describe('StateSynchronizer', () => {
  let sync: StateSynchronizerImpl;
  const localPeerId = 'local-peer';

  beforeEach(() => {
    sync = new StateSynchronizerImpl(localPeerId);
  });

  describe('state management', () => {
    it('should set and get state', () => {
      sync.set('health', 100);
      expect(sync.get('health')).toBe(100);
    });

    it('should delete state', () => {
      sync.set('score', 500);
      const deleted = sync.delete('score');
      expect(deleted).toBe(true);
      expect(sync.get('score')).toBeUndefined();
    });

    it('should return false deleting non-existent', () => {
      expect(sync.delete('missing')).toBe(false);
    });

    it('should get all states', () => {
      sync.set('a', 1);
      sync.set('b', 2);
      const all = sync.getAll();
      expect(all.size).toBe(2);
    });

    it('should clear all states', () => {
      sync.set('a', 1);
      sync.set('b', 2);
      sync.clear();
      expect(sync.getAll().size).toBe(0);
    });

    it('should check state existence', () => {
      sync.set('exists', true);
      expect(sync.has('exists')).toBe(true);
      expect(sync.has('missing')).toBe(false);
    });

    it('should get all keys', () => {
      sync.set('a', 1);
      sync.set('b', 2);
      const keys = sync.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });
  });

  describe('ownership', () => {
    it('should claim ownership', () => {
      sync.set('item', { data: 1 });
      expect(sync.claim('item')).toBe(true);
      expect(sync.isOwner('item')).toBe(true);
    });

    it('should release ownership', () => {
      sync.set('item', { data: 1 });
      sync.claim('item');
      sync.release('item');
      expect(sync.getOwner('item')).toBeUndefined();
    });

    it('should get owner', () => {
      sync.set('item', { data: 1 });
      expect(sync.getOwner('item')).toBe(localPeerId);
    });

    it('should get owned states', () => {
      sync.set('owned1', 1);
      sync.set('owned2', 2);
      const owned = sync.getOwnedStates();
      expect(owned.length).toBe(2);
    });
  });

  describe('snapshots', () => {
    it('should take snapshot', () => {
      sync.set('health', 100);
      const snapshot = sync.takeSnapshot();
      expect(snapshot.tick).toBe(0);
      expect(snapshot.states.size).toBe(1);
    });

    it('should increment tick on snapshot', () => {
      sync.takeSnapshot();
      const s2 = sync.takeSnapshot();
      expect(s2.tick).toBe(1);
    });

    it('should restore snapshot', () => {
      sync.set('health', 100);
      const snapshot = sync.takeSnapshot();
      sync.set('health', 50);
      sync.restoreSnapshot(snapshot);
      expect(sync.get('health')).toBe(100);
    });

    it('should get history', () => {
      sync.takeSnapshot();
      sync.takeSnapshot();
      const history = sync.getHistory();
      expect(history.length).toBe(2);
    });

    it('should get limited history', () => {
      sync.takeSnapshot();
      sync.takeSnapshot();
      sync.takeSnapshot();
      const history = sync.getHistory(2);
      expect(history.length).toBe(2);
    });
  });

  describe('sync control', () => {
    it('should pause and resume', () => {
      expect(sync.isPaused).toBe(false);
      sync.pause();
      expect(sync.isPaused).toBe(true);
      sync.resume();
      expect(sync.isPaused).toBe(false);
    });

    it('should sync (take snapshot)', () => {
      sync.set('data', 123);
      sync.sync();
      expect(sync.getHistory().length).toBe(1);
    });

    it('should not sync when paused', () => {
      sync.pause();
      sync.sync();
      expect(sync.getHistory().length).toBe(0);
    });
  });

  describe('remote updates', () => {
    it('should apply remote update', () => {
      const entry: ISyncStateEntry = {
        key: 'remote-data',
        value: { from: 'server' },
        version: 1,
        timestamp: Date.now(),
        origin: 'remote',
      };
      const applied = sync.applyRemoteUpdate(entry);
      expect(applied).toBe(true);
      expect(sync.get('remote-data')).toEqual({ from: 'server' });
    });

    it('should reject old version in CRDT mode', () => {
      const crdtSync = new StateSynchronizerImpl(localPeerId, { mode: 'crdt' });
      crdtSync.set('data', 1); // version 1

      const oldEntry: ISyncStateEntry = {
        key: 'data',
        value: 0,
        version: 0,
        timestamp: Date.now(),
        origin: 'remote',
      };

      const applied = crdtSync.applyRemoteUpdate(oldEntry);
      expect(applied).toBe(false);
      expect(crdtSync.get('data')).toBe(1);
    });

    it('should accept newer timestamp in LWW mode', () => {
      const lwwSync = new StateSynchronizerImpl(localPeerId, { mode: 'last-write-wins' });
      lwwSync.set('data', 'old');

      const newerEntry: ISyncStateEntry = {
        key: 'data',
        value: 'new',
        version: 1,
        timestamp: Date.now() + 1000,
        origin: 'remote',
      };

      const applied = lwwSync.applyRemoteUpdate(newerEntry);
      expect(applied).toBe(true);
      expect(lwwSync.get('data')).toBe('new');
    });

    it('should merge remote state', () => {
      const remoteState = new Map<string, ISyncStateEntry>();
      remoteState.set('key1', {
        key: 'key1',
        value: 'value1',
        version: 1,
        timestamp: Date.now(),
        origin: 'remote',
      });
      remoteState.set('key2', {
        key: 'key2',
        value: 'value2',
        version: 1,
        timestamp: Date.now(),
        origin: 'remote',
      });

      sync.mergeRemoteState(remoteState);
      expect(sync.get('key1')).toBe('value1');
      expect(sync.get('key2')).toBe('value2');
    });
  });

  describe('events', () => {
    it('should emit state changed event', () => {
      const callback = vi.fn();
      sync.onStateChanged('health', callback);
      sync.set('health', 100);
      expect(callback).toHaveBeenCalled();
    });

    it('should unregister state changed callback', () => {
      const callback = vi.fn();
      sync.onStateChanged('health', callback);
      sync.offStateChanged('health', callback);
      sync.set('health', 100);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit any state changed event', () => {
      const callback = vi.fn();
      sync.onAnyStateChanged(callback);
      sync.set('health', 100);
      sync.set('score', 500);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe('Factory Functions', () => {
  it('createNetworkClient should return NetworkClientImpl', () => {
    const client = createNetworkClient();
    expect(client).toBeInstanceOf(NetworkClientImpl);
  });

  it('createStateSynchronizer should return StateSynchronizerImpl', () => {
    const sync = createStateSynchronizer('peer1');
    expect(sync).toBeInstanceOf(StateSynchronizerImpl);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Network Integration', () => {
  it('should integrate client with state sync', async () => {
    const client = createNetworkClient();
    await client.connect({ url: 'ws://test' });

    const sync = createStateSynchronizer(client.peerId);

    // Set some state
    sync.set('playerHealth', 100);
    sync.set('playerPosition', { x: 0, y: 0, z: 0 });

    // Take snapshot for sync
    const snapshot = sync.takeSnapshot();
    expect(snapshot.states.size).toBe(2);

    await client.disconnect();
  });

  it('should handle message-based state sync', async () => {
    const client = createNetworkClient();
    await client.connect({ url: 'ws://test' });

    const sync = createStateSynchronizer(client.peerId);

    // Register handler for state updates
    client.on('state-update', (msg: INetworkMessage<ISyncStateEntry>) => {
      sync.applyRemoteUpdate(msg.payload);
    });

    // Simulate receiving remote state
    const remoteEntry: ISyncStateEntry = {
      key: 'remotePlayer',
      value: { name: 'Player2', health: 80 },
      version: 1,
      timestamp: Date.now(),
      origin: 'remote',
    };

    client.simulateIncomingMessage({
      id: 'msg1',
      type: 'state-update',
      payload: remoteEntry,
      senderId: 'peer2',
      targetId: 'all',
      timestamp: Date.now(),
    });

    // Allow async processing
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sync.get('remotePlayer')).toEqual({ name: 'Player2', health: 80 });

    await client.disconnect();
  });
});
