# @holoscript/infinity-builder-client

Thin client for consuming Infinity Builder APIs from HoloScript projects.

## Installation

```bash
npm install @holoscript/infinity-builder-client
# or
pnpm add @holoscript/infinity-builder-client
```

## Quick Start

```typescript
import { InfinityBuilderClient } from '@holoscript/infinity-builder-client';

const client = new InfinityBuilderClient({
  apiKey: process.env.INFINITY_BUILDER_API_KEY,
  baseUrl: 'https://api.infinityassistant.io'
});

// Generate HoloScript from natural language
const result = await client.build("Create a coffee shop with a counter");
console.log(result.holoScript);
// Output: create scene "Coffee Shop"\n  create box at (0, 0, 0) ...
```

## Features

### HoloScript Builder

Generate, optimize, and explain HoloScript code.

```typescript
// Build from natural language
const result = await client.build("Create a forest with pine trees", {
  style: 'realistic',
  complexity: 'medium',
  includePhysics: true
});

// Optimize for mobile
const optimized = await client.optimize(result.holoScript, 'mobile');

// Get explanation
const explanation = await client.explain(result.holoScript);
```

### AI Agent Avatars

Spawn AI agents that inhabit avatars in VR worlds.

```typescript
const agent = await client.agents.spawn({
  agentType: 'assistant',
  worldId: 'world_abc123',
  avatarConfig: {
    displayName: 'Helper Bot',
    appearance: { model: 'humanoid', color: '#667eea' }
  },
  capabilities: ['chat', 'guide', 'build-assist']
});

// Listen for agent messages
agent.on('message', (msg) => {
  console.log('Agent:', msg.content);
});

// Listen for agent actions (like creating objects)
agent.on('action', (action) => {
  if (action.type === 'create_object') {
    executeHoloScript(action.holoScript);
  }
});

// Send a message to the agent
agent.send('Help me build a wooden table', {
  position: { x: 0, y: 0, z: 5 },
  selectedObjects: ['obj_123']
});

// Disconnect when done
agent.disconnect();
```

### Voice Processing

Convert voice commands to HoloScript.

```typescript
// Record audio (browser example)
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream);
// ... record audio ...
const audioBlob = new Blob(chunks, { type: 'audio/webm' });

// Transcribe only
const transcript = await client.voice.transcribe(audioBlob, 'webm');
console.log(transcript.transcript); // "create a red cube above me"

// Transcribe and build in one call
const result = await client.voice.build(audioBlob, 'webm', {
  currentPosition: { x: 0, y: 1.6, z: 0 }
});
console.log(result.holoScript); // create cube at (0, 3, 0) with color red
```

### Knowledge Queries

Get patterns and suggestions while building.

```typescript
// Search for patterns
const patterns = await client.knowledge.patterns({
  query: 'modern office space',
  limit: 5,
  filters: { minConfidence: 0.8, maxPolygons: 50000 }
});

// Get contextual suggestions
const suggestions = await client.knowledge.suggestions({
  currentScript: 'create scene "My Shop"\n  create counter at (0, 1, 0)',
  cursorPosition: 2
});
```

### Spatial Coordination

Optimize positioning for multiplayer.

```typescript
// Arrange avatars in a circle
const result = await client.spatial.optimizeFormation({
  entities: [
    { id: 'avatar_1', position: { x: 0, y: 0, z: 0 } },
    { id: 'avatar_2', position: { x: 1, y: 0, z: 0 } }
  ],
  targetZone: { center: { x: 5, y: 0, z: 5 }, radius: 10 },
  formation: 'circle'
});
```

### Economy

Process in-world transactions.

```typescript
const tx = await client.economy.transaction({
  worldId: 'world_abc',
  type: 'purchase',
  from: 'user_buyer',
  to: 'user_seller',
  amount: 100,
  currency: 'HOLO',
  item: { type: 'asset', assetId: 'asset_xyz' }
});
```

### Health & Usage

Monitor API status and usage.

```typescript
// Check API health
const health = await client.health();
console.log(health.status); // 'healthy'

// Check usage
const usage = await client.usage();
console.log(`API calls: ${usage.usage.apiCalls}/${usage.limits.apiCalls}`);
```

## Configuration

```typescript
const client = new InfinityBuilderClient({
  apiKey: 'your-api-key',     // Required
  baseUrl: 'https://api.infinityassistant.io/api', // Optional, default shown
  timeout: 30000,             // Optional, request timeout in ms
  retries: 3                  // Optional, retry count for failed requests
});
```

## Error Handling

```typescript
import { InfinityBuilderError } from '@holoscript/infinity-builder-client';

try {
  await client.build("...");
} catch (error) {
  const builderError = error as InfinityBuilderError;
  console.error(`Error ${builderError.code}: ${builderError.message}`);
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid API key |
| 403 | Forbidden - Insufficient permissions |
| 429 | Rate Limited - Too many requests |
| 500 | Internal Error |

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  BuildResponse,
  AgentSession,
  SpawnAgentRequest,
  Pattern,
  UAA2Error
} from '@holoscript/infinityassistant';
```

## License

MIT
