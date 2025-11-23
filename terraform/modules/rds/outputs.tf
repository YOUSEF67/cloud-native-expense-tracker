# RDS Module Outputs

output "db_instance_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "The hostname of the RDS instance"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "The database port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "The name of the database"
  value       = aws_db_instance.main.db_name
}

output "master_username" {
  description = "The master username for the database"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_subnet_group_id" {
  description = "The DB subnet group ID"
  value       = aws_db_subnet_group.main.id
}

output "db_subnet_group_arn" {
  description = "The ARN of the DB subnet group"
  value       = aws_db_subnet_group.main.arn
}

output "db_parameter_group_id" {
  description = "The DB parameter group ID"
  value       = aws_db_parameter_group.main.id
}

output "db_parameter_group_arn" {
  description = "The ARN of the DB parameter group"
  value       = aws_db_parameter_group.main.arn
}

output "availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = aws_db_instance.main.availability_zone
}

output "multi_az" {
  description = "Whether the RDS instance is multi-AZ"
  value       = aws_db_instance.main.multi_az
}

output "engine" {
  description = "The database engine"
  value       = aws_db_instance.main.engine
}

output "engine_version" {
  description = "The database engine version"
  value       = aws_db_instance.main.engine_version
}

output "instance_class" {
  description = "The RDS instance class"
  value       = aws_db_instance.main.instance_class
}

output "allocated_storage" {
  description = "The allocated storage in GB"
  value       = aws_db_instance.main.allocated_storage
}

output "storage_encrypted" {
  description = "Whether the DB instance is encrypted"
  value       = aws_db_instance.main.storage_encrypted
}

output "kms_key_id" {
  description = "The KMS key ID used for encryption"
  value       = aws_db_instance.main.kms_key_id
}

output "backup_retention_period" {
  description = "The backup retention period in days"
  value       = aws_db_instance.main.backup_retention_period
}

output "backup_window" {
  description = "The backup window"
  value       = aws_db_instance.main.backup_window
}

output "maintenance_window" {
  description = "The maintenance window"
  value       = aws_db_instance.main.maintenance_window
}

output "resource_id" {
  description = "The RDS resource ID"
  value       = aws_db_instance.main.resource_id
}

output "status" {
  description = "The RDS instance status"
  value       = aws_db_instance.main.status
}
