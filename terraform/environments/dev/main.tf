module "vpc" {
  source = "../../modules/vpc"

  vpc_cidr             = var.vpc_cidr
  availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
  environment          = var.environment
  single_nat_gateway   = var.single_nat_gateway
  one_nat_gateway_per_az = false
}

module "security_groups" {
  source = "../../modules/security-groups"

  vpc_id      = module.vpc.vpc_id
  environment = var.environment
}

module "bastion" {
  source = "../../modules/bastion"

  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  instance_type       = var.instance_type
  key_name            = var.key_name
  allowed_cidr_blocks = ["0.0.0.0/0"] # Restrict this in real usage
  environment         = var.environment
}

module "rds" {
  source = "../../modules/rds"

  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  instance_class      = var.db_instance_class
  allocated_storage   = 20
  database_name       = "expense_tracker"
  master_username     = "admin"
  master_password     = "change-me-in-secrets" # Should be passed via secrets
  multi_az            = var.multi_az
  environment         = var.environment
  security_group_ids  = [module.security_groups.rds_sg_id]
}

module "elasticache" {
  source = "../../modules/elasticache"

  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  node_type           = var.cache_node_type
  num_cache_nodes     = 1
  engine_version      = "7.0"
  environment         = var.environment
  security_group_ids  = [module.security_groups.elasticache_sg_id]
}

module "eks" {
  source = "../../modules/eks"

  cluster_name        = "${var.project_name}-${var.environment}"
  cluster_version     = "1.27"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  node_instance_types = var.node_instance_types
  min_size            = 1
  max_size            = 3
  desired_size        = 2
  environment         = var.environment
}

module "ecr" {
  source = "../../modules/ecr"

  repository_name = "${var.project_name}-app"
  environment     = var.environment
}

module "oidc" {
  source = "../../modules/oidc"

  github_org  = "yousefnagy"
  github_repo = "cloud-native-expense-tracker"
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  domain_name = module.eks.cluster_endpoint # Placeholder, usually points to ALB
  environment = var.environment
}

module "waf" {
  source = "../../modules/waf"

  name        = "${var.project_name}-waf-${var.environment}"
  environment = var.environment
}

module "budget" {
  source = "../../modules/budget"

  project_name               = var.project_name
  environment                = var.environment
  limit_amount               = "200"
  subscriber_email_addresses = ["admin@example.com"]
}
