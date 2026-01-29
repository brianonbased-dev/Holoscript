# Hololand Platform Roadmap 2026-2028

**The runtime for spatial computing.**

A cross-platform runtime that powers immersive VR/AR/XR experiences. This roadmap is scoped for **5 AI agents working in parallel**.

> HoloScript is the language, **Hololand is the platform**.

---

## AI Agent Structure (5 Agents)

| Agent | Focus Area | Parallelization |
|-------|------------|-----------------|
| **Runtime** | Core services, physics, audio | Engine implementation |
| **Graphics** | Rendering, shaders, materials | Visual pipeline |
| **Network** | Multiplayer, streaming, sync | Real-time communication |
| **Platform** | Device adapters, XR integration | Cross-platform support |
| **Infra** | DevOps, CDN, analytics | Backend services |

**AI Acceleration Factor:** Tasks that take humans weeks can be completed in days with AI agents working 24/7 in parallel.

---

## Current Status (v1.0.0-alpha - January 2026)

### ✅ Schema & Interfaces Complete
- World Definition Schema (1200+ lines)
- 8 Runtime Service interfaces
- Streaming Protocol (23 message types)
- Asset Management system
- Semantic Annotation framework
- Graphics trait integration

### 🟡 Stub Implementations (Need Real Code)
- WebSocket/WebRTC connections
- Physics engine (Rapier)
- Audio playback (Web Audio API)
- XR input handling
- Asset streaming pipeline
- Entity management

---

## 2026 Roadmap (AI-Accelerated)

### Q1-Q2: Sprint 1 (Feb-Mar) - 4 weeks

| Feature | Agent | Days |
|---------|-------|------|
| WebSocket connection layer | Network | 4 |
| Physics engine integration | Runtime | 5 |
| Audio system implementation | Runtime | 4 |
| WebGL renderer foundation | Graphics | 5 |
| Quest 3 adapter | Platform | 4 |

<details>
<summary><strong>📋 Sprint 1 Detailed Specifications</strong></summary>

#### WebSocket Connection Layer - Network Agent

**Location:** `packages/runtime/src/network/`

**What to build:**
Real WebSocket connection replacing stub implementation.

**Current state:**
```typescript
// HololandIntegration.ts - STUB
private async simulateConnection(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50)); // Fake latency
}
```

**Target state:**
```typescript
class WebSocketConnection {
  private socket: WebSocket;
  private reconnectAttempts = 0;
  private messageQueue: Message[] = [];

  async connect(url: string, token: string): Promise<void> {
    this.socket = new WebSocket(url);
    this.socket.onopen = () => this.onOpen();
    this.socket.onmessage = (e) => this.onMessage(e);
    this.socket.onclose = (e) => this.onClose(e);
    this.socket.onerror = (e) => this.onError(e);
  }

  send(message: ProtocolMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(encode(message));
    } else {
      this.messageQueue.push(message);
    }
  }
}
```

**Implementation:**

1. **Connection Manager:**
   - WebSocket connection with auto-reconnect
   - Exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - Connection state machine
   - Heartbeat every 5 seconds

2. **Message Handling:**
   - Binary encoding (MessagePack or Protocol Buffers)
   - Message queuing during disconnect
   - Sequence numbers for reliability
   - Priority levels (critical, high, normal, low)

3. **Protocol Implementation:**
   - Implement all 23 message types from `StreamingProtocol.ts`
   - Handshake with version negotiation
   - Authentication flow
   - Graceful disconnect

**Files to create:**
```
packages/runtime/src/network/
├── WebSocketConnection.ts    # Core connection
├── MessageEncoder.ts         # Binary encoding
├── MessageQueue.ts           # Queuing system
├── ReconnectStrategy.ts      # Backoff logic
└── ProtocolHandler.ts        # Message routing
```

**Protocol messages to implement:**
```typescript
// From StreamingProtocol.ts
type MessageType =
  | 'handshake' | 'handshake_ack' | 'heartbeat' | 'disconnect'
  | 'world_join' | 'world_leave' | 'world_state' | 'world_update'
  | 'entity_spawn' | 'entity_despawn' | 'entity_update' | 'entity_batch' | 'entity_rpc'
  | 'asset_request' | 'asset_response' | 'asset_chunk' | 'asset_complete'
  | 'player_join' | 'player_leave' | 'player_update' | 'player_input'
  | 'voice_data' | 'chat_message';
```

**Acceptance criteria:**
- [ ] WebSocket connects to server
- [ ] Auto-reconnect with backoff
- [ ] All 23 message types implemented
- [ ] Binary encoding <50% size vs JSON
- [ ] <100ms message latency

---

#### Physics Engine Integration - Runtime Agent

**Location:** `packages/runtime/src/physics/`

**What to build:**
Integrate Rapier physics engine for real-time simulation.

**Current state:**
```typescript
// PhysicsService - STUB
addRigidBody(): string { return 'body-' + Date.now(); }
raycast(): RaycastResult | null { return null; }
```

**Target state:**
```typescript
import RAPIER from '@dimforge/rapier3d';

class RapierPhysicsService implements PhysicsService {
  private world: RAPIER.World;
  private bodies: Map<string, RAPIER.RigidBody> = new Map();
  private colliders: Map<string, RAPIER.Collider> = new Map();

  constructor() {
    const gravity = { x: 0, y: -9.81, z: 0 };
    this.world = new RAPIER.World(gravity);
  }

  step(deltaTime: number): void {
    this.world.step();
    this.syncTransforms();
  }

  addRigidBody(config: RigidBodyConfig): string {
    const bodyDesc = config.type === 'dynamic'
      ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.fixed();

    bodyDesc.setTranslation(config.position.x, config.position.y, config.position.z);
    const body = this.world.createRigidBody(bodyDesc);
    // Add collider...
  }
}
```

**Implementation:**

1. **RAPIER Integration:**
   - Load RAPIER WASM module
   - Create physics world with configurable gravity
   - Fixed timestep (1/60s) with interpolation

2. **Body Management:**
   - Dynamic, kinematic, static body types
   - Shape types: box, sphere, capsule, convex, trimesh
   - Mass, friction, restitution properties
   - Continuous collision detection (CCD)

3. **Queries:**
   - Raycasting with groups/masks
   - Shape casting
   - Overlap queries
   - Contact manifolds

4. **Events:**
   - Collision enter/exit/stay
   - Trigger enter/exit
   - Sleep/wake events

