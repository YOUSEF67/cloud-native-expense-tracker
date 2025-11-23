# Security Groups Module
# This module creates all security groups for the infrastructure

# ALB Security Group
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-${var.environment}-alb-"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-${var.environment}-alb-sg"
      Component = "alb"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ALB Ingress Rules - Allow HTTP from internet
resource "aws_security_group_rule" "alb_http_ingress" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow HTTP traffic from internet"
  security_group_id = aws_security_group.alb.id
}

# ALB Ingress Rules - Allow HTTPS from internet
resource "aws_security_group_rule" "alb_https_ingress" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow HTTPS traffic from internet"
  security_group_id = aws_security_group.alb.id
}

# ALB Egress Rules - Allow traffic to EKS nodes on port 8080
resource "aws_security_group_rule" "alb_to_eks_egress" {
  type                     = "egress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_node.id
  description              = "Allow traffic to EKS nodes on application port"
  security_group_id        = aws_security_group.alb.id
}

# EKS Node Security Group
resource "aws_security_group" "eks_node" {
  name_prefix = "${var.project_name}-${var.environment}-eks-node-"
  description = "Security group for EKS worker nodes"
  vpc_id      = var.vpc_id

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-${var.environment}-eks-node-sg"
      Component = "eks-node"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# EKS Node Ingress - Allow traffic from ALB on port 8080
resource "aws_security_group_rule" "eks_node_from_alb" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  description              = "Allow traffic from ALB on application port"
  security_group_id        = aws_security_group.eks_node.id
}

# EKS Node Ingress - Allow traffic from EKS control plane on port 443
resource "aws_security_group_rule" "eks_node_from_control_plane" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = var.eks_cluster_security_group_id
  description              = "Allow traffic from EKS control plane"
  security_group_id        = aws_security_group.eks_node.id
}

# EKS Node Ingress - Allow all traffic within same security group (node-to-node)
resource "aws_security_group_rule" "eks_node_to_node" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  self              = true
  description       = "Allow all traffic between EKS nodes"
  security_group_id = aws_security_group.eks_node.id
}

# EKS Node Egress - Allow traffic to RDS on port 3306
resource "aws_security_group_rule" "eks_node_to_rds" {
  type                     = "egress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.rds.id
  description              = "Allow traffic to RDS MySQL"
  security_group_id        = aws_security_group.eks_node.id
}

# EKS Node Egress - Allow traffic to ElastiCache on port 6379
resource "aws_security_group_rule" "eks_node_to_redis" {
  type                     = "egress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.elasticache.id
  description              = "Allow traffic to ElastiCache Redis"
  security_group_id        = aws_security_group.eks_node.id
}

# EKS Node Egress - Allow HTTPS to internet (for ECR, S3, etc.)
resource "aws_security_group_rule" "eks_node_to_internet" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow HTTPS traffic to internet for ECR, S3, etc."
  security_group_id = aws_security_group.eks_node.id
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS MySQL database"
  vpc_id      = var.vpc_id

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-${var.environment}-rds-sg"
      Component = "rds"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Ingress - Allow traffic from EKS nodes on port 3306
resource "aws_security_group_rule" "rds_from_eks_nodes" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_node.id
  description              = "Allow MySQL traffic from EKS nodes"
  security_group_id        = aws_security_group.rds.id
}

# RDS Ingress - Allow traffic from bastion on port 3306
resource "aws_security_group_rule" "rds_from_bastion" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.bastion.id
  description              = "Allow MySQL traffic from bastion host"
  security_group_id        = aws_security_group.rds.id
}

# ElastiCache Security Group
resource "aws_security_group" "elasticache" {
  name_prefix = "${var.project_name}-${var.environment}-elasticache-"
  description = "Security group for ElastiCache Redis cluster"
  vpc_id      = var.vpc_id

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-${var.environment}-elasticache-sg"
      Component = "elasticache"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ElastiCache Ingress - Allow traffic from EKS nodes on port 6379
resource "aws_security_group_rule" "elasticache_from_eks_nodes" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_node.id
  description              = "Allow Redis traffic from EKS nodes"
  security_group_id        = aws_security_group.elasticache.id
}

# Bastion Security Group
resource "aws_security_group" "bastion" {
  name_prefix = "${var.project_name}-${var.environment}-bastion-"
  description = "Security group for bastion host"
  vpc_id      = var.vpc_id

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-${var.environment}-bastion-sg"
      Component = "bastion"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Bastion Ingress - Allow SSH from specific IP ranges
resource "aws_security_group_rule" "bastion_ssh_ingress" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = var.bastion_allowed_cidr_blocks
  description       = "Allow SSH access from specific IP ranges"
  security_group_id = aws_security_group.bastion.id
}

# Bastion Egress - Allow SSH to VPC resources
resource "aws_security_group_rule" "bastion_ssh_egress" {
  type              = "egress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = [var.vpc_cidr]
  description       = "Allow SSH to VPC resources"
  security_group_id = aws_security_group.bastion.id
}

# Bastion Egress - Allow MySQL to RDS
resource "aws_security_group_rule" "bastion_mysql_egress" {
  type                     = "egress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.rds.id
  description              = "Allow MySQL access to RDS"
  security_group_id        = aws_security_group.bastion.id
}

# Bastion Egress - Allow HTTPS to internet
resource "aws_security_group_rule" "bastion_https_egress" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow HTTPS to internet for package downloads"
  security_group_id = aws_security_group.bastion.id
}
