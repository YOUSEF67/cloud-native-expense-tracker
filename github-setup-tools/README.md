# GitHub Setup Automation Tools

Automated solutions and troubleshooting guidance for common GitHub repository setup issues.

## Features

- **Git Sync Tool**: Safely synchronize local and remote Git branches
- **Branch Protection Manager**: Configure GitHub branch protection rules programmatically
- **Setup Validator**: Validate GitHub repository configuration completeness
- **Setup Automation Scripts**: Orchestrate end-to-end repository setup

## Installation

```bash
cd github-setup-tools
npm install
```

## Build

```bash
npm run build
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
github-setup-tools/
├── src/
│   ├── git-sync/          # Git synchronization utilities
│   ├── branch-protection/ # Branch protection management
│   ├── validator/         # Setup validation
│   ├── automation/        # Setup automation scripts
│   ├── utils/             # Shared utilities
│   ├── types/             # TypeScript type definitions
│   └── schemas/           # JSON schemas
├── dist/                  # Compiled output
└── package.json
```

## Configuration

Setup configuration is defined in `.github/setup-config.json`. See `src/schemas/setup-config.schema.json` for the complete schema.

Example configuration:

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
    "ECR_REPOSITORY"
  ],
  "environments": [
    {
      "name": "dev",
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

## Requirements

- Node.js 18+
- Git
- GitHub CLI (`gh`)

## License

ISC