**Files to create:**
```
packages/runtime/src/physics/
├── RapierPhysicsService.ts   # Main service
├── BodyFactory.ts            # Body creation
├── ShapeFactory.ts           # Collider shapes
├── PhysicsWorld.ts           # World management
├── QuerySystem.ts            # Raycasts, overlaps
└── PhysicsDebugRenderer.ts   # Debug visualization
```

**Configuration (from WorldDefinitionSchema):**
```typescript
physics: {
  engine: 'rapier',
  gravity: [0, -9.81, 0],
  maxBodies: 1000,
  substeps: 4,
  solverIterations: 10,
  enableCCD: true
}
```

**Acceptance criteria:**
- [ ] RAPIER WASM loads successfully
- [ ] Dynamic bodies fall with gravity
- [ ] Collision detection works
- [ ] Raycasting returns correct hits
- [ ] 1000 bodies at 60 FPS

---

#### Audio System Implementation - Runtime Agent

**Location:** `packages/runtime/src/audio/`

**What to build:**
Web Audio API integration with spatial audio support.

**Current state:**
```typescript
// AudioService - STUB
play3D(): string { return 'sound-' + Date.now(); }
setListenerPosition(): void {}
```

**Target state:**
```typescript
class WebAudioService implements AudioService {
  private context: AudioContext;
  private listener: AudioListener;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private panners: Map<string, PannerNode> = new Map();

  constructor() {
    this.context = new AudioContext();
    this.listener = this.context.listener;
  }

  async play3D(url: string, position: Vector3, options: AudioOptions): Promise<string> {
    const buffer = await this.loadAudio(url);
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const panner = this.context.createPanner();
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    panner.distanceModel = 'inverse';
    panner.refDistance = options.refDistance || 1;
    panner.maxDistance = options.maxDistance || 100;

    source.connect(panner).connect(this.context.destination);
    source.start();
    return this.registerSource(source, panner);
  }
}
```

**Implementation:**

1. **Audio Context:**
   - Single AudioContext per session
   - Resume on user interaction
   - Handle visibility changes (pause/resume)

2. **Spatial Audio:**
   - PannerNode for 3D positioning
   - HRTF panning mode
   - Distance attenuation (linear, inverse, exponential)
   - Cones for directional audio

3. **Audio Management:**
   - Sound pool for frequently used sounds
   - Streaming for long audio (music)
   - Priority system (max 32 sources)
   - Ducking for important sounds

4. **Effects:**
   - ConvolverNode for reverb
   - BiquadFilterNode for EQ
   - DynamicsCompressorNode for mastering
   - Per-zone audio settings

**Files to create:**
```
packages/runtime/src/audio/
├── WebAudioService.ts        # Main service
├── SpatialAudio.ts           # 3D positioning
├── AudioPool.ts              # Sound pooling
├── AudioLoader.ts            # Asset loading
├── ReverbSystem.ts           # Reverb zones
└── AudioMixer.ts             # Volume/ducking
```

**Configuration (from WorldDefinitionSchema):**
```typescript
audio: {
  spatialAudio: true,
  hrtf: true,
  reverbEnabled: true,
  maxSources: 32,
  dopplerEffect: true
}
```

**Acceptance criteria:**
- [ ] 3D positional audio works
- [ ] HRTF spatialization
- [ ] Reverb zones functional
- [ ] 32 concurrent sources
- [ ] <20ms audio latency

---

#### WebGL Renderer Foundation - Graphics Agent

**Location:** `packages/runtime/src/graphics/`

**What to build:**
WebGL 2.0 renderer with PBR materials.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  Scene Graph                                                │
│  └── Nodes with Transform, Mesh, Material                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Render Queue                                               │
│  - Opaque (front-to-back)                                  │
│  - Transparent (back-to-front)                             │
│  - Skybox                                                   │
│  - Post-processing                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  WebGL 2.0                                                  │
│  - VAO/VBO management                                       │
│  - Shader compilation                                       │
│  - Texture binding                                          │
│  - Draw calls                                               │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

1. **Renderer Core:**
   - WebGL 2.0 context creation
   - Render loop with RAF
   - Viewport management
   - Clear color/depth

2. **Resource Management:**
   - Buffer pool (VAO, VBO, IBO)
   - Texture manager with mipmaps
   - Shader cache
   - Uniform buffer objects (UBO)

3. **PBR Pipeline:**
   - Cook-Torrance BRDF
   - IBL (Image-Based Lighting)
   - Normal mapping
   - Roughness/metallic workflow

4. **Optimizations:**
   - Frustum culling
   - Draw call batching
   - Instanced rendering
   - LOD system

**Shader (from HOLOLAND_GRAPHICS_INTEGRATION.md):**
```glsl
// PBR Fragment Shader
vec3 F0 = mix(vec3(0.04), albedo, metallic);
vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
float NDF = distributionGGX(N, H, roughness);
float G = geometrySmith(N, V, L, roughness);

vec3 numerator = NDF * G * F;
float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
vec3 specular = numerator / denominator;
```

**Files to create:**
```
packages/runtime/src/graphics/
├── WebGLRenderer.ts          # Main renderer
├── RenderQueue.ts            # Draw ordering
├── ShaderManager.ts          # Shader compilation
├── TextureManager.ts         # Texture handling
├── BufferManager.ts          # VAO/VBO pools
├── MaterialSystem.ts         # PBR materials
├── LightingSystem.ts         # Lights, shadows
└── shaders/
    ├── pbr.vert.glsl
    ├── pbr.frag.glsl
    ├── skybox.vert.glsl
    └── skybox.frag.glsl
```

**Performance targets (from WorldDefinitionSchema):**
```typescript
rendering: {
  maxDrawCalls: 1000,
  maxTriangles: 2000000,
  targetFPS: 72,
  shadowMapSize: 2048,
  maxLights: 8
}
```

**Acceptance criteria:**
- [ ] WebGL 2.0 context works
- [ ] PBR materials render correctly
- [ ] IBL environment lighting
- [ ] <1000 draw calls maintained
- [ ] 72 FPS on Quest 3

---

#### Quest 3 Adapter - Platform Agent

**Location:** `packages/runtime/src/platforms/quest/`

**What to build:**
Meta Quest 3 platform adapter using WebXR.

**Implementation:**

