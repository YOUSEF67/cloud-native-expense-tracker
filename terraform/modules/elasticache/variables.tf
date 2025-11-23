# ElastiCache Module Variables

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

# Engine Configuration
variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "node_type" {
  description = "ElastiCache node type (e.g., cache.t3.micro, cache.t3.small)"
  type        = string
  default     = "cache.t3.micro"
}

variable "port" {
  description = "Port number for Redis"
  type        = number
  default     = 6379
}

variable "parameter_group_name" {
  description = "Name of the parameter group to associate with this replication group"
  type        = string
  default     = "default.redis7"
}

# Cluster Configuration
variable "num_cache_clusters" {
  description = "Number of cache clusters (nodes) in the replication group"
  type        = number
  default     = 2

  validation {
    condition     = var.num_cache_clusters >= 1 && var.num_cache_clusters <= 6
    error_message = "Number of cache clusters must be between 1 and 6"
  }
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover for multi-AZ deployment"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

# Network Configuration
variable "subnet_ids" {
  description = "List of subnet IDs for the cache subnet group"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability"
  }
}

variable "security_group_ids" {
  description = "List of security group IDs to associate with the replication group"
  type        = list(string)
}

# Encryption Configuration
variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable encryption in transit (TLS)"
  type        = bool
  default     = true
}

variable "auth_token" {
  description = "Password used to access a password protected server (requires transit_encryption_enabled = true)"
  type        = string
  default     = null
  sensitive   = true

  validation {
    condition     = var.auth_token == null || (length(var.auth_token) >= 16 && length(var.auth_token) <= 128)
    error_message = "Auth token must be between 16 and 128 characters if provided"
  }
}

variable "auth_token_update_strategy" {
  description = "Strategy to use when updating the auth_token (SET, ROTATE, DELETE)"
  type        = string
  default     = "ROTATE"

  validation {
    condition     = contains(["SET", "ROTATE", "DELETE"], var.auth_token_update_strategy)
    error_message = "Auth token update strategy must be one of: SET, ROTATE, DELETE"
  }
}

variable "kms_key_id" {
  description = "KMS key ID for encryption at rest (uses default if not specified)"
  type        = string
  default     = null
}

# Maintenance and Backup
variable "maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "snapshot_window" {
  description = "Daily time range for automated backups (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots (0 to disable)"
  type        = number
  default     = 5

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days"
  }
}

variable "snapshot_name" {
  description = "Name of a snapshot from which to restore data into the new replication group"
  type        = string
  default     = null
}

variable "final_snapshot_identifier" {
  description = "Name of the final snapshot when the replication group is deleted"
  type        = string
  default     = null
}

# Notifications
variable "notification_topic_arn" {
  description = "ARN of an SNS topic to send ElastiCache notifications"
  type        = string
  default     = null
}

# Auto Minor Version Upgrade
variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

# Logging Configuration
variable "slow_log_destination" {
  description = "Destination for slow log (CloudWatch log group name or Kinesis Firehose name)"
  type        = string
  default     = null
}

variable "slow_log_destination_type" {
  description = "Destination type for slow log (cloudwatch-logs or kinesis-firehose)"
  type        = string
  default     = "cloudwatch-logs"

  validation {
    condition     = contains(["cloudwatch-logs", "kinesis-firehose"], var.slow_log_destination_type)
    error_message = "Slow log destination type must be one of: cloudwatch-logs, kinesis-firehose"
  }
}

variable "engine_log_destination" {
  description = "Destination for engine log (CloudWatch log group name or Kinesis Firehose name)"
  type        = string
  default     = null
}

variable "engine_log_destination_type" {
  description = "Destination type for engine log (cloudwatch-logs or kinesis-firehose)"
  type        = string
  default     = "cloudwatch-logs"

  validation {
    condition     = contains(["cloudwatch-logs", "kinesis-firehose"], var.engine_log_destination_type)
    error_message = "Engine log destination type must be one of: cloudwatch-logs, kinesis-firehose"
  }
}

variable "log_format" {
  description = "Log format (text or json)"
  type        = string
  default     = "json"

  validation {
    condition     = contains(["text", "json"], var.log_format)
    error_message = "Log format must be one of: text, json"
  }
}

# Apply Changes
variable "apply_immediately" {
  description = "Apply changes immediately instead of during maintenance window"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
