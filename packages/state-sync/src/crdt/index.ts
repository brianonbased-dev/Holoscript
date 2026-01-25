/**
 * @holoscript/state-sync - CRDT Module
 * Conflict-free Replicated Data Types for distributed state
 */

import {
  CRDTType,
  CRDTState,
  GCounterState,
  PNCounterState,
  GSetState,
  TwoPSetState,
  ORSetState,
  LWWRegisterState,
  MVRegisterState,
  LWWMapState,
  RGASequenceState,
  JSONDocState,
  VectorClock,
  CRDTOperation,
} from '../types';

// ============================================================================
// Vector Clock Utilities
// ============================================================================

export function createVectorClock(): VectorClock {
  return { entries: {}, sum: 0 };
}

export function incrementClock(clock: VectorClock, nodeId: string): VectorClock {
  const entries = { ...clock.entries };
  entries[nodeId] = (entries[nodeId] || 0) + 1;
  const sum = Object.values(entries).reduce((a, b) => a + b, 0);
  return { entries, sum };
}

export function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
  const entries: Record<string, number> = { ...a.entries };
  for (const [nodeId, value] of Object.entries(b.entries)) {
    entries[nodeId] = Math.max(entries[nodeId] || 0, value);
  }
  const sum = Object.values(entries).reduce((acc, v) => acc + v, 0);
  return { entries, sum };
}

export function compareClock(
  a: VectorClock,
  b: VectorClock
): 'before' | 'after' | 'concurrent' | 'equal' {
  let aBeforeB = false;
  let bBeforeA = false;
  
  const allNodes = new Set([
    ...Object.keys(a.entries),
    ...Object.keys(b.entries),
  ]);
  
  for (const nodeId of allNodes) {
    const aVal = a.entries[nodeId] || 0;
    const bVal = b.entries[nodeId] || 0;
    
    if (aVal < bVal) aBeforeB = true;
    if (bVal < aVal) bBeforeA = true;
  }
  
  if (aBeforeB && !bBeforeA) return 'before';
  if (bBeforeA && !aBeforeB) return 'after';
  if (!aBeforeB && !bBeforeA) return 'equal';
  return 'concurrent';
}

// ============================================================================
// GCounter - Grow-only Counter
// ============================================================================

export class GCounter {
  private state: GCounterState;
  
  constructor(id: string) {
    this.state = {
      type: CRDTType.GCounter,
      id,
      counts: {},
    };
  }
  
  increment(nodeId: string, amount: number = 1): void {
    if (amount < 0) throw new Error('GCounter can only increment');
    this.state.counts[nodeId] = (this.state.counts[nodeId] || 0) + amount;
  }
  
  value(): number {
    return Object.values(this.state.counts).reduce((a, b) => a + b, 0);
  }
  
  merge(other: GCounterState): void {
    for (const [nodeId, count] of Object.entries(other.counts)) {
      this.state.counts[nodeId] = Math.max(
        this.state.counts[nodeId] || 0,
        count
      );
    }
  }
  
  getState(): GCounterState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState(state: GCounterState): GCounter {
    const counter = new GCounter(state.id);
    counter.state.counts = { ...state.counts };
    return counter;
  }
}

// ============================================================================
// PNCounter - Positive-Negative Counter
// ============================================================================

export class PNCounter {
  private state: PNCounterState;
  
  constructor(id: string) {
    this.state = {
      type: CRDTType.PNCounter,
      id,
      positive: {},
      negative: {},
    };
  }
  
  increment(nodeId: string, amount: number = 1): void {
    this.state.positive[nodeId] = (this.state.positive[nodeId] || 0) + amount;
  }
  
  decrement(nodeId: string, amount: number = 1): void {
    this.state.negative[nodeId] = (this.state.negative[nodeId] || 0) + amount;
  }
  
  value(): number {
    const positive = Object.values(this.state.positive).reduce((a, b) => a + b, 0);
    const negative = Object.values(this.state.negative).reduce((a, b) => a + b, 0);
    return positive - negative;
  }
  
  merge(other: PNCounterState): void {
    for (const [nodeId, count] of Object.entries(other.positive)) {
      this.state.positive[nodeId] = Math.max(
        this.state.positive[nodeId] || 0,
        count
      );
    }
    for (const [nodeId, count] of Object.entries(other.negative)) {
      this.state.negative[nodeId] = Math.max(
        this.state.negative[nodeId] || 0,
        count
      );
    }
  }
  
