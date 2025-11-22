/**
 * Setup Validator - Validates GitHub repository configuration
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { ValidationResult, ValidationCheck } from '../types/models';

/**
 * Check if required secrets exist in the repository
 * @param requiredSecrets - List of secret names to check for
 * @returns Validation check result
 */
export function checkSecrets(requiredSecrets: string[]): ValidationCheck {
  try {
    // Use GitHub CLI to list repository secrets
    const output = execSync('gh secret list --json name', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const secrets = JSON.parse(output) as Array<{ name: string }>;
    const existingSecretNames = secrets.map(s => s.name);
    
    const missingSecrets = requiredSecrets.filter(
      secret => !existingSecretNames.includes(secret)
    );
    
    if (missingSecrets.length === 0) {
      return {
        name: 'Repository Secrets',
        status: 'pass',
        message: `All ${requiredSecrets.length} required secrets are configured`
      };
    } else {
      return {
        name: 'Repository Secrets',
        status: 'fail',
        message: `Missing ${missingSecrets.length} of ${requiredSecrets.length} required secrets: ${missingSecrets.join(', ')}`,
        remediation: `Add missing secrets using: gh secret set <SECRET_NAME> --body "<value>" or via GitHub web interface at Settings > Secrets and variables > Actions`
      };
    }
  } catch (error) {
    return {
      name: 'Repository Secrets',
      status: 'fail',
      message: `Failed to check secrets: ${error instanceof Error ? error.message : String(error)}`,
      remediation: 'Ensure GitHub CLI is authenticated: gh auth login'
    };
  }
}

/**
 * Check if branch protection rules are configured correctly
 * @param branch - Branch name to check
 * @returns Validation check result
 */
export function checkBranchProtection(branch: string = 'main'): ValidationCheck {
  try {
    // Use GitHub CLI to get branch protection rules
    const output = execSync(`gh api repos/{owner}/{repo}/branches/${branch}/protection`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const protection = JSON.parse(output);
    
    // Check for key protection features
    const hasStatusChecks = protection.required_status_checks !== null;
    const hasPRReviews = protection.required_pull_request_reviews !== null;
    const enforceAdmins = protection.enforce_admins?.enabled === true;
    
    const features: string[] = [];
    if (hasStatusChecks) features.push('status checks');
    if (hasPRReviews) features.push('PR reviews');
    if (enforceAdmins) features.push('admin enforcement');
    
    if (features.length > 0) {
      return {
        name: 'Branch Protection',
        status: 'pass',
        message: `Branch '${branch}' has protection rules configured: ${features.join(', ')}`
      };
    } else {
      return {
        name: 'Branch Protection',
        status: 'warning',
        message: `Branch '${branch}' has protection enabled but no specific rules configured`,
        remediation: 'Configure branch protection rules using the Branch Protection Manager or GitHub web interface'
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a 404 (no protection configured)
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return {
        name: 'Branch Protection',
        status: 'fail',
        message: `Branch '${branch}' has no protection rules configured`,
        remediation: `Configure branch protection using: gh api repos/{owner}/{repo}/branches/${branch}/protection -X PUT --input protection-config.json`
      };
    }
    
    return {
      name: 'Branch Protection',
      status: 'fail',
      message: `Failed to check branch protection: ${errorMessage}`,
      remediation: 'Ensure GitHub CLI is authenticated and you have repository access: gh auth login'
    };
  }
}

/**
 * Check if GitHub Actions workflow files are present and valid
 * @param workflowDir - Path to .github/workflows directory
 * @returns Validation check result
 */
export function checkWorkflows(workflowDir: string = '.github/workflows'): ValidationCheck {
  try {
    if (!existsSync(workflowDir)) {
      return {
        name: 'GitHub Actions Workflows',
        status: 'fail',
        message: 'No .github/workflows directory found',
        remediation: 'Create .github/workflows directory and add workflow files'
      };
    }
    
    const files = readdirSync(workflowDir);
    const workflowFiles = files.filter((f: string) => 
      f.endsWith('.yml') || f.endsWith('.yaml')
    );
    
    if (workflowFiles.length === 0) {
      return {
        name: 'GitHub Actions Workflows',
        status: 'fail',
        message: 'No workflow files found in .github/workflows',
        remediation: 'Add GitHub Actions workflow files (.yml or .yaml) to .github/workflows directory'
      };
    }
    
    // Validate syntax of each workflow file by checking basic YAML structure
    const invalidWorkflows: string[] = [];
    for (const file of workflowFiles) {
      try {
        const content = readFileSync(join(workflowDir, file), 'utf-8');
        // Basic YAML validation - check for common syntax errors
        if (content.trim().length === 0) {
          invalidWorkflows.push(file);
          continue;
        }
        // Check for basic YAML structure (lines should not have tabs, proper indentation)
        if (content.includes('\t')) {
          invalidWorkflows.push(file);
          continue;
        }
        // Try to parse as JSON to catch severe syntax errors (YAML is superset of JSON)
        // This is a basic check - more sophisticated validation would require a YAML parser
      } catch (readError) {
        invalidWorkflows.push(file);
      }
    }
    
    if (invalidWorkflows.length > 0) {
      return {
        name: 'GitHub Actions Workflows',
        status: 'fail',
        message: `Found ${workflowFiles.length} workflow files, but ${invalidWorkflows.length} have potential syntax issues: ${invalidWorkflows.join(', ')}`,
        remediation: 'Fix YAML syntax errors in workflow files. Use a YAML validator or check GitHub Actions tab for syntax errors'
      };
    }
    
    return {
      name: 'GitHub Actions Workflows',
      status: 'pass',
      message: `Found ${workflowFiles.length} workflow files: ${workflowFiles.join(', ')}`
    };
  } catch (error) {
    return {
      name: 'GitHub Actions Workflows',
      status: 'fail',
      message: `Failed to check workflows: ${error instanceof Error ? error.message : String(error)}`,
      remediation: 'Ensure .github/workflows directory exists and is readable'
    };
  }
}

/**
 * Check if environments are configured
 * @param requiredEnvironments - List of environment names to check for
 * @returns Validation check result
 */
export function checkEnvironments(requiredEnvironments: string[]): ValidationCheck {
  try {
    // Use GitHub CLI to list environments
    const output = execSync('gh api repos/{owner}/{repo}/environments', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const response = JSON.parse(output);
    const environments = response.environments || [];
    const existingEnvNames = environments.map((e: any) => e.name);
    
    const missingEnvironments = requiredEnvironments.filter(
      env => !existingEnvNames.includes(env)
    );
    
    if (missingEnvironments.length === 0) {
      return {
        name: 'Environments',
        status: 'pass',
        message: `All ${requiredEnvironments.length} required environments are configured: ${requiredEnvironments.join(', ')}`
      };
    } else {
      return {
        name: 'Environments',
        status: 'fail',
        message: `Missing ${missingEnvironments.length} of ${requiredEnvironments.length} required environments: ${missingEnvironments.join(', ')}`,
        remediation: `Create missing environments using: gh api repos/{owner}/{repo}/environments/<ENV_NAME> -X PUT or via GitHub web interface at Settings > Environments`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Environments might not be available for all repository types
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return {
        name: 'Environments',
        status: 'warning',
        message: 'Environments feature not available for this repository (may require GitHub Pro or organization)',
        remediation: 'Upgrade repository or organization plan to use environments feature'
      };
    }
    
    return {
      name: 'Environments',
      status: 'fail',
      message: `Failed to check environments: ${errorMessage}`,
      remediation: 'Ensure GitHub CLI is authenticated and you have repository access: gh auth login'
    };
  }
}

/**
 * Generate a validation report with all checks
 * @param requiredSecrets - List of required secret names
 * @param requiredEnvironments - List of required environment names
 * @param branch - Branch to check protection for
 * @param workflowDir - Path to workflows directory
 * @returns Complete validation result
 */
export function generateReport(
  requiredSecrets: string[] = [],
  requiredEnvironments: string[] = [],
  branch: string = 'main',
  workflowDir: string = '.github/workflows'
): ValidationResult {
  const checks: ValidationCheck[] = [];
  
  // Run all validation checks
  if (requiredSecrets.length > 0) {
    checks.push(checkSecrets(requiredSecrets));
  }
  
  checks.push(checkBranchProtection(branch));
  checks.push(checkWorkflows(workflowDir));
  
  if (requiredEnvironments.length > 0) {
    checks.push(checkEnvironments(requiredEnvironments));
  }
  
  // Calculate summary
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warning').length;
  
  return {
    passed: failed === 0,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
      warnings
    }
  };
}
