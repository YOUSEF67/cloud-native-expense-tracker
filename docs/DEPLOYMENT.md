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

## 3. Application Deployment

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
  --values ./helm/values.yaml
```

## 4. CI/CD Setup

The project uses GitHub Actions for CI/CD.
1. Configure OpenID Connect (OIDC) provider in AWS (handled by Terraform).
2. Note the IAM Role ARN created for GitHub Actions.
3. Add `AWS_ACCOUNT_ID` to GitHub Repository Secrets.