1. **WebXR Session:**
```typescript
class QuestAdapter implements PlatformAdapter {
  private xrSession: XRSession | null = null;
  private xrRefSpace: XRReferenceSpace | null = null;

  async initialize(): Promise<void> {
    if (!navigator.xr) throw new Error('WebXR not supported');

    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) throw new Error('VR not supported');

    this.xrSession = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking', 'hit-test']
    });

    this.xrRefSpace = await this.xrSession.requestReferenceSpace('local-floor');
  }

  startRenderLoop(renderer: Renderer): void {
    this.xrSession!.requestAnimationFrame((time, frame) => {
      const pose = frame.getViewerPose(this.xrRefSpace!);
      if (pose) {
        for (const view of pose.views) {
          renderer.renderView(view);
        }
      }
    });
  }
}
```

2. **Input Handling:**
   - Controller tracking (grip, aim poses)
   - Button/trigger/thumbstick input
   - Hand tracking (if available)
   - Haptic feedback

3. **Passthrough (Mixed Reality):**
   - Enable/disable passthrough
   - Passthrough layers
   - Occlusion handling

4. **Performance:**
   - 90 FPS target
   - Foveated rendering
   - Fixed foveated rendering (FFR)
   - Application SpaceWarp (ASW)

**Files to create:**
```
packages/runtime/src/platforms/quest/
├── QuestAdapter.ts           # Main adapter
├── QuestInputManager.ts      # Controllers, hands
├── QuestPassthrough.ts       # MR features
├── QuestPerformance.ts       # FFR, ASW
└── QuestHaptics.ts           # Vibration
```

**Capability matrix:**
```typescript
const QUEST_3_CAPABILITIES: CapabilityMatrix = {
  platform: 'quest3',
  xr: {
    vr: true,
    ar: true,
    handTracking: true,
    eyeTracking: true,
    passthrough: true,
    spatialAnchors: true
  },
  graphics: {
    maxTextureSize: 4096,
    maxDrawCalls: 500,
    shadowsSupported: true,
    hdrSupported: false
  },
  audio: {
    spatialAudio: true,
    maxSources: 32
  }
};
```

**Acceptance criteria:**
- [ ] VR session starts on Quest 3
- [ ] Controller tracking works
- [ ] Hand tracking works
- [ ] Passthrough toggles
- [ ] 90 FPS maintained

</details>

### Q2: Sprint 2 (Apr-May) - 4 weeks

| Feature | Agent | Days |
|---------|-------|------|
| Entity component system | Runtime | 5 |
| Asset streaming pipeline | Network | 4 |
| Shadow mapping | Graphics | 4 |
| VisionOS adapter | Platform | 5 |
| CDN infrastructure | Infra | 4 |

<details>
<summary><strong>📋 Sprint 2 Detailed Specifications</strong></summary>

#### Entity Component System - Runtime Agent

**Location:** `packages/runtime/src/ecs/`

**What to build:**
High-performance ECS for managing scene entities.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  World                                                      │
│  ├── Entity Pool (sparse set)                              │
│  ├── Component Storage (archetypes)                        │
│  └── System Scheduler                                       │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

1. **Entity Management:**
```typescript
class EntityManager {
  private entities: Set<EntityId> = new Set();
  private recycled: EntityId[] = [];
  private generation: Map<number, number> = new Map();

  create(): EntityId {
    if (this.recycled.length > 0) {
      const id = this.recycled.pop()!;
      const gen = (this.generation.get(id) || 0) + 1;
      this.generation.set(id, gen);
      return { id, generation: gen };
    }
    const id = this.entities.size;
    this.entities.add(id);
    return { id, generation: 0 };
  }

  destroy(entity: EntityId): void {
    this.entities.delete(entity.id);
    this.recycled.push(entity.id);
  }
}
```

2. **Component Storage:**
```typescript
// Archetype-based storage for cache efficiency
class ComponentStorage<T> {
  private data: Map<number, T> = new Map();

  set(entity: EntityId, component: T): void {
    this.data.set(entity.id, component);
  }

  get(entity: EntityId): T | undefined {
    return this.data.get(entity.id);
  }

  query(filter: ComponentFilter): Iterator<[EntityId, T]> {
    // Return matching entities
  }
}
```

3. **Built-in Components:**
   - Transform (position, rotation, scale)
   - Mesh (geometry reference)
   - Material (material reference)
   - RigidBody (physics body ID)
   - AudioSource (audio source ID)
   - NetworkIdentity (network sync)
   - Scripts (behavior references)

4. **System Scheduling:**
   - Phase ordering (input, update, physics, render)
   - Parallel system execution
   - Dependency resolution

**Files to create:**
```
packages/runtime/src/ecs/
├── World.ts                  # Main ECS world
├── EntityManager.ts          # Entity lifecycle
├── ComponentStorage.ts       # Component data
├── SystemScheduler.ts        # Update ordering
├── Query.ts                  # Entity queries
└── components/
    ├── Transform.ts
    ├── MeshRenderer.ts
    ├── RigidBody.ts
    └── NetworkIdentity.ts
```

**Acceptance criteria:**
- [ ] Create/destroy 10,000 entities/frame
- [ ] Component queries <1ms
- [ ] Systems run in parallel
- [ ] Entity references stable across frames
- [ ] Serialization for networking

---

#### Asset Streaming Pipeline - Network Agent

**Location:** `packages/runtime/src/assets/`

**What to build:**
Progressive asset loading with priority and caching.

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Request    │────▶│  Scheduler  │────▶│  Loader     │
│  Queue      │     │  (priority) │     │  (parallel) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Cache      │     │  Decoder    │
                    │  (LRU)      │     │  (workers)  │
                    └─────────────┘     └─────────────┘
```

**Implementation:**

1. **Request Queue:**
```typescript
interface AssetRequest {
  url: string;
  type: AssetType;
  priority: 'critical' | 'high' | 'normal' | 'low';
  onProgress?: (progress: number) => void;
  onComplete?: (asset: Asset) => void;
  onError?: (error: Error) => void;
}

class AssetScheduler {
  private queue: PriorityQueue<AssetRequest>;
  private inFlight: Map<string, Promise<Asset>>;
  private maxConcurrent = 4;

