/**
 * Setup Automation Scripts
 * Orchestrates complete GitHub repository setup
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import * as readline from 'readline';
import { SetupState } from '../types/models';
import { SetupConfig, EnvironmentConfig } from '../types/config';
import { 
  setupConfigToProtectionConfig, 
  buildProtectionPayload, 
  applyProtectionRules 
} from '../branch-protection';
import { generateReport } from '../validator';

/**
 * Result of a setup step
 */
export interface SetupStepResult {
  step: string;
  success: boolean;
  message: string;
  skipped?: boolean;
}

/**
 * Complete setup summary
 */
export interface SetupSummary {
  totalSteps: number;
  successful: number;
  failed: number;
  skipped: number;
  results: SetupStepResult[];
}

/**
 * Detects the current state of repository setup
 * @returns Current setup state
 */
export function detectCurrentState(): SetupState {
  const state: SetupState = {
    repositoryExists: false,
    remoteConfigured: false,
    branchProtectionConfigured: false,
    secretsConfigured: [],
    environmentsConfigured: [],
    workflowsPresent: []
  };

  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    state.repositoryExists = true;

    // Check if remote is configured
    const remotes = execSync('git remote', { encoding: 'utf-8' }).trim();
    state.remoteConfigured = remotes.length > 0;

    // Check for branch protection (requires GitHub CLI and repo context)
    try {
      execSync('gh api repos/{owner}/{repo}/branches/main/protection', { stdio: 'pipe' });
      state.branchProtectionConfigured = true;
    } catch {
      state.branchProtectionConfigured = false;
    }

    // Check configured secrets
    try {
      const secretsOutput = execSync('gh secret list --json name', { encoding: 'utf-8', stdio: 'pipe' });
      const secrets = JSON.parse(secretsOutput) as Array<{ name: string }>;
      state.secretsConfigured = secrets.map(s => s.name);
    } catch {
      state.secretsConfigured = [];
    }

    // Check configured environments
    try {
      const envsOutput = execSync('gh api repos/{owner}/{repo}/environments', { encoding: 'utf-8', stdio: 'pipe' });
      const response = JSON.parse(envsOutput);
      const environments = response.environments || [];
      state.environmentsConfigured = environments.map((e: any) => e.name);
    } catch {
      state.environmentsConfigured = [];
    }

    // Check for workflow files
    const workflowDir = '.github/workflows';
    if (existsSync(workflowDir)) {
      const fs = require('fs');
      const files = fs.readdirSync(workflowDir);
      state.workflowsPresent = files.filter((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'));
    }
  } catch {
    // Repository doesn't exist or not in a git directory
  }

  return state;
}

/**
 * Sets up branch protection rules using the Branch Protection Manager
 * @param config - Setup configuration
 * @param currentState - Current repository state
 * @returns Setup step result
 */
export async function setupBranchProtection(
  config: SetupConfig,
  currentState: SetupState
): Promise<SetupStepResult> {
  const step = 'Branch Protection';

  // Skip if already configured
  if (currentState.branchProtectionConfigured) {
    return {
      step,
      success: true,
      message: 'Branch protection already configured',
      skipped: true
    };
  }

  // Check if branch protection config is provided
  if (!config.branchProtection) {
    return {
      step,
      success: false,
      message: 'No branch protection configuration provided in setup config'
    };
  }

  try {
    // Get repository info
    const repoInfo = execSync('gh repo view --json owner,name', { encoding: 'utf-8' });
    const { owner, name } = JSON.parse(repoInfo);

    // Convert setup config to protection config
    const protectionConfig = setupConfigToProtectionConfig(config.branchProtection);
    const payload = buildProtectionPayload(protectionConfig);

    // Apply protection rules
    const result = await applyProtectionRules(owner.login, name, config.branchProtection.branch, payload);

    if (result.success) {
      return {
        step,
        success: true,
        message: `Branch protection configured for '${config.branchProtection.branch}'`
      };
    } else {
      return {
        step,
        success: false,
        message: `Failed to configure branch protection: ${result.error}`
      };
    }
  } catch (error) {
    return {
      step,
      success: false,
      message: `Error setting up branch protection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Prompts for a secret value securely (no echo to terminal)
 * @param secretName - Name of the secret
 * @returns Promise that resolves to the secret value
 */
export function promptForSecret(secretName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Disable echo
    const stdin = process.stdin as any;
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let secret = '';
    process.stdout.write(`Enter value for ${secretName}: `);

    stdin.on('data', (char: Buffer) => {
      const c = char.toString('utf-8');

      if (c === '\n' || c === '\r' || c === '\u0004') {
        // Enter or Ctrl+D
        if (stdin.isTTY) {
          stdin.setRawMode(false);
        }
        process.stdout.write('\n');
        rl.close();
        resolve(secret);
      } else if (c === '\u0003') {
        // Ctrl+C
        if (stdin.isTTY) {
          stdin.setRawMode(false);
        }
        process.stdout.write('\n');
        rl.close();
        reject(new Error('User cancelled'));
      } else if (c === '\u007f' || c === '\b') {
        // Backspace
        if (secret.length > 0) {
          secret = secret.slice(0, -1);
        }
      } else {
        secret += c;
      }
    });
  });
}

/**
 * Sets up repository secrets with secure prompting
 * @param config - Setup configuration
 * @param currentState - Current repository state
 * @returns Setup step result
 */
export async function setupSecrets(
  config: SetupConfig,
  currentState: SetupState
): Promise<SetupStepResult> {
  const step = 'Repository Secrets';

  if (!config.secrets || config.secrets.length === 0) {
    return {
      step,
      success: true,
      message: 'No secrets to configure',
      skipped: true
    };
  }

  // Determine which secrets need to be set
  const missingSecrets = config.secrets.filter(
    secret => !currentState.secretsConfigured.includes(secret)
  );

  if (missingSecrets.length === 0) {
    return {
      step,
      success: true,
      message: `All ${config.secrets.length} secrets already configured`,
      skipped: true
    };
  }

  const errors: string[] = [];
  let configured = 0;

  for (const secretName of missingSecrets) {
    try {
      const value = await promptForSecret(secretName);
      
      if (!value || value.trim().length === 0) {
        errors.push(`${secretName}: Empty value provided`);
        continue;
      }

      // Set the secret using GitHub CLI
      execSync(`gh secret set ${secretName}`, {
        input: value,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      configured++;
    } catch (error) {
      errors.push(`${secretName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length === 0) {
    return {
      step,
      success: true,
      message: `Configured ${configured} secrets`
    };
  } else if (configured > 0) {
    return {
      step,
      success: false,
      message: `Configured ${configured} secrets, but ${errors.length} failed: ${errors.join('; ')}`
    };
  } else {
    return {
      step,
      success: false,
      message: `Failed to configure secrets: ${errors.join('; ')}`
    };
  }
}

/**
 * Creates and configures GitHub environments
 * @param config - Setup configuration
 * @param currentState - Current repository state
 * @returns Setup step result
 */
export async function setupEnvironments(
  config: SetupConfig,
  currentState: SetupState
): Promise<SetupStepResult> {
  const step = 'Environments';

  if (!config.environments || config.environments.length === 0) {
    return {
      step,
      success: true,
      message: 'No environments to configure',
      skipped: true
    };
  }

  // Determine which environments need to be created
  const missingEnvironments = config.environments.filter(
    env => !currentState.environmentsConfigured.includes(env.name)
  );

  if (missingEnvironments.length === 0) {
    return {
      step,
      success: true,
      message: `All ${config.environments.length} environments already configured`,
      skipped: true
    };
  }

  const errors: string[] = [];
  let created = 0;

  for (const env of missingEnvironments) {
    try {
      // Create environment
      execSync(`gh api repos/{owner}/{repo}/environments/${env.name} -X PUT`, {
        stdio: 'pipe'
      });

      // Configure protection rules if needed
      if (env.requiresApproval && env.approvers.length > 0) {
        const protectionPayload = {
          reviewers: env.approvers.map(approver => ({
            type: approver.includes('/') ? 'Team' : 'User',
            id: approver
          }))
        };

        execSync(`gh api repos/{owner}/{repo}/environments/${env.name} -X PUT`, {
          input: JSON.stringify(protectionPayload),
          stdio: 'pipe'
        });
      }

      created++;
    } catch (error) {
      errors.push(`${env.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length === 0) {
    return {
      step,
      success: true,
      message: `Created ${created} environments: ${missingEnvironments.map(e => e.name).join(', ')}`
    };
  } else if (created > 0) {
    return {
      step,
      success: false,
      message: `Created ${created} environments, but ${errors.length} failed: ${errors.join('; ')}`
    };
  } else {
    return {
      step,
      success: false,
      message: `Failed to create environments: ${errors.join('; ')}`
    };
  }
}

/**
 * Runs the setup validator
 * @param config - Setup configuration
 * @returns Setup step result
 */
export function runValidation(config: SetupConfig): SetupStepResult {
  const step = 'Validation';

  try {
    const result = generateReport(
      config.secrets || [],
      config.environments?.map(e => e.name) || [],
      config.branchProtection?.branch || 'main'
    );

    if (result.passed) {
      return {
        step,
        success: true,
        message: `All ${result.summary.total} validation checks passed`
      };
    } else {
      const failedChecks = result.checks
        .filter(c => c.status === 'fail')
        .map(c => c.name);

      return {
        step,
        success: false,
        message: `${result.summary.failed} of ${result.summary.total} checks failed: ${failedChecks.join(', ')}`
      };
    }
  } catch (error) {
    return {
      step,
      success: false,
      message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generates a summary of the setup process
 * @param results - Array of setup step results
 * @returns Setup summary
 */
export function generateSummary(results: SetupStepResult[]): SetupSummary {
  // Count each result in exactly one category
  // Priority: skipped > failed > successful
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.skipped && !r.success).length;
  const successful = results.filter(r => !r.skipped && r.success).length;

  return {
    totalSteps: results.length,
    successful,
    failed,
    skipped,
    results
  };
}

/**
 * Runs the complete automated setup process
 * @param configPath - Path to setup configuration file
 * @param skipExisting - Whether to skip already-configured steps
 * @returns Setup summary
 */
export async function automateGitHubSetup(
  configPath: string = '.github/setup-config.json',
  skipExisting: boolean = true
): Promise<SetupSummary> {
  const results: SetupStepResult[] = [];

  // Load configuration
  let config: SetupConfig;
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
  } catch (error) {
    results.push({
      step: 'Load Configuration',
      success: false,
      message: `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    });
    return generateSummary(results);
  }

  // Detect current state
  let currentState: SetupState;
  try {
    currentState = detectCurrentState();
    results.push({
      step: 'Detect Current State',
      success: true,
      message: 'Successfully detected repository state'
    });
  } catch (error) {
    results.push({
      step: 'Detect Current State',
      success: false,
      message: `Failed to detect state: ${error instanceof Error ? error.message : String(error)}`
    });
    return generateSummary(results);
  }

  // Run setup steps - continue even if some fail
  try {
    const branchProtectionResult = await setupBranchProtection(config, currentState);
    results.push(branchProtectionResult);
  } catch (error) {
    results.push({
      step: 'Branch Protection',
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  try {
    const secretsResult = await setupSecrets(config, currentState);
    results.push(secretsResult);
  } catch (error) {
    results.push({
      step: 'Repository Secrets',
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  try {
    const environmentsResult = await setupEnvironments(config, currentState);
    results.push(environmentsResult);
  } catch (error) {
    results.push({
      step: 'Environments',
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Run validation
  try {
    const validationResult = runValidation(config);
    results.push(validationResult);
  } catch (error) {
    results.push({
      step: 'Validation',
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  return generateSummary(results);
}
