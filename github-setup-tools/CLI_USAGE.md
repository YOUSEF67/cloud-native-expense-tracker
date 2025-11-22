# GitHub Setup Tools - CLI Usage Guide

This document provides usage examples for all CLI commands in the GitHub Setup Tools package.

## Installation

After building the project, you can use the CLI commands:

```bash
npm run build
npm link  # Optional: makes commands available globally
```

## Available Commands

### 1. sync-git-branches

Safely synchronize local and remote Git branches.

**Usage:**
```bash
sync-git-branches [options]
```

**Options:**
- `-s, --strategy <type>` - Sync strategy: merge, rebase, or force (default: "merge")
- `-b, --branch <name>` - Branch name (defaults to current branch)
- `-y, --yes` - Skip confirmation prompts (use with caution)

**Examples:**
```bash
# Sync current branch using merge strategy
sync-git-branches

# Sync specific branch using rebase
sync-git-branches --strategy rebase --branch main

# Force push (with confirmation)
sync-git-branches --strategy force

# Force push without confirmation (dangerous!)
sync-git-branches --strategy force --yes
```

### 2. setup-branch-protection

Configure GitHub branch protection rules programmatically.

**Usage:**
```bash
setup-branch-protection [options]
```

**Options:**
- `-b, --branch <name>` - Branch name to protect (required)
- `-c, --config <file>` - Path to setup configuration file (default: ".github/setup-config.json")
- `--owner <owner>` - Repository owner (defaults to current repo)
- `--repo <name>` - Repository name (defaults to current repo)

**Examples:**
```bash
# Setup protection for main branch using default config
setup-branch-protection --branch main

# Use custom config file
setup-branch-protection --branch main --config custom-config.json

# Specify repository explicitly
setup-branch-protection --branch main --owner myorg --repo myrepo
```

### 3. validate-github-setup

Validate GitHub repository configuration completeness.

**Usage:**
```bash
validate-github-setup [options]
```

**Options:**
- `-c, --config <file>` - Path to setup configuration file (default: ".github/setup-config.json")
- `-v, --verbose` - Show detailed validation information
- `-b, --branch <name>` - Branch to check protection for (default: "main")
- `-w, --workflow-dir <path>` - Path to workflows directory (default: ".github/workflows")

**Examples:**
```bash
# Basic validation
validate-github-setup

# Verbose output
validate-github-setup --verbose

# Check different branch
validate-github-setup --branch develop

# Use custom config and workflow directory
validate-github-setup --config custom-config.json --workflow-dir .workflows
```

### 4. automate-github-setup

Orchestrate complete GitHub repository setup automatically.

**Usage:**
```bash
automate-github-setup [options]
```

**Options:**
- `-c, --config <file>` - Path to setup configuration file (default: ".github/setup-config.json")
- `--skip-existing` - Skip already-completed setup steps (default: true)
- `--no-skip-existing` - Re-run all setup steps even if already configured

**Examples:**
```bash
# Run automated setup (skips existing configurations)
automate-github-setup

# Re-run all steps
automate-github-setup --no-skip-existing

# Use custom config file
automate-github-setup --config custom-config.json
```

### 5. generate-commit-message

Generate descriptive commit messages for uploaded files.

**Note:** This command is a placeholder. Full implementation will be added in task 8.

**Usage:**
```bash
generate-commit-message [options]
```

**Options:**
- `-f, --files <files>` - Comma-separated list of files to commit (required)
- `-t, --type <type>` - Commit type: feat, fix, docs, chore, test, refactor, style, ci (default: "chore")
- `--scope <scope>` - Commit scope (optional)
- `--dry-run` - Generate message without creating commit

**Examples:**
```bash
# Generate commit message for files (dry run)
generate-commit-message --files "file1.ts,file2.ts" --dry-run

# Specify commit type
generate-commit-message --files "README.md" --type docs --dry-run

# With scope
generate-commit-message --files "api.ts" --type feat --scope api --dry-run
```

## Quick-Fix Commands

These commands provide immediate solutions for common GitHub setup issues.

### 6. quick-fix-sync

