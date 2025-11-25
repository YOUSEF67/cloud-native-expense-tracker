# GitHub Repository Setup Guide

This guide walks you through setting up the GitHub repository with proper configuration for this project.

## Step 1: Create GitHub Repository

### Option A: Using GitHub CLI (gh)

```bash
# Install GitHub CLI if not already installed
# macOS: brew install gh
# Login to GitHub
gh auth login

# Create repository
gh repo create cloud-native-expense-tracker \
  --public \
  --description "Production-ready expense tracking app showcasing cloud-native architecture, Kubernetes, Terraform IaC, and GitOps on AWS" \
  --clone

# Navigate to the cloned repository
cd cloud-native-expense-tracker
```

### Option B: Using GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `cloud-native-expense-tracker`
3. Description: "Production-ready expense tracking app showcasing cloud-native architecture, Kubernetes, Terraform IaC, and GitOps on AWS"
4. Choose Public or Private
5. Do NOT initialize with README (we already have one)
6. Click "Create repository"

Then push your local code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/cloud-native-expense-tracker.git
git branch -M main
git push -u origin main
```

## Step 2: Set Up Branch Protection Rules

Protect the `main` branch to ensure code quality and prevent accidental changes.

### Using GitHub CLI

```bash
# Enable branch protection for main (GitHub API v3 format)
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --input - <<EOF
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
EOF
```

**Note:** The GitHub API v3 requires `required_status_checks` to be an object with `strict` (boolean) and `checks` (array of objects with `context` property). The older `contexts` array format is deprecated.

### Using GitHub Web Interface

1. Go to your repository on GitHub
2. Click **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule**
4. Branch name pattern: `main`
5. Enable the following settings:
   - ✅ **Require a pull request before merging**
     - Required approvals: 1
   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Add status checks: `ci/lint`, `ci/test`, `ci/build` (these will appear after first workflow run)
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings** (optional, for stricter enforcement)
6. Click **Create** or **Save changes**

## Step 3: Configure GitHub Secrets

Set up secrets required for CI/CD workflows.

### Using GitHub CLI

```bash
# Set AWS Account ID
gh secret set AWS_ACCOUNT_ID --body "123456789012"

# Set AWS Region
gh secret set AWS_REGION --body "us-east-1"

# Set ECR Repository Name
gh secret set ECR_REPOSITORY --body "expense-backend"

# Set EKS Cluster Name for each environment
gh secret set EKS_CLUSTER_NAME_DEV --body "expense-cluster-dev"
gh secret set EKS_CLUSTER_NAME_STAGING --body "expense-cluster-staging"
gh secret set EKS_CLUSTER_NAME_PROD --body "expense-cluster-prod"
```

### Using GitHub Web Interface

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AWS_ACCOUNT_ID` | Your AWS account ID | `123456789012` |
| `AWS_REGION` | AWS region for deployment | `us-east-1` |
| `ECR_REPOSITORY` | ECR repository name | `expense-backend` |
| `EKS_CLUSTER_NAME_DEV` | Dev EKS cluster name | `expense-cluster-dev` |
| `EKS_CLUSTER_NAME_STAGING` | Staging EKS cluster name | `expense-cluster-staging` |
| `EKS_CLUSTER_NAME_PROD` | Production EKS cluster name | `expense-cluster-prod` |

## Step 4: Configure GitHub Environments

Set up environments for deployment approvals (especially for production).

### Using GitHub Web Interface

1. Go to your repository on GitHub
2. Click **Settings** → **Environments**
3. Click **New environment**

#### Create Dev Environment
- Name: `dev`
- No protection rules needed (auto-deploy)

#### Create Staging Environment
- Name: `staging`
- Optional: Add required reviewers if desired

#### Create Production Environment
- Name: `production`
- ✅ **Required reviewers**: Add team members who must approve production deployments
- ✅ **Wait timer**: Optional, e.g., 5 minutes
- Environment secrets (if different from repository secrets):
  - Add production-specific secrets if needed

## Step 5: Initialize Git Repository (if not already done)

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Project structure and documentation"

# Add remote origin (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/cloud-native-expense-tracker.git

