/**
 * Branch Protection Manager
 * Manages GitHub branch protection rules via API
 */

import { ProtectionConfig } from '../types/models';
import { BranchProtectionSetupConfig } from '../types/config';

/**
 * GitHub API v3 branch protection payload structure
 */
export interface GitHubProtectionPayload {
  required_status_checks: {
    strict: boolean;
    checks: Array<{ context: string }>;
  } | null;
  enforce_admins: boolean;
  required_pull_request_reviews: {
    dismissal_restrictions: object;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
    required_approving_review_count: number;
  } | null;
  restrictions: null | object;
  required_linear_history: boolean;
  allow_force_pushes: boolean;
  allow_deletions: boolean;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  message: string;
  errors?: Array<{ message: string; field?: string }>;
  documentation_url?: string;
}

/**
 * Parsed API error with actionable guidance
 */
export interface ParsedApiError {
  originalMessage: string;
  guidance: string;
  fields?: string[];
}

/**
 * Builds a GitHub API v3 compliant branch protection payload
 * 
 * @param config - Branch protection configuration
 * @returns GitHub API v3 compliant JSON payload
 */
export function buildProtectionPayload(config: ProtectionConfig): GitHubProtectionPayload {
  const payload: any = {
    required_status_checks: config.requiredStatusChecks.checks.length > 0 
      ? {
          strict: config.requiredStatusChecks.strict,
          checks: config.requiredStatusChecks.checks
        }
      : null,
    enforce_admins: config.enforceAdmins,
    required_pull_request_reviews: {
      dismiss_stale_reviews: config.requiredPullRequestReviews.dismissStaleReviews,
      require_code_owner_reviews: config.requiredPullRequestReviews.requireCodeOwnerReviews,
      required_approving_review_count: config.requiredPullRequestReviews.requiredApprovingReviewCount
    },
    restrictions: config.restrictions,
    required_linear_history: config.requiredLinearHistory,
    allow_force_pushes: config.allowForcePushes,
    allow_deletions: config.allowDeletions
  };
  
  // Only include dismissal_restrictions if it has content (for org repos)
  if (config.requiredPullRequestReviews.dismissalRestrictions && 
      Object.keys(config.requiredPullRequestReviews.dismissalRestrictions).length > 0) {
    payload.required_pull_request_reviews.dismissal_restrictions = 
      config.requiredPullRequestReviews.dismissalRestrictions;
  }
  
  return payload;
}

/**
 * Converts setup config format to full ProtectionConfig
 * 
 * @param setupConfig - Branch protection setup configuration
 * @returns Full protection configuration
 */
export function setupConfigToProtectionConfig(setupConfig: BranchProtectionSetupConfig): ProtectionConfig {
  return {
    branch: setupConfig.branch,
    requiredStatusChecks: {
      strict: true,
      checks: setupConfig.requiredStatusChecks.map(context => ({ context }))
    },
    enforceAdmins: setupConfig.enforceAdmins,
    requiredPullRequestReviews: {
      dismissalRestrictions: {},
      dismissStaleReviews: setupConfig.dismissStaleReviews ?? true,
      requireCodeOwnerReviews: setupConfig.requireCodeOwnerReviews ?? false,
      requiredApprovingReviewCount: setupConfig.requiredApprovals
    },
    restrictions: null,
    requiredLinearHistory: setupConfig.requiredLinearHistory ?? false,
    allowForcePushes: setupConfig.allowForcePushes ?? false,
    allowDeletions: setupConfig.allowDeletions ?? false
  };
}

/**
 * Validates that a payload conforms to GitHub API v3 branch protection schema
 * 
 * @param payload - The payload to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validatePayloadSchema(payload: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required top-level fields
  if (typeof payload.enforce_admins !== 'boolean') {
    errors.push({ field: 'enforce_admins', message: 'Must be a boolean' });
  }

  if (typeof payload.required_linear_history !== 'boolean') {
    errors.push({ field: 'required_linear_history', message: 'Must be a boolean' });
  }

  if (typeof payload.allow_force_pushes !== 'boolean') {
    errors.push({ field: 'allow_force_pushes', message: 'Must be a boolean' });
  }

  if (typeof payload.allow_deletions !== 'boolean') {
    errors.push({ field: 'allow_deletions', message: 'Must be a boolean' });
  }

  // Validate required_status_checks structure
  if (payload.required_status_checks !== null) {
    if (typeof payload.required_status_checks !== 'object') {
      errors.push({ field: 'required_status_checks', message: 'Must be an object or null' });
    } else {
      if (typeof payload.required_status_checks.strict !== 'boolean') {
        errors.push({ field: 'required_status_checks.strict', message: 'Must be a boolean' });
      }

      if (!Array.isArray(payload.required_status_checks.checks)) {
        errors.push({ field: 'required_status_checks.checks', message: 'Must be an array' });
      } else {
        payload.required_status_checks.checks.forEach((check: any, index: number) => {
          if (typeof check !== 'object' || !check.context || typeof check.context !== 'string') {
            errors.push({ 
              field: `required_status_checks.checks[${index}]`, 
              message: 'Each check must be an object with a "context" string property' 
            });
          }
        });
      }
    }
  }

  // Validate required_pull_request_reviews structure
  if (payload.required_pull_request_reviews !== null) {
    if (typeof payload.required_pull_request_reviews !== 'object') {
      errors.push({ field: 'required_pull_request_reviews', message: 'Must be an object or null' });
    } else {
      const reviews = payload.required_pull_request_reviews;

      if (reviews.dismissal_restrictions !== undefined && typeof reviews.dismissal_restrictions !== 'object') {
        errors.push({ field: 'required_pull_request_reviews.dismissal_restrictions', message: 'Must be an object' });
      }

      if (typeof reviews.dismiss_stale_reviews !== 'boolean') {
        errors.push({ field: 'required_pull_request_reviews.dismiss_stale_reviews', message: 'Must be a boolean' });
      }

      if (typeof reviews.require_code_owner_reviews !== 'boolean') {
        errors.push({ field: 'required_pull_request_reviews.require_code_owner_reviews', message: 'Must be a boolean' });
      }

      if (typeof reviews.required_approving_review_count !== 'number' || reviews.required_approving_review_count < 0) {
        errors.push({ 
          field: 'required_pull_request_reviews.required_approving_review_count', 
          message: 'Must be a non-negative number' 
        });
      }
    }
  }

  // Validate restrictions
  if (payload.restrictions !== null && typeof payload.restrictions !== 'object') {
    errors.push({ field: 'restrictions', message: 'Must be an object or null' });
  }

  return errors;
}

/**
 * Parses GitHub API error responses and provides actionable guidance
 * 
 * @param errorResponse - The error response from GitHub API
 * @returns Parsed error with guidance
 */
