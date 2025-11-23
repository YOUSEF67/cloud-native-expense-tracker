# GitHub Secrets Setup Guide

This guide explains how to configure GitHub Secrets for the CI/CD workflows.

## Why CI/CD is Currently Failing

The workflows require AWS credentials and other secrets that aren't configured yet. This is **expected and normal** for a new repository.

## Required GitHub Secrets

### 1. AWS_ACCOUNT_ID
**Required for:** CD workflows (dev, staging, prod)

**Value:** `344735854973` (your AWS account ID)

**How to add:**
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AWS_ACCOUNT_ID`
5. Value: `344735854973`
6. Click **Add secret**

## Optional: Disable Workflows Until Ready to Deploy

Since you're using the local setup and not deploying to AWS yet, you can disable the CD workflows:

### Option 1: Disable Specific Workflows
1. Go to **Actions** tab in your GitHub repository
2. Click on each workflow (CD Dev, CD Staging, CD Prod)
3. Click the **⋯** menu → **Disable workflow**

### Option 2: Modify Workflow Triggers
You can also modify the workflows to only run manually:

**For each CD workflow** (`.github/workflows/cd-dev.yml`, `cd-staging.yml`, `cd-prod.yml`):

Change:
```yaml
on:
  push:
    branches: [ main ]
```

To:
```yaml
on:
  workflow_dispatch:  # Manual trigger only
```

This way, workflows will only run when you manually trigger them from the Actions tab.

## Current Workflow Status

### ✅ Will Work (No Secrets Needed)
- **Python CI** (`ci.yml`) - Runs on pull requests
  - Linting (Black, Flake8, Mypy)
  - Testing (pytest)
  - Docker build
  - Security scanning (Trivy)

- **Terraform CI** (`terraform-ci.yml`) - Runs on Terraform changes
  - Format validation
  - Terraform plan

### ❌ Will Fail (Needs AWS Setup)
- **CD Dev** (`cd-dev.yml`) - Needs AWS credentials and EKS cluster
- **CD Staging** (`cd-staging.yml`) - Needs AWS credentials and EKS cluster
- **CD Prod** (`cd-prod.yml`) - Needs AWS credentials and EKS cluster

## When to Enable CD Workflows

Enable CD workflows **only when**:
1. You've deployed the AWS infrastructure using Terraform
2. The EKS cluster is running
3. You've configured GitHub OIDC in AWS (done by Terraform OIDC module)
4. You've added `AWS_ACCOUNT_ID` to GitHub Secrets

## Summary

**For now (local development):**
- CI workflows will work fine
- CD workflows will fail (expected)
- You can safely ignore CD failures or disable those workflows

**For future (AWS deployment):**
- Add `AWS_ACCOUNT_ID` secret
- Deploy infrastructure with Terraform
- CD workflows will automatically deploy to AWS on every push to main
