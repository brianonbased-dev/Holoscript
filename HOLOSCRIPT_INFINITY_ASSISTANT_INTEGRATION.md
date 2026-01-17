# HoloScript + Infinity Assistant Integration

Complete guide for HoloScript language integration with the Infinity Assistant platform.

## Overview

HoloScript is now fully integrated with **Infinity Assistant** - the public API that replaces the private uaa2-service for component building and deployment. This guide explains how HoloScript, Infinity Builder, and the Infinity Assistant service work together.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      HoloScript Language                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Declarative language for VR/AR                         │  │
│  │ • Open source (MIT) - @holoscript/core                   │  │
│  │ • Support for HoloScript+ (v1.0): traits, state, hooks   │  │
│  │ • 9 VR traits: @grabbable, @throwable, @pointable, etc.  │  │
│  │ • Expression interpolation & TypeScript interop           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Infinity Builder Client                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • InfinityBuilderClient class (@holoscript/infinity-...) │  │
│  │ • Build HoloScript components from natural language       │  │
│  │ • Optimize for target platforms (web, mobile, VR, etc.)  │  │
│  │ • Deploy to 9 platforms automatically                     │  │
│  │ • Hololand authentication support (with subscription mgmt) │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Infinity Assistant Service (Public API)             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • https://api.infinityassistant.io/api                   │  │
│  │ • Component building endpoints                            │  │
│  │ • Deployment management                                   │  │
│  │ • AI agent orchestration                                  │  │
│  │ • Usage tracking & subscription management                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         uaa2-service Master Portal (Internal Orchestrator)       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Internal orchestration of agent operations              │  │
│  │ • Service routing and scaling                             │  │
│  │ • Quantum MCP Mesh orchestration                          │  │
│  │ • Knowledge management & compression                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## HoloScript Language

HoloScript is an **open-source, declarative language** for building VR/AR experiences with AI integration.

### Basic Syntax

```holoscript
// Orb (data object)
orb greeting {
  message: "Hello, HoloScript!"
  color: "#00ffff"
  glow: true
}

// Form (interactive UI)
form#login @grabbable @throwable {
  input#email { 
    type: "email"
    placeholder: "Enter email"
  }
  input#password { 
    type: "password"
  }
  button#submit { 
    text: "Sign In"
    @on_click: async -> { 
      await api.post('/login', form.serialize()) 
    }
  }
}

// HoloScript+ Features (v1.0+)
component#shopping-cart @state { items: [] } {
  div.items {
    @for item in state.items {
      div.item {
        span { ${item.name} }
        button { Remove }
      }
    }
  }
  
  @on_grab: () -> { 
    console.log("Cart grabbed!") 
  }
}
```

### HoloScript+ Traits (v1.0)

```holoscript
// Physical interaction traits
component#box @grabbable { ... }        // Can be grabbed
component#ball @throwable { ... }       // Can be thrown
component#pointer @pointable { ... }    // Can be pointed at
component#button @hoverable { ... }     // Responds to hover

// Manipulation traits
component#scaling @scalable { ... }     // Can be resized
component#rotating @rotatable { ... }   // Can be rotated
component#stacking @stackable { ... }   // Can stack on others
component#snapping @snappable { ... }   // Snaps to grid/targets
component#glass @breakable { ... }      // Can break on impact
```

### HoloScript+ State Management

```holoscript
component#counter @state { count: 0 } {
  div { 
    p { "Count: ${state.count}" }
    button {
      text: "Increment"
      @on_click: () -> {
        state.count = state.count + 1
      }
    }
  }
  
  // Computed value
  @computed total: state.count * 2
  
  // Lifecycle hooks
  @on_mount: () -> {
    console.log("Component mounted")
  }
  
  @on_grab: (hand) -> {
    console.log("Grabbed by ${hand.side} hand")
  }
  
  @on_collision: (other) -> {
    console.log("Collided with ${other.name}")
  }
}
```

## Infinity Builder Client

The **InfinityBuilderClient** class provides a TypeScript API for building and deploying HoloScript components.

### Installation

```bash
npm install @holoscript/infinity-builder-client
```

### Direct API Usage

```typescript
import { InfinityBuilderClient } from '@holoscript/infinity-builder-client';

const client = new InfinityBuilderClient({
  apiKey: 'your-infinity-builder-api-key',
  baseUrl: 'https://api.infinityassistant.io/api'
});

// Build from natural language
const result = await client.build('Create a login form with email and password fields');
console.log(result.holoScript); // Generated HoloScript code

// Optimize for specific platform
const optimized = await client.optimize(holoScript, 'mobile-react-native');

// Get explanation of code
const explanation = await client.explain(holoScript);
```

