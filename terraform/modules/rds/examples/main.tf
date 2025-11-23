# Example usage of the RDS module

# Development Environment Example
module "rds_dev" {
  source = "../"

  project_name = "expense-tracker"
  environment  = "dev"

  # Instance Configuration - Small for dev
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  max_allocated_storage = 50
  storage_encrypted     = true

  # Engine Configuration
  engine_version         = "8.0.35"
  parameter_group_family = "mysql8.0"

  # Database Configuration
  database_name   = "transactions"
  master_username = "admin"
  master_password = "ChangeMe123!"  # Use secrets manager in production

  # Network Configuration
  subnet_ids = [
    "subnet-12345678",
    "subnet-87654321"
  ]
  vpc_security_group_ids = ["sg-12345678"]

  # High Availability - Disabled for dev
  multi_az = false

  # Backup Configuration - Minimal for dev
  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  skip_final_snapshot     = true
  deletion_protection     = false

  # Parameter Group Configuration
  max_connections         = "100"
  slow_query_log          = "1"
  character_set_server    = "utf8mb4"
  innodb_buffer_pool_size = "{DBInstanceClassMemory*3/4}"

  # Monitoring - Basic for dev
  enabled_cloudwatch_logs_exports = ["error"]
  monitoring_interval             = 0
  performance_insights_enabled    = false

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

# Production Environment Example
module "rds_prod" {
  source = "../"

  project_name = "expense-tracker"
  environment  = "prod"

  # Instance Configuration - Larger for prod
  instance_class        = "db.t3.medium"
  allocated_storage     = 50
  max_allocated_storage = 200
  storage_encrypted     = true
  storage_type          = "gp3"

  # Engine Configuration
  engine_version         = "8.0.35"
  parameter_group_family = "mysql8.0"

  # Database Configuration
  database_name   = "transactions"
  master_username = "admin"
  master_password = "SecurePassword123!"  # Use secrets manager in production

  # Network Configuration
  subnet_ids = [
    "subnet-prod-1",
    "subnet-prod-2",
    "subnet-prod-3"
  ]
  vpc_security_group_ids = ["sg-prod-rds"]

  # High Availability - Enabled for prod
  multi_az = true

  # Backup Configuration - Full retention for prod
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  skip_final_snapshot     = false
  deletion_protection     = true

  # Parameter Group Configuration - Optimized for prod
  max_connections         = "200"
  slow_query_log          = "1"
  character_set_server    = "utf8mb4"
  innodb_buffer_pool_size = "{DBInstanceClassMemory*3/4}"

  # Additional custom parameters
  custom_parameters = [
    {
      name  = "long_query_time"
      value = "2"
    },
    {
      name  = "log_queries_not_using_indexes"
      value = "1"
    }
  ]

  # Monitoring - Full monitoring for prod
  enabled_cloudwatch_logs_exports    = ["error", "general", "slowquery"]
  monitoring_interval                = 60
  performance_insights_enabled       = true
  performance_insights_retention_period = 7

  tags = {
    Project     = "expense-tracker"
    Team        = "platform"
    Environment = "production"
    Compliance  = "required"
  }
}

# Outputs
output "dev_endpoint" {
  description = "Development RDS endpoint"
  value       = module.rds_dev.endpoint
}

output "prod_endpoint" {
  description = "Production RDS endpoint"
  value       = module.rds_prod.endpoint
}
