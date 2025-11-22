/**
 * CLI command for syncing Git branches
 */

import { Command } from 'commander';
import {
  checkBranchStatus,
  fetchRemoteChanges,
  mergeChanges,
  rebaseChanges,
  forcePushWithConfirmation,
  verifySync,
  SyncStrategy
} from '../git-sync';
import * as readline from 'readline';

/**
 * Prompts user for confirmation
 */
function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Sync git branches command
 */
export const syncGitBranchesCommand = new Command('sync-git-branches')
  .description('Safely synchronize local and remote Git branches')
  .option('-s, --strategy <type>', 'Sync strategy: merge, rebase, or force', 'merge')
  .option('-b, --branch <name>', 'Branch name (defaults to current branch)')
  .option('-y, --yes', 'Skip confirmation prompts (use with caution)')
  .action(async (options) => {
    try {
      const strategy = options.strategy as SyncStrategy;
      const branch = options.branch;
      const skipConfirm = options.yes;

      // Validate strategy
      if (!['merge', 'rebase', 'force'].includes(strategy)) {
        console.error(`Error: Invalid strategy '${strategy}'. Must be one of: merge, rebase, force`);
        process.exit(1);
      }

      console.log('Checking branch status...');
      
      // Fetch remote changes first
      const fetchResult = fetchRemoteChanges();
      if (!fetchResult.success) {
        console.error(`Error: ${fetchResult.message}`);
        process.exit(1);
      }

      // Check branch status
      const status = checkBranchStatus(branch);
      
      console.log(`\nBranch Status:`);
      console.log(`  Local:  ${status.localBranch} (${status.localCommit.substring(0, 7)})`);
      console.log(`  Remote: ${status.remoteBranch} (${status.remoteCommit.substring(0, 7)})`);
      console.log(`  Ahead:  ${status.ahead} commits`);
      console.log(`  Behind: ${status.behind} commits`);
      
      if (status.diverged) {
        console.log(`  Status: DIVERGED - branches have different histories`);
      } else if (status.ahead > 0 && status.behind === 0) {
        console.log(`  Status: AHEAD - local has commits not in remote`);
      } else if (status.behind > 0 && status.ahead === 0) {
        console.log(`  Status: BEHIND - remote has commits not in local`);
      } else {
        console.log(`  Status: IN SYNC - branches are aligned`);
        console.log('\nNo synchronization needed.');
        return;
      }

      // Execute strategy
      console.log(`\nExecuting ${strategy} strategy...`);

      if (strategy === 'merge') {
        const result = mergeChanges(branch);
        
        if (result.conflicts && result.conflicts.length > 0) {
          console.error(`\nMerge conflicts detected in ${result.conflicts.length} files:`);
          result.conflicts.forEach(file => console.error(`  - ${file}`));
          console.error('\nResolve conflicts manually, then run:');
          console.error('  git add <resolved-files>');
          console.error('  git commit');
          process.exit(1);
        }
        
        if (result.success) {
          console.log(`✓ ${result.message}`);
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
      } else if (strategy === 'rebase') {
        const result = rebaseChanges(branch);
        
        if (result.conflicts && result.conflicts.length > 0) {
          console.error(`\nRebase conflicts detected in ${result.conflicts.length} files:`);
          result.conflicts.forEach(file => console.error(`  - ${file}`));
          console.error('\nResolve conflicts manually, then run:');
          console.error('  git add <resolved-files>');
          console.error('  git rebase --continue');
          process.exit(1);
        }
        
        if (result.success) {
          console.log(`✓ ${result.message}`);
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
      } else if (strategy === 'force') {
        // Require confirmation for force push
        if (!skipConfirm) {
          console.warn('\n⚠️  WARNING: Force push will overwrite remote history!');
          console.warn('This may cause data loss for other collaborators.');
          
          const confirmed = await promptConfirmation('Are you sure you want to force push?');
          
          if (!confirmed) {
            console.log('Force push cancelled.');
            process.exit(0);
          }
        }
        
        const result = forcePushWithConfirmation(branch, true);
        
        if (result.success) {
          console.log(`✓ ${result.message}`);
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
      }

      // Verify sync
      console.log('\nVerifying synchronization...');
      if (verifySync(branch)) {
        console.log('✓ Local and remote branches are now in sync');
      } else {
        console.warn('⚠️  Branches may not be fully synchronized. Check git status.');
      }

    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
