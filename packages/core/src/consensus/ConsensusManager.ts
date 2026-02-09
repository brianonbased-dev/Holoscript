/**
 * Consensus Manager
 * Sprint 4 Priority 5 - Consensus Mechanisms
 *
 * High-level manager for multi-agent consensus, supporting pluggable
 * consensus protocols (simple majority, Raft, PBFT).
 */

import { EventEmitter } from 'events';
import {
  ConsensusConfig,
  ConsensusNode,
  ConsensusProtocol,
  ConsensusMechanism,
  Proposal,
  ProposalResult,
  ProposalStatus,
  ConsensusEvent,
  DEFAULT_CONSENSUS_CONFIG,
  generateProposalId,
  calculateQuorum,
  hasQuorum,
  isProposalExpired,
} from './ConsensusTypes';

// =============================================================================
// CONSENSUS MANAGER EVENTS
// =============================================================================

export interface ConsensusManagerEvents {
  'proposal:created': (proposal: Proposal) => void;
  'proposal:accepted': (result: ProposalResult) => void;
  'proposal:rejected': (result: ProposalResult) => void;
  'proposal:timeout': (proposalId: string) => void;
  'vote:received': (proposalId: string, voterId: string, approve: boolean) => void;
  'state:changed': (key: string, value: unknown, previousValue?: unknown) => void;
  'leader:elected': (leaderId: string) => void;
  'leader:lost': () => void;
  'node:joined': (node: ConsensusNode) => void;
  'node:left': (nodeId: string) => void;
}

// =============================================================================
// SIMPLE MAJORITY PROTOCOL
// =============================================================================

/**
 * Simple majority voting consensus
 * Each node votes on proposals, majority wins
 */
class SimpleMajorityProtocol implements ConsensusProtocol {
  readonly name: ConsensusMechanism = 'simple_majority';
  readonly nodeId: string;

  private nodes: Map<string, ConsensusNode> = new Map();
  private state: Map<string, unknown> = new Map();
  private proposals: Map<string, Proposal> = new Map();
  private config: Required<ConsensusConfig>;
  private eventEmitter: EventEmitter;
  private proposalTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    nodeId: string,
    config: Required<ConsensusConfig>,
    eventEmitter: EventEmitter
  ) {
    this.nodeId = nodeId;
    this.config = config;
    this.eventEmitter = eventEmitter;

    // Add self as first node
    this.nodes.set(nodeId, { id: nodeId });
  }

  isLeader(): boolean {
    // In simple majority, any node can propose
    return true;
  }

  getLeaderId(): string | null {
    // No leader in simple majority
    return null;
  }

  async propose<T>(key: string, value: T): Promise<ProposalResult<T>> {
    const proposalId = generateProposalId(this.nodeId);
    const now = Date.now();

    const proposal: Proposal<T> = {
      id: proposalId,
      key,
      value,
      proposerId: this.nodeId,
      timestamp: now,
      status: 'voting',
      votes: new Map(),
    };

    this.proposals.set(proposalId, proposal as Proposal);
    this.eventEmitter.emit('proposal:created', proposal);

    // Vote for own proposal
    this.vote(proposalId, this.nodeId, true);

    // Set timeout for proposal
    return new Promise<ProposalResult<T>>((resolve) => {
      const timeout = setTimeout(() => {
        const p = this.proposals.get(proposalId);
        if (p && p.status === 'voting') {
          p.status = 'timeout';
          this.eventEmitter.emit('proposal:timeout', proposalId);
          resolve({
            proposalId,
            accepted: false,
            key,
            votes: this.countVotes(proposalId),
            error: 'Proposal timed out',
          });
        }
        this.proposalTimeouts.delete(proposalId);
      }, this.config.timeout);

      this.proposalTimeouts.set(proposalId, timeout);

      // Check if already have quorum (single node case)
      this.checkQuorum(proposalId, resolve);
    });
  }

  private vote(proposalId: string, voterId: string, approve: boolean): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'voting') {
      return;
    }

    proposal.votes.set(voterId, approve);
    this.eventEmitter.emit('vote:received', proposalId, voterId, approve);
  }

  private checkQuorum<T>(
    proposalId: string,
    resolve: (result: ProposalResult<T>) => void
  ): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'voting') {
      return;
    }

    const clusterSize = this.nodes.size;
    const quorum = this.config.quorum || calculateQuorum(clusterSize);
    const { for: forVotes, against: againstVotes } = this.countVotes(proposalId);

    // Check for acceptance
    if (hasQuorum(forVotes, clusterSize, quorum)) {
      proposal.status = 'accepted';
      const previousValue = this.state.get(proposal.key);
      this.state.set(proposal.key, proposal.value);

      const result: ProposalResult<T> = {
        proposalId,
        accepted: true,
        key: proposal.key,
        value: proposal.value as T,
        votes: { for: forVotes, against: againstVotes, total: clusterSize },
      };

      this.clearProposalTimeout(proposalId);
      this.eventEmitter.emit('proposal:accepted', result);
      this.eventEmitter.emit('state:changed', proposal.key, proposal.value, previousValue);
      resolve(result);
      return;
    }

    // Check for rejection (enough against votes to never reach quorum)
    const remainingVotes = clusterSize - forVotes - againstVotes;
    if (forVotes + remainingVotes < quorum) {
      proposal.status = 'rejected';

      const result: ProposalResult<T> = {
        proposalId,
        accepted: false,
        key: proposal.key,
        votes: { for: forVotes, against: againstVotes, total: clusterSize },
        error: 'Proposal rejected by majority',
      };

      this.clearProposalTimeout(proposalId);
      this.eventEmitter.emit('proposal:rejected', result);
      resolve(result);
    }
  }

  private countVotes(proposalId: string): { for: number; against: number; total: number } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return { for: 0, against: 0, total: this.nodes.size };
    }

    let forVotes = 0;
    let againstVotes = 0;
    for (const vote of proposal.votes.values()) {
      if (vote) forVotes++;
      else againstVotes++;
    }

    return { for: forVotes, against: againstVotes, total: this.nodes.size };
  }

  private clearProposalTimeout(proposalId: string): void {
    const timeout = this.proposalTimeouts.get(proposalId);
    if (timeout) {
      clearTimeout(timeout);
      this.proposalTimeouts.delete(proposalId);
    }
  }

  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }

  getState(): Map<string, unknown> {
    return new Map(this.state);
  }

  addNode(node: ConsensusNode): void {
    this.nodes.set(node.id, node);
    this.eventEmitter.emit('node:joined', node);
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.eventEmitter.emit('node:left', nodeId);
  }

  getNodes(): ConsensusNode[] {
    return Array.from(this.nodes.values());
  }

  handleMessage(fromNodeId: string, message: unknown): void {
    const msg = message as { type: string; proposalId?: string; approve?: boolean };

    if (msg.type === 'vote' && msg.proposalId !== undefined && msg.approve !== undefined) {
      this.vote(msg.proposalId, fromNodeId, msg.approve);

      // Re-check quorum for pending proposals
      const proposal = this.proposals.get(msg.proposalId);
      if (proposal && proposal.status === 'voting') {
        // Create a resolver that emits events
        this.checkQuorum(msg.proposalId, () => {});
      }
    }
  }

  start(): void {
    // No-op for simple majority
  }

  stop(): void {
    // Clear all timeouts
    for (const timeout of this.proposalTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.proposalTimeouts.clear();
  }
}

