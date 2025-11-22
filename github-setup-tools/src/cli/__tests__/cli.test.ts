/**
 * Unit tests for CLI argument parsing
 */

import { Command } from 'commander';
import { syncGitBranchesCommand } from '../sync-git-branches';
import { setupBranchProtectionCommand } from '../setup-branch-protection';
import { validateGitHubSetupCommand } from '../validate-github-setup';
import { automateGitHubSetupCommand } from '../automate-github-setup';
import { generateCommitMessageCommand } from '../generate-commit-message';
import { quickFixSyncCommand } from '../quick-fix-sync';
import { quickFixBranchProtectionCommand } from '../quick-fix-branch-protection';

describe('CLI Argument Parsing', () => {
  describe('sync-git-branches command', () => {
    it('should have correct command name', () => {
      expect(syncGitBranchesCommand.name()).toBe('sync-git-branches');
    });

    it('should have description', () => {
      expect(syncGitBranchesCommand.description()).toBeTruthy();
      expect(syncGitBranchesCommand.description()).toContain('synchronize');
    });

    it('should accept strategy option', () => {
      const options = syncGitBranchesCommand.options;
      const strategyOption = options.find(opt => opt.long === '--strategy');
      
      expect(strategyOption).toBeDefined();
      expect(strategyOption?.short).toBe('-s');
    });

    it('should accept branch option', () => {
      const options = syncGitBranchesCommand.options;
      const branchOption = options.find(opt => opt.long === '--branch');
      
      expect(branchOption).toBeDefined();
      expect(branchOption?.short).toBe('-b');
    });

    it('should accept yes flag', () => {
      const options = syncGitBranchesCommand.options;
      const yesOption = options.find(opt => opt.long === '--yes');
      
      expect(yesOption).toBeDefined();
      expect(yesOption?.short).toBe('-y');
    });

    it('should have default strategy of merge', () => {
      const options = syncGitBranchesCommand.options;
      const strategyOption = options.find(opt => opt.long === '--strategy');
      
      expect(strategyOption?.defaultValue).toBe('merge');
    });
  });

  describe('setup-branch-protection command', () => {
    it('should have correct command name', () => {
      expect(setupBranchProtectionCommand.name()).toBe('setup-branch-protection');
    });

    it('should have description', () => {
      expect(setupBranchProtectionCommand.description()).toBeTruthy();
      expect(setupBranchProtectionCommand.description()).toContain('branch protection');
    });

    it('should require branch option', () => {
      const options = setupBranchProtectionCommand.options;
      const branchOption = options.find(opt => opt.long === '--branch');
      
      expect(branchOption).toBeDefined();
      expect(branchOption?.required).toBe(true);
    });

    it('should accept config option with default', () => {
      const options = setupBranchProtectionCommand.options;
      const configOption = options.find(opt => opt.long === '--config');
      
      expect(configOption).toBeDefined();
      expect(configOption?.defaultValue).toBe('.github/setup-config.json');
    });

    it('should accept owner and repo options', () => {
      const options = setupBranchProtectionCommand.options;
      const ownerOption = options.find(opt => opt.long === '--owner');
      const repoOption = options.find(opt => opt.long === '--repo');
      
      expect(ownerOption).toBeDefined();
      expect(repoOption).toBeDefined();
    });
  });

  describe('validate-github-setup command', () => {
    it('should have correct command name', () => {
      expect(validateGitHubSetupCommand.name()).toBe('validate-github-setup');
    });

    it('should have description', () => {
      expect(validateGitHubSetupCommand.description()).toBeTruthy();
      expect(validateGitHubSetupCommand.description().toLowerCase()).toContain('validate');
    });

    it('should accept config option with default', () => {
      const options = validateGitHubSetupCommand.options;
      const configOption = options.find(opt => opt.long === '--config');
      
      expect(configOption).toBeDefined();
      expect(configOption?.defaultValue).toBe('.github/setup-config.json');
    });

    it('should accept verbose flag', () => {
      const options = validateGitHubSetupCommand.options;
      const verboseOption = options.find(opt => opt.long === '--verbose');
      
      expect(verboseOption).toBeDefined();
      expect(verboseOption?.short).toBe('-v');
    });

    it('should accept branch option with default', () => {
      const options = validateGitHubSetupCommand.options;
      const branchOption = options.find(opt => opt.long === '--branch');
      
      expect(branchOption).toBeDefined();
      expect(branchOption?.defaultValue).toBe('main');
    });

    it('should accept workflow-dir option with default', () => {
      const options = validateGitHubSetupCommand.options;
      const workflowDirOption = options.find(opt => opt.long === '--workflow-dir');
      
      expect(workflowDirOption).toBeDefined();
      expect(workflowDirOption?.defaultValue).toBe('.github/workflows');
    });
  });

  describe('automate-github-setup command', () => {
    it('should have correct command name', () => {
      expect(automateGitHubSetupCommand.name()).toBe('automate-github-setup');
    });

    it('should have description', () => {
      expect(automateGitHubSetupCommand.description()).toBeTruthy();
      const desc = automateGitHubSetupCommand.description().toLowerCase();
      expect(desc.includes('automate') || desc.includes('orchestrate')).toBe(true);
    });

    it('should accept config option with default', () => {
      const options = automateGitHubSetupCommand.options;
      const configOption = options.find(opt => opt.long === '--config');
      
      expect(configOption).toBeDefined();
      expect(configOption?.defaultValue).toBe('.github/setup-config.json');
    });

    it('should accept skip-existing flag with default true', () => {
      const options = automateGitHubSetupCommand.options;
      const skipOption = options.find(opt => opt.long === '--skip-existing');
      
      expect(skipOption).toBeDefined();
      expect(skipOption?.defaultValue).toBe(true);
    });

    it('should accept no-skip-existing flag', () => {
      const options = automateGitHubSetupCommand.options;
      const noSkipOption = options.find(opt => opt.long === '--no-skip-existing');
      
      expect(noSkipOption).toBeDefined();
    });
  });

  describe('generate-commit-message command', () => {
    it('should have correct command name', () => {
      expect(generateCommitMessageCommand.name()).toBe('generate-commit-message');
    });

    it('should have description', () => {
      expect(generateCommitMessageCommand.description()).toBeTruthy();
      expect(generateCommitMessageCommand.description()).toContain('commit message');
    });

    it('should require files option', () => {
      const options = generateCommitMessageCommand.options;
      const filesOption = options.find(opt => opt.long === '--files');
      
      expect(filesOption).toBeDefined();
      expect(filesOption?.required).toBe(true);
    });

    it('should accept type option with default', () => {
      const options = generateCommitMessageCommand.options;
      const typeOption = options.find(opt => opt.long === '--type');
      
      expect(typeOption).toBeDefined();
      expect(typeOption?.defaultValue).toBe('chore');
    });

    it('should accept scope option', () => {
      const options = generateCommitMessageCommand.options;
      const scopeOption = options.find(opt => opt.long === '--scope');
      
      expect(scopeOption).toBeDefined();
    });

    it('should accept dry-run flag', () => {
      const options = generateCommitMessageCommand.options;
      const dryRunOption = options.find(opt => opt.long === '--dry-run');
      
      expect(dryRunOption).toBeDefined();
    });
  });

  describe('quick-fix-sync command', () => {
    it('should have correct command name', () => {
      expect(quickFixSyncCommand.name()).toBe('quick-fix-sync');
    });

    it('should have description', () => {
      expect(quickFixSyncCommand.description()).toBeTruthy();
      expect(quickFixSyncCommand.description().toLowerCase()).toContain('quick fix');
    });

    it('should accept branch option', () => {
      const options = quickFixSyncCommand.options;
      const branchOption = options.find(opt => opt.long === '--branch');
      
      expect(branchOption).toBeDefined();
      expect(branchOption?.short).toBe('-b');
    });

    it('should accept strategy option', () => {
      const options = quickFixSyncCommand.options;
      const strategyOption = options.find(opt => opt.long === '--strategy');
      
      expect(strategyOption).toBeDefined();
      expect(strategyOption?.short).toBe('-s');
    });
  });

  describe('quick-fix-branch-protection command', () => {
    it('should have correct command name', () => {
      expect(quickFixBranchProtectionCommand.name()).toBe('quick-fix-branch-protection');
    });

    it('should have description', () => {
      expect(quickFixBranchProtectionCommand.description()).toBeTruthy();
      expect(quickFixBranchProtectionCommand.description().toLowerCase()).toContain('quick fix');
    });

    it('should accept branch option with default', () => {
      const options = quickFixBranchProtectionCommand.options;
      const branchOption = options.find(opt => opt.long === '--branch');
      
      expect(branchOption).toBeDefined();
      expect(branchOption?.short).toBe('-b');
      expect(branchOption?.defaultValue).toBe('main');
    });

    it('should accept owner and repo options', () => {
      const options = quickFixBranchProtectionCommand.options;
      const ownerOption = options.find(opt => opt.long === '--owner');
      const repoOption = options.find(opt => opt.long === '--repo');
      
      expect(ownerOption).toBeDefined();
      expect(repoOption).toBeDefined();
    });

    it('should accept interactive flag', () => {
      const options = quickFixBranchProtectionCommand.options;
      const interactiveOption = options.find(opt => opt.long === '--interactive');
      
      expect(interactiveOption).toBeDefined();
    });
  });

  describe('Help text', () => {
    it('sync-git-branches should display help', () => {
      const helpText = syncGitBranchesCommand.helpInformation();
      
      expect(helpText).toContain('sync-git-branches');
      expect(helpText).toContain('--strategy');
      expect(helpText).toContain('--branch');
      expect(helpText).toContain('--yes');
    });

    it('setup-branch-protection should display help', () => {
      const helpText = setupBranchProtectionCommand.helpInformation();
      
      expect(helpText).toContain('setup-branch-protection');
      expect(helpText).toContain('--branch');
      expect(helpText).toContain('--config');
    });

    it('validate-github-setup should display help', () => {
      const helpText = validateGitHubSetupCommand.helpInformation();
      
      expect(helpText).toContain('validate-github-setup');
      expect(helpText).toContain('--verbose');
      expect(helpText).toContain('--config');
    });

    it('automate-github-setup should display help', () => {
      const helpText = automateGitHubSetupCommand.helpInformation();
      
      expect(helpText).toContain('automate-github-setup');
      expect(helpText).toContain('--config');
      expect(helpText).toContain('--skip-existing');
    });

    it('generate-commit-message should display help', () => {
      const helpText = generateCommitMessageCommand.helpInformation();
      
      expect(helpText).toContain('generate-commit-message');
      expect(helpText).toContain('--files');
      expect(helpText).toContain('--type');
    });

    it('quick-fix-sync should display help', () => {
      const helpText = quickFixSyncCommand.helpInformation();
      
      expect(helpText).toContain('quick-fix-sync');
      expect(helpText).toContain('--branch');
      expect(helpText).toContain('--strategy');
    });

    it('quick-fix-branch-protection should display help', () => {
      const helpText = quickFixBranchProtectionCommand.helpInformation();
      
      expect(helpText).toContain('quick-fix-branch-protection');
      expect(helpText).toContain('--branch');
      expect(helpText).toContain('--interactive');
    });
  });

  describe('Error handling for invalid arguments', () => {
    let exitSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock process.exit to prevent tests from actually exiting
      exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
        throw new Error(`process.exit called with code ${code}`);
      }) as any);
      
      // Mock console.error to suppress error output during tests
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing required option for setup-branch-protection', () => {
      const program = new Command();
      program.exitOverride(); // Throw instead of exit for testing
      program.addCommand(setupBranchProtectionCommand);

      expect(() => {
        program.parse(['node', 'test', 'setup-branch-protection'], { from: 'user' });
      }).toThrow();
    });

    it('should handle missing required option for generate-commit-message', () => {
      const program = new Command();
      program.exitOverride(); // Throw instead of exit for testing
      program.addCommand(generateCommitMessageCommand);

      expect(() => {
        program.parse(['node', 'test', 'generate-commit-message'], { from: 'user' });
      }).toThrow();
    });

    it('should accept valid arguments for sync-git-branches', () => {
      // Create a test version that doesn't execute the action
      const testCommand = new Command('sync-git-branches')
        .option('-s, --strategy <type>', 'Sync strategy', 'merge')
        .option('-b, --branch <name>', 'Branch name')
        .option('-y, --yes', 'Skip confirmation');

      testCommand.exitOverride();

      expect(() => {
        testCommand.parse(['sync-git-branches', '--strategy', 'rebase', '--branch', 'main'], { from: 'user' });
      }).not.toThrow();

      const opts = testCommand.opts();
      expect(opts.strategy).toBe('rebase');
      expect(opts.branch).toBe('main');
    });

    it('should accept valid arguments for validate-github-setup', () => {
      // Create a test version that doesn't execute the action
      const testCommand = new Command('validate-github-setup')
        .option('-c, --config <file>', 'Config file', '.github/setup-config.json')
        .option('-v, --verbose', 'Verbose output')
        .option('-b, --branch <name>', 'Branch name', 'main');

      testCommand.exitOverride();

      expect(() => {
        testCommand.parse(['validate-github-setup', '--verbose', '--branch', 'develop'], { from: 'user' });
      }).not.toThrow();

      const opts = testCommand.opts();
      expect(opts.verbose).toBe(true);
      expect(opts.branch).toBe('develop');
    });
  });
});
