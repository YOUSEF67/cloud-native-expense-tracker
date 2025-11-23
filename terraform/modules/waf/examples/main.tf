# Example: WAF Module Usage

# Example 1: Basic WAF for ALB (Regional)
module "waf_alb" {
  source = "../"

  project_name = "expense"
  environment  = "prod"
  scope        = "REGIONAL"
  rate_limit   = 2000

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

# Associate WAF with Application Load Balancer
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/expense-alb/1234567890abcdef"
  web_acl_arn  = module.waf_alb.web_acl_arn
}

# Example 2: WAF for CloudFront (must be in us-east-1)
module "waf_cloudfront" {
  source = "../"

  project_name = "expense"
  environment  = "prod"
  scope        = "CLOUDFRONT"
  rate_limit   = 5000  # Higher limit for CDN

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

# Example 3: Environment-specific rate limits
module "waf_dev" {
  source = "../"

  project_name = "expense"
  environment  = "dev"
  scope        = "REGIONAL"
  rate_limit   = 1000  # Lower limit for dev

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

module "waf_staging" {
  source = "../"

  project_name = "expense"
  environment  = "staging"
  scope        = "REGIONAL"
  rate_limit   = 2000

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

module "waf_prod" {
  source = "../"

  project_name = "expense"
  environment  = "prod"
  scope        = "REGIONAL"
  rate_limit   = 3000  # Higher limit for production

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

# Outputs
output "waf_alb_arn" {
  description = "ARN of the WAF Web ACL for ALB"
  value       = module.waf_alb.web_acl_arn
}

output "waf_cloudfront_arn" {
  description = "ARN of the WAF Web ACL for CloudFront"
  value       = module.waf_cloudfront.web_acl_arn
}
