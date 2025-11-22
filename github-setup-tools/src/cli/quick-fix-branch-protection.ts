/**
 * Quick-fix CLI command for fixing branch protection API calls
 * This is a standalone script to help users immediately fix branch protection configuration
 */

import { Command } from 'commander';
import { execSync } from 'child_process';
import {
  buildProtectionPayload,
  applyProtectionRules,
  verifyProtectionActive
} from '../branch-protection';
import { ProtectionConfig } from '../types/models';
import * as readline from 'readline';

/**
 * Prompts user for input
 */
function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

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
 * Quick-fix branch protection command
 */
export const quickFixBranchProtectionCommand = new Command('quick-fix-branch-protection')
  .description('Quick fix for branch protection API configuration errors')
  .option('-b, --branch <name>', 'Branch name to protect (default: main)', 'main')
  .option('--owner <owner>', 'Repository owner (defaults to current repo)')
  .option('--repo <name>', 'Repository name (defaults to current repo)')
  .option('--interactive', 'Interactive mode to configure protection rules', false)
  .action(async (options) => {
    try {
      const branch = options.branch;
      const interactive = options.interactive;

      console.log('🔧 Quick Fix: Branch Protection Configuration\n');
      console.log('This tool will help you configure branch protection with the correct API schema.');
      console.log('═══════════════════════════════════════════════════════════════════════\n');

      // Step 1: Get repository info
      let owner = options.owner;
      let repo = options.repo;

      if (!owner || !repo) {
        console.log('Step 1: Detecting repository...');
        try {
          const repoInfo = execSync('gh repo view --json owner,name', { encoding: 'utf-8' });
          const parsed = JSON.parse(repoInfo);
          owner = owner || parsed.owner.login;
          repo = repo || parsed.name;
          console.log(`✓ Repository: ${owner}/${repo}\n`);
        } catch (error) {
          console.error('✗ Failed to detect repository.');
          console.error('\nTroubleshooting:');
          console.error('  - Ensure you are in a git repository with GitHub remote');
          console.error('  - Authenticate with GitHub CLI: gh auth login');
          console.error('  - Or specify --owner and --repo explicitly');
          process.exit(1);
        }
      }

      // Step 2: Build protection configuration
      console.log('Step 2: Building protection configuration...');
      
      let protectionConfig: ProtectionConfig;

      if (interactive) {
        // Interactive mode: prompt for settings
        console.log('\n📝 Configure branch protection rules:\n');

        const requireStatusChecks = await promptConfirmation('Require status checks to pass before merging?');
        let statusChecks: string[] = [];
        
        if (requireStatusChecks) {
          const checksInput = await promptInput('Enter required status checks (comma-separated, e.g., ci/lint,ci/test,ci/build): ');
          statusChecks = checksInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }

        const requireReviews = await promptConfirmation('Require pull request reviews before merging?');
        let approvalCount = 1;
        
        if (requireReviews) {
          const countInput = await promptInput('Number of required approving reviews (default: 1): ');
          approvalCount = parseInt(countInput) || 1;
        }

        const enforceAdmins = await promptConfirmation('Enforce rules for administrators?');

        protectionConfig = {
          branch,
          requiredStatusChecks: {
            strict: requireStatusChecks,
            checks: requireStatusChecks ? statusChecks.map(context => ({ context })) : []
          },
          enforceAdmins,
          requiredPullRequestReviews: {
            dismissalRestrictions: {},
            dismissStaleReviews: requireReviews,
            requireCodeOwnerReviews: false,
            requiredApprovingReviewCount: requireReviews ? approvalCount : 0
          },
          restrictions: null,
          requiredLinearHistory: false,
          allowForcePushes: false,
          allowDeletions: false
        };
      } else {
        // Default configuration with common best practices
        console.log('Using recommended default configuration...');
        
        protectionConfig = {
          branch,
          requiredStatusChecks: {
            strict: true,
            checks: [
              { context: 'ci/lint' },
              { context: 'ci/test' },
              { context: 'ci/build' }
            ]
          },
          enforceAdmins: true,
          requiredPullRequestReviews: {
            dismissalRestrictions: {},
            dismissStaleReviews: true,
            requireCodeOwnerReviews: false,
            requiredApprovingReviewCount: 1
          },
          restrictions: null,
          requiredLinearHistory: false,
          allowForcePushes: false,
          allowDeletions: false
        };
      }

      // Step 3: Build and validate payload
      console.log('\nStep 3: Building API payload with correct schema...');
      const payload = buildProtectionPayload(protectionConfig);

      console.log('✓ Payload built successfully\n');
      console.log('📋 Protection rules to be applied:');
      
      if (payload.required_status_checks && payload.required_status_checks.checks.length > 0) {
        console.log(`  ✓ Required status checks (strict: ${payload.required_status_checks.strict}):`);
        payload.required_status_checks.checks.forEach(check => {
          console.log(`      - ${check.context}`);
        });
      }
      
      if (payload.required_pull_request_reviews) {
        console.log(`  ✓ Required approving reviews: ${payload.required_pull_request_reviews.required_approving_review_count}`);
        console.log(`  ✓ Dismiss stale reviews: ${payload.required_pull_request_reviews.dismiss_stale_reviews}`);
      }
      
      if (payload.enforce_admins) {
        console.log(`  ✓ Enforce for administrators`);
      }
      
      console.log(`  ✓ Allow force pushes: ${payload.allow_force_pushes}`);
      console.log(`  ✓ Allow deletions: ${payload.allow_deletions}`);

      // Safety check: Confirm before applying
      console.log('\n⚠️  This will update branch protection rules for:', `${owner}/${repo}:${branch}`);
      const confirmed = await promptConfirmation('Continue?');
      
      if (!confirmed) {
        console.log('\nOperation cancelled. No changes made.');
        console.log('\n💡 Tip: You can review the correct JSON schema in the output above.');
        return;
      }

      // Step 4: Apply protection rules
      console.log('\nStep 4: Applying protection rules via GitHub API...');
      const result = await applyProtectionRules(owner, repo, branch, payload);

      if (result.success) {
        console.log('✓ Branch protection rules applied successfully!\n');

        // Step 5: Verify protection is active
        console.log('Step 5: Verifying protection rules...');
        const isActive = await verifyProtectionActive(owner, repo, branch);
        
        if (isActive) {
          console.log('✓ Protection rules verified and active\n');
        } else {
          console.warn('⚠️  Could not verify protection rules. Check manually:\n');
          console.warn(`  https://github.com/${owner}/${repo}/settings/branches\n`);
        }

        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('✅ Quick fix completed successfully!');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('\n📚 For more information, see:');
        console.log('  - docs/GITHUB_SETUP.md');
        console.log(`  - https://github.com/${owner}/${repo}/settings/branches`);

      } else {
        console.error('\n❌ Failed to apply branch protection rules\n');
        console.error('Error details:');
        console.error(result.error);
        
        console.error('\n🔍 Common issues and solutions:\n');
        console.error('1. Insufficient permissions:');
        console.error('   - You need admin access to the repository');
        console.error('   - Check: gh api repos/{owner}/{repo}/collaborators/{username}/permission\n');
        
        console.error('2. Status checks don\'t exist yet:');
        console.error('   - Status checks must run at least once before being required');
        console.error('   - Create and run GitHub Actions workflows first\n');
        
        console.error('3. Invalid JSON schema:');
        console.error('   - The payload above shows the correct GitHub API v3 schema');
        console.error('   - Ensure required_status_checks has "checks" array (not "contexts")');
        console.error('   - Ensure required_pull_request_reviews has nested objects\n');
        
        console.error('4. Authentication issues:');
        console.error('   - Run: gh auth status');
        console.error('   - Re-authenticate: gh auth login\n');

        process.exit(1);
      }

    } catch (error) {
      console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('\nIf you need help, check the documentation:');
      console.error('  docs/GITHUB_SETUP.md');
      process.exit(1);
    }
  });