  getState(): PNCounterState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState(state: PNCounterState): PNCounter {
    const counter = new PNCounter(state.id);
    counter.state.positive = { ...state.positive };
    counter.state.negative = { ...state.negative };
    return counter;
  }
}

// ============================================================================
// GSet - Grow-only Set
// ============================================================================

export class GSet<T> {
  private state: GSetState;
  
  constructor(id: string) {
    this.state = {
      type: CRDTType.GSet,
      id,
      elements: [],
    };
  }
  
  add(element: T): void {
    const serialized = JSON.stringify(element);
    if (!this.state.elements.includes(serialized)) {
      this.state.elements.push(serialized);
    }
  }
  
  has(element: T): boolean {
    const serialized = JSON.stringify(element);
    return this.state.elements.includes(serialized);
  }
  
  values(): T[] {
    return this.state.elements.map((e) => JSON.parse(e));
  }
  
  merge(other: GSetState): void {
    for (const element of other.elements) {
      if (!this.state.elements.includes(element)) {
        this.state.elements.push(element);
      }
    }
  }
  
  getState(): GSetState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState<T>(state: GSetState): GSet<T> {
    const set = new GSet<T>(state.id);
    set.state.elements = [...state.elements];
    return set;
  }
}

// ============================================================================
// TwoPSet - Two-Phase Set (add/remove once)
// ============================================================================

export class TwoPSet<T> {
  private state: TwoPSetState;
  
  constructor(id: string) {
    this.state = {
      type: CRDTType.TwoPSet,
      id,
      added: [],
      removed: [],
    };
  }
  
  add(element: T): void {
    const serialized = JSON.stringify(element);
    if (!this.state.added.includes(serialized)) {
      this.state.added.push(serialized);
    }
  }
  
  remove(element: T): void {
    const serialized = JSON.stringify(element);
    if (!this.state.removed.includes(serialized)) {
      this.state.removed.push(serialized);
    }
  }
  
  has(element: T): boolean {
    const serialized = JSON.stringify(element);
    return (
      this.state.added.includes(serialized) &&
      !this.state.removed.includes(serialized)
    );
  }
  
  values(): T[] {
    return this.state.added
      .filter((e) => !this.state.removed.includes(e))
      .map((e) => JSON.parse(e));
  }
  
  merge(other: TwoPSetState): void {
    for (const element of other.added) {
      if (!this.state.added.includes(element)) {
        this.state.added.push(element);
      }
    }
    for (const element of other.removed) {
      if (!this.state.removed.includes(element)) {
        this.state.removed.push(element);
      }
    }
  }
  
  getState(): TwoPSetState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState<T>(state: TwoPSetState): TwoPSet<T> {
    const set = new TwoPSet<T>(state.id);
    set.state.added = [...state.added];
    set.state.removed = [...state.removed];
    return set;
  }
}

// ============================================================================
// ORSet - Observed-Remove Set
// ============================================================================

export class ORSet<T> {
  private state: ORSetState;
  private tagCounter: number = 0;
  
  constructor(id: string, private nodeId: string = 'default') {
    this.state = {
      type: CRDTType.ORSet,
      id,
      elements: {},
    };
  }
  
  add(element: T): void {
    const serialized = JSON.stringify(element);
    const tag = `${this.nodeId}:${this.tagCounter++}`;
    
    if (!this.state.elements[serialized]) {
      this.state.elements[serialized] = [];
    }
    this.state.elements[serialized].push(tag);
  }
  
  remove(element: T): void {
    const serialized = JSON.stringify(element);
    delete this.state.elements[serialized];
  }
  
  has(element: T): boolean {
    const serialized = JSON.stringify(element);
    const tags = this.state.elements[serialized];
    return tags !== undefined && tags.length > 0;
  }
  
  values(): T[] {
    return Object.keys(this.state.elements)
      .filter((key) => this.state.elements[key].length > 0)
      .map((key) => JSON.parse(key));
  }
  
  merge(other: ORSetState): void {
    for (const [element, tags] of Object.entries(other.elements)) {
      if (!this.state.elements[element]) {
        this.state.elements[element] = [];
      }
      for (const tag of tags) {
        if (!this.state.elements[element].includes(tag)) {
          this.state.elements[element].push(tag);
        }
      }
    }
  }
  
