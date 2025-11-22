/**
 * CLI command for validating GitHub setup
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { generateReport } from '../validator';
import { SetupConfig } from '../types/config';

/**
 * Validate GitHub setup command
 */
export const validateGitHubSetupCommand = new Command('validate-github-setup')
  .description('Validate GitHub repository configuration completeness')
  .option('-c, --config <file>', 'Path to setup configuration file', '.github/setup-config.json')
  .option('-v, --verbose', 'Show detailed validation information')
  .option('-b, --branch <name>', 'Branch to check protection for', 'main')
  .option('-w, --workflow-dir <path>', 'Path to workflows directory', '.github/workflows')
  .action((options) => {
    try {
      const configPath = options.config;
      const verbose = options.verbose;
      const branch = options.branch;
      const workflowDir = options.workflowDir;

      // Load configuration if it exists
      let config: SetupConfig = {};
      
      if (existsSync(configPath)) {
        try {
          const configContent = readFileSync(configPath, 'utf-8');
          config = JSON.parse(configContent);
        } catch (error) {
          console.warn(`Warning: Failed to parse configuration file: ${error instanceof Error ? error.message : String(error)}`);
          console.warn('Continuing with default validation...\n');
        }
      } else {
        console.warn(`Warning: Configuration file not found: ${configPath}`);
        console.warn('Continuing with default validation...\n');
      }

      console.log('Validating GitHub repository setup...\n');

      // Generate validation report
      const result = generateReport(
        config.secrets || [],
        config.environments?.map(e => e.name) || [],
        branch,
        workflowDir
      );

      // Display results
      console.log('Validation Results:');
      console.log('===================\n');

      result.checks.forEach(check => {
        const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
        const statusText = check.status.toUpperCase().padEnd(7);
        
        console.log(`${icon} [${statusText}] ${check.name}`);
        
        if (verbose || check.status !== 'pass') {
          console.log(`  ${check.message}`);
          
          if (check.remediation) {
            console.log(`  → ${check.remediation}`);
          }
        }
        
        console.log();
      });

      // Display summary
      console.log('Summary:');
      console.log('--------');
      console.log(`Total checks:   ${result.summary.total}`);
      console.log(`Passed:         ${result.summary.passed}`);
      console.log(`Failed:         ${result.summary.failed}`);
      console.log(`Warnings:       ${result.summary.warnings}`);

      if (result.passed) {
        console.log('\n✓ All validation checks passed!');
        process.exit(0);
      } else {
        console.log(`\n✗ ${result.summary.failed} validation check(s) failed.`);
        process.exit(1);
      }

    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
