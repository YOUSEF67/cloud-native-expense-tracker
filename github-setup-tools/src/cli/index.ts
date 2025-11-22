#!/usr/bin/env node
/**
 * CLI Entry Point for GitHub Setup Tools
 */

import { Command } from 'commander';
import { syncGitBranchesCommand } from './sync-git-branches';
import { setupBranchProtectionCommand } from './setup-branch-protection';
import { validateGitHubSetupCommand } from './validate-github-setup';
import { automateGitHubSetupCommand } from './automate-github-setup';
import { generateCommitMessageCommand } from './generate-commit-message';
import { quickFixSyncCommand } from './quick-fix-sync';
import { quickFixBranchProtectionCommand } from './quick-fix-branch-protection';

const program = new Command();

program
  .name('github-setup-tools')
  .description('Automated GitHub repository setup and troubleshooting tools')
  .version('1.0.0');

// Register all commands
program.addCommand(syncGitBranchesCommand);
program.addCommand(setupBranchProtectionCommand);
program.addCommand(validateGitHubSetupCommand);
program.addCommand(automateGitHubSetupCommand);
program.addCommand(generateCommitMessageCommand);

// Quick-fix commands for immediate issue resolution
program.addCommand(quickFixSyncCommand);
program.addCommand(quickFixBranchProtectionCommand);

// Parse command line arguments
program.parse(process.argv);
