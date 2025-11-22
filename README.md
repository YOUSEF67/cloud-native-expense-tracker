# Cloud-Native Expense Tracker

## Overview

A production-ready expense tracking application demonstrating modern cloud-native architecture and DevOps best practices on AWS. This project showcases enterprise-grade infrastructure automation, containerized microservices, and GitOps-driven deployment pipelines—perfect for learning or as a foundation for real-world financial applications.

### Why This Project?

This isn't just another expense tracker—it's a comprehensive reference implementation that demonstrates:

- **Infrastructure as Code Excellence**: Modular, reusable Terraform components following AWS best practices
- **Cloud-Native Architecture**: Kubernetes-orchestrated microservices with auto-scaling and high availability
- **Zero-Trust Security**: OIDC authentication, encryption everywhere, least-privilege IAM, and comprehensive audit logging
- **Production-Ready Observability**: Full metrics, logging, and monitoring stack with Prometheus and Grafana
- **Cost-Conscious Design**: Smart resource allocation, spot instances, and budget alerts to keep AWS bills predictable
- **GitOps Workflow**: Automated CI/CD pipelines that deploy safely across multiple environments

### Key Features

- **Modular Terraform Infrastructure**: Reusable modules for VPC, EKS, RDS, ElastiCache, and supporting AWS services
- **High-Performance API**: Python FastAPI backend with Redis caching and sub-100ms response times
- **Secure CI/CD**: GitHub Actions with OIDC authentication—no long-lived AWS credentials stored
- **Full Observability**: Prometheus metrics, Grafana dashboards, and CloudWatch Logs integration
- **Multi-Environment**: Separate dev, staging, and production configurations with environment-specific optimizations
- **Enterprise Security**: End-to-end encryption, VPC isolation, security groups, and CloudTrail audit logs
- **Cost Optimization**: Auto-scaling, spot instances for non-prod, and AWS Budget alerts

## Architecture

The application runs on Amazon EKS with the following components:

- **VPC**: Multi-AZ network with public, private, and database subnets
- **EKS**: Kubernetes cluster with auto-scaling node groups
- **RDS MySQL**: Multi-AZ database with automated backups
- **ElastiCache Redis**: Multi-AZ caching layer for improved performance
- **ALB**: Application Load Balancer with SSL/TLS termination
- **Monitoring**: Prometheus and Grafana for metrics and dashboards
- **Logging**: Fluent Bit forwarding logs to CloudWatch

## Prerequisites

Before deploying this infrastructure, ensure you have:

### Required Tools

