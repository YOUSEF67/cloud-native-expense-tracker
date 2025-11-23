# ElastiCache Module - Main Configuration
# Creates Redis replication group with TLS encryption, multi-AZ support, and automatic failover

# Cache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-cache-subnet-group"
  description = "Cache subnet group for ${var.project_name} ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-cache-subnet-group-${var.environment}"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

# ElastiCache Replication Group (Redis)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description          = "Redis cluster for ${var.project_name} ${var.environment}"

  # Engine configuration
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = var.port
  parameter_group_name = var.parameter_group_name

  # Cluster configuration
  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = var.security_group_ids

  # Encryption configuration
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.transit_encryption_enabled && var.auth_token != null ? var.auth_token : null
  auth_token_update_strategy = var.auth_token != null ? var.auth_token_update_strategy : null
  kms_key_id                 = var.at_rest_encryption_enabled ? var.kms_key_id : null

  # Maintenance and backup
  maintenance_window        = var.maintenance_window
  snapshot_window           = var.snapshot_window
  snapshot_retention_limit  = var.snapshot_retention_limit
  snapshot_name             = var.snapshot_name
  final_snapshot_identifier = var.final_snapshot_identifier

  # Notifications
  notification_topic_arn = var.notification_topic_arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Logging
  log_delivery_configuration {
    destination      = var.slow_log_destination
    destination_type = var.slow_log_destination_type
    log_format       = var.log_format
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = var.engine_log_destination
    destination_type = var.engine_log_destination_type
    log_format       = var.log_format
    log_type         = "engine-log"
  }

  # Apply changes immediately (use with caution in production)
  apply_immediately = var.apply_immediately

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-redis"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )

  lifecycle {
    ignore_changes = [
      auth_token
    ]
  }
}
