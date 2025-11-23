# Security Groups Module Outputs

output "alb_security_group_id" {
  description = "Security group ID for Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "eks_node_security_group_id" {
  description = "Security group ID for EKS worker nodes"
  value       = aws_security_group.eks_node.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS database"
  value       = aws_security_group.rds.id
}

output "elasticache_security_group_id" {
  description = "Security group ID for ElastiCache Redis cluster"
  value       = aws_security_group.elasticache.id
}

output "bastion_security_group_id" {
  description = "Security group ID for bastion host"
  value       = aws_security_group.bastion.id
}

# Additional outputs for convenience
output "security_group_ids" {
  description = "Map of all security group IDs"
  value = {
    alb         = aws_security_group.alb.id
    eks_node    = aws_security_group.eks_node.id
    rds         = aws_security_group.rds.id
    elasticache = aws_security_group.elasticache.id
    bastion     = aws_security_group.bastion.id
  }
}
