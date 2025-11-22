/**
 * Data models for GitHub Setup Automation
 */

/**
 * Represents the status of a Git branch relative to its remote
 */
export interface BranchStatus {
  /** Name of the local branch */
  localBranch: string;
  /** Name of the remote branch */
  remoteBranch: string;
  /** Commit hash of the local branch */
  localCommit: string;
  /** Commit hash of the remote branch */
  remoteCommit: string;
  /** Number of commits the local branch is ahead of remote */
  ahead: number;
  /** Number of commits the local branch is behind remote */
  behind: number;
  /** Whether the branches have diverged (both ahead and behind) */
  diverged: boolean;
}

/**
 * Configuration for GitHub branch protection rules
 */
export interface ProtectionConfig {
  /** Name of the branch to protect */
  branch: string;
  /** Required status checks configuration */
  requiredStatusChecks: {
    /** Whether to require branches to be up to date before merging */
    strict: boolean;
    /** List of required status checks */
    checks: Array<{ context: string }>;
  };
  /** Whether to enforce restrictions for administrators */
  enforceAdmins: boolean;
  /** Pull request review requirements */
  requiredPullRequestReviews: {
    /** Users/teams who can dismiss reviews */
    dismissalRestrictions: object;
    /** Whether to dismiss stale reviews on new commits */
    dismissStaleReviews: boolean;
    /** Whether to require review from code owners */
    requireCodeOwnerReviews: boolean;
    /** Number of required approving reviews */
    requiredApprovingReviewCount: number;
  };
  /** Push restrictions (null means no restrictions) */
  restrictions: null | object;
  /** Whether to require linear history */
  requiredLinearHistory: boolean;
  /** Whether to allow force pushes */
  allowForcePushes: boolean;
  /** Whether to allow branch deletions */
  allowDeletions: boolean;
}

/**
 * Result of a validation check
 */
export interface ValidationCheck {
  /** Name of the validation check */
  name: string;
  /** Status of the check */
  status: 'pass' | 'fail' | 'warning';
  /** Descriptive message about the check result */
  message: string;
  /** Optional remediation steps if the check failed */
  remediation?: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Whether all checks passed */
  passed: boolean;
  /** List of individual validation checks */
  checks: ValidationCheck[];
  /** Summary statistics */
  summary: {
    /** Total number of checks performed */
    total: number;
    /** Number of checks that passed */
    passed: number;
    /** Number of checks that failed */
    failed: number;
    /** Number of warnings */
    warnings: number;
  };
}

/**
 * Current state of repository setup
 */
export interface SetupState {
  /** Whether the repository exists */
  repositoryExists: boolean;
  /** Whether remote is configured */
  remoteConfigured: boolean;
  /** Whether branch protection is configured */
  branchProtectionConfigured: boolean;
  /** List of configured secrets */
  secretsConfigured: string[];
  /** List of configured environments */
  environmentsConfigured: string[];
  /** List of workflow files present */
  workflowsPresent: string[];
}

/**
 * Conventional commit message structure
 */
export interface CommitMessage {
  /** Type of commit (feat, fix, docs, chore, test, refactor, style, ci) */
  type: 'feat' | 'fix' | 'docs' | 'chore' | 'test' | 'refactor' | 'style' | 'ci';
  /** Optional scope of the commit */
  scope?: string;
  /** Short description of the commit */
  subject: string;
  /** Optional detailed description */
  body?: string;
  /** Optional footer (breaking changes, issue references) */
  footer?: string;
  /** List of files included in the commit */
  files: string[];
}

/**
 * Analysis result for a file
 */
export interface FileAnalysis {
  /** Path to the file */
  path: string;
  /** File extension or detected type */
  type: string;
  /** Category of the file */
  category: 'code' | 'config' | 'documentation' | 'test' | 'asset' | 'other';
  /** Inferred purpose description */
  purpose: string;
  /** Programming language if applicable */
  language?: string;
}