  enqueue(request: AssetRequest): void {
    // Deduplicate requests
    if (this.inFlight.has(request.url)) {
      return this.inFlight.get(request.url)!;
    }
    this.queue.push(request);
    this.processNext();
  }
}
```

2. **Chunk Streaming:**
   - Large assets split into chunks (16KB)
   - Progressive loading for textures
   - LOD streaming for models
   - Bandwidth adaptation

3. **Caching:**
   - Memory cache (LRU, configurable size)
   - IndexedDB for persistence
   - Cache headers for CDN
   - Cache invalidation

4. **Decoding:**
   - Web Workers for heavy decoding
   - glTF/GLB parsing
   - Texture decompression (Basis, KTX2)
   - Audio decoding

**Asset types:**
```typescript
type AssetType =
  | 'model'      // glTF, GLB
  | 'texture'    // PNG, JPEG, KTX2, Basis
  | 'audio'      // MP3, OGG, WAV
  | 'video'      // MP4, WebM
  | 'script'     // HoloScript
  | 'animation'  // Animation clips
  | 'material'   // Material definitions
  | 'prefab';    // Entity prefabs
```

**Files to create:**
```
packages/runtime/src/assets/
├── AssetScheduler.ts         # Request scheduling
├── AssetLoader.ts            # Fetch and decode
├── AssetCache.ts             # Memory + IndexedDB
├── ChunkStreamer.ts          # Large file streaming
├── decoders/
│   ├── ModelDecoder.ts       # glTF parsing
│   ├── TextureDecoder.ts     # Image formats
│   └── AudioDecoder.ts       # Audio formats
└── workers/
    └── decode.worker.ts      # Background decoding
```

**Acceptance criteria:**
- [ ] 4 concurrent downloads
- [ ] Priority-based scheduling
- [ ] Progressive texture loading
- [ ] <100ms cache lookup
- [ ] IndexedDB persistence

---

#### Shadow Mapping - Graphics Agent

**Location:** `packages/runtime/src/graphics/shadows/`

**What to build:**
Real-time shadows for directional and point lights.

**Implementation:**

1. **Shadow Map Generation:**
```typescript
class ShadowMapper {
  private shadowMaps: Map<Light, WebGLTexture> = new Map();
  private shadowFBO: WebGLFramebuffer;

  renderShadowMap(light: DirectionalLight, scene: Scene): void {
    // Bind shadow FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
    gl.viewport(0, 0, this.shadowMapSize, this.shadowMapSize);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Calculate light-space matrix
    const lightView = mat4.lookAt(light.position, light.target, UP);
    const lightProj = mat4.ortho(-50, 50, -50, 50, 0.1, 100);
    const lightSpaceMatrix = mat4.multiply(lightProj, lightView);

    // Render scene from light's POV
    for (const entity of scene.shadowCasters) {
      this.renderDepthOnly(entity, lightSpaceMatrix);
    }
  }
}
```

2. **Shadow Techniques:**
   - Directional: Cascaded Shadow Maps (CSM)
   - Point lights: Cube shadow maps
   - Spot lights: Single shadow map
   - Soft shadows: PCF or PCSS

3. **Optimizations:**
   - Shadow frustum culling
   - Shadow caster culling
   - Shadow cache (static objects)
   - Temporal stability

4. **Quality Settings:**
```typescript
interface ShadowConfig {
  enabled: boolean;
  mapSize: 512 | 1024 | 2048 | 4096;
  cascades: 1 | 2 | 4;
  softness: 'none' | 'pcf' | 'pcss';
  distance: number;
  bias: number;
}
```

**Shader additions:**
```glsl
// Shadow sampling
float shadow = 0.0;
vec4 fragPosLightSpace = u_lightSpaceMatrix * vec4(fragPos, 1.0);
vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
projCoords = projCoords * 0.5 + 0.5;

float closestDepth = texture(u_shadowMap, projCoords.xy).r;
float currentDepth = projCoords.z;
float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;
```

**Files to create:**
```
packages/runtime/src/graphics/shadows/
├── ShadowMapper.ts           # Main shadow system
├── CascadedShadowMaps.ts     # CSM for directional
├── CubeShadowMap.ts          # Point light shadows
├── ShadowAtlas.ts            # Texture atlas
└── shaders/
    ├── shadow.vert.glsl
    └── shadow.frag.glsl
```

**Acceptance criteria:**
- [ ] Directional shadows work
- [ ] CSM for large scenes
- [ ] Soft shadows (PCF)
- [ ] <2ms shadow pass
- [ ] No shadow acne

---

#### VisionOS Adapter - Platform Agent

**Location:** `packages/runtime/src/platforms/visionos/`

**What to build:**
Apple Vision Pro platform adapter.

**Implementation:**

1. **SwiftUI Integration:**
```swift
// VisionOS native layer
import SwiftUI
import RealityKit

@Observable
class HololandBridge {
    var immersiveSpaceState: ImmersiveSpaceState = .closed

    func openImmersiveSpace() async {
        await openImmersiveSpace(id: "hololand-immersive")
    }

    func processMessage(_ message: Data) {
        // Bridge to JavaScript runtime
    }
}
```

2. **WebXR Polyfill:**
```typescript
// JavaScript side
class VisionOSAdapter implements PlatformAdapter {
  private bridge: VisionOSBridge;

  async initialize(): Promise<void> {
    // Check for native bridge
    if (window.visionOSBridge) {
      this.bridge = window.visionOSBridge;
      await this.bridge.initialize();
    } else {
      throw new Error('VisionOS bridge not available');
    }
  }

  getHeadPose(): Pose {
    return this.bridge.getHeadPose();
  }

