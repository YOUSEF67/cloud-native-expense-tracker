# ECR Module

This Terraform module creates an Amazon Elastic Container Registry (ECR) repository with image scanning and lifecycle policies.

## Features

- **Image Scanning**: Automatically scans images on push for vulnerabilities
- **Image Tag Mutability**: Configurable to prevent tag overwrites (IMMUTABLE) or allow them (MUTABLE)
- **Lifecycle Policy**: Automatically retains only the last N images to manage storage costs
- **Encryption**: Supports AES256 or KMS encryption for images at rest
- **Tagging**: Consistent tagging across all resources

## Usage

```hcl
module "ecr_backend" {
  source = "../../modules/ecr"

  repository_name         = "expense-backend"
  image_tag_mutability    = "IMMUTABLE"
  scan_on_push            = true
  image_retention_count   = 10
  environment             = "production"

  tags = {
    Project   = "expense-tracker"
    Component = "backend"
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
| repository_name | Name of the ECR repository | `string` | n/a | yes |
| image_tag_mutability | The tag mutability setting (MUTABLE or IMMUTABLE) | `string` | `"IMMUTABLE"` | no |
| scan_on_push | Enable image scanning on push | `bool` | `true` | no |
| image_retention_count | Number of images to retain | `number` | `10` | no |
| encryption_type | Encryption type (AES256 or KMS) | `string` | `"AES256"` | no |
| kms_key_arn | KMS key ARN for encryption (if using KMS) | `string` | `null` | no |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| tags | Additional tags for the repository | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| repository_url | The URL of the ECR repository |
| repository_arn | The ARN of the ECR repository |
| repository_name | The name of the ECR repository |
| registry_id | The registry ID where the repository was created |

## Examples

### Basic Usage

```hcl
module "ecr" {
  source = "../../modules/ecr"

  repository_name = "my-app"
  environment     = "dev"
}
```

### Production Configuration with KMS Encryption

```hcl
module "ecr_prod" {
  source = "../../modules/ecr"

  repository_name         = "my-app-prod"
  image_tag_mutability    = "IMMUTABLE"
  scan_on_push            = true
  image_retention_count   = 20
  encryption_type         = "KMS"
  kms_key_arn            = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  environment             = "prod"

  tags = {
    Project     = "my-app"
    CostCenter  = "engineering"
    Compliance  = "required"
  }
}
```

### Multiple Repositories

```hcl
module "ecr_backend" {
  source = "../../modules/ecr"

  repository_name = "expense-backend"
  environment     = "prod"
}

module "ecr_frontend" {
  source = "../../modules/ecr"

  repository_name = "expense-frontend"
  environment     = "prod"
}
```

## Lifecycle Policy

The module automatically creates a lifecycle policy that:
- Retains the last N images (configurable via `image_retention_count`)
- Applies to all image tags (tagged and untagged)
- Helps manage storage costs by removing old images

## Security Considerations

1. **Image Scanning**: Enabled by default to detect vulnerabilities
2. **Tag Immutability**: Set to IMMUTABLE by default to prevent accidental overwrites
3. **Encryption**: Uses AES256 encryption by default, with optional KMS support
4. **IAM Permissions**: Ensure proper IAM policies are in place for push/pull operations

## Notes

- The lifecycle policy takes effect after the specified number of images is exceeded
- Image scanning results are available in the AWS Console and via API
- For production environments, consider using IMMUTABLE tags and KMS encryption
