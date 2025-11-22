/**
 * Git Sync Tool
 * 
 * Safely synchronizes local and remote Git branches
 */

import { execSync } from 'child_process';
import { BranchStatus } from '../types/models';

/**
 * Result of a git operation
 */
export interface GitOperationResult {
  success: boolean;
  message: string;
  conflicts?: string[];
}

/**
 * Sync strategy options
 */
export type SyncStrategy = 'merge' | 'rebase' | 'force';

/**
 * Compares local and remote branch states
 * @param branch - Branch name to check (defaults to current branch)
 * @returns BranchStatus object with comparison details
 */
export function checkBranchStatus(branch?: string): BranchStatus {
  try {
    // Get current branch if not specified
    const currentBranch = branch || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    // Get remote name (usually 'origin')
    const remote = execSync('git remote', { encoding: 'utf-8' }).trim().split('\n')[0] || 'origin';
    const remoteBranch = `${remote}/${currentBranch}`;
    
    // Get commit hashes
    const localCommit = execSync(`git rev-parse ${currentBranch}`, { encoding: 'utf-8' }).trim();
    const remoteCommit = execSync(`git rev-parse ${remoteBranch}`, { encoding: 'utf-8' }).trim();
    
    // Calculate ahead/behind counts
    const aheadCount = execSync(`git rev-list --count ${remoteBranch}..${currentBranch}`, { encoding: 'utf-8' }).trim();
    const behindCount = execSync(`git rev-list --count ${currentBranch}..${remoteBranch}`, { encoding: 'utf-8' }).trim();
    
    const ahead = parseInt(aheadCount, 10);
    const behind = parseInt(behindCount, 10);
    
    return {
      localBranch: currentBranch,
      remoteBranch,
      localCommit,
      remoteCommit,
      ahead,
      behind,
      diverged: ahead > 0 && behind > 0
    };
  } catch (error) {
    throw new Error(`Failed to check branch status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Safely fetches changes from remote repository
 * @param remote - Remote name (defaults to 'origin')
 * @returns Success status and message
 */
export function fetchRemoteChanges(remote: string = 'origin'): GitOperationResult {
  try {
    execSync(`git fetch ${remote}`, { encoding: 'utf-8', stdio: 'pipe' });
    return {
      success: true,
      message: `Successfully fetched changes from ${remote}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch from ${remote}: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Detects conflicting files in the working directory
 * @returns List of files with conflicts
 */
export function detectConflicts(): string[] {
  try {
    // Check for files with conflict markers
    const status = execSync('git diff --name-only --diff-filter=U', { encoding: 'utf-8' }).trim();
    
    if (!status) {
      return [];
    }
    
    return status.split('\n').filter(file => file.length > 0);
  } catch (error) {
    // If git diff fails, there might be no conflicts or git is in a bad state
    return [];
  }
}

/**
 * Verifies that local and remote branches are aligned (at the same commit)
 * @param branch - Branch name to verify (defaults to current branch)
 * @returns True if branches are aligned, false otherwise
 */
export function verifySync(branch?: string): boolean {
  try {
    const status = checkBranchStatus(branch);
    return status.localCommit === status.remoteCommit;
  } catch (error) {
    return false;
  }
}

/**
 * Merges remote changes into local branch using pull strategy
 * @param branch - Branch name (defaults to current branch)
 * @returns Result of the merge operation
 */
export function mergeChanges(branch?: string): GitOperationResult {
  try {
    const currentBranch = branch || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    // Perform git pull with merge strategy
    execSync(`git pull --no-rebase origin ${currentBranch}`, { encoding: 'utf-8', stdio: 'pipe' });
    
    // Check for conflicts
    const conflicts = detectConflicts();
    
    if (conflicts.length > 0) {
      return {
        success: false,
        message: 'Merge completed with conflicts',
        conflicts
      };
    }
    
    return {
      success: true,
      message: 'Successfully merged remote changes'
    };
  } catch (error) {
    const conflicts = detectConflicts();
    
    if (conflicts.length > 0) {
      return {
        success: false,
        message: 'Merge failed with conflicts',
        conflicts
      };
    }
    
    return {
      success: false,
      message: `Merge failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Rebases local commits onto remote branch
 * @param branch - Branch name (defaults to current branch)
 * @returns Result of the rebase operation
 */
export function rebaseChanges(branch?: string): GitOperationResult {
  try {
    const currentBranch = branch || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    // Perform git pull with rebase strategy
    execSync(`git pull --rebase origin ${currentBranch}`, { encoding: 'utf-8', stdio: 'pipe' });
    
    // Check for conflicts
    const conflicts = detectConflicts();
    
    if (conflicts.length > 0) {
      return {
        success: false,
        message: 'Rebase completed with conflicts',
        conflicts
      };
    }
    
    return {
      success: true,
      message: 'Successfully rebased onto remote changes'
    };
  } catch (error) {
    const conflicts = detectConflicts();
    
    if (conflicts.length > 0) {
      return {
        success: false,
        message: 'Rebase failed with conflicts',
        conflicts
      };
    }
    
    return {
      success: false,
      message: `Rebase failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Force pushes to remote with confirmation requirement
 * @param branch - Branch name (defaults to current branch)
 * @param confirmed - Whether the user has confirmed the force push
 * @returns Result of the force push operation
 */
export function forcePushWithConfirmation(branch?: string, confirmed: boolean = false): GitOperationResult {
  if (!confirmed) {
    return {
      success: false,
      message: 'WARNING: Force push will overwrite remote history and may cause data loss. Explicit confirmation required.'
    };
  }
  
  try {
    const currentBranch = branch || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    // Perform force push
    execSync(`git push --force origin ${currentBranch}`, { encoding: 'utf-8', stdio: 'pipe' });
    
    return {
      success: true,
      message: 'Successfully force pushed to remote'
    };
  } catch (error) {
    return {
      success: false,
      message: `Force push failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
