# @holoscript/state-sync

**Distributed state synchronization with CRDTs for HoloScript VR/AR**

Conflict-free data structures that automatically merge across peers — perfect for multiplayer VR.

## Features

- 🔄 **CRDTs** — Conflict-free replicated data types that always converge
- ⚡ **Delta Sync** — Only sync changes, not full state
- 🌲 **Merkle Trees** — Efficient state verification and diff detection
- ↩️ **Undo/Redo** — Built-in state history management
- 📸 **Snapshots** — Point-in-time state capture and restore

## Installation

```bash
npm install @holoscript/state-sync
```

## Quick Start

```typescript
import { createCRDT, CRDTType, SyncCoordinator } from '@holoscript/state-sync';

// Create a counter that works across peers
const counter = createCRDT(CRDTType.PNCounter, 'player-score');

// Increment from any peer — no conflicts!
counter.increment(10);
counter.decrement(3);

console.log(counter.value); // 7
```

## CRDT Types

### Counters

```typescript
import { GCounter, PNCounter } from '@holoscript/state-sync';

// Grow-only counter (can only increase)
const visits = new GCounter('page-visits');
visits.increment(1);

// Positive-negative counter (can increase and decrease)
const score = new PNCounter('player-score');
score.increment(100);
score.decrement(25);
console.log(score.value); // 75
```

### Sets

```typescript
import { GSet, TwoPSet, ORSet } from '@holoscript/state-sync';

// Grow-only set (elements can only be added)
const tags = new GSet<string>('tags');
tags.add('vr');
tags.add('multiplayer');

// Two-phase set (add and remove, but removed items can't be re-added)
const inventory = new TwoPSet<string>('inventory');
inventory.add('sword');
inventory.remove('sword'); // Can't add 'sword' again

// OR-Set (add, remove, re-add — most flexible)
const players = new ORSet<string>('online-players');
players.add('alice');
players.remove('alice');
players.add('alice'); // Works!
```

### Registers

```typescript
import { LWWRegister, MVRegister } from '@holoscript/state-sync';

// Last-writer-wins register
const playerName = new LWWRegister<string>('name');
playerName.set('Alice');
playerName.set('Bob'); // Bob wins (most recent)

// Multi-value register (keeps all concurrent values)
const position = new MVRegister<Vec3>('position');
position.set({ x: 1, y: 0, z: 0 });
// If concurrent updates happen, all values are preserved
```

### Maps and Sequences

```typescript
import { LWWMap, RGASequence } from '@holoscript/state-sync';

// Last-writer-wins map
const playerData = new LWWMap<unknown>('player');
playerData.set('health', 100);
playerData.set('level', 5);
playerData.delete('temp');

// Sequence (ordered list with insert/delete)
const chatHistory = new RGASequence<string>('chat');
chatHistory.insert(0, 'Hello!');
chatHistory.insert(1, 'World!');
chatHistory.delete(0); // Removes 'Hello!'
```

### JSON Documents

```typescript
import { JSONDoc } from '@holoscript/state-sync';

// Full JSON document CRDT
const worldState = new JSONDoc('world');
worldState.set(['players', 'alice', 'position'], { x: 0, y: 1.6, z: 0 });
worldState.set(['players', 'alice', 'health'], 100);
worldState.delete(['players', 'bob']);
```

## Synchronization

### Delta Sync

Only sync the changes, not full state:

```typescript
import { DeltaSyncManager } from '@holoscript/state-sync';

const syncManager = new DeltaSyncManager();

// Get delta since last sync
const delta = syncManager.getDelta(lastSyncTime);

// Send delta to peers
sendToPeers(delta);

// Receive and apply delta from peers
syncManager.applyDelta(receivedDelta);
```

### Merkle Tree Sync

Efficiently detect what's different between peers:

```typescript
import { MerkleTreeSync } from '@holoscript/state-sync';

const merkle = new MerkleTreeSync();

// Get hash of current state
const stateHash = merkle.getRootHash();

// Compare with peer to find differences
const diff = merkle.compare(peerHash);
```

### Conflict Resolution

Custom conflict handling:

```typescript
import { ConflictResolver } from '@holoscript/state-sync';

const resolver = new ConflictResolver({
  strategy: 'last-write-wins', // or 'first-write-wins', 'custom'
  customResolver: (local, remote) => {
    // Your merge logic
    return remote.timestamp > local.timestamp ? remote : local;
  },
});
```

## State Management

### Undo/Redo

Built-in history management:

```typescript
import { StateUndoManager } from '@holoscript/state-sync';

const undoManager = new StateUndoManager();

// Perform operations
state.set('color', 'red');
undoManager.checkpoint();

state.set('color', 'blue');
undoManager.checkpoint();

// Undo
undoManager.undo(); // color = 'red'
undoManager.redo(); // color = 'blue'
```

### Snapshots

Save and restore state:

```typescript
import { SnapshotManager } from '@holoscript/state-sync';

const snapshots = new SnapshotManager();

// Take snapshot
const snapshotId = snapshots.capture('before-battle');

// ... battle happens ...

// Restore snapshot
snapshots.restore(snapshotId);
```

## Sync Coordinator

Orchestrate all synchronization:

```typescript
import { SyncCoordinator } from '@holoscript/state-sync';

const coordinator = new SyncCoordinator({
  nodeId: 'player-123',
  syncInterval: 100, // ms
  strategy: 'delta',
});

// Register CRDTs to sync
coordinator.register(counter);
coordinator.register(playerSet);

// Handle incoming sync messages
coordinator.onMessage((message) => {
  broadcastToPeers(message);
});

// Start syncing
coordinator.start();
```

## Vector Clocks

For causality tracking:

```typescript
import { createVectorClock, incrementClock, compareClock } from '@holoscript/state-sync';

const clock = createVectorClock();
incrementClock(clock, 'node-a');

// Compare clocks
const result = compareClock(clockA, clockB);
// -1 = A before B, 0 = concurrent, 1 = A after B
```

## Integration with HoloScript

Use with `@networked` and `@synced` traits:

```hsplus
orb player @networked @synced {
  position: [0, 1.6, 0]
  
  state {
    health: 100   // Synced as LWWRegister
    inventory: [] // Synced as ORSet
  }
  
  sync_rate: 20hz
}
```

## Types

```typescript
import type {
  CRDTType,
  CRDTState,
  VectorClock,
  CRDTOperation,
  SyncStrategy,
} from '@holoscript/state-sync';
```

## License

MIT © Brian Joseph
