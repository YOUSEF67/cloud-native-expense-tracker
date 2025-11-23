# WAF Module

This Terraform module creates an AWS WAFv2 Web ACL with rate limiting and AWS managed rule groups for comprehensive web application protection.

## Features

- **Rate Limiting**: Configurable rate-based rule to prevent DDoS attacks (default: 2000 requests per 5 minutes per IP)
- **AWS Managed Rules - Common Rule Set**: Protection against common web exploits (OWASP Top 10)
- **AWS Managed Rules - SQL Injection**: Protection against SQL injection attacks
- **CloudWatch Metrics**: All rules emit CloudWatch metrics for monitoring
- **Sampled Requests**: Request sampling enabled for debugging and analysis

## Usage

```hcl
module "waf" {
  source = "../../modules/waf"

  project_name = "expense"
  environment  = "prod"
  scope        = "REGIONAL"  # Use "CLOUDFRONT" for CloudFront distributions
  rate_limit   = 2000        # Requests per 5 minutes per IP

  tags = {
    Project = "expense-tracker"
    Team    = "platform"
  }
}

# Associate with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = module.waf.web_acl_arn
}

# Or associate with CloudFront (requires scope = "CLOUDFRONT")
resource "aws_cloudfront_distribution" "main" {
  # ... other configuration
  web_acl_id = module.waf.web_acl_arn
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
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| scope | Scope of the WAF (REGIONAL or CLOUDFRONT) | `string` | `"REGIONAL"` | no |
| rate_limit | Rate limit for requests per 5 minutes from a single IP | `number` | `2000` | no |
| tags | Additional tags to apply to the WAF resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| web_acl_id | The ID of the WAF Web ACL |
| web_acl_arn | The ARN of the WAF Web ACL |
| web_acl_capacity | The capacity units used by the Web ACL |
| web_acl_name | The name of the WAF Web ACL |

## Rules

### 1. Rate Limiting (Priority 1)
- **Action**: Block
- **Limit**: Configurable (default 2000 requests per 5 minutes)
- **Aggregate**: By IP address
- **Use Case**: Prevent DDoS attacks and brute force attempts

### 2. AWS Managed Rules - Common Rule Set (Priority 2)
- **Action**: Block (via managed rule group)
- **Protection**: OWASP Top 10 vulnerabilities
- **Includes**:
  - Cross-site scripting (XSS)
  - Local file inclusion (LFI)
  - Remote file inclusion (RFI)
  - PHP injection
  - Cross-site request forgery (CSRF)
  - And more...

### 3. AWS Managed Rules - SQL Injection (Priority 3)
- **Action**: Block (via managed rule group)
- **Protection**: SQL injection attacks
- **Includes**:
  - SQL injection in query strings
  - SQL injection in request body
  - SQL injection in cookies
  - SQL injection in headers

## Monitoring

All rules emit CloudWatch metrics with the following naming pattern:
- Rate limit: `{project_name}-rate-limit-{environment}`
- Common rules: `{project_name}-common-rules-{environment}`
- SQLi rules: `{project_name}-sqli-rules-{environment}`
- Overall WAF: `{project_name}-waf-{environment}`

### Example CloudWatch Queries

**View blocked requests:**
```
fields @timestamp, httpRequest.clientIp, action, terminatingRuleId
| filter action = "BLOCK"
| sort @timestamp desc
```

**Count blocks by rule:**
```
fields terminatingRuleId
| filter action = "BLOCK"
| stats count() by terminatingRuleId
```

## Cost Considerations

- **Web ACL**: $5.00 per month
- **Rules**: $1.00 per rule per month (3 rules = $3.00)
- **Requests**: $0.60 per 1 million requests
- **Managed Rule Groups**: Included in rule cost

**Estimated monthly cost**: ~$10-20 depending on traffic volume

## Security Best Practices

1. **Scope Selection**:
   - Use `REGIONAL` for ALB, API Gateway, App Runner
   - Use `CLOUDFRONT` for CloudFront distributions (must be in us-east-1)

2. **Rate Limiting**:
   - Adjust rate limit based on expected traffic patterns
   - Lower for APIs with authentication
   - Higher for public-facing content

3. **Testing**:
   - Test WAF rules in staging before production
   - Use sampled requests to verify rule behavior
   - Monitor false positives

4. **Logging**:
   - Enable WAF logging to S3 or CloudWatch Logs
   - Analyze logs regularly for attack patterns
   - Set up alerts for high block rates

## Examples

See the `examples/` directory for complete usage examples:
- Basic WAF with ALB
- WAF with CloudFront
- Custom rate limits per environment

## References

- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [AWS Managed Rules](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups.html)
- [WAF Best Practices](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html)
