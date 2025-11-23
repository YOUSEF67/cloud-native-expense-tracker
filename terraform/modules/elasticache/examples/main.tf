# Example usage of the ElastiCache module

# Production environment example
module "elasticache_prod" {
  source = "../"

  project_name = "expense-tracker"
  environment  = "prod"

  # Engine configuration
  engine_version = "7.0"
  node_type      = "cache.t3.medium"
  port           = 6379

  # Cluster configuration - Multi-AZ with automatic failover
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Network configuration
  subnet_ids = [
    "subnet-12345678",
    "subnet-87654321",
    "subnet-11223344"
  ]
  security_group_ids = ["sg-12345678"]

  # Encryption configuration
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = "MySecureRedisPassword123!"  # Should come from secrets manager
  auth_token_update_strategy = "ROTATE"

  # Backup configuration
  snapshot_retention_limit  = 7
  snapshot_window           = "03:00-04:00"
  maintenance_window        = "sun:05:00-sun:06:00"
  final_snapshot_identifier = "expense-tracker-prod-final-snapshot"

  # Logging configuration
  slow_log_destination        = "/aws/elasticache/expense-tracker-prod/slow-log"
  slow_log_destination_type   = "cloudwatch-logs"
  engine_log_destination      = "/aws/elasticache/expense-tracker-prod/engine-log"
  engine_log_destination_type = "cloudwatch-logs"
  log_format                  = "json"

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Apply changes during maintenance window
  apply_immediately = false

  tags = {
    Project     = "expense-tracker"
    Environment = "prod"
    Team        = "platform"
    CostCenter  = "engineering"
  }
}

# Development environment example
module "elasticache_dev" {
  source = "../"

  project_name = "expense-tracker"
  environment  = "dev"

  # Engine configuration
  engine_version = "7.0"
  node_type      = "cache.t3.micro"

  # Cluster configuration - Single node for cost savings
  num_cache_clusters         = 1
  automatic_failover_enabled = false
  multi_az_enabled           = false

  # Network configuration
  subnet_ids = [
    "subnet-12345678",
    "subnet-87654321"
  ]
  security_group_ids = ["sg-87654321"]

  # Encryption configuration - Optional auth token for dev
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = null  # No auth token for dev

  # Backup configuration - Minimal retention for dev
  snapshot_retention_limit = 1
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "sun:05:00-sun:06:00"

  # Logging configuration
  slow_log_destination        = "/aws/elasticache/expense-tracker-dev/slow-log"
  slow_log_destination_type   = "cloudwatch-logs"
  engine_log_destination      = "/aws/elasticache/expense-tracker-dev/engine-log"
  engine_log_destination_type = "cloudwatch-logs"
  log_format                  = "json"

  # Apply changes immediately in dev
  apply_immediately = true

  tags = {
    Project     = "expense-tracker"
    Environment = "dev"
    Team        = "platform"
  }
}

# Outputs
output "prod_primary_endpoint" {
  description = "Production Redis primary endpoint"
  value       = module.elasticache_prod.primary_endpoint_address
}

output "prod_port" {
  description = "Production Redis port"
  value       = module.elasticache_prod.port
}

output "dev_primary_endpoint" {
  description = "Development Redis primary endpoint"
  value       = module.elasticache_dev.primary_endpoint_address
}

output "dev_port" {
  description = "Development Redis port"
  value       = module.elasticache_dev.port
}