# Push to main branch
git branch -M main
git push -u origin main
```

## Step 6: Verify Setup

### Check Branch Protection
```bash
gh api repos/:owner/:repo/branches/main/protection
```

### Check Secrets
```bash
gh secret list
```

### Check Environments
```bash
gh api repos/:owner/:repo/environments
```

## Step 7: Set Up OIDC for GitHub Actions (After Infrastructure Deployment)

After deploying the Terraform OIDC module, you'll need to configure the IAM role ARN:

```bash
# Set the IAM role ARN for GitHub Actions
gh secret set AWS_ROLE_TO_ASSUME --body "arn:aws:iam::123456789012:role/GitHubActionsRole"
```

This role will be created by the Terraform OIDC module and allows GitHub Actions to authenticate with AWS without long-lived credentials.

## Additional Configuration

### Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select:
   - ✅ **Allow all actions and reusable workflows**
3. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

### Enable Dependabot (Optional)

1. Go to **Settings** → **Security** → **Code security and analysis**
2. Enable:
   - ✅ **Dependabot alerts**
   - ✅ **Dependabot security updates**

### Set Up Issue Templates (Optional)

Create `.github/ISSUE_TEMPLATE/` directory with templates for bug reports and feature requests.

### Set Up Pull Request Template (Optional)

Create `.github/PULL_REQUEST_TEMPLATE.md` with a standard PR template.

## Troubleshooting

### Non-Fast-Forward Git Push Errors

**Problem:** When pushing to GitHub, you receive an error like:
```
! [rejected]        main -> main (non-fast-forward)
error: failed to push some refs to 'https://github.com/user/repo.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart.
```

**Cause:** This occurs when the remote branch has commits that your local branch doesn't have. Your local and remote branches have diverged.

**Resolution Options:**

#### Option 1: Pull and Merge (Recommended for most cases)

**Using CLI:**
```bash
# Fetch remote changes
git fetch origin main

# Check the status
git status

# Pull and merge remote changes
git pull origin main

# Resolve any merge conflicts if they occur
# Edit conflicting files, then:
git add .
git commit -m "Merge remote changes"

# Push your changes
git push origin main
```

**Using the automation tool:**
```bash
# Use the Git sync tool with merge strategy
cd github-setup-tools
npm run sync-git-branches -- --strategy=merge --branch=main
```

#### Option 2: Rebase (For cleaner history)

**Using CLI:**
```bash
# Fetch remote changes
git fetch origin main

# Rebase your local commits on top of remote
git rebase origin/main

# Resolve any conflicts if they occur
# Edit conflicting files, then:
git add .
git rebase --continue

# Force push (only if you're sure no one else is working on the branch)
git push origin main --force-with-lease
```

**Using the automation tool:**
```bash
# Use the Git sync tool with rebase strategy
cd github-setup-tools
npm run sync-git-branches -- --strategy=rebase --branch=main
```

#### Option 3: Force Push (Use with extreme caution)

**⚠️ WARNING:** This will overwrite remote changes and may cause data loss for other collaborators.

**Using CLI:**
```bash
# Only use if you're absolutely certain you want to overwrite remote changes
git push origin main --force-with-lease
```

**Using the automation tool:**
```bash
# The tool will prompt for confirmation before force pushing
cd github-setup-tools
npm run sync-git-branches -- --strategy=force --branch=main
```

**When to use each option:**
- **Pull and Merge:** Safe default, preserves all history
- **Rebase:** When you want a linear history and are working alone
- **Force Push:** Only when you're certain the remote changes should be discarded (e.g., fixing a mistake)

---

### Branch Protection API Errors

**Problem:** When setting up branch protection via API, you receive errors like:
```
422 Unprocessable Entity
{
  "message": "Validation Failed",
  "errors": [...]
}
```

**Cause:** The JSON payload doesn't conform to the GitHub API v3 schema requirements.

**Common Issues and Solutions:**

#### Issue 1: Incorrect `required_status_checks` format

**❌ Incorrect (deprecated format):**
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci/lint", "ci/test"]
  }
}
```

**✅ Correct (current format):**
```json
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "ci/lint"},
      {"context": "ci/test"}
    ]
  }
}
```

#### Issue 2: Missing nested objects in `required_pull_request_reviews`

**❌ Incorrect:**
```json
{
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  }
}
```

