# RDS Module

This Terraform module creates an AWS RDS MySQL instance with custom parameter groups, multi-AZ support, encryption, and automated backups.

## Features

- **Custom Parameter Group**: Optimized MySQL parameters for performance
- **Multi-AZ Support**: High availability with automatic failover
- **Encryption**: At-rest encryption using AWS KMS
- **Automated Backups**: Configurable retention period and backup windows
- **Storage Autoscaling**: Automatic storage expansion up to defined limit
- **Enhanced Monitoring**: CloudWatch logs and Performance Insights support
- **Security**: VPC security groups and private subnet deployment

## Usage

```hcl
module "rds" {
  source = "../../modules/rds"

  project_name = "expense-tracker"
  environment  = "prod"

  # Instance Configuration
  instance_class        = "db.t3.small"
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  # Engine Configuration
  engine_version          = "8.0.35"
  parameter_group_family  = "mysql8.0"

  # Database Configuration
  database_name   = "transactions"
  master_username = "admin"
  master_password = var.db_password  # Use secrets manager in production

  # Network Configuration
  subnet_ids             = module.vpc.database_subnet_ids
  vpc_security_group_ids = [module.security_groups.rds_security_group_id]

  # High Availability
  multi_az = true

  # Backup Configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Parameter Group Configuration
  max_connections         = "200"
  slow_query_log         = "1"
  character_set_server   = "utf8mb4"
  innodb_buffer_pool_size = "{DBInstanceClassMemory*3/4}"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]
  monitoring_interval            = 60
  performance_insights_enabled   = true

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}
```

## Environment-Specific Configurations

### Development
```hcl
instance_class          = "db.t3.micro"
allocated_storage       = 20
max_allocated_storage   = 50
multi_az               = false
backup_retention_period = 1
deletion_protection    = false
skip_final_snapshot    = true
```

### Staging
```hcl
instance_class          = "db.t3.small"
allocated_storage       = 20
max_allocated_storage   = 100
multi_az               = true
backup_retention_period = 3
deletion_protection    = true
skip_final_snapshot    = false
```

### Production
```hcl
instance_class          = "db.t3.medium"
allocated_storage       = 50
max_allocated_storage   = 200
multi_az               = true
backup_retention_period = 7
deletion_protection    = true
skip_final_snapshot    = false
performance_insights_enabled = true
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Name of the project | string | - | yes |
| environment | Environment name (dev, staging, prod) | string | - | yes |
| instance_class | RDS instance type | string | "db.t3.micro" | no |
| allocated_storage | Initial allocated storage in GB | number | 20 | no |
| max_allocated_storage | Maximum storage for autoscaling in GB | number | 100 | no |
| storage_type | Storage type (gp2, gp3, io1) | string | "gp3" | no |
| storage_encrypted | Enable encryption at rest | bool | true | no |
| engine_version | MySQL engine version | string | "8.0.35" | no |
| database_name | Name of the initial database | string | "transactions" | no |
| master_username | Master username for the database | string | "admin" | no |
| master_password | Master password for the database | string | - | yes |
| subnet_ids | List of subnet IDs for the DB subnet group | list(string) | - | yes |
| vpc_security_group_ids | List of VPC security group IDs | list(string) | - | yes |
| multi_az | Enable multi-AZ deployment | bool | false | no |
| backup_retention_period | Number of days to retain backups | number | 7 | no |
| max_connections | Maximum number of database connections | string | "100" | no |
| slow_query_log | Enable slow query log | string | "1" | no |
| character_set_server | Server character set | string | "utf8mb4" | no |
| innodb_buffer_pool_size | InnoDB buffer pool size | string | "{DBInstanceClassMemory*3/4}" | no |

## Outputs

| Name | Description |
|------|-------------|
| endpoint | The connection endpoint for the RDS instance |
| address | The hostname of the RDS instance |
| port | The database port |
| database_name | The name of the database |
| db_instance_id | The RDS instance ID |
| db_parameter_group_id | The DB parameter group ID |

## Requirements

- Terraform >= 1.0
- AWS Provider >= 5.0

## Notes

- **Password Management**: In production, use AWS Secrets Manager to manage database passwords instead of passing them as variables
- **Backup Strategy**: Automated backups are stored in S3 and retained based on the retention period
- **Multi-AZ**: Enables automatic failover to a standby instance in a different AZ (1-2 minute downtime)
- **Storage Autoscaling**: Automatically increases storage when free space falls below 10% or is less than 10 GB
- **Parameter Group**: Custom parameters are applied during the next maintenance window or can be applied immediately
- **Deletion Protection**: Enabled by default for production environments to prevent accidental deletion

## Security Considerations

1. **Encryption**: Always enable encryption at rest for production databases
2. **Network Isolation**: Deploy in private subnets with no public accessibility
3. **Security Groups**: Restrict access to only necessary sources (EKS nodes, bastion)
4. **Credentials**: Use AWS Secrets Manager for password rotation
5. **Backups**: Enable automated backups with appropriate retention periods
6. **Monitoring**: Enable CloudWatch logs and Performance Insights for security auditing
