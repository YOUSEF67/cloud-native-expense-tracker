# Design Document: GitHub Setup Automation

## Overview

This feature provides a comprehensive toolkit for automating GitHub repository setup and troubleshooting common configuration issues. The system consists of modular utilities for Git synchronization, branch protection management, setup validation, and automated configuration scripts. The design emphasizes safety, clear error messaging, and adherence to GitHub API specifications.

## Architecture

The system follows a modular architecture with five main components:

1. **Git Sync Tool** - Handles local/remote branch synchronization
2. **Branch Protection Manager** - Manages GitHub branch protection via API
3. **Setup Validator** - Validates repository configuration completeness
4. **Setup Automation Scripts** - Orchestrates end-to-end repository setup
5. **Commit Message Generator** - Generates descriptive commit messages for uploaded files

These components are designed as independent utilities that can be used standalone or composed together. Each component uses the GitHub CLI (`gh`) for API interactions and standard Git commands for repository operations.

### Component Interaction

```
User
  ↓
Setup Automation Scripts ←→ Git Sync Tool
  ↓                          ↓
Branch Protection Manager ←→ GitHub API
  ↓                          ↓
Setup Validator ←→ GitHub CLI (gh)
  ↓
Commit Message Generator ←→ Git
```

## Components and Interfaces

### Git Sync Tool

**Purpose:** Safely synchronize local and remote Git branches

**Interface:**
```bash
sync_git_branches [--strategy=merge|rebase|force] [--branch=<name>]
```

**Functions:**
- `check_branch_status()` - Compares local and remote branch states
- `fetch_remote_changes()` - Fetches latest remote changes
- `merge_changes()` - Merges remote changes into local branch
- `rebase_changes()` - Rebases local commits onto remote
- `force_push_with_confirmation()` - Force pushes after explicit user confirmation
- `detect_conflicts()` - Identifies merge conflicts
- `verify_sync()` - Confirms local and remote are aligned

### Branch Protection Manager

**Purpose:** Configure GitHub branch protection rules programmatically

**Interface:**
```bash
setup_branch_protection --branch=<name> [--config=<file>]
```

**Functions:**
- `build_protection_payload()` - Constructs valid GitHub API JSON payload
- `validate_payload_schema()` - Validates JSON against GitHub API schema
- `apply_protection_rules()` - Sends API request to GitHub
- `parse_api_error()` - Extracts actionable information from API errors
- `verify_protection_active()` - Confirms rules are applied

**GitHub API Schema (v3):**
```json
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "ci/lint"},
      {"context": "ci/test"},
      {"context": "ci/build"}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

### Setup Validator

**Purpose:** Validate GitHub repository configuration

**Interface:**
```bash
validate_github_setup [--verbose]
```

**Functions:**
- `check_secrets()` - Verifies required secrets exist
- `check_branch_protection()` - Validates branch protection rules
- `check_workflows()` - Validates GitHub Actions workflow files
- `check_environments()` - Verifies environment configurations
- `generate_report()` - Creates validation report with remediation steps

**Validation Checks:**
- Required secrets: AWS_ACCOUNT_ID, AWS_REGION, ECR_REPOSITORY, EKS_CLUSTER_NAME_*
- Branch protection on main: PR reviews, status checks, admin enforcement
- Workflow files: Syntax validation, required jobs present
- Environments: dev, staging, production with appropriate protections

### Setup Automation Scripts

**Purpose:** Orchestrate complete repository setup

**Interface:**
```bash
automate_github_setup [--skip-existing] [--config=<file>]
```

**Functions:**
- `detect_current_state()` - Identifies completed setup steps
- `setup_branch_protection()` - Configures branch protection
- `setup_secrets()` - Prompts for and sets repository secrets
- `setup_environments()` - Creates and configures environments
- `run_validation()` - Executes setup validation
- `generate_summary()` - Creates setup completion report

### Commit Message Generator

**Purpose:** Generate descriptive commit messages for uploaded files

**Interface:**
```bash
generate_commit_message --files=<file1,file2,...> [--type=<feat|fix|docs|chore>]
```

**Functions:**
- `analyze_file_content()` - Analyzes file content to determine purpose
- `detect_file_type()` - Identifies file type and category
- `generate_description()` - Creates descriptive summary of file purpose
- `format_conventional_commit()` - Formats message using conventional commit standard
- `validate_message_quality()` - Ensures message meets quality standards
- `create_commit_with_message()` - Creates git commit with generated message

**Conventional Commit Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Commit Types:**
- `feat`: New feature or functionality
- `fix`: Bug fix
- `docs`: Documentation changes
- `chore`: Maintenance tasks, configuration
- `test`: Test files
- `refactor`: Code refactoring
- `style`: Code style changes
- `ci`: CI/CD configuration

## Data Models

### Branch Status
```typescript
interface BranchStatus {
  localBranch: string;
  remoteBranch: string;
  localCommit: string;
  remoteCommit: string;
  ahead: number;      // commits ahead of remote
  behind: number;     // commits behind remote
  diverged: boolean;  // branches have diverged
}
```

### Protection Config
```typescript
interface ProtectionConfig {
  branch: string;
  requiredStatusChecks: {
    strict: boolean;
    checks: Array<{context: string}>;
  };
  enforceAdmins: boolean;
  requiredPullRequestReviews: {
    dismissalRestrictions: object;
    dismissStaleReviews: boolean;
    requireCodeOwnerReviews: boolean;
    requiredApprovingReviewCount: number;
  };
  restrictions: null | object;
  requiredLinearHistory: boolean;
  allowForcePushes: boolean;
  allowDeletions: boolean;
}
```

### Validation Result
```typescript
interface ValidationResult {
  passed: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    remediation?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}
