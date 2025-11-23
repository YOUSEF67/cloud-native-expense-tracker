# Budget Module Variables

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

variable "limit_amount" {
  description = "Monthly budget limit in USD"
  type        = string

  validation {
    condition     = can(tonumber(var.limit_amount)) && tonumber(var.limit_amount) > 0
    error_message = "Limit amount must be a positive number."
  }
}

variable "subscriber_email_addresses" {
  description = "List of email addresses to receive budget notifications"
  type        = list(string)

  validation {
    condition     = length(var.subscriber_email_addresses) > 0
    error_message = "At least one email address must be provided."
  }
}

variable "tags" {
  description = "Additional tags to apply to the budget resources"
  type        = map(string)
  default     = {}
}
