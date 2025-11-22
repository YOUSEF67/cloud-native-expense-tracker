/**
 * CLI command for setting up branch protection
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import {
  setupConfigToProtectionConfig,
  buildProtectionPayload,
  applyProtectionRules
} from '../branch-protection';
import { SetupConfig } from '../types/config';

/**
 * Setup branch protection command
 */
export const setupBranchProtectionCommand = new Command('setup-branch-protection')
  .description('Configure GitHub branch protection rules programmatically')
  .requiredOption('-b, --branch <name>', 'Branch name to protect')
  .option('-c, --config <file>', 'Path to setup configuration file', '.github/setup-config.json')
  .option('--owner <owner>', 'Repository owner (defaults to current repo)')
  .option('--repo <name>', 'Repository name (defaults to current repo)')
  .action(async (options) => {
    try {
      const branch = options.branch;
      const configPath = options.config;

      // Load configuration
      if (!existsSync(configPath)) {
        console.error(`Error: Configuration file not found: ${configPath}`);
        process.exit(1);
      }

      let config: SetupConfig;
      try {
        const configContent = readFileSync(configPath, 'utf-8');
        config = JSON.parse(configContent);
      } catch (error) {
        console.error(`Error: Failed to parse configuration file: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      // Validate branch protection config exists
      if (!config.branchProtection) {
        console.error('Error: No branchProtection configuration found in config file');
        process.exit(1);
      }

      // Override branch if specified
      if (branch) {
        config.branchProtection.branch = branch;
      }

      // Get repository info
      let owner = options.owner;
      let repo = options.repo;

      if (!owner || !repo) {
        try {
          const repoInfo = execSync('gh repo view --json owner,name', { encoding: 'utf-8' });
          const parsed = JSON.parse(repoInfo);
          owner = owner || parsed.owner.login;
          repo = repo || parsed.name;
        } catch (error) {
          console.error('Error: Failed to detect repository. Ensure you are in a git repository with GitHub remote.');
          console.error('Or specify --owner and --repo explicitly.');
          process.exit(1);
        }
      }

      console.log(`Setting up branch protection for ${owner}/${repo}:${config.branchProtection.branch}...`);

      // Convert config and build payload
      const protectionConfig = setupConfigToProtectionConfig(config.branchProtection);
      const payload = buildProtectionPayload(protectionConfig);

      console.log('\nProtection rules:');
      if (payload.required_status_checks) {
        console.log(`  ✓ Required status checks: ${payload.required_status_checks.checks.map(c => c.context).join(', ')}`);
      }
      if (payload.required_pull_request_reviews) {
        console.log(`  ✓ Required approving reviews: ${payload.required_pull_request_reviews.required_approving_review_count}`);
      }
      if (payload.enforce_admins) {
        console.log(`  ✓ Enforce for administrators`);
      }

      // Apply protection rules
      const result = await applyProtectionRules(owner, repo, config.branchProtection.branch, payload);

      if (result.success) {
        console.log(`\n✓ Branch protection successfully configured for '${config.branchProtection.branch}'`);
        
        if (result.shouldVerify) {
          console.log('\nVerifying protection rules are active...');
          // Verification happens inside applyProtectionRules
        }
      } else {
        console.error(`\n✗ Failed to configure branch protection:`);
        console.error(result.error);
        process.exit(1);
      }

    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