  getHandPoses(): { left: HandPose; right: HandPose } {
    return this.bridge.getHandPoses();
  }
}
```

3. **RealityKit Integration:**
   - Entity synchronization
   - Material conversion
   - Lighting matching
   - Spatial audio passthrough

4. **VisionOS Features:**
   - Eye tracking
   - Hand tracking (native quality)
   - Spatial personas
   - SharePlay integration

**Files to create:**
```
packages/runtime/src/platforms/visionos/
├── VisionOSAdapter.ts        # JS adapter
├── VisionOSBridge.swift      # Native bridge
├── VisionOSInput.ts          # Eye + hand tracking
├── VisionOSRenderer.ts       # RealityKit sync
└── SharePlayIntegration.ts   # Social features
```

**Acceptance criteria:**
- [ ] Runs in VisionOS simulator
- [ ] Hand tracking works
- [ ] Eye tracking works
- [ ] 90 FPS maintained
- [ ] Spatial audio works

---

#### CDN Infrastructure - Infra Agent

**Location:** Infrastructure (not in code repo)

**What to build:**
Global CDN for asset delivery.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  Origin (S3/GCS)                                           │
│  └── Asset storage with versioning                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CDN Edge (CloudFront/Fastly)                              │
│  ├── North America (us-east, us-west)                      │
│  ├── Europe (eu-west, eu-central)                          │
│  ├── Asia (ap-northeast, ap-southeast)                     │
│  └── Global anycast                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Client                                                     │
│  └── Asset requests with cache headers                     │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

1. **Origin Setup:**
   - S3 bucket with versioning
   - Bucket policy for CDN access
   - Cross-region replication
   - Lifecycle rules for old versions

2. **CDN Configuration:**
```hcl
# Terraform example
resource "aws_cloudfront_distribution" "assets" {
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-assets"
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-assets"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 31536000 # 1 year
  }
}
```

3. **Cache Strategy:**
   - Immutable assets: 1 year cache
   - Mutable assets: ETag validation
   - Manifest files: Short TTL (5 min)
   - Versioned URLs: `/assets/v2/model.glb`

4. **Monitoring:**
   - Cache hit ratio
   - Origin load
   - Global latency (p50, p95, p99)
   - Bandwidth usage

**Acceptance criteria:**
- [ ] <50ms asset latency (p50)
- [ ] >95% cache hit ratio
- [ ] 99.9% uptime
- [ ] Auto-scaling origin
- [ ] Cost alerts configured

</details>

### Q2-Q3: Sprint 3 (Jun-Jul) - 4 weeks

| Feature | Agent | Days |
|---------|-------|------|
| Voice chat system | Network | 5 |
| Post-processing effects | Graphics | 4 |
| Input abstraction layer | Runtime | 3 |
| Android XR adapter | Platform | 5 |
| Analytics pipeline | Infra | 4 |

<details>
<summary><strong>📋 Sprint 3 Detailed Specifications</strong></summary>

#### Voice Chat System - Network Agent

**Location:** `packages/runtime/src/voice/`

**What to build:**
Real-time voice communication with spatial audio.

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Microphone │────▶│  Encoder    │────▶│  Network    │
│  (getUserMedia)   │  (Opus)     │     │  (WebRTC)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Speakers   │◀────│  Decoder    │◀────│  Receive    │
│  (spatial)  │     │  (Opus)     │     │  Buffer     │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Implementation:**

1. **Capture:**
```typescript
class VoiceCapture {
  private stream: MediaStream | null = null;
  private processor: AudioWorkletNode | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      }
    });

    const context = new AudioContext({ sampleRate: 48000 });
    await context.audioWorklet.addModule('voice-processor.js');

    const source = context.createMediaStreamSource(this.stream);
    this.processor = new AudioWorkletNode(context, 'voice-processor');
    source.connect(this.processor);

    this.processor.port.onmessage = (e) => {
      this.onAudioData(e.data);
    };
  }
}
```

2. **Encoding (Opus):**
   - Use libopus via WASM
   - 48kHz, mono, ~32kbps
   - Frame size: 20ms (960 samples)
   - Packet loss concealment

3. **Transport:**
   - WebRTC data channel (low latency)
   - Fallback to WebSocket
   - Jitter buffer (adaptive)
   - Priority over other traffic

4. **Spatial Playback:**
   - Position voice at speaker's location
   - Distance attenuation
   - Occlusion (walls block voice)
   - Voice activity detection (VAD)

**Files to create:**
```
packages/runtime/src/voice/
├── VoiceService.ts           # Main service
├── VoiceCapture.ts           # Microphone input
├── OpusCodec.ts              # Encode/decode
├── VoiceTransport.ts         # WebRTC/WS
├── SpatialVoice.ts           # 3D positioning
└── worklets/
    └── voice-processor.js    # AudioWorklet
```

**Acceptance criteria:**
- [ ] Voice capture works
- [ ] <150ms end-to-end latency
- [ ] Spatial positioning
- [ ] Echo cancellation
- [ ] Push-to-talk option

---

#### Post-Processing Effects - Graphics Agent

**Location:** `packages/runtime/src/graphics/postprocess/`

**What to build:**
Screen-space effects for visual polish.

**Effects to implement:**

1. **Bloom:**
```glsl
// Bloom threshold pass
vec3 color = texture(u_scene, v_uv).rgb;
float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
vec3 result = brightness > u_threshold ? color : vec3(0.0);

// Blur passes (separable Gaussian)
// Composite: scene + bloom * intensity
```

2. **Tone Mapping:**
```glsl
// ACES tone mapping
vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
```

3. **Ambient Occlusion (SSAO):**
   - Screen-space AO
   - 16-32 samples
   - Bilateral blur
   - Half-resolution

4. **Anti-aliasing (FXAA/TAA):**
   - FXAA for mobile
   - TAA for desktop
   - Velocity buffer for TAA

5. **Color Grading:**
   - LUT-based grading
   - Exposure, contrast, saturation
   - Split toning
   - Vignette

**Pipeline:**
```
Scene Render → SSAO → Bloom → Tone Map → Color Grade → AA → Output
```

**Files to create:**
```
packages/runtime/src/graphics/postprocess/
├── PostProcessPipeline.ts    # Effect chain
├── effects/
│   ├── Bloom.ts
│   ├── SSAO.ts
│   ├── ToneMapping.ts
│   ├── ColorGrading.ts
│   ├── FXAA.ts
│   └── TAA.ts
└── shaders/
    ├── bloom.frag.glsl
    ├── ssao.frag.glsl
    ├── tonemap.frag.glsl
    └── fxaa.frag.glsl
```

**Acceptance criteria:**
- [ ] Bloom works
- [ ] SSAO works
- [ ] Tone mapping (ACES)
- [ ] FXAA/TAA selectable
- [ ] <2ms total post-process

---

#### Input Abstraction Layer - Runtime Agent

**Location:** `packages/runtime/src/input/`

**What to build:**
Unified input system across all platforms.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  Input Sources                                              │
│  ├── Keyboard/Mouse                                        │
│  ├── Gamepad                                               │
│  ├── Touch                                                 │
│  ├── XR Controllers                                        │
│  └── Hand Tracking                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Input Manager                                              │
│  ├── Action Bindings                                       │
│  ├── Axis Mappings                                         │
│  └── Gesture Recognition                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Game Logic                                                 │
│  └── Uses abstract actions, not raw input                  │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

1. **Action System:**
```typescript
interface InputAction {
  name: string;
  type: 'button' | 'axis' | 'vector2' | 'pose';
  bindings: InputBinding[];
}

