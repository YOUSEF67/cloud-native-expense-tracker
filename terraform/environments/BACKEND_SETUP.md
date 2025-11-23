# Backend Configuration Setup Guide

This guide explains how to configure Terraform remote state backend for each environment after deploying the bootstrap module.

## Quick Start

### 1. Deploy Bootstrap Module (One-Time Setup)

```bash
cd terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS account details
terraform init
terraform apply
```

Save the outputs:
```bash
terraform output s3_bucket_name
terraform output dynamodb_table_name
```

### 2. Update Backend Configuration

For each environment (dev, staging, prod), update the `backend.tf` file with the actual values from bootstrap outputs.

#### Example for Dev Environment

Edit `terraform/environments/dev/backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "expense-terraform-state-123456789012"  # From bootstrap output
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "expense-terraform-locks"              # From bootstrap output
    encrypt        = true
  }
}
```

### 3. Initialize Each Environment

```bash
# Dev environment
cd terraform/environments/dev
terraform init

# Staging environment
cd terraform/environments/staging
terraform init

# Production environment
cd terraform/environments/prod
terraform init
```

## Backend Configuration Reference

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `bucket` | S3 bucket name for state storage | `expense-terraform-state-123456789012` |
| `key` | Path to state file within bucket | `environments/dev/terraform.tfstate` |
| `region` | AWS region of the S3 bucket | `us-east-1` |
| `dynamodb_table` | DynamoDB table for state locking | `expense-terraform-locks` |
| `encrypt` | Enable encryption at rest | `true` |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `kms_key_id` | KMS key ARN for encryption | `arn:aws:kms:us-east-1:123456789012:key/...` |
| `role_arn` | IAM role to assume | `arn:aws:iam::123456789012:role/TerraformRole` |
| `profile` | AWS CLI profile to use | `default` |

## State File Organization

```
S3 Bucket: expense-terraform-state-123456789012
├── environments/
│   ├── dev/
│   │   └── terraform.tfstate
│   ├── staging/
│   │   └── terraform.tfstate
│   └── prod/
│       └── terraform.tfstate
└── access-logs/
```

## Migrating Existing Local State

If you have existing local state files:

1. Configure the backend in your `backend.tf`
2. Run `terraform init`
3. Terraform will detect the local state and prompt:
   ```
   Do you want to copy existing state to the new backend?
   ```
4. Type `yes` to migrate

## Troubleshooting

### Error: "Error loading state: AccessDenied"

**Solution**: Ensure your AWS credentials have permissions to access the S3 bucket and DynamoDB table.

### Error: "Error acquiring the state lock"

**Solution**: Another Terraform process is running. Wait for it to complete or manually release the lock:

```bash
# List locks
aws dynamodb scan --table-name expense-terraform-locks

# Delete specific lock (use with caution!)
aws dynamodb delete-item \
  --table-name expense-terraform-locks \
  --key '{"LockID": {"S": "YOUR-LOCK-ID"}}'
```

### Error: "Backend configuration changed"

**Solution**: Run `terraform init -reconfigure` to reinitialize with the new backend configuration.

## Best Practices

1. **Never commit `terraform.tfvars`**: Contains sensitive information
2. **Always use state locking**: Prevents concurrent modifications
3. **Enable versioning**: Allows recovery from accidental state corruption
4. **Separate state files**: Use different state files for each environment
5. **Backup state files**: Regularly backup your state files
6. **Limit access**: Restrict who can modify state files

## Security Considerations

- State files may contain sensitive data (passwords, keys)
- Always encrypt state files at rest (enabled by default)
- Use IAM policies to restrict access to state bucket
- Enable CloudTrail logging for audit trail
- Use MFA for production state modifications

## Additional Resources

- [Terraform S3 Backend Documentation](https://www.terraform.io/docs/language/settings/backends/s3.html)
- [State Locking](https://www.terraform.io/docs/language/state/locking.html)
- [Backend Configuration](https://www.terraform.io/docs/language/settings/backends/configuration.html)
