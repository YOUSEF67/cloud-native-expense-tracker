/**
 * Example usage of GitHub Setup Automation types
 */

import {
  BranchStatus,
  ProtectionConfig,
  ValidationResult,
  SetupState,
  SetupConfig,
} from '../src/types';

// Example: Creating a BranchStatus object
const branchStatus: BranchStatus = {
  localBranch: 'main',
  remoteBranch: 'origin/main',
  localCommit: 'abc123def456',
  remoteCommit: 'def456abc123',
  ahead: 2,
  behind: 1,
  diverged: true,
};

console.log('Branch Status:', branchStatus);

// Example: Creating a ProtectionConfig object
const protectionConfig: ProtectionConfig = {
  branch: 'main',
  requiredStatusChecks: {
    strict: true,
    checks: [
      { context: 'ci/lint' },
      { context: 'ci/test' },
      { context: 'ci/build' },
    ],
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

console.log('Protection Config:', protectionConfig);

// Example: Creating a ValidationResult object
const validationResult: ValidationResult = {
  passed: false,
  checks: [
    {
      name: 'Required Secrets',
      status: 'pass',
      message: 'All required secrets are configured',
    },
    {
      name: 'Branch Protection',
      status: 'fail',
      message: 'Branch protection is not configured',
      remediation: 'Run: setup_branch_protection --branch=main',
    },
    {
      name: 'Workflows',
      status: 'warning',
      message: 'Some workflows may be missing',
    },
  ],
  summary: {
    total: 3,
    passed: 1,
    failed: 1,
    warnings: 1,
  },
};

console.log('Validation Result:', validationResult);

// Example: Creating a SetupState object
const setupState: SetupState = {
  repositoryExists: true,
  remoteConfigured: true,
  branchProtectionConfigured: false,
  secretsConfigured: ['AWS_ACCOUNT_ID', 'AWS_REGION'],
  environmentsConfigured: ['dev'],
  workflowsPresent: ['.github/workflows/ci.yml'],
};

console.log('Setup State:', setupState);

// Example: Creating a SetupConfig object
const setupConfig: SetupConfig = {
  branchProtection: {
    branch: 'main',
    requiredStatusChecks: ['ci/lint', 'ci/test'],
    requiredApprovals: 1,
    enforceAdmins: true,
  },
  secrets: ['AWS_ACCOUNT_ID', 'AWS_REGION', 'ECR_REPOSITORY'],
  environments: [
    {
      name: 'dev',
      requiresApproval: false,
      approvers: [],
    },
    {
      name: 'production',
      requiresApproval: true,
      approvers: ['@team/devops'],
    },
  ],
};

console.log('Setup Config:', setupConfig);
