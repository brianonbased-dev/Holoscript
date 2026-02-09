import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeaderElection, type LeaderElectionConfig } from '../LeaderElection';

describe('LeaderElection', () => {
  let election: LeaderElection;
  const nodeId = 'node-1';
  const clusterMembers = ['node-2', 'node-3', 'node-4'];

  beforeEach(() => {
    election = new LeaderElection(nodeId, clusterMembers);
  });

  afterEach(() => {
    election.stop();
  });

  describe('constructor', () => {
    it('should create with node id and cluster members', () => {
      expect(election).toBeDefined();
    });

    it('should accept custom config', () => {
      const customConfig: Partial<LeaderElectionConfig> = {
        electionTimeoutMin: 200,
        electionTimeoutMax: 400,
        heartbeatInterval: 75,
      };
      const customElection = new LeaderElection(nodeId, clusterMembers, customConfig);
      expect(customElection).toBeDefined();
      customElection.stop();
    });

    it('should start as follower with no leader', () => {
      expect(election.getRole()).toBe('follower');
      expect(election.getLeader()).toBeNull();
    });
  });

  describe('startElection', () => {
    it('should elect a leader', async () => {
      const leader = await election.startElection();

      expect(leader).toBeDefined();
      expect(typeof leader).toBe('string');
    });

    it('should become leader when receiving majority votes', async () => {
      // Simulate receiving votes
      election.receiveVote('node-2');
      election.receiveVote('node-3');

      const leader = await election.startElection();

      expect(election.getRole()).toBe('leader');
      expect(leader).toBe(nodeId);
    });

    it('should set leader id after election', async () => {
      await election.startElection();

      expect(election.getLeader()).not.toBeNull();
    });
  });

  describe('getLeader', () => {
    it('should return null before election', () => {
      expect(election.getLeader()).toBeNull();
    });

    it('should return leader id after election', async () => {
      await election.startElection();
      expect(election.getLeader()).toBeDefined();
    });
  });

  describe('getRole', () => {
    it('should return follower initially', () => {
      expect(election.getRole()).toBe('follower');
    });

    it('should return leader after winning election', async () => {
      // With simulated votes, should become leader
      election.receiveVote('node-2');
      election.receiveVote('node-3');
      await election.startElection();

      expect(election.getRole()).toBe('leader');
    });
  });

  describe('onLeaderChange', () => {
    it('should register callback', () => {
      const callback = vi.fn();
      const unsubscribe = election.onLeaderChange(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should call callback when leader changes', async () => {
      const callback = vi.fn();
      election.onLeaderChange(callback);

      await election.startElection();

      expect(callback).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', async () => {
      const callback = vi.fn();
      const unsubscribe = election.onLeaderChange(callback);
      unsubscribe();

      await election.startElection();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('receiveVote', () => {
    it('should accumulate votes when candidate', async () => {
      // Start election to become candidate
      const electionPromise = election.startElection();

      // Votes should be counted
      election.receiveVote('node-2');
      election.receiveVote('node-3');

      await electionPromise;

      expect(election.getRole()).toBe('leader');
    });
  });

  describe('handleMessage', () => {
    it('should handle heartbeat message', () => {
      election.handleMessage('node-2', {
        type: 'heartbeat',
        term: 1,
        leaderId: 'node-2',
      });

      expect(election.getLeader()).toBe('node-2');
      expect(election.getRole()).toBe('follower');
    });

    it('should handle vote request', () => {
      election.handleMessage('node-2', {
        type: 'request-vote',
        term: 1,
        candidateId: 'node-2',
      });

      // Should remain follower but update term internally
      expect(election.getRole()).toBe('follower');
    });

    it('should handle vote response', async () => {
      election.startElection(); // Don't await - become candidate

      // Wait a tick for state to update
      await new Promise(r => setTimeout(r, 10));

      election.handleMessage('node-2', {
        type: 'vote-response',
        term: 1,
        voteGranted: true,
      });

      // Should accumulate votes
      expect(election.getRole()).toBe('leader'); // Already had self-vote + simulated
    });

    it('should step down when receiving higher term', () => {
      // First become leader
      election.receiveVote('node-2');
      election.receiveVote('node-3');
      election['becomeLeader'](); // Access private method for testing

      expect(election.getRole()).toBe('leader');

      // Receive message with higher term
      election.handleMessage('node-5', {
        type: 'heartbeat',
        term: 999,
        leaderId: 'node-5',
      });

      expect(election.getRole()).toBe('follower');
    });
  });

  describe('stop', () => {
    it('should stop timers', async () => {
      await election.startElection();
      
      // Should not throw
      expect(() => election.stop()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      election.stop();
      election.stop();
      election.stop();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('quorum calculation', () => {
    it('should require majority for 3-node cluster', async () => {
      const smallElection = new LeaderElection('a', ['b', 'c']);
      
      // Need 2 votes (majority of 3)
      smallElection.receiveVote('b'); // Now has 2 votes (self + b)
      await smallElection.startElection();

      expect(smallElection.getRole()).toBe('leader');
      smallElection.stop();
    });

    it('should require majority for 5-node cluster', async () => {
      const largeElection = new LeaderElection('a', ['b', 'c', 'd', 'e']);
      
      // Need 3 votes (majority of 5)
      largeElection.receiveVote('b');
      largeElection.receiveVote('c');
      await largeElection.startElection();

      expect(largeElection.getRole()).toBe('leader');
      largeElection.stop();
    });

    it('should handle custom quorum size', async () => {
      const customElection = new LeaderElection('a', ['b', 'c', 'd'], {
        quorumSize: 2,
      });

      // Only need 2 votes
      customElection.receiveVote('b');
      await customElection.startElection();

      expect(customElection.getRole()).toBe('leader');
      customElection.stop();
    });
  });
});
