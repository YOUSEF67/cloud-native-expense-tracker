# Budget Module Outputs

output "budget_id" {
  description = "The ID of the budget"
  value       = aws_budgets_budget.monthly_budget.id
}

output "budget_name" {
  description = "The name of the budget"
  value       = aws_budgets_budget.monthly_budget.name
}

output "budget_arn" {
  description = "The ARN of the budget"
  value       = aws_budgets_budget.monthly_budget.arn
}
