# GitHub Actions OIDC Module

This Terraform module creates an AWS IAM OIDC identity provider for GitHub Actions and an IAM role that GitHub Actions workflows can assume without storing long-lived AWS credentials.

## Features

- Creates an OIDC identity provider for GitHub Actions
- Creates an IAM role with trust policy for specific GitHub repository
- Attaches least-privilege policies for:
  - ECR push operations
  - EKS cluster describe operations
  - CloudWatch Logs write operations
- Supports repository-specific access control

## Usage

```hcl
module "github_oidc" {
  source = "../../modules/oidc"

  github_org   = "my-organization"
  github_repo  = "my-repository"
  project_name = "expense-tracker"
  environment  = "prod"

  ecr_repository_arns = [
    "arn:aws:ecr:us-east-1:123456789012:repository/expense-backend"
  ]

  eks_cluster_arns = [
    "arn:aws:eks:us-east-1:123456789012:cluster/expense-cluster-prod"
  ]
}
```

## GitHub Actions Workflow Configuration

Use the role ARN in your GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        run: |
          docker build -t my-image .
          docker push $ECR_REGISTRY/my-image:latest
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |
| tls | >= 4.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 5.0 |
| tls | >= 4.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| github_org | GitHub organization name | `string` | n/a | yes |
| github_repo | GitHub repository name | `string` | n/a | yes |
| project_name | Project name for resource naming and tagging | `string` | `"expense-tracker"` | no |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| ecr_repository_arns | List of ECR repository ARNs that GitHub Actions can push to | `list(string)` | `[]` | no |
| eks_cluster_arns | List of EKS cluster ARNs that GitHub Actions can describe | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| oidc_provider_arn | ARN of the GitHub Actions OIDC provider |
| role_arn | ARN of the IAM role for GitHub Actions to assume |
| role_name | Name of the IAM role for GitHub Actions |
| oidc_provider_url | URL of the GitHub Actions OIDC provider |

## Security Considerations

1. **Repository-Specific Access**: The trust policy restricts access to a specific GitHub organization and repository using the `sub` claim condition.

2. **Least Privilege**: The IAM role only has permissions for:
   - Pushing images to specified ECR repositories
   - Describing specified EKS clusters
   - Writing logs to CloudWatch Logs under `/aws/github-actions/*`

3. **No Long-Lived Credentials**: Uses OIDC federation instead of storing AWS access keys in GitHub Secrets.

4. **Audience Validation**: The trust policy validates that the audience (`aud`) claim is `sts.amazonaws.com`.

## IAM Policies

The module creates and attaches the following IAM policies:

### ECR Push Policy
- `ecr:GetAuthorizationToken` - Get authentication token for ECR
- `ecr:BatchCheckLayerAvailability` - Check if image layers exist
- `ecr:GetDownloadUrlForLayer` - Download image layers
- `ecr:BatchGetImage` - Get image manifests
- `ecr:PutImage` - Push new images
- `ecr:InitiateLayerUpload` - Start layer upload
- `ecr:UploadLayerPart` - Upload layer parts
- `ecr:CompleteLayerUpload` - Complete layer upload

### EKS Describe Policy
- `eks:DescribeCluster` - Get cluster details
- `eks:ListClusters` - List available clusters

### CloudWatch Logs Policy
- `logs:CreateLogGroup` - Create log groups
- `logs:CreateLogStream` - Create log streams
- `logs:PutLogEvents` - Write log events
- `logs:DescribeLogGroups` - Describe log groups
- `logs:DescribeLogStreams` - Describe log streams

## Example: Multi-Environment Setup

```hcl
# Production environment
module "github_oidc_prod" {
  source = "../../modules/oidc"

  github_org   = "my-org"
  github_repo  = "expense-tracker"
  project_name = "expense-tracker"
  environment  = "prod"

  ecr_repository_arns = [module.ecr_prod.repository_arn]
  eks_cluster_arns    = [module.eks_prod.cluster_arn]
}

# Staging environment
module "github_oidc_staging" {
  source = "../../modules/oidc"

  github_org   = "my-org"
  github_repo  = "expense-tracker"
  project_name = "expense-tracker"
  environment  = "staging"

  ecr_repository_arns = [module.ecr_staging.repository_arn]
  eks_cluster_arns    = [module.eks_staging.cluster_arn]
}
```

## Troubleshooting

### Error: "Not authorized to perform sts:AssumeRoleWithWebIdentity"

This error occurs when the trust policy conditions don't match. Verify:
1. The GitHub organization and repository names are correct
2. The workflow has `id-token: write` permission
3. The `role-to-assume` ARN is correct

### Error: "Access Denied" when pushing to ECR

Ensure the ECR repository ARN is included in the `ecr_repository_arns` variable.

### Error: "Access Denied" when describing EKS cluster

Ensure the EKS cluster ARN is included in the `eks_cluster_arns` variable.

## References

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Provider Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