  getState(): ORSetState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState<T>(state: ORSetState, nodeId: string = 'default'): ORSet<T> {
    const set = new ORSet<T>(state.id, nodeId);
    set.state.elements = JSON.parse(JSON.stringify(state.elements));
    return set;
  }
}

// ============================================================================
// LWWRegister - Last-Writer-Wins Register
// ============================================================================

export class LWWRegister<T> {
  private state: LWWRegisterState;
  
  constructor(id: string) {
    this.state = {
      type: CRDTType.LWWRegister,
      id,
      value: null,
      timestamp: 0,
      nodeId: '',
    };
  }
  
  set(value: T, nodeId: string, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    if (
      ts > this.state.timestamp ||
      (ts === this.state.timestamp && nodeId > this.state.nodeId)
    ) {
      this.state.value = value;
      this.state.timestamp = ts;
      this.state.nodeId = nodeId;
    }
  }
  
  get(): T | null {
    return this.state.value as T | null;
  }
  
  merge(other: LWWRegisterState): void {
    if (
      other.timestamp > this.state.timestamp ||
      (other.timestamp === this.state.timestamp &&
        other.nodeId > this.state.nodeId)
    ) {
      this.state.value = other.value;
      this.state.timestamp = other.timestamp;
      this.state.nodeId = other.nodeId;
    }
  }
  
  getState(): LWWRegisterState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState<T>(state: LWWRegisterState): LWWRegister<T> {
    const register = new LWWRegister<T>(state.id);
    register.state = JSON.parse(JSON.stringify(state));
    return register;
  }
}

// ============================================================================
// MVRegister - Multi-Value Register
// ============================================================================

export class MVRegister<T> {
  private state: MVRegisterState;
  
  constructor(id: string) {
    this.state = {
      type: CRDTType.MVRegister,
      id,
      values: [],
    };
  }
  
  set(value: T, nodeId: string): void {
    // Create new vector clock entry
    const newClock = createVectorClock();
    
    // Find max clock of existing values
    for (const { clock } of this.state.values) {
      for (const [node, count] of Object.entries(clock.entries)) {
        newClock.entries[node] = Math.max(newClock.entries[node] || 0, count);
      }
    }
    
    // Increment for this node
    newClock.entries[nodeId] = (newClock.entries[nodeId] || 0) + 1;
    newClock.sum = Object.values(newClock.entries).reduce((a, b) => a + b, 0);
    
    // Replace with single value
    this.state.values = [{ value, clock: newClock }];
  }
  
  get(): T[] {
    return this.state.values.map((v) => v.value as T);
  }
  
  merge(other: MVRegisterState): void {
    const allValues = [...this.state.values, ...other.values];
    const surviving: Array<{ value: unknown; clock: VectorClock }> = [];
    
    for (const entry of allValues) {
      let dominated = false;
      
      for (const other of allValues) {
        if (entry === other) continue;
        
        const cmp = compareClock(entry.clock, other.clock);
        if (cmp === 'before') {
          dominated = true;
          break;
        }
      }
      
      if (!dominated) {
        // Check if already in surviving
        const exists = surviving.some(
          (s) => compareClock(s.clock, entry.clock) === 'equal'
        );
        if (!exists) {
          surviving.push(entry);
        }
      }
    }
    
    this.state.values = surviving;
  }
  
  getState(): MVRegisterState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState<T>(state: MVRegisterState): MVRegister<T> {
    const register = new MVRegister<T>(state.id);
    register.state = JSON.parse(JSON.stringify(state));
    return register;
  }
}

// ============================================================================
// LWWMap - Last-Writer-Wins Map
// ============================================================================

export class LWWMap<V> {
  private state: LWWMapState;
  
  constructor(id: string) {
    this.state = {
      type: CRDTType.LWWMap,
      id,
      entries: {},
    };
  }
  
  set(key: string, value: V, nodeId: string, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    const existing = this.state.entries[key];
    
    if (
      !existing ||
      ts > existing.timestamp ||
      (ts === existing.timestamp && nodeId > existing.nodeId)
    ) {
      this.state.entries[key] = {
        value,
        timestamp: ts,
        nodeId,
      };
    }
  }
  