const actions: InputAction[] = [
  {
    name: 'grab',
    type: 'button',
    bindings: [
      { source: 'keyboard', key: 'E' },
      { source: 'gamepad', button: 'rightTrigger' },
      { source: 'xr', button: 'grip' },
      { source: 'hand', gesture: 'pinch' }
    ]
  },
  {
    name: 'move',
    type: 'vector2',
    bindings: [
      { source: 'keyboard', keys: ['W', 'A', 'S', 'D'] },
      { source: 'gamepad', axis: 'leftStick' },
      { source: 'xr', axis: 'leftThumbstick' }
    ]
  }
];
```

2. **Gesture Recognition:**
   - Pinch (grab)
   - Point (select)
   - Thumbs up (confirm)
   - Open hand (release)
   - Swipe (scroll)

3. **Haptic Feedback:**
```typescript
interface HapticFeedback {
  play(pattern: HapticPattern): void;
  stop(): void;
}

type HapticPattern =
  | { type: 'impulse'; intensity: number; duration: number }
  | { type: 'vibration'; frequency: number; amplitude: number; duration: number }
  | { type: 'preset'; name: 'click' | 'success' | 'error' };
```

**Files to create:**
```
packages/runtime/src/input/
├── InputManager.ts           # Main manager
├── ActionSystem.ts           # Action bindings
├── sources/
│   ├── KeyboardMouse.ts
│   ├── Gamepad.ts
│   ├── Touch.ts
│   ├── XRController.ts
│   └── HandTracking.ts
├── GestureRecognizer.ts      # Hand gestures
└── HapticFeedback.ts         # Vibration
```

**Acceptance criteria:**
- [ ] Actions work across platforms
- [ ] Rebindable controls
- [ ] Hand gesture recognition
- [ ] Haptic feedback
- [ ] <1 frame input latency

---

#### Android XR Adapter - Platform Agent

**Location:** `packages/runtime/src/platforms/android-xr/`

**What to build:**
Google Android XR platform adapter.

**Implementation:**

1. **WebXR on Android XR:**
```typescript
class AndroidXRAdapter implements PlatformAdapter {
  async initialize(): Promise<void> {
    const session = await navigator.xr?.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: [
        'hand-tracking',
        'depth-sensing',
        'hit-test'
      ]
    });
    // Android XR supports standard WebXR
  }
}
```

2. **Unique Features:**
   - Depth sensing API
   - Plane detection
   - Hit testing
   - Environment understanding
   - Passthrough (if hardware supports)

3. **Performance Targets:**
   - 90 FPS for VR mode
   - Dynamic resolution scaling
   - Foveated rendering (if available)

**Files to create:**
```
packages/runtime/src/platforms/android-xr/
├── AndroidXRAdapter.ts       # Main adapter
├── AndroidXRDepth.ts         # Depth sensing
├── AndroidXRPlanes.ts        # Plane detection
└── AndroidXRPerformance.ts   # Perf tuning
```

**Acceptance criteria:**
- [ ] Runs on Android XR devices
- [ ] Hand tracking works
- [ ] Depth sensing works
- [ ] 90 FPS target
- [ ] Passthrough (where available)

---

#### Analytics Pipeline - Infra Agent

**Location:** Infrastructure + `packages/runtime/src/analytics/`

**What to build:**
Event tracking and performance monitoring.

**Client-side:**
```typescript
class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private batchInterval = 5000; // 5 seconds

  track(event: AnalyticsEvent): void {
    this.queue.push({
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    });
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, 100);
    await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify(batch)
    });
  }
}
```

**Server-side pipeline:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  API        │────▶│  Kinesis    │────▶│  Lambda     │
│  Gateway    │     │  Firehose   │     │  Transform  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Redshift   │◀────│  S3         │◀────│  Glue       │
│  (query)    │     │  (storage)  │     │  (catalog)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Event types:**
```typescript
type AnalyticsEvent =
  | { type: 'session_start'; platform: string; device: string }
  | { type: 'session_end'; duration: number }
  | { type: 'world_join'; worldId: string }
  | { type: 'world_leave'; worldId: string; duration: number }
  | { type: 'performance'; fps: number; drawCalls: number; memory: number }
  | { type: 'error'; message: string; stack: string }
  | { type: 'custom'; name: string; properties: Record<string, unknown> };
```

**Dashboards:**
- DAU/MAU
- Session duration
- World popularity
- Performance by platform
- Error rates

**Acceptance criteria:**
- [ ] Client tracking works
- [ ] <5s event ingestion
- [ ] Queryable within 1 hour
- [ ] Dashboard live
- [ ] GDPR compliant (consent)

</details>

---

## 2026 H2 Roadmap (AI-Accelerated)

### Q3: Sprint 4 (Aug-Sep) - 4 weeks

| Feature | Agent | Days |
|---------|-------|------|
| State synchronization | Network | 5 |
| Animation system | Runtime | 5 |
| WebGPU renderer | Graphics | 6 |
| SteamVR adapter | Platform | 4 |

<details>
<summary><strong>📋 Sprint 4 Detailed Specifications</strong></summary>

#### State Synchronization - Network Agent

**Location:** `packages/runtime/src/network/sync/`

**What to build:**
Delta-compressed state sync for multiplayer.

**Implementation:**

1. **State Snapshot:**
```typescript
interface EntityState {
  id: string;
  components: {
    transform?: { position: vec3; rotation: quat; scale: vec3 };
    physics?: { velocity: vec3; angularVelocity: vec3 };
    custom?: Record<string, unknown>;
  };
  sequence: number;
}

class StateManager {
  private baseline: Map<string, EntityState> = new Map();
  private pending: Map<string, EntityState> = new Map();

  createDelta(current: EntityState): DeltaState {
    const baseline = this.baseline.get(current.id);
    if (!baseline) return { full: current };

    const delta: Partial<EntityState> = { id: current.id };
    // Only include changed components
    for (const [key, value] of Object.entries(current.components)) {
      if (!deepEqual(value, baseline.components[key])) {
        delta.components = delta.components || {};
        delta.components[key] = value;
      }
    }
    return { delta };
  }
}
```

2. **Interest Management:**
   - Only sync entities within interest radius (100m default)
   - Priority based on distance
   - Ownership determines authority

3. **Interpolation:**
```typescript
class Interpolator {
  private buffer: StateSnapshot[] = [];
  private interpolationDelay = 100; // ms