### With Hololand Integration

```typescript
import { InfinityBuilderClient } from '@holoscript/infinity-builder-client';

const client = new InfinityBuilderClient({
  apiKey: 'api-key-from-subscription',
  hololandAuth: {
    userId: 'user-123',
    sessionToken: 'session-token',
    hololandApiUrl: 'http://localhost:3001/api/v1'
  }
});

// Build component (tracked through Hololand subscription)
const result = await client.buildComponentWithHololand(
  'shopping-cart',
  `form#cart @state { items: [] } { ... }`,
  ['web', 'mobile-react-native', 'vr']
);

// Deploy to production (also tracked)
const deployment = await client.deployComponentWithHololand(
  result.componentId,
  'production'
);

// Check subscription usage
const subscription = await client.getHololandSubscriptionStatus();
console.log(`Builds: ${subscription.usage.buildComponents.used}/${subscription.usage.buildComponents.limit}`);
```

## Infinity Assistant Service API

The **public API** for building and deploying components.

### Base URL
```
https://api.infinityassistant.io/api
```

### Key Endpoints

#### Build Component
```
POST /v1/components/build
Authorization: Bearer {INFINITY_BUILDER_API_KEY}

Request:
{
  "type": "custom",
  "name": "my-form",
  "holoScript": "form#login { ... }",
  "targets": ["web", "mobile-react-native", "vr"],
  "optimize": true,
  "sourceMap": true
}

Response:
{
  "componentId": "comp_abc123xyz",
  "success": true,
  "builds": {
    "web": { "url": "...", "size": 45230 },
    "mobile-react-native": { "url": "...", "size": 52100 },
    "vr": { "url": "...", "size": 61500 }
  },
  "estimatedTime": 15
}
```

#### Deploy Component
```
POST /v1/components/{componentId}/deploy
Authorization: Bearer {INFINITY_BUILDER_API_KEY}

Request:
{
  "environment": "production",
  "webhooks": ["https://myapp.com/webhook"]
}

Response:
{
  "deploymentId": "deploy_xyz789",
  "status": "deployed",
  "deploymentUrl": "https://components.infinityassistant.io/comp_abc123xyz",
  "deployedAt": "2026-01-17T10:30:00Z"
}
```

#### Get Component Status
```
GET /v1/components/{componentId}/status
Authorization: Bearer {INFINITY_BUILDER_API_KEY}

Response:
{
  "componentId": "comp_abc123xyz",
  "name": "my-form",
  "status": "deployed",
  "builds": ["web", "mobile-react-native", "vr"],
  "deployedVersion": 2,
  "lastUpdated": "2026-01-17T10:30:00Z",
  "deployments": [
    {
      "id": "deploy_xyz789",
      "environment": "production",
      "deployedAt": "2026-01-17T10:30:00Z",
      "status": "active"
    }
  ]
}
```

## Hololand Integration

Users can build and deploy HoloScript components directly within Hololand with automatic subscription tracking.

### Sign Up for Infinity Assistant

```typescript
// User clicks "Upgrade to Pro"
const response = await fetch('/api/v1/infinity-assistant/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${hololandSessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ plan: 'pro' })
});

const { subscription } = await response.json();
// subscription.apiKey is ready to use
```

### Build and Deploy in Hololand

```typescript
// Use the Infinity Builder Client with Hololand auth
const client = new InfinityBuilderClient({
  apiKey: subscription.apiKey,
  hololandAuth: {
    userId: currentUser.id,
    sessionToken: hololandSessionToken
  }
});

// Build with automatic usage tracking
const build = await client.buildComponentWithHololand(
  'product-card',
  `form#product { ... }`,
  ['web', 'mobile-react-native']
);

