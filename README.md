# HoloScript

**Open source VR scene description language and runtime**

HoloScript is a declarative language for building virtual reality experiences. Write simple commands, get immersive 3D worlds.

## What is HoloScript?

```javascript
create scene "My World"
  create cube at (0, 1, 0) with color red
  create sphere at (2, 1, 0) with physics enabled
  create light at (0, 10, 0) with intensity 1.5
```

HoloScript makes VR development accessible to everyone - from beginners to professionals.

## Packages

| Package | Description |
|---------|-------------|
| [@holoscript/uaa2-client](./packages/uaa2-client) | API client for uaa2-service (AI building, agents, voice) |

## Quick Start

### Using with uaa2-service

```bash
npm install @holoscript/uaa2-client
```

```typescript
import { UAA2Client } from '@holoscript/uaa2-client';

const client = new UAA2Client({
  apiKey: process.env.UAA2_API_KEY
});

// Generate HoloScript from natural language
const result = await client.build("Create a cozy living room");
console.log(result.holoScript);

// Spawn an AI assistant in your world
const agent = await client.agents.spawn({
  agentType: 'assistant',
  worldId: 'my-world',
  avatarConfig: {
    displayName: 'Builder Bot',
    appearance: { model: 'humanoid' }
  },
  capabilities: ['chat', 'build-assist']
});

agent.on('message', (msg) => console.log(msg.content));
agent.send('Help me add furniture');
```

## Ecosystem

HoloScript is the open source foundation for VR development:

```
+------------------+     +------------------+     +------------------+
|    HoloScript    | --> |     Hololand     | --> |   uaa2-service   |
|   (Open Source)  |     |   (Proprietary)  |     |   (Proprietary)  |
|                  |     |                  |     |                  |
|  - Language spec |     |  - Full platform |     |  - AI agents     |
|  - Runtime       |     |  - Networking    |     |  - Voice → VR    |
|  - API clients   |     |  - Social        |     |  - Knowledge     |
+------------------+     +------------------+     +------------------+
```

- **HoloScript** (MIT): Language, runtime, and tooling anyone can use
- **Hololand** (Proprietary): Full metaverse platform built on HoloScript
- **uaa2-service** (Proprietary): AI infrastructure powering intelligent features

## Language Features

### Objects

```javascript
create cube at (0, 0, 0)
create sphere at (2, 0, 0) with radius 0.5
create box at (0, 1, 0) with size (2, 0.1, 1)
```

### Materials

```javascript
create cube with color red
create sphere with color #667eea
create box with texture "wood.jpg"
```

### Physics

```javascript
create sphere with physics enabled
create cube with physics { mass: 2, friction: 0.5 }
```

### Lighting

```javascript
create light at (0, 10, 0) with intensity 2
create spotlight at (5, 5, 0) pointing at (0, 0, 0)
create ambient light with color warm
```

### Interactivity

```javascript
create button at (0, 1.5, -2) with text "Click Me"
  on click -> spawn cube at (0, 3, 0)
```

## Contributing

HoloScript is open source under the MIT license. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT

---

**HoloScript is part of the Hololand ecosystem**