  addSnapshot(snapshot: StateSnapshot): void {
    this.buffer.push(snapshot);
    // Keep last 1 second of snapshots
    while (this.buffer.length > 60) {
      this.buffer.shift();
    }
  }

  getInterpolatedState(time: number): StateSnapshot {
    const targetTime = time - this.interpolationDelay;
    // Find surrounding snapshots and lerp
  }
}
```

4. **Conflict Resolution:**
   - Server authoritative for positions
   - Last-write-wins for properties
   - Client prediction with reconciliation

**Files to create:**
```
packages/runtime/src/network/sync/
├── StateManager.ts           # State tracking
├── DeltaCompressor.ts        # Delta encoding
├── InterestManager.ts        # Spatial filtering
├── Interpolator.ts           # Smooth interpolation
└── Reconciler.ts             # Prediction correction
```

**Acceptance criteria:**
- [ ] Delta compression <30% full size
- [ ] 100 entities sync at 20Hz
- [ ] <200ms perceived latency
- [ ] Smooth interpolation
- [ ] Prediction works

---

#### Animation System - Runtime Agent

**Location:** `packages/runtime/src/animation/`

**What to build:**
Skeletal animation with blending.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  Animation Graph                                            │
│  ├── States (idle, walk, run, jump)                        │
│  ├── Transitions (conditions, blend times)                 │
│  └── Blend Trees (directional movement)                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Animation Sampler                                          │
│  ├── Keyframe interpolation                                │
│  ├── Bone transforms                                       │
│  └── Root motion                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Skinning                                                   │
│  └── GPU skinning (vertex shader)                          │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

1. **Animation Clips:**
```typescript
interface AnimationClip {
  name: string;
  duration: number;
  tracks: AnimationTrack[];
  loop: boolean;
}

interface AnimationTrack {
  targetBone: string;
  property: 'position' | 'rotation' | 'scale';
  keyframes: Keyframe[];
  interpolation: 'linear' | 'step' | 'cubic';
}
```

2. **State Machine:**
```typescript
interface AnimationState {
  name: string;
  clip: AnimationClip;
  speed: number;
  transitions: Transition[];
}

interface Transition {
  target: string;
  condition: () => boolean;
  duration: number; // Blend time
  exitTime?: number; // When to allow transition
}
```

3. **Blend Trees:**
   - 1D blend (walk speed)
   - 2D blend (directional movement)
   - Additive blending (layered animations)

4. **GPU Skinning:**
```glsl
// Vertex shader skinning
uniform mat4 u_boneMatrices[MAX_BONES];

void main() {
    mat4 skinMatrix =
        a_weights.x * u_boneMatrices[int(a_joints.x)] +
        a_weights.y * u_boneMatrices[int(a_joints.y)] +
        a_weights.z * u_boneMatrices[int(a_joints.z)] +
        a_weights.w * u_boneMatrices[int(a_joints.w)];

    vec4 skinnedPosition = skinMatrix * vec4(a_position, 1.0);
    gl_Position = u_mvp * skinnedPosition;
}
```

**Files to create:**
```
packages/runtime/src/animation/
├── AnimationSystem.ts        # Main system
├── AnimationClip.ts          # Clip data
├── AnimationSampler.ts       # Keyframe sampling
├── StateMachine.ts           # State transitions
├── BlendTree.ts              # 1D/2D blending
├── Skeleton.ts               # Bone hierarchy
└── GPUSkinning.ts            # Shader skinning
```

**Acceptance criteria:**
- [ ] Play animation clips
- [ ] State machine transitions
- [ ] Blend trees work
- [ ] GPU skinning
- [ ] 100 animated characters at 60 FPS

---

#### WebGPU Renderer - Graphics Agent

**Location:** `packages/runtime/src/graphics/webgpu/`

**What to build:**
WebGPU renderer for next-gen performance.

**Why WebGPU:**
- Compute shaders
- Better CPU overhead
- Explicit resource management
- Modern GPU features

**Implementation:**

1. **Device Initialization:**
```typescript
class WebGPURenderer {
  private adapter: GPUAdapter;
  private device: GPUDevice;
  private context: GPUCanvasContext;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();

    this.context = canvas.getContext('webgpu')!;
    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied'
    });
  }
}
```

2. **Render Pipeline:**
```typescript
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({ code: vertexShader }),
    entryPoint: 'main',
    buffers: [vertexBufferLayout]
  },
  fragment: {
    module: device.createShaderModule({ code: fragmentShader }),
    entryPoint: 'main',
    targets: [{ format: presentationFormat }]
  },
  primitive: {
    topology: 'triangle-list',
    cullMode: 'back'
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus'
  }
});
```

3. **Compute Shaders:**
   - GPU particle systems
   - Skinning
   - Culling
   - Physics (future)

4. **Bindless Resources:**
   - Texture arrays
   - Buffer arrays
   - Reduced draw calls

**WGSL Shaders:**
```wgsl
// PBR fragment shader
@fragment
fn main(input: VertexOutput) -> @location(0) vec4f {
    let albedo = textureSample(albedoTexture, albedoSampler, input.uv).rgb;
    let normal = calculateNormal(input);
    let metallic = textureSample(metallicTexture, metallicSampler, input.uv).r;
    let roughness = textureSample(roughnessTexture, roughnessSampler, input.uv).r;

    // PBR lighting calculation
    let color = calculatePBR(albedo, normal, metallic, roughness);
    return vec4f(color, 1.0);
}
```

**Files to create:**
```
packages/runtime/src/graphics/webgpu/
├── WebGPURenderer.ts         # Main renderer
├── WebGPUPipeline.ts         # Pipeline management
├── WebGPUBuffer.ts           # Buffer handling
├── WebGPUTexture.ts          # Texture handling
├── WebGPUCompute.ts          # Compute shaders
└── shaders/
    ├── pbr.wgsl
    ├── skinning.wgsl
    ├── particles.wgsl
    └── culling.wgsl
