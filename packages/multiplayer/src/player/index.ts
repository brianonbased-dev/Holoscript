/**
 * @holoscript/multiplayer - Player Module
 * Player synchronization, interpolation, and voice chat
 */

import {
  Vec3,
  Quaternion,
  Transform,
  PlayerState,
  PlayerInput,
  SyncedObject,
  SyncMode,
  SyncPriority,
  SyncUpdate,
  VoiceChatConfig,
  VoiceChatMode,
  VoiceStream,
  RPCCall,
  RPCHandler,
  RPCTarget,
  TransformSnapshot,
  InterpolationBuffer,
  MultiplayerEvent,
  MultiplayerEventHandler,
  NetworkMessage,
  DEFAULT_VOICE_CHAT_CONFIG,
} from '../types';

// ============================================================================
// Transform Interpolation
// ============================================================================

export class TransformInterpolator {
  private buffer: InterpolationBuffer;
  private storedDelay: number;
  
  constructor(delay: number = 100) {
    this.storedDelay = delay;
    this.buffer = {
      snapshots: [],
      delay,
      currentTime: 0,
    };
  }
  
  addSnapshot(snapshot: TransformSnapshot): void {
    // Keep buffer sorted by timestamp
    this.buffer.snapshots.push(snapshot);
    this.buffer.snapshots.sort((a, b) => a.timestamp - b.timestamp);
    
    // Limit buffer size
    while (this.buffer.snapshots.length > 20) {
      this.buffer.snapshots.shift();
    }
  }
  
  interpolate(currentTime: number): Transform | null {
    const targetTime = currentTime - this.buffer.delay;
    const snapshots = this.buffer.snapshots;
    
    if (snapshots.length < 2) {
      return snapshots.length === 1
        ? this.snapshotToTransform(snapshots[0])
        : null;
    }
    
    // Find surrounding snapshots
    let before: TransformSnapshot | null = null;
    let after: TransformSnapshot | null = null;
    
    for (let i = 0; i < snapshots.length - 1; i++) {
      if (
        snapshots[i].timestamp <= targetTime &&
        snapshots[i + 1].timestamp >= targetTime
      ) {
        before = snapshots[i];
        after = snapshots[i + 1];
        break;
      }
    }
    
    if (!before || !after) {
      // Extrapolate from last snapshot
      const last = snapshots[snapshots.length - 1];
      return this.snapshotToTransform(last);
    }
    
    // Interpolate
    const t =
      (targetTime - before.timestamp) / (after.timestamp - before.timestamp);
    
    return {
      position: this.lerpVec3(before.position, after.position, t),
      rotation: this.slerpQuat(before.rotation, after.rotation, t),
      scale: { x: 1, y: 1, z: 1 },
    };
  }
  
  getDelay(): number {
    return this.storedDelay;
  }
  
  setDelay(delay: number): void {
    this.storedDelay = delay;
    this.buffer.delay = delay;
  }
  
  clear(): void {
    this.buffer.snapshots = [];
  }
  
  private snapshotToTransform(snapshot: TransformSnapshot): Transform {
    return {
      position: snapshot.position,
      rotation: snapshot.rotation,
      scale: { x: 1, y: 1, z: 1 },
    };
  }
  
  private lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }
  
  private slerpQuat(a: Quaternion, b: Quaternion, t: number): Quaternion {
    // Simplified slerp (use nlerp for better performance)
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    
    // Handle negative dot (shortest path)
    const bx = dot < 0 ? -b.x : b.x;
    const by = dot < 0 ? -b.y : b.y;
    const bz = dot < 0 ? -b.z : b.z;
    const bw = dot < 0 ? -b.w : b.w;
    dot = Math.abs(dot);
    
    // Linear interpolation for close quaternions
    if (dot > 0.9995) {
      return this.normalizeQuat({
        x: a.x + (bx - a.x) * t,
        y: a.y + (by - a.y) * t,
        z: a.z + (bz - a.z) * t,
        w: a.w + (bw - a.w) * t,
      });
    }
    
    // Slerp
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;
    
    return {
      x: a.x * wa + bx * wb,
      y: a.y * wa + by * wb,
      z: a.z * wa + bz * wb,
      w: a.w * wa + bw * wb,
    };
  }
  
  private normalizeQuat(q: Quaternion): Quaternion {
    const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    return {
      x: q.x / len,
      y: q.y / len,
      z: q.z / len,
      w: q.w / len,
    };
  }
}

