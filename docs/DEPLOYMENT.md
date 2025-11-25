# Deployment Guide

This guide details the steps to deploy the Cloud Native Expense Tracker infrastructure and application.

## 1. Prerequisites

Ensure you have the following tools installed:
- [AWS CLI](https://aws.amazon.com/cli/)
- [Terraform](https://www.terraform.io/downloads.html)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)

## 2. Infrastructure Deployment

### Bootstrap
The bootstrap phase sets up the S3 bucket and DynamoDB table for Terraform state management.

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

### Environment Deployment
Deploy the infrastructure for a specific environment (dev, staging, or prod).

```bash
# Example for dev
cd terraform/environments/dev
terraform init
terraform apply
```

## 3. Local Development

### Run with Docker Compose
```bash
# Start all services (MySQL, Redis, App)
docker-compose up --build -d

# Wait for services to be ready
sleep 10

# Run migrations
docker-compose exec app alembic upgrade head

# Test the API
./scripts/test_local.sh
```

## 4. Application Deployment

### Build Docker Image
```bash
docker build -t expense-tracker .
```

### Push to ECR
Authenticate and push the image to the ECR repository created by Terraform.

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker tag expense-tracker:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/expense-tracker-app:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/expense-tracker-app:latest
```

### Deploy with Helm
```bash
helm upgrade --install expense-tracker ./helm \
  --set image.repository=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/expense-tracker-app \
  --set image.tag=latest \
  --values ./helm/values.yaml \
  --namespace expense \
  --create-namespace
```

## 5. CI/CD Setup

The project uses GitHub Actions for CI/CD.
1. Configure OpenID Connect (OIDC) provider in AWS (handled by Terraform).
2. Note the IAM Role ARN created for GitHub Actions.
3. Add `AWS_ACCOUNT_ID` to GitHub Repository Secrets.

## 6. Verify Deployment

```bash
# Check pod status
kubectl get pods -n expense

# Check service
kubectl get svc -n expense

# Check ingress
kubectl get ingress -n expense

# View logs
kubectl logs -f deployment/expense-tracker -n expense
```
