# Bastion Module Variables

variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Instance Configuration
variable "instance_type" {
  description = "EC2 instance type for bastion host (e.g., t3.small, t3.medium)"
  type        = string
  default     = "t3.small"

  validation {
    condition     = can(regex("^t[2-3]\\.(nano|micro|small|medium|large|xlarge|2xlarge)$", var.instance_type))
    error_message = "Instance type must be a valid t2 or t3 instance type"
  }
}

variable "key_name" {
  description = "Name of the SSH key pair to use for the bastion host"
  type        = string

  validation {
    condition     = length(var.key_name) > 0
    error_message = "Key name must not be empty"
  }
}

# Network Configuration
variable "subnet_id" {
  description = "ID of the public subnet where the bastion host will be deployed"
  type        = string
}

variable "security_group_id" {
  description = "ID of the security group to attach to the bastion host"
  type        = string
}

# Storage Configuration
variable "root_volume_type" {
  description = "Type of root volume (gp2, gp3, io1)"
  type        = string
  default     = "gp3"

  validation {
    condition     = contains(["gp2", "gp3", "io1"], var.root_volume_type)
    error_message = "Root volume type must be one of: gp2, gp3, io1"
  }
}

variable "root_volume_size" {
  description = "Size of root volume in GB"
  type        = number
  default     = 20

  validation {
    condition     = var.root_volume_size >= 8 && var.root_volume_size <= 16384
    error_message = "Root volume size must be between 8 and 16384 GB"
  }
}

variable "root_volume_encrypted" {
  description = "Enable encryption for root volume"
  type        = bool
  default     = true
}

# IAM Configuration
variable "iam_instance_profile" {
  description = "IAM instance profile name to attach to the bastion host"
  type        = string
  default     = null
}

# Elastic IP Configuration
variable "allocate_elastic_ip" {
  description = "Allocate an Elastic IP for the bastion host"
  type        = bool
  default     = true
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

# Protection Configuration
variable "enable_termination_protection" {
  description = "Enable EC2 termination protection (recommended for production)"
  type        = bool
  default     = false
}

# Tags
variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
