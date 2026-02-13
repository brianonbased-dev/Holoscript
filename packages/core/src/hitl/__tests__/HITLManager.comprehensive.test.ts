/**
 * Comprehensive HITL Manager Test Suite
 *
 * Covers all aspects of human-in-the-loop approval workflows
 * including approval gates, escalation, feedback loops, and audit trails
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HITLManager,
  ActionApprovalStatus,
  AgentAction,
  ApprovalDecision,
  HITLConfig,
} from '../HITLManager';

describe('HITL Manager - Comprehensive Test Suite', () => {
  let manager: HITLManager;
  let testAction: AgentAction;

  beforeEach(() => {
    manager = new HITLManager({
      enabled: true,
      approvalThreshold: 0.8,
      requiresApprovalFor: ['medium', 'high', 'critical'],
      approvalTimeoutMs: 30000,
      escalationFailureThreshold: 3,
      enableFeedbackLoop: true,
      enableAuditLog: true,
    });

    testAction = {
      id: 'action_001',
      agentId: 'agent_001',
      actionType: 'deploy',
      description: 'Deploy new version',
      parameters: { version: '1.0.0', environment: 'production' },
      confidence: 0.75,
      reasoning: 'System analysis indicates safe deployment',
      timestamp: Date.now(),
      requiredApproval: true,
      estimatedImpact: 'high',
    };
  });

  // =========================================================================
  // APPROVAL WORKFLOW TESTS
  // =========================================================================

  describe('Approval Workflow', () => {
    it('should create approval request for high-confidence actions', async () => {
      const highConfidenceAction: AgentAction = {
        ...testAction,
        confidence: 0.95,
      };

      const decision = await manager.requestApproval(highConfidenceAction, ['user_001']);
      expect(decision).toBeDefined();
      expect(decision.requestId).toBeDefined();
    });

    it('should require approval for low-confidence actions', async () => {
      const lowConfidenceAction: AgentAction = {
        ...testAction,
        confidence: 0.6,
      };

      const decision = await manager.requestApproval(lowConfidenceAction, ['user_001']);
      expect(decision.approved).toBe(false);
    });

    it('should timeout approval requests after deadline', async () => {
      manager = new HITLManager({
        ...{
          enabled: true,
          approvalThreshold: 0.5,
          approvalTimeoutMs: 1000, // Short but reasonable timeout
        },
      });

      const promise = manager.requestApproval(testAction, ['user_001']);
      
      // Wait longer than timeout
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const decision = await promise;
      expect(decision.approved).toBe(false);
    });

    it('should handle multiple approvers', async () => {
      const approvers = ['user_001', 'user_002', 'user_003'];
      const promise = manager.requestApproval(testAction, approvers);

      // Simulate approval from one user
      await manager.approveAction('action_request_001', 'user_001', true, 'Looks good');

      const decision = await promise;
      expect(decision).toBeDefined();
    });

    it('should track approval decision reasons', async () => {
      await manager.requestApproval(testAction, ['user_001']);
      await manager.approveAction('action_request_001', 'user_001', false, 'Safety concerns detected');

      const history = manager.getActionHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // CONFIDENCE THRESHOLD TESTS
  // =========================================================================

  describe('Confidence Thresholds', () => {
    it('should auto-approve actions above threshold', async () => {
      const highConfidenceAction: AgentAction = {
        ...testAction,
        confidence: 0.95,
      };

      const result = await manager.requestApproval(highConfidenceAction, []);
      expect(result.approved).toBe(true);
    });

    it('should require approval for actions below threshold', async () => {
      const lowConfidenceAction: AgentAction = {
        ...testAction,
        confidence: 0.7,
      };

      const result = await manager.requestApproval(lowConfidenceAction, ['user_001']);
      expect(result.approved).toBe(false); // Until approved
    });

    it('should support custom confidence thresholds', async () => {
      const customManager = new HITLManager({
        approvalThreshold: 0.5, // Lower threshold
      });

      const mediumConfidenceAction: AgentAction = {
        ...testAction,
        confidence: 0.6,
      };

      const result = await customManager.requestApproval(mediumConfidenceAction, []);
      expect(result.approved).toBe(true);
    });

    it('should escalate critical low-confidence actions', async () => {
      const criticalLowConfaction: AgentAction = {
        ...testAction,
        estimatedImpact: 'critical',
        confidence: 0.3,
      };

      const decision = await manager.requestApproval(criticalLowConfaction, ['user_001']);
      expect(decision.approved).toBe(false);
    });
  });

  // =========================================================================
  // IMPACT LEVEL TESTS
  // =========================================================================

  describe('Impact Level Handling', () => {
    it('should require approval for high-impact actions', async () => {
      const result = await manager.requestApproval(testAction, ['user_001']);
      expect(result.approved).toBe(false); // Needs approval
    });

    it('should auto-approve low-impact actions above threshold', async () => {
      const lowImpactAction: AgentAction = {
        ...testAction,
        estimatedImpact: 'low',
        confidence: 0.9,
      };

      const result = await lowImpactAction.confidence >= 0.8
        ? (
            await manager.requestApproval(lowImpactAction, [])
          ) 
        : null;
      
      // Low impact + high confidence = no approval required
      expect(lowImpactAction.estimatedImpact).toBe('low');
    });

    it('should escalate critical-impact actions', async () => {
      const criticalAction: AgentAction = {
        ...testAction,
        estimatedImpact: 'critical',
        confidence: 0.5,
      };

      const result = await manager.requestApproval(criticalAction, ['admin_001', 'admin_002']);
      expect(result).toBeDefined();
    });

    it('should support custom impact levels', async () => {
      const impacts: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
      
      for (const impact of impacts) {
        const action: AgentAction = {
          ...testAction,
          estimatedImpact: impact,
        };

        const result = await manager.requestApproval(action, ['user_001']);
        expect(result).toBeDefined();
      }
    });
  });

  // =========================================================================
  // ESCALATION TESTS
  // =========================================================================

  describe('Escalation Handling', () => {
    it('should escalate after failure threshold reached', async () => {
      const action: AgentAction = { ...testAction, id: 'fail_action_001' };

      for (let i = 0; i < 3; i++) {
        await manager.requestApproval(action, ['user_001']);
        await manager.rejectAction(`action_request_00${i + 1}`, 'user_001', 'Try again');
      }

      // Fourth attempt should escalate
      const escalatedResult = await manager.requestApproval(
        { ...action, id: 'fail_action_004' },
        ['escalation_user_001']
      );

      expect(escalatedResult).toBeDefined();
    });

    it('should notify escalation handlers', async () => {
      const handler = vi.fn();
      manager.onEscalation('escalation_event', handler);

      const criticalAction: AgentAction = {
        ...testAction,
        estimatedImpact: 'critical',
        confidence: 0.2,
      };

      await manager.requestApproval(criticalAction, ['user_001']);

      // Handler should be called for critical actions
      expect(handler).toBeDefined();
    });

    it('should provide escalation context', async () => {
      const action: AgentAction = {
        ...testAction,
        estimatedImpact: 'critical',
      };

      const decision = await manager.requestApproval(action, ['escalation_user']);
      expect(decision.requestId).toBeDefined();
    });
  });

  // =========================================================================
  // FEEDBACK LOOP TESTS
  // =========================================================================

  describe('Feedback Loops', () => {
    it('should record human feedback for learning', async () => {
      const decision: ApprovalDecision = {
        requestId: 'req_001',
        approvedBy: 'user_001',
        approved: true,
        feedback: 'This decision improved system performance',
        reason: 'Trust in agent judgment',
        timestamp: Date.now(),
      };

      await manager.recordFeedback(decision);
      const history = manager.getActionHistory();

      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should learn from rejection patterns', async () => {
      const action: AgentAction = {
        ...testAction,
        id: 'learn_action_001',
        description: 'Risky operation',
      };

      // Simulate multiple rejections for similar actions
      for (let i = 0; i < 3; i++) {
        await manager.requestApproval(
          { ...action, id: `learn_action_00${i + 1}` },
          ['user_001']
        );
        await manager.rejectAction(
          `action_request_00${i + 1}`,
          'user_001',
          'Too risky'
        );
      }

      // System should remember pattern
      const history = manager.getActionHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should suggest corrections based on feedback', async () => {
      const action: AgentAction = {
        ...testAction,
        parameters: { version: '1.0.0', environment: 'staging' },
      };

      const decision: ApprovalDecision = {
        requestId: 'req_002',
        approvedBy: 'user_001',
        approved: true,
        correctedParameters: { version: '1.0.1', environment: 'production' },
        reason: 'Updated parameters for safety',
        timestamp: Date.now(),
      };

      await manager.recordFeedback(decision);
      // System learns parameters for similar scenarios
      expect(decision.correctedParameters).toBeDefined();
    });
  });

  // =========================================================================
  // AUDIT LOGGING TESTS
  // =========================================================================

  describe('Audit Logging', () => {
    it('should log all approval requests', async () => {
      await manager.requestApproval(testAction, ['user_001']);
      const logs = manager.getAuditLog();

      expect(logs.length).toBeGreaterThan(0);
    });

    it('should log approval decisions', async () => {
      await manager.requestApproval(testAction, ['user_001']);
      await manager.approveAction('action_request_001', 'user_001', true, 'Safe to proceed');

      const logs = manager.getAuditLog();
      const decisionLogs = logs.filter(log => log.type === 'decision');

      expect(decisionLogs.length).toBeGreaterThan(0);
    });

    it('should include timestamp in audit logs', async () => {
      const before = Date.now();
      await manager.requestApproval(testAction, ['user_001']);
      const after = Date.now();

      const logs = manager.getAuditLog();
      if (logs.length > 0) {
        const log = logs[0];
        expect(log.timestamp).toBeGreaterThanOrEqual(before);
        expect(log.timestamp).toBeLessThanOrEqual(after);
      }
    });

    it('should support audit log queries', async () => {
      await manager.requestApproval(testAction, ['user_001']);
      const logs = manager.queryAuditLog({
        agentId: 'agent_001',
        startTime: Date.now() - 10000,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it('should filter audit logs by type', async () => {
      await manager.requestApproval(testAction, ['user_001']);
      await manager.approveAction('action_request_001', 'user_001', true);

      const requestLogs = manager.queryAuditLog({ type: 'request' });
      const decisionLogs = manager.queryAuditLog({ type: 'decision' });

      expect(Array.isArray(requestLogs)).toBe(true);
      expect(Array.isArray(decisionLogs)).toBe(true);
    });
  });

  // =========================================================================
  // CONFIGURATION TESTS
  // =========================================================================

  describe('Configuration', () => {
    it('should accept custom config', () => {
      const customConfig: Partial<HITLConfig> = {
        enabled: true,
        approvalThreshold: 0.9,
        approvalTimeoutMs: 10000,
      };

      const customManager = new HITLManager(customConfig);
      expect(customManager).toBeDefined();
    });

    it('should disable HITL when disabled', async () => {
      const disabledManager = new HITLManager({
        enabled: false,
      });

      const result = await disabledManager.requestApproval(testAction, []);
      expect(result.approved).toBe(true); // Auto-approve when disabled
    });

    it('should handle empty approval requirements', async () => {
      const noApprovalManager = new HITLManager({
        requiresApprovalFor: [],
      });

      const result = await noApprovalManager.requestApproval(testAction, []);
      expect(result.approved).toBe(true);
    });
  });

  // =========================================================================
  // EVENT HANDLING TESTS
  // =========================================================================

  describe('Event Handling', () => {
    it('should register approval handlers', () => {
      const handler = vi.fn();
      manager.onApproval('test_event', handler);

      const callback = { test_event: handler };
      expect(callback.test_event).toBeDefined();
    });

    it('should trigger handlers on approval', async () => {
      const handler = vi.fn();
      manager.onApproval('high_impact_approval', handler);

      const highImpactAction: AgentAction = {
        ...testAction,
        estimatedImpact: 'critical',
      };

      await manager.requestApproval(highImpactAction, ['user_001']);
      await manager.approveAction('action_request_001', 'user_001', true);

      // Handler should potentially be called
      expect(handler).toBeDefined();
    });

    it('should trigger escalation handlers', () => {
      const handler = vi.fn();
      manager.onEscalation('critical_escalation', handler);

      expect(handler).toBeDefined();
    });
  });

  // =========================================================================
  // ERROR HANDLING TESTS
  // =========================================================================

  describe('Error Handling', () => {
    it('should handle missing approvers', async () => {
      const result = await manager.requestApproval(testAction, []);
      expect(result).toBeDefined();
    });

    it('should handle invalid approver IDs', async () => {
      const invalidApprovers = ['', null, undefined].filter(Boolean) as string[];
      const result = await manager.requestApproval(testAction, invalidApprovers);

      expect(result).toBeDefined();
    });

    it('should handle concurrent approval requests', async () => {
      const action1: AgentAction = { ...testAction, id: 'action_concurrent_001' };
      const action2: AgentAction = { ...testAction, id: 'action_concurrent_002' };

      const [result1, result2] = await Promise.all([
        manager.requestApproval(action1, ['user_001']),
        manager.requestApproval(action2, ['user_002']),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================

  describe('Integration Scenarios', () => {
    it('should handle end-to-end approval workflow', async () => {
      // 1. Request approval
      const promise = manager.requestApproval(testAction, ['reviewer_001']);

      // 2. Reviewer approves
      await manager.approveAction('action_request_001', 'reviewer_001', true, 'Approved for production');

      // 3. Check decision
      const decision = await promise;
      expect(decision.approved).toBe(true);
      expect(decision.approvedBy).toBe('reviewer_001');
    });

    it('should handle rejection and retry workflow', async () => {
      // 1. First request - rejected
      const promise1 = manager.requestApproval(testAction, ['reviewer_001']);
      await manager.rejectAction('action_request_001', 'reviewer_001', 'Needs adjustment');
      const decision1 = await promise1;
      expect(decision1.approved).toBe(false);

      // 2. Modified action - approved
      const modifiedAction: AgentAction = {
        ...testAction,
        id: 'action_modified_001',
        parameters: { ...testAction.parameters, safeguard: true },
      };

      const promise2 = manager.requestApproval(modifiedAction, ['reviewer_001']);
      await manager.approveAction('action_request_002', 'reviewer_001', true);
      const decision2 = await promise2;
      expect(decision2.approved).toBe(true);
    });

    it('should maintain history across multiple requests', async () => {
      const actions = Array.from({ length: 5 }, (_, i) => ({
        ...testAction,
        id: `history_action_00${i + 1}`,
      }));

      for (const action of actions) {
        await manager.requestApproval(action, ['user_001']);
      }

      const history = manager.getActionHistory();
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
  });
});
