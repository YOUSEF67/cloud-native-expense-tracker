# CloudFront Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer to use as origin"
  type        = string
}

variable "web_acl_arn" {
  description = "ARN of the WAF Web ACL to associate with the distribution"
  type        = string
  default     = null
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS (must be in us-east-1 for CloudFront)"
  type        = string
}

variable "custom_header_value" {
  description = "Value for custom header to validate requests from CloudFront to origin"
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.price_class)
    error_message = "Price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

variable "geo_restriction_type" {
  description = "Method to restrict distribution of content by country (none, whitelist, blacklist)"
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "whitelist", "blacklist"], var.geo_restriction_type)
    error_message = "Geo restriction type must be none, whitelist, or blacklist."
  }
}

variable "geo_restriction_locations" {
  description = "ISO 3166-1-alpha-2 country codes for geo restriction"
  type        = list(string)
  default     = []
}

variable "custom_error_responses" {
  description = "Custom error response configurations"
  type = list(object({
    error_code            = number
    response_code         = number
    response_page_path    = string
    error_caching_min_ttl = number
  }))
  default = []
}

variable "create_origin_access_identity" {
  description = "Whether to create CloudFront Origin Access Identity (for S3 origins)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to the CloudFront distribution"
  type        = map(string)
  default     = {}
}