```

### Setup State
```typescript
interface SetupState {
  repositoryExists: boolean;
  remoteConfigured: boolean;
  branchProtectionConfigured: boolean;
  secretsConfigured: string[];  // list of configured secrets
  environmentsConfigured: string[];  // list of configured environments
  workflowsPresent: string[];  // list of workflow files
}
```

### Commit Message
```typescript
interface CommitMessage {
  type: 'feat' | 'fix' | 'docs' | 'chore' | 'test' | 'refactor' | 'style' | 'ci';
  scope?: string;
  subject: string;
  body?: string;
  footer?: string;
  files: string[];  // list of files included in commit
}
```

### File Analysis
```typescript
interface FileAnalysis {
  path: string;
  type: string;  // file extension or detected type
  category: 'code' | 'config' | 'documentation' | 'test' | 'asset' | 'other';
  purpose: string;  // inferred purpose description
  language?: string;  // programming language if applicable
}
```

## Correc
tness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Successful sync ensures alignment
*For any* Git repository where synchronization completes successfully, the local and remote branches should be at the same commit hash
**Validates: Requirements 1.5**

### Property 2: Pull and merge executes correct strategy
*For any* repository state where the user chooses pull and merge, the tool should execute git pull with merge strategy and report whether the operation succeeded or failed
**Validates: Requirements 1.2**

### Property 3: Force push requires confirmation
*For any* force push operation, the tool should issue a warning and require explicit user confirmation before executing the force push command
**Validates: Requirements 1.3**

### Property 4: Conflict detection identifies all conflicting files
*For any* merge operation that results in conflicts, the tool should identify and report all files that have conflicts
**Validates: Requirements 1.4**

### Property 5: Branch protection payload conforms to schema
*For any* branch protection configuration input, the generated JSON payload should conform to the GitHub API v3 branch protection schema
**Validates: Requirements 2.1**

### Property 6: Status checks formatted correctly
*For any* list of required status checks, the generated JSON should contain a "required_status_checks" object with "strict" boolean and "checks" array properties
**Validates: Requirements 2.2**

### Property 7: PR review settings formatted correctly
*For any* pull request review configuration, the generated JSON should contain a "required_pull_request_reviews" object with nested "dismissal_restrictions" and "required_approving_review_count" properties
**Validates: Requirements 2.3**

### Property 8: API success triggers verification
*For any* successful branch protection API request, the system should verify that the protection rules are actually active on the branch
**Validates: Requirements 2.4**

### Property 9: API errors produce actionable guidance
*For any* failed branch protection API request, the error parser should extract the error message and provide specific guidance for correction
**Validates: Requirements 2.5**

### Property 10: Validator detects missing secrets
*For any* repository state, the validator should correctly identify which required secrets are present and which are missing
**Validates: Requirements 3.1**

### Property 11: Validator checks branch protection
*For any* repository state, the validator should correctly determine whether branch protection rules are configured according to requirements
**Validates: Requirements 3.2**

### Property 12: Validator checks workflow validity
*For any* repository with workflow files, the validator should detect syntactically invalid workflows and report them
**Validates: Requirements 3.3**

### Property 13: Validator reports missing configurations with remediation
*For any* repository state with missing configurations, the validator should report each missing item along with specific remediation steps
**Validates: Requirements 3.4**

### Property 14: Setup script is idempotent
*For any* repository state, running the setup script multiple times should skip already-completed steps and not duplicate configurations
**Validates: Requirements 4.1**

### Property 15: Secret prompts are secure
*For any* secret input prompt, the system should not echo the entered value to the terminal
**Validates: Requirements 4.3**

### Property 16: Environment creation is complete
*For any* successful environment setup, the system should create dev, staging, and production environments with their respective protection rules
**Validates: Requirements 4.4**

### Property 17: Setup continues after failures
*For any* setup execution where one or more steps fail, the system should continue executing remaining steps and provide a summary of all failures at completion
**Validates: Requirements 4.5**

### Property 18: Generated commit messages describe file purpose
*For any* uploaded file, the generated commit message should contain a description that explains the file's purpose
**Validates: Requirements 6.1**

### Property 19: Commit messages include filename and summary
*For any* generated commit message, it should include both the filename and a summary of the file's contents or function
**Validates: Requirements 6.2**

### Property 20: Multi-file commits describe all files
*For any* set of multiple files uploaded together, the generated commit message should describe all added files
**Validates: Requirements 6.3**

### Property 21: Commit messages follow conventional format
*For any* generated commit message, it should conform to the conventional commit format with an appropriate type prefix (feat, fix, docs, chore, test, refactor, style, or ci)
**Validates: Requirements 6.4**

### Property 22: Commit messages meet quality standards
*For any* generated commit message, it should pass quality validation checks for clarity and completeness (minimum length, descriptive content, proper grammar)
**Validates: Requirements 6.5**

## Error Handling

### Git Sync Tool Errors

**Non-Fast-Forward Error:**
- Detect: Check git push exit code and stderr for "non-fast-forward" message
- Handle: Fetch remote changes, analyze divergence, present merge/rebase/force options
- User guidance: Explain that remote has changes not present locally

**Merge Conflict Error:**
- Detect: Check git merge/pull exit code and presence of conflict markers
- Handle: Parse git status to identify conflicting files
- User guidance: List conflicting files and provide resolution steps

**Authentication Error:**
- Detect: Check for "authentication failed" or "permission denied" in git output
- Handle: Verify git credentials and remote URL configuration
- User guidance: Direct to GitHub CLI authentication or SSH key setup

### Branch Protection Manager Errors

**Invalid JSON Schema:**
- Detect: GitHub API returns 422 with schema validation errors
- Handle: Parse error message to identify which fields are invalid
- User guidance: Show correct schema format for the failing fields

**Insufficient Permissions:**
- Detect: GitHub API returns 403 forbidden
- Handle: Check user's repository permissions
- User guidance: Explain that admin access is required for branch protection

**Branch Does Not Exist:**
- Detect: GitHub API returns 404 for branch
- Handle: List available branches
- User guidance: Suggest creating the branch or using an existing one

### Setup Validator Errors

**GitHub CLI Not Authenticated:**
- Detect: `gh auth status` returns non-zero exit code
- Handle: Prompt user to authenticate
- User guidance: Provide `gh auth login` command

**Missing Repository Context:**
- Detect: `gh repo view` fails or not in a git repository
- Handle: Check if current directory is a git repository with remote
- User guidance: Explain repository context requirements

**API Rate Limiting:**
- Detect: GitHub API returns 429 or rate limit headers
- Handle: Parse rate limit reset time
- User guidance: Show when rate limit resets and suggest authentication for higher limits

### Setup Automation Errors

**Partial Setup Failure:**
- Detect: Any setup step returns non-zero exit code
- Handle: Log the failure, mark step as failed, continue with next steps
- User guidance: Provide summary of failed steps with individual error messages

**Secret Input Timeout:**
- Detect: User input prompt times out or receives EOF
- Handle: Skip the secret, mark as not configured
- User guidance: Explain that secrets can be configured later manually

**Environment Creation Conflict:**
- Detect: Environment already exists with different configuration
- Handle: Offer to update existing environment or skip
- User guidance: Show current vs. desired configuration differences

### Commit Message Generator Errors

**Unreadable File:**
- Detect: File cannot be read or accessed
- Handle: Use filename and extension to infer purpose
- User guidance: Warn that commit message is based on filename only

**Binary File:**
- Detect: File is binary and content cannot be analyzed
- Handle: Generate message based on file type and extension
- User guidance: Indicate that message is based on file type analysis

**Ambiguous File Purpose:**
- Detect: Cannot determine clear purpose from file content
- Handle: Generate generic but descriptive message based on file location and type
- User guidance: Suggest user review and edit commit message if needed

**Invalid Commit Type:**
- Detect: Cannot determine appropriate conventional commit type
- Handle: Default to 'chore' type with explanation
- User guidance: Suggest appropriate type based on file analysis

**Quality Validation Failure:**
- Detect: Generated message fails quality checks
- Handle: Enhance message with additional context until it passes
- User guidance: Show what quality standards were not met and how they were addressed

## Testing Strategy

This feature will use a dual testing approach combining unit tests for specific scenarios and property-based tests for universal correctness properties.

### Unit Testing

Unit tests will cover:
- Specific Git repository states (ahead, behind, diverged, conflicted)
- Known GitHub API error responses and their parsing
- Edge cases like empty repositories, detached HEAD states
- Integration with GitHub CLI commands
- Specific validation scenarios (all secrets present, some missing, none present)
- Specific file types and their expected commit message formats
- Edge cases for commit message generation (binary files, empty files, large files)

Unit test framework: **Jest** (for Node.js/TypeScript implementation) or **pytest** (for Python implementation)

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs. Each property test will run a minimum of 100 iterations.

Property test framework: **fast-check** (for JavaScript/TypeScript) or **Hypothesis** (for Python)

**Property Test Requirements:**
- Each property-based test MUST be tagged with a comment referencing the correctness property from this design document
- Tag format: `// Feature: github-setup-automation, Property {number}: {property_text}`
- Each correctness property MUST be implemented by a SINGLE property-based test
- Each test MUST run at least 100 iterations to ensure thorough coverage