```

**Acceptance criteria:**
- [ ] WebGPU initialization
- [ ] PBR rendering matches WebGL
- [ ] Compute shader particles
- [ ] 2x draw call reduction
- [ ] Falls back to WebGL gracefully

---

#### SteamVR Adapter - Platform Agent

**Location:** `packages/runtime/src/platforms/steamvr/`

**What to build:**
SteamVR/OpenXR adapter for PC VR.

**Implementation:**

1. **OpenXR Runtime:**
```typescript
class SteamVRAdapter implements PlatformAdapter {
  async initialize(): Promise<void> {
    // Use WebXR which maps to OpenXR on desktop
    const session = await navigator.xr?.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: [
        'hand-tracking',
        'high-refresh-rate',
        'high-fixed-foveated-rendering'
      ]
    });

    // Request high refresh rate
    const supportedRates = await session.supportedFrameRates;
    if (supportedRates?.includes(120)) {
      await session.updateTargetFrameRate(120);
    }
  }
}
```

2. **Controller Support:**
   - Valve Index controllers
   - HTC Vive controllers
   - Windows Mixed Reality controllers
   - Generic XR controllers

3. **Desktop Features:**
   - High refresh rate (up to 144Hz)
   - High resolution
   - Full hand tracking (Index)
   - Advanced haptics

**Files to create:**
```
packages/runtime/src/platforms/steamvr/
├── SteamVRAdapter.ts         # Main adapter
├── SteamVRInput.ts           # Controller mapping
├── SteamVRPerformance.ts     # High-end settings
└── SteamVRHaptics.ts         # Advanced haptics
```

**Acceptance criteria:**
- [ ] Works with SteamVR
- [ ] Index controller support
- [ ] 90-144 FPS
- [ ] Finger tracking (Index)
- [ ] Advanced haptics

</details>

### Q4: Sprint 5 (Oct-Nov) - 4 weeks

| Feature | Agent | Days |
|---------|-------|------|
| World persistence | Network | 5 |
| Particle system | Graphics | 4 |
| Scripting runtime | Runtime | 5 |
| Mobile web adapter | Platform | 4 |

### Q4: Sprint 6 (Dec) - 2 weeks

| Feature | Agent | Days |
|---------|-------|------|
| Performance profiler | Runtime | 4 |
| World editor integration | Graphics | 4 |
| Hololand 1.0 release | All | 3 |

---

## 2027 Roadmap (AI-Accelerated)

### Q1: Sprint 7 (Jan-Feb) - 4 weeks

| Feature | Agent | Days |
|---------|-------|------|
| AI NPC system | Runtime | 6 |
| Global illumination | Graphics | 6 |
| Matchmaking service | Network | 5 |
| Pico adapter | Platform | 4 |

### Q2: Sprint 8 (Mar-Apr) - 4 weeks

| Feature | Agent | Days |
|---------|-------|------|
| Procedural generation | Runtime | 5 |
| Ray tracing (WebGPU) | Graphics | 6 |
| Social features | Network | 5 |
| HoloLens 2 adapter | Platform | 5 |

### Q3-Q4: Sprint 9-10 (May-Aug) - 8 weeks

| Feature | Agent | Days |
|---------|-------|------|
| Cloud rendering | Infra | 8 |
| Volumetric effects | Graphics | 6 |
| Spatial anchors | Platform | 5 |
| Hololand 2.0 release | All | 5 |

---

## 2028 Roadmap (Ecosystem Growth)

- Enterprise features (SSO, audit logs)
- Custom domain worlds
- Marketplace integration
- Partner platform SDK
- 100,000+ concurrent users target

---

## Platform Support Matrix

| Platform | Adapter | Status | Target FPS |
|----------|---------|--------|------------|
| Quest 3 | WebXR | Sprint 1 | 90 |
| Vision Pro | Native + WebXR | Sprint 2 | 90 |
| Android XR | WebXR | Sprint 3 | 90 |
| SteamVR | WebXR/OpenXR | Sprint 4 | 90-144 |
| Mobile Web | WebGL | Sprint 5 | 60 |
| Desktop Web | WebGL/WebGPU | Sprint 1 | 60-120 |
| Pico | WebXR | Sprint 7 | 90 |
| HoloLens 2 | WebXR | Sprint 8 | 60 |

---

## Performance Targets

| Metric | Mobile | VR | Desktop |
|--------|--------|-----|---------|
| FPS | 60 | 90 | 60-144 |
| Draw calls | 500 | 500 | 1000 |
| Triangles | 500K | 1M | 2M |
| Texture memory | 256MB | 512MB | 1GB |
| Physics bodies | 500 | 1000 | 2000 |
| Audio sources | 16 | 32 | 64 |

---

## AI Agent Velocity

- **Work pattern**: 24/7 parallel execution
- **Human weeks → AI days**: ~5:1 compression ratio
- **5 agents in parallel**: 5x throughput multiplier
- **Total acceleration**: ~25x faster than traditional team
- **Buffer**: 30% for review, testing, and iteration

---

## Milestones (AI-Accelerated Timeline)

### 2026
- [ ] Mar: Core runtime functional (physics, audio, WebGL)
- [ ] May: Quest 3 + VisionOS working
- [ ] Jul: Voice chat + post-processing
- [ ] Sep: State sync + WebGPU
- [ ] Dec: Hololand 1.0 release

### 2027
- [ ] Feb: AI NPCs + GI
- [ ] Apr: Ray tracing + social
- [ ] Aug: Hololand 2.0 release

---

## Contributing

```bash
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand
pnpm install
pnpm build
pnpm test
```

### Current Sprint Priorities (Sprint 1)

1. WebSocket connection layer - **Network Agent**
2. Physics engine (Rapier) - **Runtime Agent**
3. Audio system (Web Audio) - **Runtime Agent**
4. WebGL renderer - **Graphics Agent**
5. Quest 3 adapter - **Platform Agent**

---

## AI Agent Assignment

| Agent | Current Task | Status |
|-------|--------------|--------|
| Runtime | Physics + Audio integration | 🟡 In Progress |
| Graphics | WebGL renderer foundation | 🟡 In Progress |
| Network | WebSocket connection layer | 🟡 In Progress |
| Platform | Quest 3 adapter | 🟡 In Progress |
| Infra | CDN setup | 🟡 In Progress |

---

## Related

- **[HoloScript](https://github.com/brianonbased-dev/HoloScript)** - The language
- **[Infinity Assistant](https://infinityassistant.io)** - AI assistant

---

*Last updated: 2026-01-28*
*Roadmap version: AI-Accelerated v1.0*