// ============================================================================
// Player Sync Manager
// ============================================================================

export class PlayerSyncManager {
  private interpolators: Map<string, {
    head: TransformInterpolator;
    leftHand: TransformInterpolator;
    rightHand: TransformInterpolator;
  }> = new Map();
  
  private localPlayerId: string | null = null;
  private sendCallback?: (message: NetworkMessage) => void;
  private updateRate: number = 20; // Hz
  private lastSendTime: number = 0;
  
  constructor(updateRate: number = 20) {
    this.updateRate = updateRate;
  }
  
  setLocalPlayer(playerId: string): void {
    this.localPlayerId = playerId;
  }
  
  setSendCallback(callback: (message: NetworkMessage) => void): void {
    this.sendCallback = callback;
  }
  
  addRemotePlayer(playerId: string, delay: number = 100): void {
    this.interpolators.set(playerId, {
      head: new TransformInterpolator(delay),
      leftHand: new TransformInterpolator(delay),
      rightHand: new TransformInterpolator(delay),
    });
  }
  
  removeRemotePlayer(playerId: string): void {
    this.interpolators.delete(playerId);
  }
  
  receivePlayerUpdate(
    playerId: string,
    headSnapshot: TransformSnapshot,
    leftHandSnapshot: TransformSnapshot,
    rightHandSnapshot: TransformSnapshot
  ): void {
    const interpolators = this.interpolators.get(playerId);
    if (!interpolators) return;
    
    interpolators.head.addSnapshot(headSnapshot);
    interpolators.leftHand.addSnapshot(leftHandSnapshot);
    interpolators.rightHand.addSnapshot(rightHandSnapshot);
  }
  
  getInterpolatedTransforms(
    playerId: string,
    currentTime: number
  ): { head: Transform; leftHand: Transform; rightHand: Transform } | null {
    const interpolators = this.interpolators.get(playerId);
    if (!interpolators) return null;
    
    const head = interpolators.head.interpolate(currentTime);
    const leftHand = interpolators.leftHand.interpolate(currentTime);
    const rightHand = interpolators.rightHand.interpolate(currentTime);
    
    if (!head || !leftHand || !rightHand) return null;
    
    return { head, leftHand, rightHand };
  }
  
  sendLocalTransforms(
    head: Transform,
    leftHand: Transform,
    rightHand: Transform
  ): void {
    const now = Date.now();
    const minInterval = 1000 / this.updateRate;
    
    if (now - this.lastSendTime < minInterval) return;
    this.lastSendTime = now;
    
    if (!this.sendCallback || !this.localPlayerId) return;
    
    this.sendCallback({
      type: 'player_transform',
      payload: {
        playerId: this.localPlayerId,
        head: this.transformToSnapshot(head, now),
        leftHand: this.transformToSnapshot(leftHand, now),
        rightHand: this.transformToSnapshot(rightHand, now),
      },
      timestamp: now,
      reliable: false,
      channel: 1,
    });
  }
  
  private transformToSnapshot(
    transform: Transform,
    timestamp: number
  ): TransformSnapshot {
    return {
      position: transform.position,
      rotation: transform.rotation,
      timestamp,
    };
  }
}

// ============================================================================
// Voice Chat Manager
// ============================================================================

export class VoiceChatManager {
  private config: VoiceChatConfig;
  private streams: Map<string, VoiceStream> = new Map();
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isTransmitting: boolean = false;
  private eventHandlers: Set<MultiplayerEventHandler> = new Set();
  
  constructor(config: Partial<VoiceChatConfig> = {}) {
    this.config = { ...DEFAULT_VOICE_CHAT_CONFIG, ...config };
  }
  