export function parseApiError(errorResponse: ApiErrorResponse): ParsedApiError {
  const result: ParsedApiError = {
    originalMessage: errorResponse.message,
    guidance: '',
    fields: []
  };

  // Extract field names from errors
  if (errorResponse.errors && errorResponse.errors.length > 0) {
    result.fields = errorResponse.errors
      .filter(e => e.field)
      .map(e => e.field!);
  }

  // Provide specific guidance based on error message
  const message = errorResponse.message.toLowerCase();

  if (message.includes('validation failed') || message.includes('invalid')) {
    result.guidance = 'The request payload does not match the GitHub API schema. ';
    
    if (result.fields && result.fields.length > 0) {
      result.guidance += `Check the following fields: ${result.fields.join(', ')}. `;
    }
    
    result.guidance += 'Ensure required_status_checks has "strict" (boolean) and "checks" (array) properties. ';
    result.guidance += 'Ensure required_pull_request_reviews has nested objects for dismissal_restrictions and numeric required_approving_review_count.';
  } else if (message.includes('not found') || message.includes('404')) {
    result.guidance = 'The specified branch does not exist. Create the branch first or check the branch name spelling.';
  } else if (message.includes('forbidden') || message.includes('403')) {
    result.guidance = 'You do not have permission to modify branch protection rules. Admin access to the repository is required.';
  } else if (message.includes('unauthorized') || message.includes('401')) {
    result.guidance = 'Authentication failed. Run "gh auth login" to authenticate with GitHub CLI.';
  } else if (message.includes('rate limit')) {
    result.guidance = 'GitHub API rate limit exceeded. Wait for the rate limit to reset or authenticate for higher limits.';
  } else {
    result.guidance = 'An unexpected error occurred. Check the error message and GitHub API documentation for details.';
    
    if (errorResponse.documentation_url) {
      result.guidance += ` See: ${errorResponse.documentation_url}`;
    }
  }

  return result;
}

/**
 * Applies branch protection rules via GitHub CLI
 * 
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Branch name
 * @param payload - Protection payload
 * @param executor - Optional function to execute commands (for testing)
 * @returns Success status and any error message
 */
export async function applyProtectionRules(
  owner: string,
  repo: string,
  branch: string,
  payload: GitHubProtectionPayload,
  executor?: (command: string, input?: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
): Promise<{ success: boolean; error?: string; shouldVerify?: boolean }> {
  const exec = executor || defaultExecutor;
  
  // Validate the payload first
  const validationErrors = validatePayloadSchema(payload);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: `Invalid payload: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`
    };
  }

  try {
    // Use GitHub CLI to apply branch protection
    const payloadJson = JSON.stringify(payload);
    const command = `gh api repos/${owner}/${repo}/branches/${branch}/protection -X PUT --input -`;
    
    const result = await exec(command, payloadJson);
    
    if (result.exitCode === 0) {
      return { success: true, shouldVerify: true };
    } else {
      // Parse the error response
      let errorResponse: ApiErrorResponse;
      try {
        errorResponse = JSON.parse(result.stderr || result.stdout);
      } catch {
        errorResponse = { message: result.stderr || result.stdout || 'Unknown error' };
      }
      
      const parsedError = parseApiError(errorResponse);
      return {
        success: false,
        error: `${parsedError.originalMessage}\n\nGuidance: ${parsedError.guidance}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Verifies that branch protection rules are active
 * 
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Branch name
 * @param executor - Optional function to execute commands (for testing)
 * @returns Whether protection is active and the current rules
 */
export async function verifyProtectionActive(
  owner: string,
  repo: string,
  branch: string,
  executor?: (command: string, input?: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
): Promise<boolean> {
  const exec = executor || defaultExecutor;
  
  try {
    const command = `gh api repos/${owner}/${repo}/branches/${branch}/protection`;
    const result = await exec(command);
    
    if (result.exitCode === 0) {
      try {
        JSON.parse(result.stdout);
        return true;
      } catch {
        return false;
      }
    } else {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Default command executor using child_process
 */
async function defaultExecutor(command: string, input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { spawn } = await import('child_process');
  
  return new Promise((resolve) => {
    // Parse command into parts
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const proc = spawn(cmd, args, {
      stdio: input ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }
    
    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    proc.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      });
    });
    
    proc.on('error', (error) => {
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1
      });
    });
    
    // Send input if provided
    if (input && proc.stdin) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
}
