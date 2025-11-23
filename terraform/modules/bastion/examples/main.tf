# Example usage of the Bastion module

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Example: Basic bastion host configuration
module "bastion_basic" {
  source = "../"

  project_name = "example-project"
  environment  = "dev"

  # Instance Configuration
  instance_type = "t3.small"
  key_name      = "my-ssh-key"

  # Network Configuration
  subnet_id         = "subnet-12345678"
  security_group_id = "sg-12345678"

  # Use default settings for other parameters
}

# Example: Production bastion host with all features
module "bastion_production" {
  source = "../"

  project_name = "example-project"
  environment  = "prod"

  # Instance Configuration
  instance_type = "t3.medium"
  key_name      = "prod-ssh-key"

  # Network Configuration
  subnet_id         = "subnet-87654321"
  security_group_id = "sg-87654321"

  # Storage Configuration
  root_volume_type      = "gp3"
  root_volume_size      = 30
  root_volume_encrypted = true

  # IAM Configuration
  iam_instance_profile = "bastion-instance-profile"

  # Elastic IP
  allocate_elastic_ip = true

  # Monitoring and Protection
  enable_detailed_monitoring    = true
  enable_termination_protection = true

  tags = {
    Project     = "example-project"
    Owner       = "devops-team"
    CostCenter  = "engineering"
    Compliance  = "required"
  }
}

# Outputs
output "bastion_basic_public_ip" {
  description = "Public IP of basic bastion host"
  value       = module.bastion_basic.public_ip
}

output "bastion_basic_ssh_command" {
  description = "SSH command for basic bastion host"
  value       = module.bastion_basic.ssh_connection_string
}

output "bastion_prod_public_ip" {
  description = "Public IP of production bastion host"
  value       = module.bastion_production.public_ip
}

output "bastion_prod_ssh_command" {
  description = "SSH command for production bastion host"
  value       = module.bastion_production.ssh_connection_string
}
