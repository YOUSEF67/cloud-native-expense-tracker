# CloudFront Distribution Module

This Terraform module creates an AWS CloudFront distribution configured for API acceleration with Application Load Balancer (ALB) as the origin.

## Features

- CloudFront distribution with ALB origin
- No caching configuration for API endpoints
- HTTPS-only with TLS 1.2+
- IPv6 support enabled
- Compression enabled for improved performance
- WAF integration support
- Custom error responses
- Geo-restriction capabilities
- Origin Access Identity support (for future S3 origins)

## Usage

```hcl
module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name        = "expense"
  environment         = "prod"
  alb_dns_name        = module.alb.dns_name
  acm_certificate_arn = module.acm.certificate_arn
  web_acl_arn         = module.waf.web_acl_arn

  custom_header_value = "secret-value-to-validate-cloudfront"
  price_class         = "PriceClass_100"

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 4.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 4.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| alb_dns_name | DNS name of the ALB to use as origin | `string` | n/a | yes |
| acm_certificate_arn | ARN of ACM certificate (must be in us-east-1) | `string` | n/a | yes |
| web_acl_arn | ARN of WAF Web ACL | `string` | `null` | no |
| custom_header_value | Custom header value for origin validation | `string` | `""` | no |
| price_class | CloudFront distribution price class | `string` | `"PriceClass_100"` | no |
| geo_restriction_type | Geo restriction method (none, whitelist, blacklist) | `string` | `"none"` | no |
| geo_restriction_locations | Country codes for geo restriction | `list(string)` | `[]` | no |
| custom_error_responses | Custom error response configurations | `list(object)` | `[]` | no |
| create_origin_access_identity | Create Origin Access Identity for S3 | `bool` | `false` | no |
| tags | Additional tags | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| distribution_id | CloudFront distribution ID |
| distribution_arn | CloudFront distribution ARN |
| distribution_domain_name | CloudFront distribution domain name |
| distribution_hosted_zone_id | Route 53 zone ID for alias records |
| distribution_status | Current distribution status |
| origin_access_identity_iam_arn | OAI IAM ARN (if created) |
| origin_access_identity_path | OAI path (if created) |

## Configuration Details

### Cache Behavior

The module is configured with **no caching** for API endpoints:
- `min_ttl = 0`
- `default_ttl = 0`
- `max_ttl = 0`

This ensures that all requests are forwarded to the origin (ALB) without caching, which is appropriate for dynamic API responses.

### Security

- **HTTPS Only**: Redirects HTTP to HTTPS
- **TLS 1.2+**: Minimum protocol version
- **WAF Integration**: Optional Web ACL association
- **Custom Headers**: Origin validation support
- **Geo-Restrictions**: Optional country-based restrictions

### Performance

- **Compression**: Enabled for text-based responses
- **IPv6**: Enabled for modern clients
- **Edge Locations**: Configurable via price class

## Price Classes

- `PriceClass_100`: US, Canada, Europe (lowest cost)
- `PriceClass_200`: US, Canada, Europe, Asia, Middle East, Africa
- `PriceClass_All`: All edge locations (highest performance)

## Notes

- ACM certificate must be created in **us-east-1** region for CloudFront
- Custom header can be used to validate requests originate from CloudFront
- For production, consider using WAF for additional security
- Distribution deployment can take 15-20 minutes

## Example with Custom Error Responses

```hcl
module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name        = "expense"
  environment         = "prod"
  alb_dns_name        = module.alb.dns_name
  acm_certificate_arn = module.acm.certificate_arn

  custom_error_responses = [
    {
      error_code            = 404
      response_code         = 404
      response_page_path    = "/404.html"
      error_caching_min_ttl = 300
    },
    {
      error_code            = 500
      response_code         = 500
      response_page_path    = "/500.html"
      error_caching_min_ttl = 0
    }
  ]
}
```

## Integration with Route 53

```hcl
resource "aws_route53_record" "cloudfront" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
```
