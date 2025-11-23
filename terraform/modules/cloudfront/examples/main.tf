# Example usage of CloudFront module

# Basic usage with ALB origin
module "cloudfront_basic" {
  source = "../"

  project_name        = "expense"
  environment         = "prod"
  alb_dns_name        = "expense-alb-123456789.us-east-1.elb.amazonaws.com"
  acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

# Advanced usage with WAF and custom configuration
module "cloudfront_advanced" {
  source = "../"

  project_name        = "expense"
  environment         = "prod"
  alb_dns_name        = "expense-alb-123456789.us-east-1.elb.amazonaws.com"
  acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
  web_acl_arn         = "arn:aws:wafv2:us-east-1:123456789012:global/webacl/expense-waf/12345678-1234-1234-1234-123456789012"

  custom_header_value = "my-secret-validation-header"
  price_class         = "PriceClass_200"

  # Geo-restriction example (whitelist US and Canada)
  geo_restriction_type      = "whitelist"
  geo_restriction_locations = ["US", "CA"]

  # Custom error responses
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
    },
    {
      error_code            = 503
      response_code         = 503
      response_page_path    = "/maintenance.html"
      error_caching_min_ttl = 60
    }
  ]

  tags = {
    Project     = "expense-tracker"
    Team        = "platform"
    CostCenter  = "engineering"
    Compliance  = "pci-dss"
  }
}

# Outputs
output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront_basic.distribution_domain_name
}

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront_basic.distribution_id
}
