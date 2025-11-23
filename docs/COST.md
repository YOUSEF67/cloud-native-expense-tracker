# Cost Estimation

This document provides estimated monthly costs for the infrastructure across different environments.

> [!NOTE]
> Estimates are based on AWS us-east-1 pricing and 730 hours/month. Actual costs may vary.

## Development Environment
Optimized for low cost.

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| EKS Cluster | Control Plane | $73.00 |
| EC2 (Nodes) | 2x t3.small (Spot) | $15.00 |
| RDS | db.t3.small (Single AZ) | $25.00 |
| ElastiCache | cache.t3.micro | $12.00 |
| NAT Gateway | 1x NAT Gateway | $32.00 |
| Load Balancer | 1x ALB | $16.00 |
| **Total** | | **~$173.00** |

## Staging Environment
Balanced for performance and cost.

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| EKS Cluster | Control Plane | $73.00 |
| EC2 (Nodes) | 3x t3.medium | $90.00 |
| RDS | db.t3.medium (Multi-AZ) | $100.00 |
| ElastiCache | cache.t3.small (2 nodes) | $50.00 |
| NAT Gateway | 1x NAT Gateway | $32.00 |
| Load Balancer | 1x ALB | $16.00 |
| **Total** | | **~$361.00** |

## Production Environment
Optimized for high availability and performance.

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| EKS Cluster | Control Plane | $73.00 |
| EC2 (Nodes) | 5x t3.large | $300.00 |
| RDS | db.t3.large (Multi-AZ) | $200.00 |
| ElastiCache | cache.t3.medium (3 nodes) | $150.00 |
| NAT Gateway | 3x NAT Gateway | $96.00 |
| Load Balancer | 1x ALB | $16.00 |
| WAF | Web ACL | $20.00 |
| **Total** | | **~$855.00** |

## Cost Optimization Tips
- **Spot Instances**: Use Spot instances for EKS worker nodes in Dev/Staging.
- **Savings Plans**: Purchase Compute Savings Plans for predictable workloads.
- **Auto-stop**: Scale down Dev environment to 0 replicas during nights/weekends.
