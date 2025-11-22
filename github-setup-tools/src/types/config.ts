/**
 * Configuration types for GitHub setup automation
 */

/**
 * Branch protection configuration from setup config file
 */
export interface BranchProtectionSetupConfig {
  /** Name of the branch to protect */
  branch: string;
  /** List of required status check contexts */
  requiredStatusChecks: string[];
  /** Number of required approving reviews */
  requiredApprovals: number;
  /** Whether to enforce restrictions for administrators */
  enforceAdmins: boolean;
  /** Whether to dismiss stale reviews on new commits */
  dismissStaleReviews?: boolean;
  /** Whether to require review from code owners */
  requireCodeOwnerReviews?: boolean;
  /** Whether to require linear history */
  requiredLinearHistory?: boolean;
  /** Whether to allow force pushes */
  allowForcePushes?: boolean;
  /** Whether to allow branch deletions */
  allowDeletions?: boolean;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  /** Name of the environment */
  name: string;
  /** Whether deployments require approval */
  requiresApproval: boolean;
  /** List of users/teams who can approve deployments */
  approvers: string[];
}

/**
 * Complete setup configuration file structure
 */
export interface SetupConfig {
  /** Branch protection configuration */
  branchProtection?: BranchProtectionSetupConfig;
  /** List of required repository secrets */
  secrets?: string[];
  /** List of environments to create */
  environments?: EnvironmentConfig[];
}
