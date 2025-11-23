# Backend configuration for staging environment
# This file configures Terraform to use S3 for state storage with DynamoDB for locking
# 
# IMPORTANT: Before using this backend configuration:
# 1. Deploy the bootstrap module first: cd ../../bootstrap && terraform apply
# 2. Update the bucket name below with your actual bucket name from bootstrap outputs
# 3. Run: terraform init

terraform {
  backend "s3" {
    # Update this with your actual bucket name from bootstrap module
    # Format: {project_name}-terraform-state-{aws_account_id}
    bucket = "expense-terraform-state-123456789012"

    # State file path for staging environment
    key = "environments/staging/terraform.tfstate"

    # AWS region where the bucket was created
    region = "us-east-1"

    # DynamoDB table for state locking
    # Update this with your actual table name from bootstrap module
    # Format: {project_name}-terraform-locks
    dynamodb_table = "expense-terraform-locks"

    # Enable encryption at rest
    encrypt = true

    # Optional: Specify KMS key for encryption
    # kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }
}
