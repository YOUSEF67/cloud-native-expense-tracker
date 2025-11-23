# ElastiCache Redis Module

This Terraform module creates an AWS ElastiCache Redis replication group with support for:
- Multi-AZ deployment with automatic failover
- Encryption at rest and in transit (TLS)
- Redis AUTH token authentication
- Automated backups and snapshots
- CloudWatch logging integration
- Configurable node types and cluster sizes

## Features

- **High Availability**: Multi-AZ deployment with automatic failover
- **Security**: Encryption at rest (KMS), encryption in transit (TLS), and AUTH token support
- **Monitoring**: CloudWatch logs for slow queries and engine logs
- **Backup**: Automated daily snapshots with configurable retention
- **Scalability**: Support for 1-6 cache nodes in the replication group

## Usage

```hcl
module "elasticache" {
  source = "../../modules/elasticache"

  project_name = "expense-tracker"
  environment  = "prod"

  # Engine configuration
  engine_version = "7.0"
  node_type      = "cache.t3.small"

  # Cluster configuration
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Network configuration
  subnet_ids         = module.vpc.database_subnet_ids
  security_group_ids = [module.security_groups.elasticache_sg_id]

  # Encryption configuration
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token  # 16-128 characters

  # Backup configuration
  snapshot_retention_limit = 7
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "sun:05:00-sun:06:00"

  # Logging
  slow_log_destination        = "/aws/elasticache/${var.project_name}-${var.environment}/slow-log"
  slow_log_destination_type   = "cloudwatch-logs"
  engine_log_destination      = "/aws/elasticache/${var.project_name}-${var.environment}/engine-log"
  engine_log_destination_type = "cloudwatch-logs"
  log_format                  = "json"

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}
```

## Environment-Specific Configurations

### Development
```hcl
node_type                  = "cache.t3.micro"
num_cache_clusters         = 1
automatic_failover_enabled = false
multi_az_enabled           = false
snapshot_retention_limit   = 1
auth_token                 = null  # Optional for dev
```

### Staging
```hcl
node_type                  = "cache.t3.small"
num_cache_clusters         = 2
automatic_failover_enabled = true
multi_az_enabled           = true
snapshot_retention_limit   = 3
auth_token                 = var.redis_auth_token
```

### Production
```hcl
node_type                  = "cache.t3.medium"
num_cache_clusters         = 2
automatic_failover_enabled = true
multi_az_enabled           = true
snapshot_retention_limit   = 7
auth_token                 = var.redis_auth_token
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| engine_version | Redis engine version | `string` | `"7.0"` | no |
| node_type | ElastiCache node type | `string` | `"cache.t3.micro"` | no |
| num_cache_clusters | Number of cache clusters | `number` | `2` | no |
| automatic_failover_enabled | Enable automatic failover | `bool` | `true` | no |
| multi_az_enabled | Enable multi-AZ deployment | `bool` | `true` | no |
| subnet_ids | List of subnet IDs | `list(string)` | n/a | yes |
| security_group_ids | List of security group IDs | `list(string)` | n/a | yes |
| at_rest_encryption_enabled | Enable encryption at rest | `bool` | `true` | no |
| transit_encryption_enabled | Enable encryption in transit | `bool` | `true` | no |
| auth_token | Redis AUTH token (16-128 chars) | `string` | `null` | no |
| snapshot_retention_limit | Days to retain snapshots | `number` | `5` | no |

## Outputs

| Name | Description |
|------|-------------|
| replication_group_id | The ID of the replication group |
| primary_endpoint_address | Primary endpoint address |
| reader_endpoint_address | Reader endpoint address |
| port | Port number (6379) |
| auth_token | Redis AUTH token (sensitive) |
| security_group_ids | Associated security group IDs |

## Security Considerations

1. **Encryption**: Always enable both at-rest and in-transit encryption for production
2. **AUTH Token**: Use strong AUTH tokens (16-128 characters) for production environments
3. **Network**: Deploy in private subnets with security groups restricting access to application tier
4. **Secrets Management**: Store AUTH tokens in AWS Secrets Manager or Parameter Store
5. **Logging**: Enable CloudWatch logs for security monitoring and troubleshooting

## Notes

- Automatic failover requires at least 2 cache clusters
- Multi-AZ requires automatic failover to be enabled
- AUTH token requires transit encryption to be enabled
- Changing certain parameters may cause downtime (use `apply_immediately = false` for production)
- Final snapshot identifier is optional but recommended for production environments

## References

- [AWS ElastiCache for Redis Documentation](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/)
- [Terraform aws_elasticache_replication_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group)