- **AWS CLI** (v2.x or later) - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Terraform** (v1.5.x or later) - [Installation Guide](https://developer.hashicorp.com/terraform/downloads)
- **kubectl** (v1.28.x or later) - [Installation Guide](https://kubernetes.io/docs/tasks/tools/)
- **Helm** (v3.x or later) - [Installation Guide](https://helm.sh/docs/intro/install/)
- **Docker** (v20.x or later) - [Installation Guide](https://docs.docker.com/get-docker/)
- **Python** (v3.11 or later) - [Installation Guide](https://www.python.org/downloads/)
- **Git** - [Installation Guide](https://git-scm.com/downloads)

### AWS Account Requirements

- AWS account with administrative access
- AWS CLI configured with credentials (`aws configure`)
- Sufficient service quotas for:
  - VPCs and subnets
  - EKS clusters
  - RDS instances
  - ElastiCache clusters
  - Elastic IPs and NAT Gateways

### Required AWS Permissions

Your IAM user or role needs permissions to create and manage:
- VPC, Subnets, Route Tables, Internet Gateways, NAT Gateways
- EKS clusters and node groups
- RDS instances and parameter groups
- ElastiCache replication groups
- EC2 instances (bastion host)
- IAM roles and policies
- S3 buckets and DynamoDB tables
- CloudWatch Logs and metrics
- ECR repositories
- ACM certificates
- Route53 hosted zones (if using custom domain)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUSEF67/cloud-native-expense-tracker.git
cd cloud-native-expense-tracker
```

### 2. Bootstrap Terraform State Management

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

This creates the S3 bucket and DynamoDB table for Terraform state management.

### 3. Deploy Infrastructure

```bash
cd ../environments/dev
terraform init
terraform apply
```

### 4. Configure kubectl

```bash
aws eks update-kubeconfig --name expense-cluster-dev --region us-east-1
```

### 5. Deploy Application

```bash
cd ../../../helm
helm upgrade --install expense-backend . \
  -f values-dev.yaml \
  --namespace expense \
  --create-namespace
```

### 6. Access the Application

Get the ALB endpoint:
```bash
kubectl get ingress -n expense
```

## Project Structure

```
.
├── app/                          # Python FastAPI application
│   ├── main.py                   # Application entry point
│   ├── config.py                 # Configuration management
│   ├── models.py                 # Database models
│   ├── database.py               # Database connection
│   ├── cache.py                  # Redis caching layer
│   ├── metrics.py                # Prometheus metrics
│   ├── routers/                  # API endpoints
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Container image
│   └── tests/                    # Unit and integration tests
│
├── terraform/                    # Infrastructure as Code
│   ├── bootstrap/                # S3 + DynamoDB for state
│   ├── modules/                  # Reusable Terraform modules
│   │   ├── vpc/
│   │   ├── eks/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   ├── bastion/
│   │   ├── ecr/
│   │   └── oidc/
│   └── environments/             # Environment-specific configs
│       ├── dev/
│       ├── staging/
│       └── prod/
│
├── helm/                         # Kubernetes Helm charts
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-dev.yaml
│   ├── values-staging.yaml
│   ├── values-prod.yaml
│   └── templates/                # Kubernetes manifests
│
├── .github/                      # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml                # PR validation
│       ├── cd-dev.yml            # Dev deployment
│       ├── cd-staging.yml        # Staging deployment
│       └── cd-prod.yml           # Production deployment
│
├── docs/                         # Documentation
│   ├── DEPLOYMENT.md             # Deployment guide
│   ├── OPERATIONS.md             # Operations runbook
│   ├── ARCHITECTURE.md           # Architecture details
│   └── API.md                    # API documentation
│
└── README.md                     # This file
```

## Environment Configurations

### Development
- **Purpose**: Local development and testing
- **Instance Types**: t3.small (bastion), t3.medium (EKS), db.t3.micro (RDS)
- **High Availability**: Single AZ, single NAT Gateway
- **Cost**: ~$150-200/month

### Staging
- **Purpose**: Pre-production testing
- **Instance Types**: t3.medium (bastion), t3.medium (EKS), db.t3.small (RDS)
- **High Availability**: Multi-AZ RDS, single NAT Gateway
- **Cost**: ~$300-400/month

### Production
- **Purpose**: Live production workloads
- **Instance Types**: t3.medium (bastion), t3.large (EKS), db.t3.small (RDS)
- **High Availability**: Multi-AZ for all services, NAT Gateway per AZ
- **Cost**: ~$500-700/month

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /transaction` - Get all transactions
- `POST /transaction` - Create new transaction
- `DELETE /transaction` - Delete all transactions
- `GET /transaction/id` - Get transaction by ID
- `DELETE /transaction/id` - Delete transaction by ID
- `GET /metrics` - Prometheus metrics

See [API Documentation](docs/API.md) for detailed specifications.

## Monitoring and Observability

### Prometheus Metrics
- HTTP request rates and durations
- Cache hit/miss ratios
- Database query performance
- Business metrics (transaction counts, amounts)

### Grafana Dashboards
- Cluster overview
- Application performance
- Business metrics
- Infrastructure health
- Cost tracking

### CloudWatch Logs
- Application logs with structured JSON
- Container logs from all pods
- VPC Flow Logs for network analysis

## Security

- **Encryption at Rest**: RDS (KMS), ElastiCache, EBS volumes
- **Encryption in Transit**: TLS for ALB, RDS, Redis
- **IAM**: Least privilege roles, OIDC for GitHub Actions
- **Network**: Private subnets, security groups, VPC Flow Logs
- **Secrets**: Kubernetes Secrets, AWS Secrets Manager integration
- **Audit**: CloudTrail for API logging

## Cost Optimization

- Spot instances for non-production EKS nodes
- Auto-scaling based on CPU utilization
- Single NAT Gateway for dev environment
- S3 lifecycle policies for backups
- Budget alerts at 80% and 100% thresholds

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Step-by-step deployment instructions
- [Operations Runbook](docs/OPERATIONS.md) - Day-2 operations procedures
- [Architecture Documentation](docs/ARCHITECTURE.md) - Detailed architecture diagrams
- [API Documentation](docs/API.md) - API endpoint specifications
- [Cost Estimation](docs/COST.md) - Cost breakdown and optimization

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `pytest`
4. Submit a pull request
5. Wait for CI checks to pass
6. Request review from team members

## Support

For issues, questions, or contributions, please open an issue in the GitHub repository.

## License

[Specify your license here]
# cloud-native-expense-tracker
