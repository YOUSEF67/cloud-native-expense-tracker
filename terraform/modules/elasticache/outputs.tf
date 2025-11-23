# ElastiCache Module Outputs

output "replication_group_id" {
  description = "The ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.id
}

output "replication_group_arn" {
  description = "The ARN of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.arn
}

output "primary_endpoint_address" {
  description = "The address of the primary endpoint for the replication group"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "The address of the reader endpoint for the replication group"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "configuration_endpoint_address" {
  description = "The configuration endpoint address for the replication group"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "port" {
  description = "The port number on which the cache accepts connections"
  value       = aws_elasticache_replication_group.main.port
}

output "member_clusters" {
  description = "The identifiers of all the nodes that are part of this replication group"
  value       = aws_elasticache_replication_group.main.member_clusters
}

output "engine" {
  description = "The name of the cache engine"
  value       = aws_elasticache_replication_group.main.engine
}

output "engine_version" {
  description = "The version of the cache engine"
  value       = aws_elasticache_replication_group.main.engine_version_actual
}

output "node_type" {
  description = "The cache node type"
  value       = aws_elasticache_replication_group.main.node_type
}

output "num_cache_clusters" {
  description = "The number of cache clusters in the replication group"
  value       = aws_elasticache_replication_group.main.num_cache_clusters
}

output "automatic_failover_enabled" {
  description = "Whether automatic failover is enabled"
  value       = aws_elasticache_replication_group.main.automatic_failover_enabled
}

output "multi_az_enabled" {
  description = "Whether multi-AZ is enabled"
  value       = aws_elasticache_replication_group.main.multi_az_enabled
}

output "at_rest_encryption_enabled" {
  description = "Whether encryption at rest is enabled"
  value       = aws_elasticache_replication_group.main.at_rest_encryption_enabled
}

output "transit_encryption_enabled" {
  description = "Whether encryption in transit is enabled"
  value       = aws_elasticache_replication_group.main.transit_encryption_enabled
}

output "auth_token" {
  description = "The Redis AUTH token (if configured)"
  value       = var.auth_token
  sensitive   = true
}

output "subnet_group_name" {
  description = "The name of the cache subnet group"
  value       = aws_elasticache_subnet_group.main.name
}

output "subnet_group_id" {
  description = "The ID of the cache subnet group"
  value       = aws_elasticache_subnet_group.main.id
}

output "security_group_ids" {
  description = "The security group IDs associated with the replication group"
  value       = var.security_group_ids
}

output "maintenance_window" {
  description = "The maintenance window"
  value       = aws_elasticache_replication_group.main.maintenance_window
}

output "snapshot_window" {
  description = "The daily time range for automated backups"
  value       = aws_elasticache_replication_group.main.snapshot_window
}

output "snapshot_retention_limit" {
  description = "The number of days for which ElastiCache retains automatic snapshots"
  value       = aws_elasticache_replication_group.main.snapshot_retention_limit
}

output "cluster_enabled" {
  description = "Whether cluster mode is enabled"
  value       = aws_elasticache_replication_group.main.cluster_enabled
}
