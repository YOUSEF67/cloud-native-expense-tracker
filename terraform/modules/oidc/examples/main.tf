# Example usage of the GitHub Actions OIDC module

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Example: Basic usage with minimal configuration
module "github_oidc_basic" {
  source = "../"

  github_org   = "my-organization"
  github_repo  = "expense-tracker"
  project_name = "expense-tracker"
  environment  = "dev"
}

# Example: Full configuration with ECR and EKS permissions
module "github_oidc_full" {
  source = "../"

  github_org   = "my-organization"
  github_repo  = "expense-tracker"
  project_name = "expense-tracker"
  environment  = "prod"

  ecr_repository_arns = [
    "arn:aws:ecr:us-east-1:123456789012:repository/expense-backend",
    "arn:aws:ecr:us-east-1:123456789012:repository/expense-frontend"
  ]

  eks_cluster_arns = [
    "arn:aws:eks:us-east-1:123456789012:cluster/expense-cluster-prod"
  ]
}

# Outputs for GitHub Actions configuration
output "github_actions_role_arn" {
  description = "IAM role ARN to use in GitHub Actions workflows"
  value       = module.github_oidc_full.role_arn
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN"
  value       = module.github_oidc_full.oidc_provider_arn
}
