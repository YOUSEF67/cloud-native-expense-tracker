# VPC Module

This Terraform module creates a complete VPC infrastructure with multi-AZ support, including public, private, and database subnets, Internet Gateway, NAT Gateways, and route tables.

## Features

- **Multi-AZ Support**: Distributes subnets across multiple availability zones for high availability
- **Three-Tier Network Architecture**: 
  - Public subnets for ALB and bastion hosts
  - Private subnets for EKS worker nodes
  - Database subnets for RDS and ElastiCache
- **Cost Optimization**: Configurable NAT Gateway deployment (single or per-AZ)
- **Kubernetes Ready**: Includes proper tags for AWS Load Balancer Controller
- **Flexible CIDR Allocation**: Automatic subnet CIDR calculation

## Usage

### Basic Example (Development)

```hcl
module "vpc" {
  source = "../../modules/vpc"

  project_name       = "expense"
  environment        = "dev"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]

  # Cost optimization for dev
  enable_nat_gateway   = true
  single_nat_gateway   = true
  one_nat_gateway_per_az = false

  tags = {
    Project   = "expense-tracker"
    ManagedBy = "Terraform"
  }
}
```

### Production Example (High Availability)

```hcl
module "vpc" {
  source = "../../modules/vpc"

  project_name       = "expense"
  environment        = "prod"
  vpc_cidr           = "10.2.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # High availability for prod
  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true

  tags = {
    Project   = "expense-tracker"
    ManagedBy = "Terraform"
  }
}
```

## Subnet CIDR Allocation

The module automatically calculates subnet CIDRs using the following scheme:

- **Public Subnets**: `10.0.0.0/24`, `10.0.1.0/24`, `10.0.2.0/24` (CIDR offset: 0-2)
- **Private Subnets**: `10.0.10.0/24`, `10.0.11.0/24`, `10.0.12.0/24` (CIDR offset: 10-12)
- **Database Subnets**: `10.0.20.0/24`, `10.0.21.0/24`, `10.0.22.0/24` (CIDR offset: 20-22)

This provides clear separation and room for expansion.

## NAT Gateway Configuration

### Single NAT Gateway (Development)
- **Cost**: ~$32/month
- **Use Case**: Development environments where high availability is not critical
- **Configuration**: `single_nat_gateway = true`

### One NAT Gateway per AZ (Production)
- **Cost**: ~$96/month (3 AZs)
- **Use Case**: Production environments requiring high availability
- **Configuration**: `one_nat_gateway_per_az = true`

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project, used for resource naming | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| vpc_cidr | CIDR block for the VPC | `string` | `"10.0.0.0/16"` | no |
| availability_zones | List of availability zones for subnet distribution | `list(string)` | n/a | yes |
| enable_nat_gateway | Enable NAT Gateway for private subnet internet access | `bool` | `true` | no |
| single_nat_gateway | Use a single NAT Gateway for all private subnets | `bool` | `false` | no |
| one_nat_gateway_per_az | Create one NAT Gateway per availability zone | `bool` | `false` | no |
| enable_vpn_gateway | Enable VPN Gateway for VPC | `bool` | `false` | no |
| tags | Additional tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | The ID of the VPC |
| vpc_cidr | The CIDR block of the VPC |
| public_subnet_ids | List of public subnet IDs |
| private_subnet_ids | List of private subnet IDs |
| database_subnet_ids | List of database subnet IDs |
| nat_gateway_ids | List of NAT Gateway IDs |
| nat_gateway_ips | List of NAT Gateway public IP addresses |
| internet_gateway_id | The ID of the Internet Gateway |
| availability_zones | List of availability zones used |

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VPC (10.0.0.0/16)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Public Subnets (10.0.x.0/24)              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │   ALB    │  │ Bastion  │  │   NAT    │            │ │
│  │  │          │  │          │  │ Gateway  │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             Private Subnets (10.0.1x.0/24)             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │   EKS    │  │   EKS    │  │   EKS    │            │ │
│  │  │  Node 1  │  │  Node 2  │  │  Node 3  │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Database Subnets (10.0.2x.0/24)             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │   RDS    │  │   RDS    │  │  Redis   │            │ │
│  │  │ Primary  │  │ Standby  │  │          │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tags

All resources are tagged with:
- `Name`: Resource-specific name
- `Environment`: Environment name (dev/staging/prod)
- `ManagedBy`: "Terraform"
- Additional custom tags from `tags` variable

## Kubernetes Integration

The module includes tags required for AWS Load Balancer Controller:
- Public subnets: `kubernetes.io/role/elb = 1`
- Private subnets: `kubernetes.io/role/internal-elb = 1`

## Validation

The module includes input validation for:
- Environment must be one of: dev, staging, prod
- VPC CIDR must be a valid IPv4 CIDR block
- At least 2 availability zones are required

## Notes

- NAT Gateways are created in public subnets
- Private subnets route internet traffic through NAT Gateways
- Database subnets have no internet access by default
- Internet Gateway provides internet access for public subnets
- DNS hostnames and DNS support are enabled by default