  async initialize(): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          sampleRate: this.config.sampleRate,
        },
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioContext = new AudioContext();
      
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize voice chat:', error);
      return false;
    }
  }
  
  shutdown(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.isTransmitting = false;
  }
  
  startTransmitting(): void {
    this.isTransmitting = true;
  }
  
  stopTransmitting(): void {
    this.isTransmitting = false;
  }
  
  isCurrentlyTransmitting(): boolean {
    return this.isTransmitting;
  }
  
  getLocalAudioLevel(): number {
    if (!this.analyser) return 0;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    
    return sum / (dataArray.length * 255);
  }
  
  shouldTransmit(): boolean {
    if (this.config.mode === VoiceChatMode.OpenMic) {
      return true;
    }
    
    if (this.config.mode === VoiceChatMode.PushToTalk) {
      return this.isTransmitting;
    }
    
    if (this.config.mode === VoiceChatMode.VoiceActivity) {
      return this.getLocalAudioLevel() > this.config.voiceThreshold;
    }
    
    return false;
  }
  
  addRemoteStream(playerId: string, position: Vec3): void {
    this.streams.set(playerId, {
      playerId,
      isSpeaking: false,
      audioLevel: 0,
      isMutedByLocal: false,
      isSelfMuted: false,
      position,
    });
  }
  
  removeRemoteStream(playerId: string): void {
    this.streams.delete(playerId);
  }
  
  updateStreamPosition(playerId: string, position: Vec3): void {
    const stream = this.streams.get(playerId);
    if (stream) {
      stream.position = position;
    }
  }
  
  updateStreamSpeaking(playerId: string, isSpeaking: boolean): void {
    const stream = this.streams.get(playerId);
    if (stream && stream.isSpeaking !== isSpeaking) {
      stream.isSpeaking = isSpeaking;
      this.emit({ type: 'voice_state_changed', playerId, isSpeaking });
    }
  }
  
  mutePlayer(playerId: string): void {
    const stream = this.streams.get(playerId);
    if (stream) {
      stream.isMutedByLocal = true;
    }
  }
  
  unmutePlayer(playerId: string): void {
    const stream = this.streams.get(playerId);
    if (stream) {
      stream.isMutedByLocal = false;
    }
  }
  
  getStreams(): VoiceStream[] {
    return Array.from(this.streams.values());
  }
  
  on(handler: MultiplayerEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: MultiplayerEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// RPC Manager
// ============================================================================

export class RPCManager {
  private handlers: Map<string, RPCHandler> = new Map();
  private sendCallback?: (message: NetworkMessage) => void;
  private localPlayerId: string = '';
  private eventHandlers: Set<MultiplayerEventHandler> = new Set();
  
  setLocalPlayerId(playerId: string): void {
    this.localPlayerId = playerId;
  }
  
  setSendCallback(callback: (message: NetworkMessage) => void): void {
    this.sendCallback = callback;
  }
  
  registerHandler(method: string, handler: RPCHandler['handler']): void {
    this.handlers.set(method, { method, handler });
  }
  
  unregisterHandler(method: string): void {
    this.handlers.delete(method);
  }
  
  call(call: RPCCall): void {
    if (!this.sendCallback) return;
    
    this.sendCallback({
      type: 'rpc',
      payload: call,
      timestamp: Date.now(),
      senderId: this.localPlayerId,
      reliable: call.reliable,
      channel: 2,
    });
  }
  
  callAll(method: string, ...args: unknown[]): void {
    this.call({
      method,
      args,
      target: RPCTarget.All,
      reliable: true,
    });
  }
  
  callOthers(method: string, ...args: unknown[]): void {
    this.call({
      method,
      args,
      target: RPCTarget.Others,
      reliable: true,
    });
  }
  
  callPlayer(playerId: string, method: string, ...args: unknown[]): void {
    this.call({
      method,
      args,
      target: RPCTarget.Player,
      targetPlayerId: playerId,
      reliable: true,
    });
  }
  
  callServer(method: string, ...args: unknown[]): void {
    this.call({
      method,
      args,
      target: RPCTarget.Server,
      reliable: true,
    });
  }
  
  handleIncomingRPC(senderId: string, call: RPCCall): void {
    const handler = this.handlers.get(call.method);
    if (!handler) {
      console.warn(`No handler for RPC method: ${call.method}`);
      return;
    }
    
    this.emit({
      type: 'rpc_received',
      method: call.method,
      senderId,
      args: call.args,
    });
    
    try {
      handler.handler(senderId, ...call.args);
    } catch (e) {
      console.error(`RPC handler error for ${call.method}:`, e);
    }
  }
  
  on(handler: MultiplayerEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: MultiplayerEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Object Sync Manager
// ============================================================================

export class ObjectSyncManager {
  private objects: Map<string, SyncedObject> = new Map();
  private localPlayerId: string = '';
  private sendCallback?: (message: NetworkMessage) => void;
  private eventHandlers: Set<MultiplayerEventHandler> = new Set();
  
  private networkIdCounter: number = 0;
  
  setLocalPlayerId(playerId: string): void {
    this.localPlayerId = playerId;
  }
  
  setSendCallback(callback: (message: NetworkMessage) => void): void {
    this.sendCallback = callback;
  }
  
  spawn(
    transform: Transform,
    properties: Record<string, unknown> = {},
    syncMode: SyncMode = SyncMode.OwnerToAll,
    priority: SyncPriority = SyncPriority.Normal
  ): SyncedObject {
    const networkId = `${this.localPlayerId}_${this.networkIdCounter++}`;
    
    const obj: SyncedObject = {
      networkId,
      ownerId: this.localPlayerId,
      syncMode,
      priority,
      transform,
      properties,
      lastSyncTime: Date.now(),
      isInterpolating: false,
    };
    
    this.objects.set(networkId, obj);
    
    if (this.sendCallback) {
      this.sendCallback({
        type: 'object_spawn',
        payload: obj,
        timestamp: Date.now(),
        reliable: true,
        channel: 0,
      });
    }
    
    this.emit({ type: 'object_spawned', object: obj });
    
    return obj;
  }
  
  despawn(networkId: string): boolean {
    const obj = this.objects.get(networkId);
    if (!obj) return false;
    
    // Only owner can despawn
    if (obj.ownerId !== this.localPlayerId) return false;
    
    this.objects.delete(networkId);
    
    if (this.sendCallback) {
      this.sendCallback({
        type: 'object_despawn',
        payload: { networkId },
        timestamp: Date.now(),
        reliable: true,
        channel: 0,
      });
    }
    
    this.emit({ type: 'object_despawned', networkId });
    
    return true;
  }
  
  updateObject(networkId: string, update: Partial<SyncUpdate>): void {
    const obj = this.objects.get(networkId);
    if (!obj) return;
    
    // Check ownership
    if (obj.syncMode === SyncMode.OwnerToAll && obj.ownerId !== this.localPlayerId) {
      return;
    }
    
    if (update.properties) {
      Object.assign(obj.properties, update.properties);
    }
    
    obj.lastSyncTime = Date.now();
    
    if (this.sendCallback) {
      this.sendCallback({
        type: 'object_update',
        payload: {
          networkId,
          properties: update.properties,
          timestamp: obj.lastSyncTime,
          sequence: 0,
        },
        timestamp: obj.lastSyncTime,
        reliable: obj.priority >= SyncPriority.High,
        channel: obj.priority,
      });
    }
  }
  
  requestOwnership(networkId: string): void {
    if (this.sendCallback) {
      this.sendCallback({
        type: 'object_ownership_request',
        payload: { networkId, requesterId: this.localPlayerId },
        timestamp: Date.now(),
        reliable: true,
        channel: 0,
      });
    }
  }
  
  transferOwnership(networkId: string, newOwnerId: string): void {
    const obj = this.objects.get(networkId);
    if (!obj || obj.ownerId !== this.localPlayerId) return;
    
    obj.ownerId = newOwnerId;
    
    if (this.sendCallback) {
      this.sendCallback({
        type: 'object_ownership_transfer',
        payload: { networkId, newOwnerId },
        timestamp: Date.now(),
        reliable: true,
        channel: 0,
      });
    }
    
    this.emit({ type: 'object_ownership_changed', networkId, newOwnerId });
  }
  
  getObject(networkId: string): SyncedObject | undefined {
    return this.objects.get(networkId);
  }
  
  getAllObjects(): SyncedObject[] {
    return Array.from(this.objects.values());
  }
  
  getOwnedObjects(): SyncedObject[] {
    return this.getAllObjects().filter((o) => o.ownerId === this.localPlayerId);
  }
  
  on(handler: MultiplayerEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: MultiplayerEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}
