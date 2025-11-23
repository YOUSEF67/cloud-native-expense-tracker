# Example usage of the EKS module

# Development Environment Example
module "eks_dev" {
  source = "../"

  cluster_name        = "expense-cluster-dev"
  cluster_version     = "1.28"
  vpc_id              = "vpc-xxxxx"
  private_subnet_ids  = ["subnet-xxxxx", "subnet-yyyyy", "subnet-zzzzz"]
  environment         = "dev"

  # API Endpoint Configuration - Public access for CI/CD
  endpoint_private_access = true
  endpoint_public_access  = true
  public_access_cidrs     = ["0.0.0.0/0"]

  # Node Group Configuration - Smaller instances for dev
  node_instance_types = ["t3.medium"]
  node_desired_size   = 2
  node_min_size       = 1
  node_max_size       = 4
  node_disk_size      = 20

  # Enable spot instances for cost savings
  enable_spot_instances = true

  # Optional: ALB security group for ingress
  alb_security_group_id = "sg-xxxxx"

  tags = {
    Environment = "dev"
    Project     = "expense"
    Terraform   = "true"
    ManagedBy   = "Terraform"
  }
}

# Staging Environment Example
module "eks_staging" {
  source = "../"

  cluster_name        = "expense-cluster-staging"
  cluster_version     = "1.28"
  vpc_id              = "vpc-xxxxx"
  private_subnet_ids  = ["subnet-xxxxx", "subnet-yyyyy", "subnet-zzzzz"]
  environment         = "staging"

  # API Endpoint Configuration
  endpoint_private_access = true
  endpoint_public_access  = true
  public_access_cidrs     = ["0.0.0.0/0"]

  # Node Group Configuration - Mixed instance types
  node_instance_types = ["t3.medium", "t3.large"]
  node_desired_size   = 3
  node_min_size       = 2
  node_max_size       = 6
  node_disk_size      = 30

  # Partial spot instances
  enable_spot_instances = true

  alb_security_group_id = "sg-xxxxx"

  tags = {
    Environment = "staging"
    Project     = "expense"
    Terraform   = "true"
    ManagedBy   = "Terraform"
  }
}

# Production Environment Example
module "eks_prod" {
  source = "../"

  cluster_name        = "expense-cluster-prod"
  cluster_version     = "1.28"
  vpc_id              = "vpc-xxxxx"
  private_subnet_ids  = ["subnet-xxxxx", "subnet-yyyyy", "subnet-zzzzz"]
  environment         = "prod"

  # API Endpoint Configuration - Private only for security
  endpoint_private_access = true
  endpoint_public_access  = false
  public_access_cidrs     = []

  # Node Group Configuration - Larger instances for production
  node_instance_types = ["t3.large", "t3.xlarge"]
  node_desired_size   = 4
  node_min_size       = 3
  node_max_size       = 10
  node_disk_size      = 50

  # On-demand instances for stability
  enable_spot_instances = false

  alb_security_group_id = "sg-xxxxx"

  tags = {
    Environment = "prod"
    Project     = "expense"
    Terraform   = "true"
    ManagedBy   = "Terraform"
  }
}

# Outputs
output "dev_cluster_endpoint" {
  description = "Dev cluster endpoint"
  value       = module.eks_dev.cluster_endpoint
}

output "dev_oidc_provider_arn" {
  description = "Dev OIDC provider ARN for IRSA"
  value       = module.eks_dev.oidc_provider_arn
}

output "staging_cluster_endpoint" {
  description = "Staging cluster endpoint"
  value       = module.eks_staging.cluster_endpoint
}

output "prod_cluster_endpoint" {
  description = "Production cluster endpoint"
  value       = module.eks_prod.cluster_endpoint
}