  delete(key: string, nodeId: string, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    const existing = this.state.entries[key];
    
    if (
      !existing ||
      ts > existing.timestamp ||
      (ts === existing.timestamp && nodeId > existing.nodeId)
    ) {
      this.state.entries[key] = {
        value: null,
        timestamp: ts,
        nodeId,
        deleted: true,
      };
    }
  }
  
  get(key: string): V | undefined {
    const entry = this.state.entries[key];
    if (!entry || entry.deleted) return undefined;
    return entry.value as V;
  }
  
  has(key: string): boolean {
    const entry = this.state.entries[key];
    return entry !== undefined && !entry.deleted;
  }
  
  keys(): string[] {
    return Object.keys(this.state.entries).filter(
      (key) => !this.state.entries[key].deleted
    );
  }
  
  values(): V[] {
    return this.keys().map((key) => this.state.entries[key].value as V);
  }
  
  entries(): Array<[string, V]> {
    return this.keys().map((key) => [
      key,
      this.state.entries[key].value as V,
    ]);
  }
  
  merge(other: LWWMapState): void {
    for (const [key, entry] of Object.entries(other.entries)) {
      const existing = this.state.entries[key];
      
      if (
        !existing ||
        entry.timestamp > existing.timestamp ||
        (entry.timestamp === existing.timestamp &&
          entry.nodeId > existing.nodeId)
      ) {
        this.state.entries[key] = { ...entry };
      }
    }
  }
  
  getState(): LWWMapState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState<V>(state: LWWMapState): LWWMap<V> {
    const map = new LWWMap<V>(state.id);
    map.state = JSON.parse(JSON.stringify(state));
    return map;
  }
}

// ============================================================================
// RGASequence - Replicated Growable Array
// ============================================================================

export class RGASequence<T> {
  private state: RGASequenceState;
  private logicalClock: number = 0;
  private nodeId: string;
  
  constructor(id: string, nodeId: string = 'default') {
    this.nodeId = nodeId;
    this.state = {
      type: CRDTType.RGASequence,
      id,
      vertices: [],
      edges: {},
    };
  }
  
  insert(index: number, value: T): string {
    const vertexId = `${this.nodeId}:${this.logicalClock++}`;
    
    // Find position
    const visibleVertices = this.getVisibleVertices();
    
    let after: string | null = null;
    if (index > 0 && index <= visibleVertices.length) {
      after = visibleVertices[index - 1].id;
    }
    
    this.state.vertices.push({
      id: vertexId,
      value,
      timestamp: Date.now(),
      deleted: false,
    });
    
    if (after) {
      if (!this.state.edges[after]) {
        this.state.edges[after] = [];
      }
      this.state.edges[after].push(vertexId);
    }
    
    return vertexId;
  }
  
  remove(index: number): boolean {
    const visibleVertices = this.getVisibleVertices();
    if (index < 0 || index >= visibleVertices.length) return false;
    
    const vertex = visibleVertices[index];
    const original = this.state.vertices.find((v) => v.id === vertex.id);
    if (original) {
      original.deleted = true;
    }
    
    return true;
  }
  
  toArray(): T[] {
    return this.getVisibleVertices().map((v) => v.value as T);
  }
  
  length(): number {
    return this.getVisibleVertices().length;
  }
  
  get(index: number): T | undefined {
    const visibleVertices = this.getVisibleVertices();
    if (index < 0 || index >= visibleVertices.length) return undefined;
    return visibleVertices[index].value as T;
  }
  
  merge(other: RGASequenceState): void {
    // Add new vertices
    for (const vertex of other.vertices) {
      if (!this.state.vertices.some((v) => v.id === vertex.id)) {
        this.state.vertices.push({ ...vertex });
      } else {
        // Update deleted flag
        const existing = this.state.vertices.find((v) => v.id === vertex.id);
        if (existing && vertex.deleted) {
          existing.deleted = true;
        }
      }
    }
    
    // Merge edges
    for (const [from, tos] of Object.entries(other.edges)) {
      if (!this.state.edges[from]) {
        this.state.edges[from] = [];
      }
      for (const to of tos) {
        if (!this.state.edges[from].includes(to)) {
          this.state.edges[from].push(to);
        }
      }
    }
  }
  
  private getVisibleVertices(): Array<{
    id: string;
    value: unknown;
    timestamp: number;
    deleted: boolean;
  }> {
    // Simple implementation - topological sort
    const sorted = [...this.state.vertices].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    return sorted.filter((v) => !v.deleted);
  }
  
