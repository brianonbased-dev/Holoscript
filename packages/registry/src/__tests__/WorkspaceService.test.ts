/**
 * Tests for Workspace Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceService } from '../workspace/WorkspaceService.js';
import { WorkspaceRepository } from '../workspace/WorkspaceRepository.js';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let repo: WorkspaceRepository;

  beforeEach(() => {
    repo = new WorkspaceRepository();
    service = new WorkspaceService(repo);
  });

  describe('createWorkspace', () => {
    it('should create a workspace with owner', async () => {
      const workspace = await service.createWorkspace(
        { name: 'test-workspace', displayName: 'Test Workspace' },
        'user-123'
      );

      expect(workspace.displayName).toBe('Test Workspace');
      expect(workspace.ownerId).toBe('user-123');
    });

    it('should generate unique IDs', async () => {
      const ws1 = await service.createWorkspace(
        { name: 'workspace-1' },
        'user-1'
      );
      const ws2 = await service.createWorkspace(
        { name: 'workspace-2' },
        'user-2'
      );

      expect(ws1.id).not.toBe(ws2.id);
    });

    it('should reject short names', async () => {
      await expect(
        service.createWorkspace({ name: 'a' }, 'user-1')
      ).rejects.toThrow('Workspace name must be at least 2 characters');
    });
  });
});