**✅ Correct:**
```json
{
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  }
}
```

#### Complete Valid Schema

**Using CLI with correct schema:**
```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --input - <<EOF
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
EOF
```

**Using the automation tool:**
```bash
# The tool automatically generates correct schema
cd github-setup-tools
npm run setup-branch-protection -- --branch=main --config=.github/setup-config.json
```

**Using Web Interface:**
1. Go to **Settings** → **Branches** → **Add rule**
2. Configure settings through the UI (automatically generates correct API calls)
3. This is the safest option if you're unsure about the API schema

---

### Authentication Errors

**Problem:** Commands fail with authentication errors:
```
gh: authentication failed
error: could not read Username for 'https://github.com': terminal prompts disabled
```

**Cause:** GitHub CLI is not authenticated or credentials have expired.

**Resolution:**

#### Step 1: Check Authentication Status

```bash
gh auth status
```

#### Step 2: Authenticate with GitHub CLI

**Interactive authentication (recommended):**
```bash
gh auth login
```

Follow the prompts:
1. Choose **GitHub.com**
2. Choose **HTTPS** or **SSH** (HTTPS is easier for most users)
3. Choose **Login with a web browser**
4. Copy the one-time code and press Enter
5. Complete authentication in your browser

**Token authentication:**
```bash
# Create a personal access token at https://github.com/settings/tokens
# Required scopes: repo, workflow, admin:org (for branch protection)

# Set the token
gh auth login --with-token < token.txt
# Or paste the token when prompted
```

#### Step 3: Verify Authentication

```bash
# Check authentication status
gh auth status

# Test API access
gh api user
```

#### Step 4: Configure Git Credentials

**For HTTPS:**
```bash
# Configure Git to use GitHub CLI as credential helper
gh auth setup-git
```

**For SSH:**
```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add SSH key to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add SSH key to GitHub
gh ssh-key add ~/.ssh/id_ed25519.pub --title "My Computer"

# Test SSH connection
ssh -T git@github.com
```

**Using Web Interface:**
1. Go to **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token**
3. Select scopes: `repo`, `workflow`, `admin:org`
4. Copy the token and use it with `gh auth login --with-token`

---

### Missing Status Checks

**Problem:** When setting up branch protection, status checks don't appear in the list, or you get an error:
```
Status check "ci/lint" not found
```

**Cause:** Status checks only become available after they've run at least once in a workflow.

**Resolution:**

#### Step 1: Ensure Workflows Exist

Check that you have GitHub Actions workflows defined:
```bash
# List workflow files
ls -la .github/workflows/

# Should see files like: ci.yml, deploy.yml, etc.
```

#### Step 2: Verify Workflow Syntax

**Using CLI:**
```bash
# Validate workflow syntax
gh workflow list

# View workflow details
gh workflow view ci.yml
```

**Using Web Interface:**
1. Go to **Actions** tab in your repository
2. Check for any workflow syntax errors
3. Workflows with errors will show a warning icon

#### Step 3: Trigger Initial Workflow Run

**Option A: Push a commit**
```bash
git commit --allow-empty -m "Trigger workflows"
git push origin main
```

**Option B: Manually trigger workflow**
```bash
# If workflow has workflow_dispatch trigger
gh workflow run ci.yml
```

**Option C: Using Web Interface**
1. Go to **Actions** tab
2. Select the workflow
3. Click **Run workflow** (if available)

#### Step 4: Wait for Workflow Completion

```bash
# Watch workflow runs
gh run list --workflow=ci.yml

# View specific run
gh run view <run-id>
```

#### Step 5: Add Status Checks to Branch Protection

**After workflows have run at least once:**

**Using CLI:**
```bash
# Now the status checks will be recognized
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --input - <<EOF
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
  "restrictions": null
}
EOF
```

**Using Web Interface:**
1. Go to **Settings** → **Branches** → **Edit rule** (or **Add rule**)
2. Under "Require status checks to pass before merging"
3. Search for status checks - they should now appear in the dropdown
4. Select the required checks
5. Click **Save changes**

**Note:** Status check names must match exactly with the job names in your workflow files:
```yaml
# In .github/workflows/ci.yml
jobs:
  lint:  # This creates status check "ci/lint" or just "lint"
    runs-on: ubuntu-latest
    # ...
```

