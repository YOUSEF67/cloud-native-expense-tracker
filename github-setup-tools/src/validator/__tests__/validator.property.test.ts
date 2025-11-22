/**
 * Property-based tests for Setup Validator
 */

import * as fc from 'fast-check';
import { execSync } from 'child_process';
import { 
  checkSecrets, 
  checkBranchProtection, 
  checkWorkflows, 
  checkEnvironments,
  generateReport 
} from '../index';

// Mock child_process execSync
jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn()
}));

import { existsSync, readFileSync, readdirSync } from 'fs';
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>;

describe('Setup Validator Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature: github-setup-automation, Property 10: Validator detects missing secrets
  // Validates: Requirements 3.1
  describe('Property 10: Validator detects missing secrets', () => {
    test('for any repository state, validator correctly identifies present and missing secrets', () => {
      fc.assert(
        fc.property(
          // Generate a list of required secrets
          fc.array(fc.string({ minLength: 1, maxLength: 30 }).map(s => s.toUpperCase().replace(/[^A-Z0-9_]/g, '_')), { minLength: 1, maxLength: 10 }),
          // Generate a list of existing secrets (subset or superset)
          fc.array(fc.string({ minLength: 1, maxLength: 30 }).map(s => s.toUpperCase().replace(/[^A-Z0-9_]/g, '_')), { minLength: 0, maxLength: 15 }),
          (requiredSecrets, existingSecrets) => {
            // Make required secrets unique
            const uniqueRequired = Array.from(new Set(requiredSecrets));
            const uniqueExisting = Array.from(new Set(existingSecrets));
            
            // Mock GitHub CLI response
            const secretObjects = uniqueExisting.map(name => ({ name }));
            mockExecSync.mockReturnValue(JSON.stringify(secretObjects));
            
            const result = checkSecrets(uniqueRequired);
            
            // Calculate expected missing secrets
            const expectedMissing = uniqueRequired.filter(
              secret => !uniqueExisting.includes(secret)
            );
            
            // Property: The validator should correctly identify missing secrets
            if (expectedMissing.length === 0) {
              // All secrets present
              expect(result.status).toBe('pass');
              expect(result.message).toContain('All');
              expect(result.message).toContain('required secrets are configured');
            } else {
              // Some secrets missing
              expect(result.status).toBe('fail');
              expect(result.message).toContain('Missing');
              // Check that all missing secrets are mentioned
              expectedMissing.forEach(secret => {
                expect(result.message).toContain(secret);
              });
              expect(result.remediation).toBeDefined();
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: github-setup-automation, Property 11: Validator checks branch protection
  // Validates: Requirements 3.2
  describe('Property 11: Validator checks branch protection', () => {
    test('for any repository state, validator correctly determines branch protection status', () => {
      fc.assert(
        fc.property(
          // Generate branch name
          fc.constantFrom('main', 'master', 'develop', 'staging'),
          // Generate whether protection exists
          fc.boolean(),
          // If protection exists, generate protection features
          fc.record({
            hasStatusChecks: fc.boolean(),
            hasPRReviews: fc.boolean(),
            enforceAdmins: fc.boolean()
          }),
          (branch, hasProtection, features) => {
            if (!hasProtection) {
              // Mock 404 response for no protection
              mockExecSync.mockImplementation(() => {
                throw new Error('HTTP 404: Not Found');
              });
              
              const result = checkBranchProtection(branch);
              
              // Property: Should detect missing protection
              expect(result.status).toBe('fail');
              expect(result.message).toContain('no protection rules');
              expect(result.remediation).toBeDefined();
            } else {
              // Mock protection response
              const protection = {
                required_status_checks: features.hasStatusChecks ? { strict: true, checks: [] } : null,
                required_pull_request_reviews: features.hasPRReviews ? { required_approving_review_count: 1 } : null,
                enforce_admins: { enabled: features.enforceAdmins }
              };
              
              mockExecSync.mockReturnValue(JSON.stringify(protection));
              
              const result = checkBranchProtection(branch);
              
              // Property: Should correctly identify protection status
              const hasAnyFeature = features.hasStatusChecks || features.hasPRReviews || features.enforceAdmins;
              
              if (hasAnyFeature) {
                expect(result.status).toBe('pass');
                expect(result.message).toContain('protection rules configured');
              } else {
                expect(result.status).toBe('warning');
                expect(result.message).toContain('no specific rules configured');
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: github-setup-automation, Property 12: Validator checks workflow validity
  // Validates: Requirements 3.3
  describe('Property 12: Validator checks workflow validity', () => {
    test('for any repository with workflow files, validator detects invalid workflows', () => {
      fc.assert(
        fc.property(
          // Generate whether workflows directory exists
          fc.boolean(),
          // Generate list of workflow files (some valid, some invalid)
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 })
                .filter(s => !s.includes('/') && !s.includes('\\') && s.trim().length > 0)
                .map(s => s.replace(/[^a-zA-Z0-9_-]/g, '_') + '.yml'),
              isValid: fc.boolean()
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (dirExists, workflows) => {
            const workflowDir = '.github/workflows';
            
            if (!dirExists) {
              mockExistsSync.mockReturnValue(false);
              
              const result = checkWorkflows(workflowDir);
              
              // Property: Should detect missing directory
              expect(result.status).toBe('fail');
              expect(result.message).toContain('No .github/workflows directory');
              expect(result.remediation).toBeDefined();
            } else if (workflows.length === 0) {
              mockExistsSync.mockReturnValue(true);
              mockReaddirSync.mockReturnValue([]);
              
              const result = checkWorkflows(workflowDir);
              
              // Property: Should detect no workflow files
              expect(result.status).toBe('fail');
              expect(result.message).toContain('No workflow files found');
              expect(result.remediation).toBeDefined();
            } else {
              mockExistsSync.mockReturnValue(true);
              mockReaddirSync.mockReturnValue(workflows.map(w => w.name) as any);
              
              // Mock file reading
              mockReadFileSync.mockImplementation((path: any) => {
                const filename = path.toString().split('/').pop();
                const workflow = workflows.find(w => w.name === filename);
                
                if (workflow && !workflow.isValid) {
                  // Return content with tabs (invalid YAML)
                  return '\tname: test\n\tjobs:\n\t\ttest: {}';
                }
                // Return valid YAML
                return 'name: test\njobs:\n  test:\n    runs-on: ubuntu-latest';
              });
              
              const result = checkWorkflows(workflowDir);
              
              const invalidCount = workflows.filter(w => !w.isValid).length;
              
              // Property: Should correctly identify invalid workflows
              if (invalidCount > 0) {
                expect(result.status).toBe('fail');
                expect(result.message).toContain('syntax');
                expect(result.remediation).toBeDefined();
              } else {
                expect(result.status).toBe('pass');
                expect(result.message).toContain(`Found ${workflows.length}`);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: github-setup-automation, Property 13: Validator reports missing configurations with remediation
  // Validates: Requirements 3.4
  describe('Property 13: Validator reports missing configurations with remediation', () => {
    test('for any repository state with missing configurations, validator provides remediation steps', () => {
      fc.assert(
        fc.property(
          // Generate configuration state
          fc.record({
            secretsMissing: fc.boolean(),
            protectionMissing: fc.boolean(),
            workflowsMissing: fc.boolean(),
            environmentsMissing: fc.boolean()
          }),
          (state) => {
            // Setup mocks based on state
            if (state.secretsMissing) {
              mockExecSync.mockReturnValueOnce(JSON.stringify([]));
            } else {
              mockExecSync.mockReturnValueOnce(JSON.stringify([{ name: 'SECRET1' }]));
            }
            
            if (state.protectionMissing) {
              mockExecSync.mockImplementationOnce(() => {
                throw new Error('HTTP 404: Not Found');
              });
            } else {
              mockExecSync.mockReturnValueOnce(JSON.stringify({
                required_status_checks: { strict: true, checks: [] },
                required_pull_request_reviews: { required_approving_review_count: 1 },
                enforce_admins: { enabled: true }
              }));
            }
            
            if (state.workflowsMissing) {
              mockExistsSync.mockReturnValue(false);
            } else {
              mockExistsSync.mockReturnValue(true);
              mockReaddirSync.mockReturnValue(['test.yml'] as any);
              mockReadFileSync.mockReturnValue('name: test\njobs:\n  test: {}');
            }
            
            if (state.environmentsMissing) {
              mockExecSync.mockReturnValueOnce(JSON.stringify({ environments: [] }));
            } else {
              mockExecSync.mockReturnValueOnce(JSON.stringify({ 
                environments: [{ name: 'dev' }] 
              }));
            }
            
            const result = generateReport(['SECRET1'], ['dev'], 'main', '.github/workflows');
            
            // Property: Every failed check must have remediation steps
            const failedChecks = result.checks.filter(c => c.status === 'fail');
            
            failedChecks.forEach(check => {
              expect(check.remediation).toBeDefined();
              expect(check.remediation).not.toBe('');
              expect(typeof check.remediation).toBe('string');
            });
            
            // Property: Report should accurately reflect overall status
            if (failedChecks.length > 0) {
              expect(result.passed).toBe(false);
              expect(result.summary.failed).toBe(failedChecks.length);
            } else {
              expect(result.passed).toBe(true);
              expect(result.summary.failed).toBe(0);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
