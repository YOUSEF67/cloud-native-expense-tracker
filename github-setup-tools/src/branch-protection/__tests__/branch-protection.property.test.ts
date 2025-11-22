/**
 * Property-based tests for Branch Protection Manager
 */

import * as fc from 'fast-check';
import {
  buildProtectionPayload,
  validatePayloadSchema,
  parseApiError,
  applyProtectionRules,
  GitHubProtectionPayload,
  ApiErrorResponse
} from '../index';
import { ProtectionConfig } from '../../types/models';

/**
 * Arbitrary generator for ProtectionConfig
 */
const protectionConfigArbitrary = (): fc.Arbitrary<ProtectionConfig> => {
  return fc.record({
    branch: fc.string({ minLength: 1, maxLength: 50 }),
    requiredStatusChecks: fc.record({
      strict: fc.boolean(),
      checks: fc.array(
        fc.record({ context: fc.string({ minLength: 1, maxLength: 100 }) }),
        { minLength: 0, maxLength: 10 }
      )
    }),
    enforceAdmins: fc.boolean(),
    requiredPullRequestReviews: fc.record({
      dismissalRestrictions: fc.constant({}),
      dismissStaleReviews: fc.boolean(),
      requireCodeOwnerReviews: fc.boolean(),
      requiredApprovingReviewCount: fc.integer({ min: 0, max: 6 })
    }),
    restrictions: fc.constantFrom(null, {}),
    requiredLinearHistory: fc.boolean(),
    allowForcePushes: fc.boolean(),
    allowDeletions: fc.boolean()
  });
};

// Feature: github-setup-automation, Property 5: Branch protection payload conforms to schema
describe('Property 5: Branch protection payload conforms to schema', () => {
  test('generated branch protection payloads conform to GitHub API schema', () => {
    fc.assert(
      fc.property(protectionConfigArbitrary(), (config) => {
        const payload = buildProtectionPayload(config);
        const errors = validatePayloadSchema(payload);
        
        // The payload should have no validation errors
        return errors.length === 0;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: github-setup-automation, Property 6: Status checks formatted correctly
describe('Property 6: Status checks formatted correctly', () => {
  test('status checks are formatted with strict and checks properties', () => {
    fc.assert(
      fc.property(protectionConfigArbitrary(), (config) => {
        const payload = buildProtectionPayload(config);
        
        // If there are status checks, they should be properly formatted
        if (config.requiredStatusChecks.checks.length > 0) {
          return (
            payload.required_status_checks !== null &&
            typeof payload.required_status_checks === 'object' &&
            typeof payload.required_status_checks.strict === 'boolean' &&
            Array.isArray(payload.required_status_checks.checks) &&
            payload.required_status_checks.checks.every(
              check => typeof check === 'object' && typeof check.context === 'string'
            )
          );
        } else {
          // If no checks, should be null
          return payload.required_status_checks === null;
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: github-setup-automation, Property 7: PR review settings formatted correctly
describe('Property 7: PR review settings formatted correctly', () => {
  test('PR review settings contain nested dismissal_restrictions and required_approving_review_count', () => {
    fc.assert(
      fc.property(protectionConfigArbitrary(), (config) => {
        const payload = buildProtectionPayload(config);
        
        // PR review settings should always be present and properly formatted
        return (
          payload.required_pull_request_reviews !== null &&
          typeof payload.required_pull_request_reviews === 'object' &&
          typeof payload.required_pull_request_reviews.dismissal_restrictions === 'object' &&
          typeof payload.required_pull_request_reviews.dismiss_stale_reviews === 'boolean' &&
          typeof payload.required_pull_request_reviews.require_code_owner_reviews === 'boolean' &&
          typeof payload.required_pull_request_reviews.required_approving_review_count === 'number' &&
          payload.required_pull_request_reviews.required_approving_review_count >= 0
        );
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: github-setup-automation, Property 8: API success triggers verification
describe('Property 8: API success triggers verification', () => {
  test('successful API requests should indicate verification is needed', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectionConfigArbitrary(),
        fc.string({ minLength: 1, maxLength: 50 }), // owner
        fc.string({ minLength: 1, maxLength: 50 }), // repo
        async (config, owner, repo) => {
          const payload = buildProtectionPayload(config);
          
          // Mock executor that simulates successful API call
          const mockExecutor = async (command: string) => ({
            stdout: JSON.stringify({ url: 'https://api.github.com/...' }),
            stderr: '',
            exitCode: 0
          });
          
          const result = await applyProtectionRules(owner, repo, config.branch, payload, mockExecutor);
          
          // When API succeeds, shouldVerify should be true
          return result.success === true && result.shouldVerify === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: github-setup-automation, Property 9: API errors produce actionable guidance
describe('Property 9: API errors produce actionable guidance', () => {
  test('failed API requests should provide actionable guidance', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectionConfigArbitrary(),
        fc.string({ minLength: 1, maxLength: 50 }), // owner
        fc.string({ minLength: 1, maxLength: 50 }), // repo
        fc.constantFrom(
          { message: 'Validation failed', errors: [{ field: 'required_status_checks', message: 'Invalid format' }] },
          { message: 'Not Found' },
          { message: 'Forbidden' },
          { message: 'Unauthorized' },
          { message: 'Rate limit exceeded' }
        ),
        async (config, owner, repo, errorResponse) => {
          const payload = buildProtectionPayload(config);
          
          // Mock executor that simulates failed API call
          const mockExecutor = async (command: string) => ({
            stdout: '',
            stderr: JSON.stringify(errorResponse),
            exitCode: 1
          });
          
          const result = await applyProtectionRules(owner, repo, config.branch, payload, mockExecutor);
          
          // When API fails, should have error message with guidance
          return (
            result.success === false &&
            result.error !== undefined &&
            result.error.includes('Guidance:')
          );
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('parseApiError provides specific guidance for different error types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { message: 'Validation failed', errors: [{ field: 'checks', message: 'Invalid' }] },
          { message: 'Not Found' },
          { message: 'Forbidden' },
          { message: 'Unauthorized' },
          { message: 'Rate limit exceeded' },
          { message: 'Unknown error', documentation_url: 'https://docs.github.com' }
        ),
        (errorResponse) => {
          const parsed = parseApiError(errorResponse);
          
          // Should always have original message and guidance
          return (
            parsed.originalMessage === errorResponse.message &&
            parsed.guidance.length > 0 &&
            typeof parsed.guidance === 'string'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