---

### Branch Protection Not Working
- Ensure you have admin access to the repository
- Check that status check names match exactly with workflow job names
- Status checks only appear after the first workflow run
- Verify the API schema is correct (see Branch Protection API Errors section above)

### Secrets Not Available in Workflows
- Verify secrets are set at the repository level (not organization level)
- Check that workflow has correct permissions
- Ensure secret names match exactly in workflow files
- Secrets are not available in workflows triggered by forks (security feature)

### OIDC Authentication Failing
- Verify the IAM role trust policy includes your GitHub repository
- Check that the role ARN is correctly set in secrets
- Ensure the OIDC provider is created in AWS
- Verify the workflow has `id-token: write` permission

## Commit Message Generator

The GitHub Setup Automation toolkit includes a commit message generator that creates descriptive, conventional commit messages for your files.

### Basic Usage

**Generate commit message for a single file:**
```bash
cd github-setup-tools
npm run generate-commit-message -- --files=src/index.ts
```

**Generate commit message for multiple files:**
```bash
npm run generate-commit-message -- --files=src/index.ts,src/utils.ts,README.md
```

**Specify commit type:**
```bash
npm run generate-commit-message -- --files=src/feature.ts --type=feat
npm run generate-commit-message -- --files=docs/guide.md --type=docs
npm run generate-commit-message -- --files=package.json --type=chore
```

### Conventional Commit Types

The generator follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

| Type | Description | Example Use Case |
|------|-------------|------------------|
| `feat` | New feature | Adding new functionality |
| `fix` | Bug fix | Fixing a bug or error |
| `docs` | Documentation | README, guides, comments |
| `chore` | Maintenance | Dependencies, config files |
| `test` | Tests | Test files and test utilities |
| `refactor` | Code refactoring | Restructuring without changing behavior |
| `style` | Code style | Formatting, whitespace |
| `ci` | CI/CD changes | GitHub Actions, Jenkins, etc. |

### How It Works

The commit message generator:

1. **Analyzes file content** - Reads and understands the purpose of each file
2. **Detects file type** - Identifies programming language, config format, or document type
3. **Generates description** - Creates a clear summary of what the file does
4. **Formats message** - Applies conventional commit format with appropriate type
5. **Validates quality** - Ensures the message meets clarity and completeness standards

### Generated Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example output:**
```
feat(api): add user authentication endpoint

Implements JWT-based authentication with login and token refresh
functionality. Includes middleware for protected routes.

Files: src/api/auth.ts, src/middleware/auth.ts
```

### Customization

#### Custom Configuration File

Create `.github/commit-config.json`:
```json
{
  "defaultType": "chore",
  "includeFileList": true,
  "maxSubjectLength": 72,
  "requireBody": false,
  "typeMapping": {
    "*.test.ts": "test",
    "*.spec.ts": "test",
    "*.md": "docs",
    "Dockerfile": "ci",
    "*.yml": "ci",
    "*.yaml": "ci"
  }
}
```

**Use custom config:**
```bash
npm run generate-commit-message -- --files=test.ts --config=.github/commit-config.json
```

#### Automatic Type Detection

The generator automatically detects appropriate commit types based on file patterns:

- `*.test.ts`, `*.spec.ts` → `test`
- `*.md`, `*.txt` → `docs`
- `Dockerfile`, `*.yml`, `*.yaml`, `Jenkinsfile` → `ci`
- `package.json`, `*.config.js` → `chore`
- `*.ts`, `*.js`, `*.py` (with new features) → `feat`
- `*.ts`, `*.js`, `*.py` (with fixes) → `fix`

#### Override Auto-Detection

Force a specific type even if auto-detection suggests otherwise:
```bash
npm run generate-commit-message -- --files=src/api.ts --type=refactor --force
```

### Integration with Git Workflow

#### Option 1: Generate and Review

```bash
# Generate message and save to file
npm run generate-commit-message -- --files=src/feature.ts > commit-msg.txt

# Review and edit if needed
cat commit-msg.txt

# Use the message for commit
git add src/feature.ts
git commit -F commit-msg.txt
```

