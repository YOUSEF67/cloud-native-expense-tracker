# Variables for GitHub Actions OIDC Module

variable "github_org" {
  description = "GitHub organization name"
  type        = string

  validation {
    condition     = length(var.github_org) > 0
    error_message = "GitHub organization name must not be empty"
  }
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string

  validation {
    condition     = length(var.github_repo) > 0
    error_message = "GitHub repository name must not be empty"
  }
}

variable "project_name" {
  description = "Project name for resource naming and tagging"
  type        = string
  default     = "expense-tracker"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "ecr_repository_arns" {
  description = "List of ECR repository ARNs that GitHub Actions can push to"
  type        = list(string)
  default     = []
}

variable "eks_cluster_arns" {
  description = "List of EKS cluster ARNs that GitHub Actions can describe"
  type        = list(string)
  default     = []
}
