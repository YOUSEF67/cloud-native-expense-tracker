# EKS Module

This Terraform module creates an Amazon EKS (Elastic Kubernetes Service) cluster with managed node groups, supporting both on-demand and spot instances.

## Features

- EKS cluster with configurable Kubernetes version
- Managed node groups with auto-scaling support
- Spot instance support for cost optimization
- Private and public API endpoint configuration
- OIDC provider for IAM Roles for Service Accounts (IRSA)
- Security groups for cluster and nodes
- CloudWatch logging for control plane
- IAM roles with required policies for cluster and nodes

## Usage

```hcl
module "eks" {
  source = "../../modules/eks"

  cluster_name        = "expense-cluster-dev"
  cluster_version     = "1.28"
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  environment         = "dev"

  # API Endpoint Configuration
  endpoint_private_access = true
  endpoint_public_access  = true
  public_access_cidrs     = ["0.0.0.0/0"]

  # Node Group Configuration
  node_instance_types = ["t3.medium", "t3.large"]
  node_desired_size   = 2
  node_min_size       = 1
  node_max_size       = 4
  node_disk_size      = 20

  # Spot Instance Configuration
  enable_spot_instances = true

  # Security Group Configuration
  alb_security_group_id = module.security_groups.alb_security_group_id

  tags = {
    Environment = "dev"
    Project     = "expense"
    Terraform   = "true"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 5.0 |
| tls | >= 4.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| cluster_name | Name of the EKS cluster | `string` | n/a | yes |
| vpc_id | VPC ID where the EKS cluster will be deployed | `string` | n/a | yes |
| private_subnet_ids | List of private subnet IDs for EKS worker nodes | `list(string)` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| cluster_version | Kubernetes version for the EKS cluster | `string` | `"1.28"` | no |
| endpoint_private_access | Enable private API server endpoint | `bool` | `true` | no |
| endpoint_public_access | Enable public API server endpoint | `bool` | `true` | no |
| public_access_cidrs | List of CIDR blocks that can access the public API server endpoint | `list(string)` | `["0.0.0.0/0"]` | no |
| cluster_log_types | List of control plane logging types to enable | `list(string)` | `["api", "audit", "authenticator", "controllerManager", "scheduler"]` | no |
| node_instance_types | List of instance types for the EKS node group | `list(string)` | `["t3.medium"]` | no |
| node_desired_size | Desired number of worker nodes | `number` | `2` | no |
| node_min_size | Minimum number of worker nodes | `number` | `1` | no |
| node_max_size | Maximum number of worker nodes | `number` | `4` | no |
| node_disk_size | Disk size in GB for worker nodes | `number` | `20` | no |
| enable_spot_instances | Enable spot instances for the node group | `bool` | `false` | no |
| bootstrap_arguments | Additional arguments to pass to the bootstrap script | `string` | `""` | no |
| alb_security_group_id | Security group ID of the ALB to allow traffic to nodes | `string` | `""` | no |
| tags | A map of tags to add to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | The name/id of the EKS cluster |
| cluster_name | The name of the EKS cluster |
| cluster_endpoint | Endpoint for EKS control plane |
| cluster_version | The Kubernetes server version for the cluster |
| cluster_security_group_id | Security group ID attached to the EKS cluster |
| node_security_group_id | Security group ID attached to the EKS nodes |
| cluster_iam_role_arn | IAM role ARN of the EKS cluster |
| node_iam_role_arn | IAM role ARN of the EKS node group |
| node_iam_role_name | IAM role name of the EKS node group |
| oidc_provider_arn | ARN of the OIDC Provider for EKS |
| oidc_provider_url | URL of the OIDC Provider for EKS |
| oidc_provider_id | ID of the OIDC Provider for EKS (without https://) |
| node_group_id | EKS node group ID |
| node_group_arn | Amazon Resource Name (ARN) of the EKS Node Group |
| node_group_status | Status of the EKS node group |

## Environment-Specific Configurations

### Development
```hcl
endpoint_public_access  = true
enable_spot_instances   = true
node_instance_types     = ["t3.medium"]
node_desired_size       = 2
node_min_size           = 1
node_max_size           = 4
```

### Staging
```hcl
endpoint_public_access  = true
enable_spot_instances   = true
node_instance_types     = ["t3.medium", "t3.large"]
node_desired_size       = 3
node_min_size           = 2
node_max_size           = 6
```

### Production
```hcl
endpoint_public_access  = false  # Private only
enable_spot_instances   = false  # On-demand for stability
node_instance_types     = ["t3.large", "t3.xlarge"]
node_desired_size       = 4
node_min_size           = 3
node_max_size           = 10
```

## Security Considerations

1. **API Endpoint Access**: For production, set `endpoint_public_access = false` and access the cluster through a bastion host or VPN.

2. **Security Groups**: The module creates security groups that allow:
   - Cluster to communicate with nodes on port 443
   - Nodes to communicate with each other
   - ALB to communicate with nodes on port 8080 (if ALB security group ID is provided)

3. **IAM Roles**: The module creates IAM roles with least-privilege policies for:
   - EKS cluster control plane
   - Worker nodes (with ECR, CloudWatch, and EBS CSI policies)

4. **OIDC Provider**: Enables IAM Roles for Service Accounts (IRSA) for fine-grained pod-level IAM permissions.

5. **Encryption**: Node EBS volumes are encrypted by default.

## Cost Optimization

- Use spot instances for non-production environments (`enable_spot_instances = true`)
- Configure appropriate node sizes based on workload requirements
- Use cluster autoscaler to scale nodes based on demand
- Set appropriate min/max node counts to prevent over-provisioning

## Accessing the Cluster

After the cluster is created, configure kubectl:

```bash
aws eks update-kubeconfig --name <cluster_name> --region <region>
```

## Notes

- The node group uses a launch template for additional configuration
- Nodes are deployed in private subnets only
- The module enables all control plane logging types by default
- Node group desired size is ignored in lifecycle to allow autoscaler management