#### Option 2: Direct Commit

```bash
# Generate and commit in one step
npm run generate-commit-message -- --files=src/feature.ts --commit

# This will:
# 1. Generate the commit message
# 2. Stage the specified files
# 3. Create the commit automatically
```

#### Option 3: Interactive Mode

```bash
# Interactive mode prompts for confirmation
npm run generate-commit-message -- --files=src/feature.ts --interactive

# You'll see:
# - Generated commit message
# - Prompt to edit, accept, or cancel
# - Option to modify before committing
```

### Quality Standards

Generated commit messages must meet these quality standards:

1. **Minimum length:** Subject line at least 10 characters
2. **Maximum length:** Subject line no more than 72 characters
3. **Descriptive content:** Must explain what the file does, not just name it
4. **Proper grammar:** Correct capitalization and punctuation
5. **Imperative mood:** Use "add feature" not "adds feature" or "added feature"
6. **No generic messages:** Avoids "update file" or "change code"

**Examples of quality validation:**

❌ **Rejected:**
```
chore: update file
```
*Reason: Too generic, doesn't explain what changed*

❌ **Rejected:**
```
feat: added new feature for handling user authentication and authorization with JWT tokens and refresh token rotation
```
*Reason: Subject line too long (>72 characters)*

✅ **Accepted:**
```
feat(auth): add JWT authentication with token refresh

Implements user authentication using JWT tokens with automatic
refresh token rotation for enhanced security.
```

### Troubleshooting

#### Issue: Generated message is too generic

**Solution:** Ensure files have sufficient content for analysis
```bash
# Add comments or documentation to help the analyzer
# The generator works better with well-documented code
```

#### Issue: Wrong commit type detected

**Solution:** Manually specify the type
```bash
npm run generate-commit-message -- --files=src/api.ts --type=feat
```

#### Issue: Binary files or unreadable content

**Solution:** The generator will use filename and extension
```bash
# For binary files, it generates based on file type
npm run generate-commit-message -- --files=logo.png --type=chore
# Output: "chore(assets): add logo image file"
```

#### Issue: Multiple files with different purposes

**Solution:** Group related files or commit separately
```bash
# Option 1: Commit related files together
npm run generate-commit-message -- --files=src/api.ts,src/api.test.ts

# Option 2: Commit separately
npm run generate-commit-message -- --files=src/api.ts --commit
npm run generate-commit-message -- --files=src/api.test.ts --commit
```

### Best Practices

1. **Commit related files together** - Group files that serve the same purpose
2. **Review generated messages** - Always review before committing
3. **Use appropriate types** - Choose the type that best describes the change
4. **Keep commits focused** - One logical change per commit
5. **Add context in body** - Use the body for additional explanation when needed

### Examples

**Example 1: New feature file**
```bash
$ npm run generate-commit-message -- --files=src/payment/stripe.ts

feat(payment): add Stripe payment integration

Implements Stripe payment processing with support for one-time
payments and subscription management. Includes webhook handling
for payment events.

Files: src/payment/stripe.ts
```

**Example 2: Configuration file**
```bash
$ npm run generate-commit-message -- --files=.github/workflows/ci.yml

ci(workflows): add continuous integration pipeline

Configures GitHub Actions workflow for automated testing, linting,
and building on pull requests and main branch pushes.

Files: .github/workflows/ci.yml
```

**Example 3: Documentation**
```bash
$ npm run generate-commit-message -- --files=docs/API.md

docs(api): add API endpoint documentation

Documents all REST API endpoints with request/response examples,
authentication requirements, and error handling.

Files: docs/API.md
```

**Example 4: Multiple related files**
```bash
$ npm run generate-commit-message -- --files=src/user.ts,src/user.test.ts

feat(user): add user management module with tests

Implements user CRUD operations with validation and includes
comprehensive unit tests for all user management functions.

Files: src/user.ts, src/user.test.ts
```

---

## Next Steps

After completing this setup:

1. Review the [Deployment Guide](DEPLOYMENT.md) for infrastructure deployment
2. Set up AWS OIDC provider using Terraform
3. Run the first CI workflow to validate the setup
4. Deploy infrastructure to dev environment
5. Use the commit message generator for consistent commit history

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [AWS OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
