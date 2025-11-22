/**
 * Tests for type definitions
 */

import {
  BranchStatus,
  ProtectionConfig,
  ValidationResult,
  SetupState,
} from '../models';

describe('Type Definitions', () => {
  describe('BranchStatus', () => {
    it('should accept valid BranchStatus object', () => {
      const status: BranchStatus = {
        localBranch: 'main',
        remoteBranch: 'origin/main',
        localCommit: 'abc123',
        remoteCommit: 'def456',
        ahead: 2,
        behind: 1,
        diverged: true,
      };

      expect(status.localBranch).toBe('main');
      expect(status.diverged).toBe(true);
    });
  });

  describe('ProtectionConfig', () => {
    it('should accept valid ProtectionConfig object', () => {
      const config: ProtectionConfig = {
        branch: 'main',
        requiredStatusChecks: {
          strict: true,
          checks: [{ context: 'ci/test' }],
        },
        enforceAdmins: true,
        requiredPullRequestReviews: {
          dismissalRestrictions: {},
          dismissStaleReviews: true,
          requireCodeOwnerReviews: false,
          requiredApprovingReviewCount: 1,
        },
        restrictions: null,
        requiredLinearHistory: false,
        allowForcePushes: false,
        allowDeletions: false,
      };

      expect(config.branch).toBe('main');
      expect(config.enforceAdmins).toBe(true);
    });
  });

  describe('ValidationResult', () => {
    it('should accept valid ValidationResult object', () => {
      const result: ValidationResult = {
        passed: true,
        checks: [
          {
            name: 'secrets',
            status: 'pass',
            message: 'All secrets configured',
          },
        ],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          warnings: 0,
        },
      };

      expect(result.passed).toBe(true);
      expect(result.checks).toHaveLength(1);
    });
  });

  describe('SetupState', () => {
    it('should accept valid SetupState object', () => {
      const state: SetupState = {
        repositoryExists: true,
        remoteConfigured: true,
        branchProtectionConfigured: false,
        secretsConfigured: ['AWS_ACCOUNT_ID'],
        environmentsConfigured: ['dev', 'staging'],
        workflowsPresent: ['.github/workflows/ci.yml'],
      };

      expect(state.repositoryExists).toBe(true);
      expect(state.secretsConfigured).toContain('AWS_ACCOUNT_ID');
    });
  });
});
