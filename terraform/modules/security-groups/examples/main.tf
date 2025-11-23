# Example usage of the security-groups module

# This example shows how to use the security-groups module
# in your environment-specific configurations

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Example: Using the security groups module
module "security_groups" {
  source = "../"

  project_name  = "expense"
  environment   = "dev"
  vpc_id        = "vpc-0123456789abcdef0"  # Replace with actual VPC ID
  vpc_cidr      = "10.0.0.0/16"

  # Replace with actual EKS cluster security group ID
  eks_cluster_security_group_id = "sg-0123456789abcdef0"

  # Restrict SSH access to specific IP ranges in production
  bastion_allowed_cidr_blocks = [
    "203.0.113.0/24",  # Office network
    "198.51.100.0/24"  # VPN network
  ]

  common_tags = {
    Project     = "expense"
    Environment = "dev"
    Terraform   = "true"
    ManagedBy   = "Terraform"
    Owner       = "DevOps Team"
  }
}

# Outputs
output "alb_sg_id" {
  description = "ALB Security Group ID"
  value       = module.security_groups.alb_security_group_id
}

output "eks_node_sg_id" {
  description = "EKS Node Security Group ID"
  value       = module.security_groups.eks_node_security_group_id
}

output "rds_sg_id" {
  description = "RDS Security Group ID"
  value       = module.security_groups.rds_security_group_id
}

output "elasticache_sg_id" {
  description = "ElastiCache Security Group ID"
  value       = module.security_groups.elasticache_security_group_id
}

output "bastion_sg_id" {
  description = "Bastion Security Group ID"
  value       = module.security_groups.bastion_security_group_id
}

output "all_security_groups" {
  description = "All Security Group IDs"
  value       = module.security_groups.security_group_ids
}