// Deploy with automatic usage tracking
const deployment = await client.deployComponentWithHololand(
  build.componentId,
  'production'
);
```

## Subscription Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|-----------|
| **Component Builds/Month** | 10 | 1,000 | Unlimited |
| **API Calls/Month** | 1,000 | 100,000 | Unlimited |
| **HoloScript Building** | ✓ | ✓ | ✓ |
| **Component Deployment** | - | ✓ | ✓ |
| **VR Preview** | - | ✓ | ✓ |
| **Team Collaboration** | - | ✓ | ✓ |
| **Advanced Analytics** | - | - | ✓ |
| **Dedicated Support** | - | - | ✓ |
| **Price** | Free | $9.99/mo | Custom |

## Deployment Targets

HoloScript components compile to **9 platforms**:

**Web**
- `web` - Standard web (React/Vue/Angular)
- `web-vr` - WebXR for browser VR
- `web-ar` - WebAR for mobile browsers

**Mobile**
- `mobile-react-native` - React Native (iOS/Android)
- `mobile-flutter` - Flutter (iOS/Android)
- `mobile-compose` - Jetpack Compose (Android)
- `mobile-swiftui` - SwiftUI (iOS)

**Desktop**
- `desktop-electron` - Electron (Windows/Mac/Linux)
- `desktop-tauri` - Tauri (Windows/Mac/Linux)

## File Structure

```
HoloScript/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── HoloScriptPlusParser.ts      # Main parser
│   │   │   ├── HoloScriptPlusRuntime.ts     # Runtime executor
│   │   │   ├── traits/
│   │   │   │   ├── AIDriverTrait.ts         # AI integration
│   │   │   │   ├── VRInteractionTraits.ts   # VR traits
│   │   │   │   └── ... (other traits)
│   │   │   └── types.ts                     # Type definitions
│   │   └── dist/                            # Built output
│   │
│   ├── uaa2-client/  (renamed from)
│   │   ├── src/
│   │   │   ├── UAA2Client.ts                # InfinityBuilderClient class
│   │   │   ├── types.ts                     # Config & types
│   │   │   ├── AgentSession.ts              # WebSocket sessions
│   │   │   └── index.ts                     # Public exports
│   │   └── dist/                            # Built output
│   │
│   ├── creator-tools/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   └── dist/
│   │
│   └── cli/
│       ├── src/
│       │   ├── commands/
│       │   └── cli.ts
│       └── dist/
│
├── examples/
│   ├── vr-interactions.hsplus
│   ├── form-builder.hsplus
│   └── ... (more examples)
│
└── README.md
```

## Environment Variables

### Development
```env
INFINITY_BUILDER_API_URL=https://api.infinityassistant.io/api
INFINITY_BUILDER_API_KEY=your-development-key
NODE_ENV=development
```

### Production
```env
INFINITY_BUILDER_API_URL=https://api.infinityassistant.io/api
INFINITY_BUILDER_API_KEY=your-production-key
NODE_ENV=production
LOG_LEVEL=info
```

## Quick Start Examples

### Example 1: Build from Natural Language
```typescript
import { InfinityBuilderClient } from '@holoscript/infinity-builder-client';

const client = new InfinityBuilderClient({
  apiKey: process.env.INFINITY_BUILDER_API_KEY!
});

const result = await client.build(
  'Create a form with name, email, and phone number fields with validation'
);

console.log('Generated HoloScript:');
console.log(result.holoScript);
```

### Example 2: Parse and Execute HoloScript
```typescript
import { HoloScriptPlusParser, HoloScriptPlusRuntime } from '@holoscript/core';

const holoScript = `
form#signup @state { email: "" } {
  input#email {
    placeholder: "Enter your email"
    @on_change: (value) -> {
      state.email = value
    }
  }
  button#submit {
    text: "Sign Up"
  }
}
`;

const parser = new HoloScriptPlusParser();
const ast = parser.parse(holoScript);

const runtime = new HoloScriptPlusRuntime(ast);
await runtime.mount(document.body);
```

### Example 3: Deploy to Multiple Platforms
```typescript
import { InfinityBuilderClient } from '@holoscript/infinity-builder-client';

const client = new InfinityBuilderClient({
  apiKey: process.env.INFINITY_BUILDER_API_KEY!
});

const targets = [
  'web',
  'web-vr',
  'mobile-react-native',
  'mobile-flutter',
  'desktop-electron',
  'vr'
];

const result = await client.build('Create a shopping cart component');

// Optimize for each target
const optimizations = await Promise.all(
  targets.map(target => client.optimize(result.holoScript, target as any))
);

console.log(`Built for ${targets.length} platforms:`);
optimizations.forEach((opt, i) => {
  console.log(`${targets[i]}: ${opt.holoScript.length} chars`);
});
```

## Next Steps

1. **Sign Up** - Register at https://infinityassistant.io
2. **Get API Key** - From your account dashboard
3. **Install Client** - `npm install @holoscript/infinity-builder-client`
4. **Build** - Use `InfinityBuilderClient` to build components
5. **Deploy** - Deploy to multiple platforms automatically

## References

- [HoloScript Language Spec](../README.md)
- [Infinity Builder Client Docs](./packages/uaa2-client/README.md)
- [Infinity Assistant API](https://api.infinityassistant.io)
- [Hololand Integration](../../Hololand/platform/backend/INFINITY_ASSISTANT_INTEGRATION.md)
