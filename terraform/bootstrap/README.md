# Terraform Bootstrap Module

This module creates the foundational infrastructure required for Terraform remote state management:
- **S3 Bucket**: Stores Terraform state files with versioning and encryption
- **DynamoDB Table**: Provides state locking to prevent concurrent modifications
- **KMS Key**: Encrypts state files at rest

## Prerequisites

Before deploying this module, ensure you have:

1. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure
   ```

2. **Terraform** installed (version >= 1.0)
   ```bash
   terraform --version
   ```

3. **AWS Credentials** with sufficient permissions to create:
   - S3 buckets
   - DynamoDB tables
   - KMS keys
   - IAM policies (for bucket policies)

4. **AWS Account ID** - Get it by running:
   ```bash
   aws sts get-caller-identity --query Account --output text
   ```

## Deployment Process

### Step 1: Configure Variables

1. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:
   ```hcl
   aws_region     = "us-east-1"
   aws_account_id = "123456789012"  # Your AWS account ID
   project_name   = "expense"
   ```

### Step 2: Initialize Terraform

```bash
terraform init
```

This downloads the required providers (AWS).

### Step 3: Review the Plan

```bash
terraform plan
```

Review the resources that will be created:
- 1 S3 bucket with versioning, encryption, and lifecycle policies
- 1 DynamoDB table for state locking
- 1 KMS key for encryption
- Associated bucket policies and configurations

### Step 4: Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted to confirm the creation of resources.

### Step 5: Save the Outputs

After successful deployment, save the outputs for use in other modules:

```bash
terraform output -json > bootstrap-outputs.json
```

Key outputs include:
- `s3_bucket_name`: Name of the state bucket
- `dynamodb_table_name`: Name of the locking table
- `kms_key_arn`: ARN of the encryption key

## Using the Remote Backend

After deploying the bootstrap module, configure other Terraform modules to use the remote backend:

### Option 1: Update Backend Configuration Files

Update the backend configuration in each environment:

1. **For dev environment** (`terraform/environments/dev/backend.tf`):
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

2. **For staging environment** (`terraform/environments/staging/backend.tf`):
   ```hcl
   terraform {
     backend "s3" {
       bucket         = "expense-terraform-state-123456789012"
       key            = "environments/staging/terraform.tfstate"
       region         = "us-east-1"
       dynamodb_table = "expense-terraform-locks"
       encrypt        = true
     }
   }
   ```

3. **For prod environment** (`terraform/environments/prod/backend.tf`):
   ```hcl
   terraform {
     backend "s3" {
       bucket         = "expense-terraform-state-123456789012"
       key            = "environments/prod/terraform.tfstate"
       region         = "us-east-1"
       dynamodb_table = "expense-terraform-locks"
       encrypt        = true
     }
   }
   ```

### Option 2: Use Backend Configuration File

Alternatively, create a `backend-config.hcl` file:

```hcl
bucket         = "expense-terraform-state-123456789012"
region         = "us-east-1"
dynamodb_table = "expense-terraform-locks"
encrypt        = true
```

Then initialize with:
```bash
terraform init -backend-config=backend-config.hcl
```

## Migrating Existing State

If you have existing local state files, migrate them to the remote backend:

1. Configure the backend in your Terraform configuration
2. Run `terraform init`
3. Terraform will detect the state and ask if you want to migrate
4. Type `yes` to copy the state to S3

## State File Organization

The S3 bucket organizes state files by environment:

```
expense-terraform-state-123456789012/
├── environments/
│   ├── dev/
│   │   └── terraform.tfstate
│   ├── staging/
│   │   └── terraform.tfstate
│   └── prod/
│       └── terraform.tfstate
└── access-logs/
    └── (S3 access logs)
```

## Security Features

### Encryption
- **At Rest**: All state files are encrypted using AWS KMS
- **In Transit**: HTTPS is enforced for all S3 operations
- **Key Rotation**: KMS key rotation is enabled automatically

### Access Control
- **Public Access**: Completely blocked via S3 bucket policies
- **Versioning**: Enabled to maintain state file history
- **Logging**: S3 access logs are enabled for audit trail

### State Locking
- **DynamoDB**: Prevents concurrent Terraform operations
- **Automatic**: Terraform handles locking automatically
- **Timeout**: Locks expire after 10 minutes if not released

## Lifecycle Management

The S3 bucket has lifecycle policies to optimize costs:

- **30 days**: Old versions transition to STANDARD_IA (Infrequent Access)
- **90 days**: Old versions transition to GLACIER
- **365 days**: Old versions are permanently deleted

## Troubleshooting

### Issue: "Bucket name already exists"

**Cause**: S3 bucket names must be globally unique across all AWS accounts.

**Solution**: Change the `project_name` or `aws_account_id` in `terraform.tfvars`.

### Issue: "Access Denied" when creating resources

**Cause**: Insufficient IAM permissions.

**Solution**: Ensure your AWS credentials have permissions for:
- `s3:CreateBucket`, `s3:PutBucketVersioning`, `s3:PutEncryptionConfiguration`
- `dynamodb:CreateTable`
- `kms:CreateKey`, `kms:CreateAlias`

### Issue: State lock timeout

**Cause**: Previous Terraform operation didn't release the lock.

**Solution**: Manually remove the lock from DynamoDB:
```bash
aws dynamodb delete-item \
  --table-name expense-terraform-locks \
  --key '{"LockID": {"S": "expense-terraform-state-123456789012/environments/dev/terraform.tfstate-md5"}}'
```

### Issue: Cannot initialize backend

**Cause**: Backend configuration doesn't match deployed resources.

**Solution**: Verify the bucket name and DynamoDB table name match the bootstrap outputs:
```bash
cd terraform/bootstrap
terraform output
```

## Cleanup

To destroy the bootstrap infrastructure (⚠️ **WARNING**: This will delete all state files):

1. First, destroy all other infrastructure that uses this backend
2. Migrate state files locally or back them up
3. Then destroy the bootstrap:
   ```bash
   terraform destroy
   ```

**Note**: You may need to empty the S3 bucket manually before Terraform can delete it:
```bash
aws s3 rm s3://expense-terraform-state-123456789012 --recursive
```

## Best Practices

1. **Deploy Once**: This module should only be deployed once per AWS account
2. **Backup State**: Regularly backup the bootstrap state file (stored locally)
3. **Access Control**: Limit who can modify the state bucket and DynamoDB table
4. **Monitoring**: Set up CloudWatch alarms for DynamoDB throttling
5. **Cost Optimization**: Review lifecycle policies based on your retention needs

## Cost Estimate

Approximate monthly costs for the bootstrap infrastructure:

- **S3 Bucket**: ~$0.50 - $2.00 (depends on state file size and versions)
- **DynamoDB Table**: ~$0.00 - $0.50 (pay-per-request, minimal usage)
- **KMS Key**: ~$1.00 (per key per month)
- **Total**: ~$1.50 - $3.50 per month

## Additional Resources

- [Terraform S3 Backend Documentation](https://www.terraform.io/docs/language/settings/backends/s3.html)
- [AWS S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [DynamoDB State Locking](https://www.terraform.io/docs/language/settings/backends/s3.html#dynamodb-state-locking)
- [AWS KMS Key Management](https://docs.aws.amazon.com/kms/latest/developerguide/overview.html)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Terraform and AWS documentation
3. Contact your DevOps team or AWS support