// =============================================================================
// CONSENSUS MANAGER
// =============================================================================

/**
 * High-level consensus manager
 *
 * Wraps consensus protocols and provides a unified interface for
 * proposing and subscribing to state changes.
 */
export class ConsensusManager extends EventEmitter {
  private protocol: ConsensusProtocol;
  private config: Required<ConsensusConfig>;
  private subscriptions: Map<string, Set<(value: unknown) => void>> = new Map();
  private isRunning: boolean = false;

  constructor(nodeId: string, config: Partial<ConsensusConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONSENSUS_CONFIG, ...config };

    // Create protocol based on mechanism
    switch (this.config.mechanism) {
      case 'raft':
        // Raft is implemented in RaftConsensus.ts
        throw new Error('Use RaftConsensus class directly for Raft protocol');
      case 'pbft':
        throw new Error('PBFT not yet implemented');
      case 'simple_majority':
      default:
        this.protocol = new SimpleMajorityProtocol(nodeId, this.config, this);
    }

    // Forward state changes to subscriptions
    this.on('state:changed', (key: string, value: unknown) => {
      const subs = this.subscriptions.get(key);
      if (subs) {
        for (const callback of subs) {
          try {
            callback(value);
          } catch (e) {
            console.error(`Subscription callback error for key ${key}:`, e);
          }
        }
      }
    });
  }

  /**
   * Get current node ID
   */
  get nodeId(): string {
    return this.protocol.nodeId;
  }

  /**
   * Start the consensus protocol
   */
  start(): void {
    if (this.isRunning) return;
    this.protocol.start();
    this.isRunning = true;
  }

  /**
   * Stop the consensus protocol
   */
  stop(): void {
    if (!this.isRunning) return;
    this.protocol.stop();
    this.isRunning = false;
  }

  /**
   * Propose a state change
   */
  async propose<T>(key: string, value: T): Promise<boolean> {
    const result = await this.protocol.propose(key, value);
    return result.accepted;
  }

  /**
   * Propose with full result
   */
  async proposeWithResult<T>(key: string, value: T): Promise<ProposalResult<T>> {
    return this.protocol.propose(key, value);
  }

  /**
   * Get current value for key
   */
  get<T>(key: string): T | undefined {
    return this.protocol.get<T>(key);
  }

  /**
   * Get all state
   */
  getState(): Map<string, unknown> {
    return this.protocol.getState();
  }

  /**
   * Subscribe to changes for a key
   */
  subscribe<T>(key: string, callback: (value: T) => void): () => void {
    let subs = this.subscriptions.get(key);
    if (!subs) {
      subs = new Set();
      this.subscriptions.set(key, subs);
    }
    subs.add(callback as (value: unknown) => void);

    // Return unsubscribe function
    return () => {
      subs?.delete(callback as (value: unknown) => void);
      if (subs?.size === 0) {
        this.subscriptions.delete(key);
      }
    };
  }

  /**
   * Check if this node is the leader (Raft) or can propose (simple majority)
   */
  isLeader(): boolean {
    return this.protocol.isLeader();
  }

  /**
   * Get leader ID (null for simple majority)
   */
  getLeader(): ConsensusNode | null {
    const leaderId = this.protocol.getLeaderId();
    if (!leaderId) return null;
    return this.protocol.getNodes().find((n) => n.id === leaderId) || null;
  }

  /**
   * Add a node to the consensus cluster
   */
  addNode(node: ConsensusNode): void {
    this.protocol.addNode(node);
  }

  /**
   * Remove a node from the consensus cluster
   */
  removeNode(nodeId: string): void {
    this.protocol.removeNode(nodeId);
  }

  /**
   * Get all nodes in the cluster
   */
  getNodes(): ConsensusNode[] {
    return this.protocol.getNodes();
  }

  /**
   * Handle incoming message from another node
   */
  handleMessage(fromNodeId: string, message: unknown): void {
    this.protocol.handleMessage(fromNodeId, message);
  }

  /**
   * Get the underlying protocol
   */
  getProtocol(): ConsensusProtocol {
    return this.protocol;
  }
}
