/**
 * CLI command for automating GitHub setup
 */

import { Command } from 'commander';
import { existsSync } from 'fs';
import { automateGitHubSetup } from '../automation';

/**
 * Automate GitHub setup command
 */
export const automateGitHubSetupCommand = new Command('automate-github-setup')
  .description('Orchestrate complete GitHub repository setup automatically')
  .option('-c, --config <file>', 'Path to setup configuration file', '.github/setup-config.json')
  .option('--skip-existing', 'Skip already-completed setup steps', true)
  .option('--no-skip-existing', 'Re-run all setup steps even if already configured')
  .action(async (options) => {
    try {
      const configPath = options.config;
      const skipExisting = options.skipExisting;

      // Check if config file exists
      if (!existsSync(configPath)) {
        console.error(`Error: Configuration file not found: ${configPath}`);
        console.error('\nCreate a configuration file with the following structure:');
        console.error(JSON.stringify({
          branchProtection: {
            branch: 'main',
            requiredStatusChecks: ['ci/lint', 'ci/test'],
            requiredApprovals: 1,
            enforceAdmins: true
          },
          secrets: ['AWS_ACCOUNT_ID', 'AWS_REGION'],
          environments: [
            { name: 'dev', requiresApproval: false, approvers: [] },
            { name: 'production', requiresApproval: true, approvers: [] }
          ]
        }, null, 2));
        process.exit(1);
      }

      console.log('GitHub Repository Setup Automation');
      console.log('===================================\n');
      console.log(`Configuration: ${configPath}`);
      console.log(`Skip existing:  ${skipExisting ? 'Yes' : 'No'}\n`);

      // Run automated setup
      console.log('Starting automated setup...\n');
      const summary = await automateGitHubSetup(configPath, skipExisting);

      // Display results
      console.log('\nSetup Results:');
      console.log('==============\n');

      summary.results.forEach(result => {
        const icon = result.success ? '✓' : result.skipped ? '○' : '✗';
        const status = result.skipped ? 'SKIPPED' : result.success ? 'SUCCESS' : 'FAILED';
        
        console.log(`${icon} [${status.padEnd(8)}] ${result.step}`);
        console.log(`  ${result.message}\n`);
      });

      // Display summary
      console.log('Summary:');
      console.log('--------');
      console.log(`Total steps:    ${summary.totalSteps}`);
      console.log(`Successful:     ${summary.successful}`);
      console.log(`Failed:         ${summary.failed}`);
      console.log(`Skipped:        ${summary.skipped}`);

      if (summary.failed === 0) {
        console.log('\n✓ Setup completed successfully!');
        
        if (summary.skipped > 0) {
          console.log(`  (${summary.skipped} steps were already configured)`);
        }
        
        process.exit(0);
      } else {
        console.log(`\n✗ Setup completed with ${summary.failed} failure(s).`);
        console.log('Review the errors above and retry or complete manually.');
        process.exit(1);
      }

    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
