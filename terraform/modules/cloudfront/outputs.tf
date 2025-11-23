# CloudFront Module Outputs

output "distribution_id" {
  description = "The identifier for the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.id
}

output "distribution_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.arn
}

output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "distribution_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID for alias records"
  value       = aws_cloudfront_distribution.this.hosted_zone_id
}

output "distribution_status" {
  description = "The current status of the distribution"
  value       = aws_cloudfront_distribution.this.status
}

output "origin_access_identity_iam_arn" {
  description = "The IAM ARN of the Origin Access Identity (if created)"
  value       = var.create_origin_access_identity ? aws_cloudfront_origin_access_identity.this[0].iam_arn : null
}

output "origin_access_identity_path" {
  description = "The CloudFront origin access identity path (if created)"
  value       = var.create_origin_access_identity ? aws_cloudfront_origin_access_identity.this[0].cloudfront_access_identity_path : null
}