  getState(): RGASequenceState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState<T>(state: RGASequenceState, nodeId: string = 'default'): RGASequence<T> {
    const seq = new RGASequence<T>(state.id, nodeId);
    seq.state = JSON.parse(JSON.stringify(state));
    return seq;
  }
}

// ============================================================================
// JSONDoc - JSON Document CRDT
// ============================================================================

export class JSONDoc {
  private state: JSONDocState;
  private nodeId: string;
  
  constructor(id: string, nodeId: string = 'default') {
    this.nodeId = nodeId;
    this.state = {
      type: CRDTType.JSONDoc,
      id,
      root: {},
      operations: [],
    };
  }
  
  set(path: string[], value: unknown): void {
    const op: CRDTOperation = {
      id: `${this.nodeId}:${Date.now()}:${Math.random()}`,
      type: 'set',
      path,
      value,
      timestamp: Date.now(),
      nodeId: this.nodeId,
    };
    
    this.applyOperation(op);
    this.state.operations.push(op);
  }
  
  delete(path: string[]): void {
    const op: CRDTOperation = {
      id: `${this.nodeId}:${Date.now()}:${Math.random()}`,
      type: 'delete',
      path,
      timestamp: Date.now(),
      nodeId: this.nodeId,
    };
    
    this.applyOperation(op);
    this.state.operations.push(op);
  }
  
  get(path: string[]): unknown {
    let current: unknown = this.state.root;
    
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    
    return current;
  }
  
  getRoot(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(this.state.root));
  }
  
  merge(other: JSONDocState): void {
    // Merge by replaying operations
    const allOps = [...this.state.operations, ...other.operations];
    
    // Sort by timestamp, then by node ID for tie-breaking
    allOps.sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return a.nodeId.localeCompare(b.nodeId);
    });
    
    // Deduplicate
    const uniqueOps: CRDTOperation[] = [];
    const seen = new Set<string>();
    for (const op of allOps) {
      if (!seen.has(op.id)) {
        seen.add(op.id);
        uniqueOps.push(op);
      }
    }
    
    // Rebuild state
    this.state.root = {};
    for (const op of uniqueOps) {
      this.applyOperation(op);
    }
    
    this.state.operations = uniqueOps;
  }
  
  private applyOperation(op: CRDTOperation): void {
    if (op.path.length === 0) return;
    
    let current: Record<string, unknown> = this.state.root;
    
    for (let i = 0; i < op.path.length - 1; i++) {
      const key = op.path[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    
    const lastKey = op.path[op.path.length - 1];
    
    if (op.type === 'set') {
      current[lastKey] = op.value;
    } else if (op.type === 'delete') {
      delete current[lastKey];
    }
  }
  
  getState(): JSONDocState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  static fromState(state: JSONDocState, nodeId: string = 'default'): JSONDoc {
    const doc = new JSONDoc(state.id, nodeId);
    doc.state = JSON.parse(JSON.stringify(state));
    return doc;
  }
}

// ============================================================================
// CRDT Factory
// ============================================================================

export function createCRDT<T extends CRDTState>(
  type: CRDTType,
  id: string,
  nodeId: string = 'default'
): GCounter | PNCounter | GSet<unknown> | TwoPSet<unknown> | ORSet<unknown> | LWWRegister<unknown> | MVRegister<unknown> | LWWMap<unknown> | RGASequence<unknown> | JSONDoc {
  switch (type) {
    case CRDTType.GCounter:
      return new GCounter(id);
    case CRDTType.PNCounter:
      return new PNCounter(id);
    case CRDTType.GSet:
      return new GSet(id);
    case CRDTType.TwoPSet:
      return new TwoPSet(id);
    case CRDTType.ORSet:
      return new ORSet(id, nodeId);
    case CRDTType.LWWRegister:
      return new LWWRegister(id);
    case CRDTType.MVRegister:
      return new MVRegister(id);
    case CRDTType.LWWMap:
      return new LWWMap(id);
    case CRDTType.RGASequence:
      return new RGASequence(id, nodeId);
    case CRDTType.JSONDoc:
      return new JSONDoc(id, nodeId);
    default:
      throw new Error(`Unknown CRDT type: ${type}`);
  }
}
