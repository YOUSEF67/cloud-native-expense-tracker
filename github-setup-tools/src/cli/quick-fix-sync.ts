/**
 * Quick-fix CLI command for resolving non-fast-forward errors
 * This is a standalone script to help users immediately resolve Git sync issues
 */

import { Command } from 'commander';
import {
  checkBranchStatus,
  fetchRemoteChanges,
  mergeChanges,
  detectConflicts
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
 * Prompts user to choose a sync strategy
 */
function promptStrategy(): Promise<'merge' | 'rebase' | 'force' | 'cancel'> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\nHow would you like to resolve this?');
    console.log('  1) Pull and merge (recommended) - Combines remote changes with your local changes');
    console.log('  2) Rebase - Replays your local commits on top of remote changes');
    console.log('  3) Force push - Overwrites remote with your local changes (⚠️  DANGEROUS)');
    console.log('  4) Cancel - Exit without making changes');
    
    rl.question('\nEnter your choice (1-4): ', (answer) => {
      rl.close();
      
      switch (answer.trim()) {
        case '1':
          resolve('merge');
          break;
        case '2':
          resolve('rebase');
          break;
        case '3':
          resolve('force');
          break;
        case '4':
        default:
          resolve('cancel');
          break;
      }
    });
  });
}

/**
 * Quick-fix sync command
 */
export const quickFixSyncCommand = new Command('quick-fix-sync')
  .description('Quick fix for non-fast-forward Git push errors')
  .option('-b, --branch <name>', 'Branch name (defaults to current branch)')
  .option('-s, --strategy <type>', 'Skip interactive prompt and use strategy: merge, rebase, or force')
  .action(async (options) => {
    try {
      const branch = options.branch;
      let strategy = options.strategy as 'merge' | 'rebase' | 'force' | undefined;

      console.log('🔧 Quick Fix: Resolving Non-Fast-Forward Error\n');
      console.log('This tool will help you safely synchronize your local and remote branches.');
      console.log('═══════════════════════════════════════════════════════════════════════\n');

      // Safety check: Validate strategy if provided
      if (strategy && !['merge', 'rebase', 'force'].includes(strategy)) {
        console.error(`Error: Invalid strategy '${strategy}'. Must be one of: merge, rebase, force`);
        process.exit(1);
      }

      // Step 1: Fetch remote changes
      console.log('Step 1: Fetching remote changes...');
      const fetchResult = fetchRemoteChanges();
      
      if (!fetchResult.success) {
        console.error(`✗ Failed to fetch remote changes: ${fetchResult.message}`);
        console.error('\nTroubleshooting:');
        console.error('  - Check your internet connection');
        console.error('  - Verify you have access to the remote repository');
        console.error('  - Run: gh auth status');
        process.exit(1);
      }
      console.log('✓ Remote changes fetched successfully\n');

      // Step 2: Check branch status
      console.log('Step 2: Analyzing branch status...');
      const status = checkBranchStatus(branch);
      
      console.log(`\n📊 Branch Status:`);
      console.log(`  Local:  ${status.localBranch} @ ${status.localCommit.substring(0, 7)}`);
      console.log(`  Remote: ${status.remoteBranch} @ ${status.remoteCommit.substring(0, 7)}`);
      console.log(`  Ahead:  ${status.ahead} commit(s)`);
      console.log(`  Behind: ${status.behind} commit(s)`);
      
      // Check if sync is needed
      if (status.ahead === 0 && status.behind === 0) {
        console.log('\n✓ Branches are already in sync! No action needed.');
        return;
      }

      if (status.behind === 0 && status.ahead > 0) {
        console.log('\n✓ Your branch is ahead of remote. You can push safely:');
        console.log('  git push');
        return;
      }

      // Branches are diverged or behind
      if (status.diverged) {
        console.log(`\n⚠️  DIVERGED: Your local and remote branches have different histories.`);
      } else {
        console.log(`\n⚠️  BEHIND: Your local branch is behind the remote.`);
      }

      // Step 3: Prompt for strategy if not provided
      if (!strategy) {
        const chosenStrategy = await promptStrategy();
        
        if (chosenStrategy === 'cancel') {
          console.log('\nOperation cancelled. No changes made.');
          return;
        }
        
        strategy = chosenStrategy;
      }

      // Step 4: Execute chosen strategy
      console.log(`\nStep 3: Executing ${strategy} strategy...`);

      if (strategy === 'merge') {
        const result = mergeChanges(branch);
        
        if (result.conflicts && result.conflicts.length > 0) {
          console.error(`\n❌ Merge conflicts detected in ${result.conflicts.length} file(s):`);
          result.conflicts.forEach(file => console.error(`     - ${file}`));
          console.error('\n📝 To resolve conflicts:');
          console.error('  1. Open the conflicting files and resolve the conflicts');
          console.error('  2. Stage the resolved files: git add <file>');
          console.error('  3. Complete the merge: git commit');
          console.error('  4. Push your changes: git push');
          process.exit(1);
        }
        
        if (result.success) {
          console.log(`✓ ${result.message}`);
          console.log('\n✓ Merge completed successfully!');
          console.log('  You can now push your changes: git push');
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
        
      } else if (strategy === 'rebase') {
        console.log('⚠️  Note: Rebase rewrites commit history. Use with caution on shared branches.');
        
        const confirmed = await promptConfirmation('Continue with rebase?');
        if (!confirmed) {
          console.log('Rebase cancelled.');
          return;
        }

        const { rebaseChanges } = await import('../git-sync');
        const result = rebaseChanges(branch);
        
        if (result.conflicts && result.conflicts.length > 0) {
          console.error(`\n❌ Rebase conflicts detected in ${result.conflicts.length} file(s):`);
          result.conflicts.forEach(file => console.error(`     - ${file}`));
          console.error('\n📝 To resolve conflicts:');
          console.error('  1. Open the conflicting files and resolve the conflicts');
          console.error('  2. Stage the resolved files: git add <file>');
          console.error('  3. Continue the rebase: git rebase --continue');
          console.error('  4. Push your changes: git push --force-with-lease');
          process.exit(1);
        }
        
        if (result.success) {
          console.log(`✓ ${result.message}`);
          console.log('\n✓ Rebase completed successfully!');
          console.log('  Push your changes: git push --force-with-lease');
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
        
      } else if (strategy === 'force') {
        console.error('\n⚠️  ⚠️  ⚠️  DANGER: FORCE PUSH WARNING ⚠️  ⚠️  ⚠️');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('Force pushing will OVERWRITE the remote branch with your local version.');
        console.error('This will PERMANENTLY DELETE any commits that exist on remote but not locally.');
        console.error('Other collaborators may lose their work!');
        console.error('═══════════════════════════════════════════════════════════\n');
        
        const confirmed = await promptConfirmation('⚠️  Type "yes" to confirm force push');
        
        if (!confirmed) {
          console.log('Force push cancelled. No changes made.');
          return;
        }

        const { forcePushWithConfirmation } = await import('../git-sync');
        const result = forcePushWithConfirmation(branch, true);
        
        if (result.success) {
          console.log(`✓ ${result.message}`);
          console.log('\n✓ Force push completed.');
        } else {
          console.error(`✗ ${result.message}`);
          process.exit(1);
        }
      }

      console.log('\n═══════════════════════════════════════════════════════════════════════');
      console.log('✅ Quick fix completed successfully!');
      console.log('═══════════════════════════════════════════════════════════════════════');

    } catch (error) {
      console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('\nIf you need help, check the documentation:');
      console.error('  docs/GITHUB_SETUP.md');
      process.exit(1);
    }
  });
