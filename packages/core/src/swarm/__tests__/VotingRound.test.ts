/**
 * VotingRound Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VotingRound } from '../VotingRound';
import type { IHiveContribution } from '../../extensions';

describe('VotingRound', () => {
  let votingRound: VotingRound;
  
  const makeContribution = (
    id: string, 
    type: IHiveContribution['type'] = 'idea',
    confidence = 0.8
  ): IHiveContribution => ({
    id,
    agentId: `agent-${id}`,
    timestamp: Date.now(),
    type,
    content: `Contribution ${id}`,
    confidence,
  });

  beforeEach(() => {
    votingRound = new VotingRound();
  });

  describe('registerContribution', () => {
    it('should register a contribution for voting', () => {
      const contrib = makeContribution('c1');
      votingRound.registerContribution(contrib);
      
      const result = votingRound.getResult('c1');
      expect(result).toBeDefined();
      expect(result?.supportVotes).toBe(0);
      expect(result?.opposeVotes).toBe(0);
    });

    it('should throw when registering after close', () => {
      votingRound.close();
      const contrib = makeContribution('c1');
      expect(() => votingRound.registerContribution(contrib)).toThrow('closed');
    });
  });

  describe('castVote', () => {
    it('should record support votes', () => {
      const contrib = makeContribution('c1');
      votingRound.registerContribution(contrib);
      
      votingRound.castVote('c1', 'voter1', 'support');
      
      const result = votingRound.getResult('c1');
      expect(result?.supportVotes).toBe(1);
      expect(result?.opposeVotes).toBe(0);
    });

    it('should record oppose votes', () => {
      const contrib = makeContribution('c1');
      votingRound.registerContribution(contrib);
      
      votingRound.castVote('c1', 'voter1', 'oppose');
      
      const result = votingRound.getResult('c1');
      expect(result?.supportVotes).toBe(0);
      expect(result?.opposeVotes).toBe(1);
    });

    it('should track multiple voters', () => {
      const contrib = makeContribution('c1');
      votingRound.registerContribution(contrib);
      
      votingRound.castVote('c1', 'voter1', 'support');
      votingRound.castVote('c1', 'voter2', 'support');
      votingRound.castVote('c1', 'voter3', 'oppose');
      
      const result = votingRound.getResult('c1');
      expect(result?.supportVotes).toBe(2);
      expect(result?.opposeVotes).toBe(1);
      expect(result?.netScore).toBe(1);
      expect(result?.voterIds).toHaveLength(3);
    });

    it('should prevent duplicate votes from same voter', () => {
      const contrib = makeContribution('c1');
      votingRound.registerContribution(contrib);
      
      votingRound.castVote('c1', 'voter1', 'support');
      expect(() => votingRound.castVote('c1', 'voter1', 'oppose')).toThrow('already voted');
    });

    it('should throw for unregistered contribution', () => {
      expect(() => votingRound.castVote('unknown', 'voter1', 'support')).toThrow('not registered');
    });

    it('should throw when voting on closed round', () => {
      const contrib = makeContribution('c1');
      votingRound.registerContribution(contrib);
      votingRound.close();
      
      expect(() => votingRound.castVote('c1', 'voter1', 'support')).toThrow('closed');
    });

    it('should apply confidence weighting when enabled', () => {
      votingRound = new VotingRound({ weightByConfidence: true });
      const contrib = makeContribution('c1');
      votingRound.registerContribution(contrib);
      
      votingRound.castVote('c1', 'voter1', 'support', 0.9);
      votingRound.castVote('c1', 'voter2', 'oppose', 0.3);
      
      const result = votingRound.getResult('c1');
      expect(result?.weightedScore).toBeCloseTo(0.6, 1); // 0.9 - 0.3
    });
  });

  describe('getAllResults', () => {
    it('should return all results ranked by score', () => {
      votingRound.registerContribution(makeContribution('c1'));
      votingRound.registerContribution(makeContribution('c2'));
      votingRound.registerContribution(makeContribution('c3'));
      
      votingRound.castVote('c1', 'v1', 'support');
      votingRound.castVote('c2', 'v1', 'support');
      votingRound.castVote('c2', 'v2', 'support');
      votingRound.castVote('c3', 'v1', 'oppose');
      
      const results = votingRound.getAllResults();
      expect(results[0].contributionId).toBe('c2'); // 2 support
      expect(results[1].contributionId).toBe('c1'); // 1 support
      expect(results[2].contributionId).toBe('c3'); // 1 oppose
    });
  });

  describe('hasSuperMajority', () => {
    it('should detect super majority', () => {
      votingRound = new VotingRound({ 
        superMajorityThreshold: 0.67,
        minVotesRequired: 3 
      });
      votingRound.registerContribution(makeContribution('c1'));
      
      votingRound.castVote('c1', 'v1', 'support');
      votingRound.castVote('c1', 'v2', 'support');
      votingRound.castVote('c1', 'v3', 'support');
      
      expect(votingRound.hasSuperMajority('c1')).toBe(true);
    });

    it('should return false without enough votes', () => {
      votingRound = new VotingRound({ minVotesRequired: 5 });
      votingRound.registerContribution(makeContribution('c1'));
      
      votingRound.castVote('c1', 'v1', 'support');
      votingRound.castVote('c1', 'v2', 'support');
      
      expect(votingRound.hasSuperMajority('c1')).toBe(false);
    });

    it('should return false without majority', () => {
      votingRound = new VotingRound({ superMajorityThreshold: 0.67 });
      votingRound.registerContribution(makeContribution('c1'));
      
      votingRound.castVote('c1', 'v1', 'support');
      votingRound.castVote('c1', 'v2', 'oppose');
      votingRound.castVote('c1', 'v3', 'oppose');
      
      expect(votingRound.hasSuperMajority('c1')).toBe(false);
    });
  });

  describe('getApprovedContributions', () => {
    it('should return contributions with super majority', () => {
      votingRound = new VotingRound({ minVotesRequired: 2, superMajorityThreshold: 0.6 });
      
      const c1 = makeContribution('c1');
      const c2 = makeContribution('c2');
      votingRound.registerContribution(c1);
      votingRound.registerContribution(c2);
      
      // c1 gets 2 support, 0 oppose = 100% support
      votingRound.castVote('c1', 'v1', 'support');
      votingRound.castVote('c1', 'v2', 'support');
      // c2 gets 1 support, 1 oppose = 50% support (below 60% threshold)
      votingRound.castVote('c2', 'v1', 'support');
      votingRound.castVote('c2', 'v2', 'oppose');
      
      const approved = votingRound.getApprovedContributions();
      expect(approved).toHaveLength(1);
      expect(approved[0].id).toBe('c1');
    });
  });

  describe('getWinner', () => {
    it('should return top-ranked contribution', () => {
      const c1 = makeContribution('c1');
      const c2 = makeContribution('c2');
      votingRound.registerContribution(c1);
      votingRound.registerContribution(c2);
      
      votingRound.castVote('c1', 'v1', 'support');
      votingRound.castVote('c2', 'v1', 'support');
      votingRound.castVote('c2', 'v2', 'support');
      
      const winner = votingRound.getWinner();
      expect(winner?.id).toBe('c2');
    });

    it('should return undefined with no contributions', () => {
      const winner = votingRound.getWinner();
      expect(winner).toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    it('should compute voting statistics', () => {
      votingRound.registerContribution(makeContribution('c1'));
      votingRound.registerContribution(makeContribution('c2'));
      
      votingRound.castVote('c1', 'v1', 'support');
      votingRound.castVote('c1', 'v2', 'support');
      votingRound.castVote('c2', 'v1', 'oppose');
      
      const stats = votingRound.getStatistics();
      expect(stats.totalContributions).toBe(2);
      expect(stats.totalVotes).toBe(3);
    });
  });

  describe('close', () => {
    it('should mark round as closed', () => {
      expect(votingRound.isClosed()).toBe(false);
      votingRound.close();
      expect(votingRound.isClosed()).toBe(true);
    });
  });
});
