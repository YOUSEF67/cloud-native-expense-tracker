# Security Groups Module

This Terraform module creates all security groups required for the AWS infrastructure, including security groups for ALB, EKS nodes, RDS, ElastiCache, and bastion host.

## Features

- **ALB Security Group**: Allows HTTP (80) and HTTPS (443) from internet, egress to EKS nodes on port 8080
- **EKS Node Security Group**: Allows traffic from ALB (8080), EKS control plane (443), node-to-node communication, and egress to RDS (3306), Redis (6379), and internet (443)
- **RDS Security Group**: Allows MySQL traffic (3306) from EKS nodes and bastion host
- **ElastiCache Security Group**: Allows Redis traffic (6379) from EKS nodes
- **Bastion Security Group**: Allows SSH (22) from specific IP ranges, egress for SSH, MySQL, and HTTPS

## Security Design

The security groups follow the principle of least privilege:

1. **Network Segmentation**: Each component has its own security group
2. **Minimal Ingress**: Only required ports are opened
3. **Source Restriction**: Traffic is restricted to specific security groups where possible
4. **Explicit Egress**: Egress rules are explicitly defined rather than allowing all traffic

## Usage

```hcl
module "security_groups" {
  source = "../../modules/security-groups"

  project_name  = "expense"
  environment   = "dev"
  vpc_id        = module.vpc.vpc_id
  vpc_cidr      = "10.0.0.0/16"
  
  eks_cluster_security_group_id = module.eks.cluster_security_group_id
  bastion_allowed_cidr_blocks   = ["203.0.113.0/24"]  # Your office IP range

  common_tags = {
    Project     = "expense"
    Environment = "dev"
    Terraform   = "true"
    ManagedBy   = "Terraform"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 4.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| vpc_id | VPC ID where security groups will be created | `string` | n/a | yes |
| vpc_cidr | VPC CIDR block for internal traffic rules | `string` | n/a | yes |
| eks_cluster_security_group_id | Security group ID of the EKS cluster control plane | `string` | n/a | yes |
| bastion_allowed_cidr_blocks | List of CIDR blocks allowed to SSH into bastion host | `list(string)` | `["0.0.0.0/0"]` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| alb_security_group_id | Security group ID for Application Load Balancer |
| eks_node_security_group_id | Security group ID for EKS worker nodes |
| rds_security_group_id | Security group ID for RDS database |
| elasticache_security_group_id | Security group ID for ElastiCache Redis cluster |
| bastion_security_group_id | Security group ID for bastion host |
| security_group_ids | Map of all security group IDs |

## Security Group Rules

### ALB Security Group

**Ingress:**
- Port 80 (HTTP) from 0.0.0.0/0
- Port 443 (HTTPS) from 0.0.0.0/0

**Egress:**
- Port 8080 (TCP) to EKS node security group

### EKS Node Security Group

**Ingress:**
- Port 8080 (TCP) from ALB security group
- Port 443 (TCP) from EKS control plane security group
- All ports/protocols from same security group (node-to-node)

**Egress:**
- Port 3306 (TCP) to RDS security group
- Port 6379 (TCP) to ElastiCache security group
- Port 443 (TCP) to 0.0.0.0/0 (for ECR, S3, etc.)

### RDS Security Group

**Ingress:**
- Port 3306 (TCP) from EKS node security group
- Port 3306 (TCP) from bastion security group

**Egress:**
- None (no outbound connections required)

### ElastiCache Security Group

**Ingress:**
- Port 6379 (TCP) from EKS node security group

**Egress:**
- None (no outbound connections required)

### Bastion Security Group

**Ingress:**
- Port 22 (SSH) from specified CIDR blocks

**Egress:**
- Port 22 (SSH) to VPC CIDR
- Port 3306 (TCP) to RDS security group
- Port 443 (HTTPS) to 0.0.0.0/0

## Architecture Diagram

```
Internet
   |
   | (80, 443)
   v
[ALB SG]
   |
   | (8080)
   v
[EKS Node SG] <---> [EKS Node SG] (node-to-node)
   |         |
   | (3306)  | (6379)
   v         v
[RDS SG]  [ElastiCache SG]
   ^
   | (3306)
   |
[Bastion SG] <--- (22) --- Specific IPs
```

## Notes

- Security groups use `name_prefix` with `create_before_destroy` lifecycle to allow for safe updates
- All security groups are tagged with project, environment, and component information
- The bastion security group allows SSH from configurable CIDR blocks (default: 0.0.0.0/0, should be restricted in production)
- EKS nodes can communicate with each other on all ports for Kubernetes networking
- RDS and ElastiCache security groups have no egress rules as they don't initiate outbound connections

## Best Practices

1. **Restrict Bastion Access**: In production, set `bastion_allowed_cidr_blocks` to your office/VPN IP ranges
2. **Review Regularly**: Periodically review security group rules to ensure they follow least privilege
3. **Use Security Group IDs**: Reference security groups by ID rather than CIDR blocks where possible
4. **Enable VPC Flow Logs**: Monitor network traffic for security analysis
5. **Tag Everything**: Use consistent tagging for cost allocation and resource management

## Compliance

This module implements security controls that align with:
- AWS Well-Architected Framework (Security Pillar)
- CIS AWS Foundations Benchmark
- NIST Cybersecurity Framework

## References

- [AWS Security Groups Documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [EKS Security Best Practices](https://docs.aws.amazon.com/eks/latest/userguide/security-best-practices.html)
- [Requirements Document](../../../.kiro/specs/aws-infrastructure-enhancement/requirements.md) - Requirements 6, 13