Quick fix for resolving non-fast-forward Git push errors.

**Usage:**
```bash
quick-fix-sync [options]
```

**Options:**
- `-b, --branch <name>` - Branch name (defaults to current branch)
- `-s, --strategy <type>` - Skip interactive prompt and use strategy: merge, rebase, or force

**Features:**
- Interactive mode with clear explanations of each option
- Safety checks and confirmation prompts for destructive operations
- Detailed conflict resolution guidance
- Step-by-step progress indicators

**Examples:**
```bash
# Interactive mode (recommended for first-time users)
quick-fix-sync

# Specify strategy directly
quick-fix-sync --strategy merge

# Fix specific branch
quick-fix-sync --branch develop --strategy rebase
```

**When to use:**
- When you encounter "non-fast-forward" errors during git push
- When your local branch is behind or diverged from remote
- When you need guidance on resolving Git synchronization issues

### 7. quick-fix-branch-protection

Quick fix for configuring branch protection with correct API schema.

**Usage:**
```bash
quick-fix-branch-protection [options]
```

**Options:**
- `-b, --branch <name>` - Branch name to protect (default: "main")
- `--owner <owner>` - Repository owner (defaults to current repo)
- `--repo <name>` - Repository name (defaults to current repo)
- `--interactive` - Interactive mode to configure protection rules

**Features:**
- Uses correct GitHub API v3 schema automatically
- Interactive configuration mode for custom rules
- Recommended default settings for common use cases
- Automatic verification of applied rules
- Detailed error messages with troubleshooting guidance

**Examples:**
```bash
# Apply recommended default protection rules
quick-fix-branch-protection

# Interactive mode to customize rules
quick-fix-branch-protection --interactive

# Protect different branch
quick-fix-branch-protection --branch develop

# Specify repository explicitly
quick-fix-branch-protection --owner myorg --repo myrepo --branch main
```

**When to use:**
- When branch protection API calls fail with schema errors
- When you need to quickly set up branch protection with best practices
- When you want to ensure correct JSON payload format
- When troubleshooting "422 Unprocessable Entity" errors from GitHub API

## Configuration File Format

The setup configuration file (`.github/setup-config.json`) should follow this structure:

```json
{
  "branchProtection": {
    "branch": "main",
    "requiredStatusChecks": ["ci/lint", "ci/test", "ci/build"],
    "requiredApprovals": 1,
    "enforceAdmins": true,
    "dismissStaleReviews": true,
    "requireCodeOwnerReviews": false,
    "requiredLinearHistory": false,
    "allowForcePushes": false,
    "allowDeletions": false
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
      "requiresApproval": false,
      "approvers": []
    },
    {
      "name": "staging",
      "requiresApproval": false,
      "approvers": []
    },
    {
      "name": "production",
      "requiresApproval": true,
      "approvers": []
    }
  ]
}
```

## Prerequisites

- Git installed and configured
- GitHub CLI (`gh`) installed and authenticated
- Node.js and npm installed
- Appropriate repository permissions for branch protection and secrets management

## Help

All commands support the `--help` flag for detailed usage information:

```bash
sync-git-branches --help
setup-branch-protection --help
validate-github-setup --help
automate-github-setup --help
generate-commit-message --help
quick-fix-sync --help
quick-fix-branch-protection --help
```

## Troubleshooting

### Quick-Fix Commands Not Working?

1. **Authentication Issues:**
   ```bash
   gh auth status
   gh auth login
   ```

2. **Repository Detection Issues:**
   - Ensure you're in a Git repository
   - Verify remote is configured: `git remote -v`
   - Check GitHub CLI can access repo: `gh repo view`

3. **Permission Issues:**
   - Branch protection requires admin access
   - Check your permissions: `gh api repos/{owner}/{repo}/collaborators/{username}/permission`

### Common Error Messages

- **"non-fast-forward"**: Use `quick-fix-sync` to resolve
- **"422 Unprocessable Entity"**: Use `quick-fix-branch-protection` with correct schema
- **"authentication failed"**: Run `gh auth login`
- **"status checks not found"**: Status checks must run at least once before being required
