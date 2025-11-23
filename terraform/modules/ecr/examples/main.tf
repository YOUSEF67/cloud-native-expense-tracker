# Example usage of the ECR module

# Backend repository with default settings
module "ecr_backend" {
  source = "../"

  repository_name = "expense-backend"
  environment     = "dev"

  tags = {
    Project   = "expense-tracker"
    Component = "backend"
  }
}

# Frontend repository with custom retention
module "ecr_frontend" {
  source = "../"

  repository_name       = "expense-frontend"
  image_retention_count = 15
  environment           = "dev"

  tags = {
    Project   = "expense-tracker"
    Component = "frontend"
  }
}

# Production repository with KMS encryption
module "ecr_prod" {
  source = "../"

  repository_name      = "expense-backend-prod"
  image_tag_mutability = "IMMUTABLE"
  scan_on_push         = true
  image_retention_count = 20
  encryption_type      = "KMS"
  # kms_key_arn        = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  environment          = "prod"

  tags = {
    Project     = "expense-tracker"
    Component   = "backend"
    Environment = "production"
    Compliance  = "required"
  }
}

# Outputs
output "backend_repository_url" {
  description = "Backend ECR repository URL"
  value       = module.ecr_backend.repository_url
}

output "frontend_repository_url" {
  description = "Frontend ECR repository URL"
  value       = module.ecr_frontend.repository_url
}

output "prod_repository_url" {
  description = "Production ECR repository URL"
  value       = module.ecr_prod.repository_url
}