**Example Property Test Structure:**
```typescript
// Feature: github-setup-automation, Property 5: Branch protection payload conforms to schema
test('generated branch protection payloads conform to GitHub API schema', () => {
  fc.assert(
    fc.property(
      branchProtectionConfigArbitrary(),
      (config) => {
        const payload = buildProtectionPayload(config);
        return validateAgainstGitHubSchema(payload);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Data Generation

For property-based tests, we'll need generators for:
- Git repository states (commit histories, branch relationships)
- Branch protection configurations (various combinations of settings)
- Validation states (different combinations of present/missing configurations)
- GitHub API error responses (various error formats and codes)
- File content samples (various file types, languages, purposes)
- Commit message components (types, scopes, subjects, bodies)

### Integration Testing

Integration tests will verify:
- End-to-end setup automation flow
- Actual GitHub API interactions (using test repositories)
- Git command execution in real repositories
- GitHub CLI command integration

### Test Environment

- Use temporary Git repositories for testing Git operations
- Use GitHub test organization/repositories for API integration tests
- Mock GitHub API responses for unit tests
- Use in-memory or temporary file systems where possible

## Implementation Notes

### Language and Runtime

Recommended implementation: **Bash scripts** with **Node.js/TypeScript** utilities for complex logic

Rationale:
- Bash scripts integrate naturally with Git and GitHub CLI
- TypeScript provides type safety for JSON schema validation
- Easy to distribute and run in CI/CD environments
- Minimal dependencies for end users

### Dependencies

- GitHub CLI (`gh`) - Required for GitHub API interactions
- Git - Required for repository operations
- Node.js (if using TypeScript utilities) - For JSON schema validation and complex logic
- jq - For JSON parsing in bash scripts (optional, can use Node.js instead)

### Configuration

Configuration file format (`.github/setup-config.json`):
```json
{
  "branchProtection": {
    "branch": "main",
    "requiredStatusChecks": ["ci/lint", "ci/test", "ci/build"],
    "requiredApprovals": 1,
    "enforceAdmins": true
  },
  "secrets": [
    "AWS_ACCOUNT_ID",
    "AWS_REGION",
    "ECR_REPOSITORY",
    "EKS_CLUSTER_NAME_DEV",
    "EKS_CLUSTER_NAME_STAGING",
    "EKS_CLUSTER_NAME_PROD"
  ],
  "environments": [
    {
      "name": "dev",
      "requiresApproval": false
    },
    {
      "name": "staging",
      "requiresApproval": false
    },
    {
      "name": "production",
      "requiresApproval": true,
      "approvers": []
    }
  ]
}
```

### Security Considerations

- Never log or display secret values
- Use secure input methods (no echo) for sensitive data
- Validate all user inputs before executing commands
- Require explicit confirmation for destructive operations (force push)
- Use GitHub CLI authentication instead of personal access tokens where possible
- Implement rate limiting awareness to avoid API throttling

### Performance Considerations

- Cache GitHub API responses where appropriate
- Batch API requests when possible
- Use git fetch instead of git pull when only checking status
- Implement timeout mechanisms for user input prompts
- Provide progress indicators for long-running operations

### Extensibility

The design supports future extensions:
- Additional validation checks (code owners, required workflows)
- Custom branch protection templates
- Multi-repository setup automation
- Integration with other Git hosting platforms (GitLab, Bitbucket)
- Webhook configuration
- GitHub App installation automation
