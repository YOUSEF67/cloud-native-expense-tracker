# Bastion Host Module

This Terraform module creates a bastion host (jump server) for secure access to private resources in the VPC.

## Features

- Latest Ubuntu 22.04 LTS AMI
- Pre-installed tools: AWS CLI v2, kubectl, MySQL client
- Optional Elastic IP allocation
- Configurable instance type per environment
- Encrypted root volume
- CloudWatch monitoring support
- Termination protection for production

## Usage

```hcl
module "bastion" {
  source = "../../modules/bastion"

  project_name = "expense-tracker"
  environment  = "dev"

  # Instance Configuration
  instance_type = "t3.small"
  key_name      = "my-ssh-key"

  # Network Configuration
  subnet_id         = module.vpc.public_subnet_ids[0]
  security_group_id = module.security_groups.bastion_security_group_id

  # Optional: Elastic IP
  allocate_elastic_ip = true

  # Optional: IAM Instance Profile
  iam_instance_profile = aws_iam_instance_profile.bastion.name

  # Optional: Enable termination protection for production
  enable_termination_protection = var.environment == "prod" ? true : false

  tags = {
    Project = "expense-tracker"
    Owner   = "devops-team"
  }
}
```

## Environment-Specific Configurations

### Development
```hcl
instance_type                 = "t3.small"
allocate_elastic_ip           = true
enable_detailed_monitoring    = false
enable_termination_protection = false
```

### Staging
```hcl
instance_type                 = "t3.small"
allocate_elastic_ip           = true
enable_detailed_monitoring    = false
enable_termination_protection = false
```

### Production
```hcl
instance_type                 = "t3.medium"
allocate_elastic_ip           = true
enable_detailed_monitoring    = true
enable_termination_protection = true
```

## Pre-installed Tools

The bastion host comes with the following tools pre-installed via user data:

- **AWS CLI v2**: For AWS service management
- **kubectl**: For Kubernetes cluster management
- **MySQL Client**: For database access and troubleshooting
- **jq**: For JSON processing
- **vim**: Text editor
- **htop**: Process monitoring

## Connecting to the Bastion Host

### SSH Connection
```bash
ssh -i /path/to/your-key.pem ubuntu@<bastion-public-ip>
```

### Connecting to RDS via Bastion
```bash
# SSH tunnel to RDS
ssh -i /path/to/your-key.pem -L 3306:<rds-endpoint>:3306 ubuntu@<bastion-public-ip>

# Then connect from your local machine
mysql -h 127.0.0.1 -u admin -p
```

### Connecting to EKS via Bastion
```bash
# SSH into bastion
ssh -i /path/to/your-key.pem ubuntu@<bastion-public-ip>

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name <cluster-name>

# Verify connection
kubectl get nodes
```

## Security Considerations

1. **SSH Key Management**: Store SSH private keys securely and never commit them to version control
2. **IP Whitelisting**: Configure `bastion_allowed_cidr_blocks` in the security group module to restrict SSH access
3. **Session Logging**: Consider enabling AWS Systems Manager Session Manager for audited access
4. **Regular Updates**: Keep the bastion host updated with security patches
5. **Termination Protection**: Enable for production environments to prevent accidental deletion

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Name of the project | string | - | yes |
| environment | Environment name (dev/staging/prod) | string | - | yes |
| instance_type | EC2 instance type | string | "t3.small" | no |
| key_name | SSH key pair name | string | - | yes |
| subnet_id | Public subnet ID | string | - | yes |
| security_group_id | Security group ID | string | - | yes |
| root_volume_type | Root volume type | string | "gp3" | no |
| root_volume_size | Root volume size in GB | number | 20 | no |
| root_volume_encrypted | Enable root volume encryption | bool | true | no |
| iam_instance_profile | IAM instance profile name | string | null | no |
| allocate_elastic_ip | Allocate Elastic IP | bool | true | no |
| enable_detailed_monitoring | Enable detailed CloudWatch monitoring | bool | false | no |
| enable_termination_protection | Enable termination protection | bool | false | no |
| tags | Additional tags | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| instance_id | The ID of the bastion EC2 instance |
| instance_arn | The ARN of the bastion EC2 instance |
| public_ip | The public IP address of the bastion host |
| private_ip | The private IP address of the bastion host |
| elastic_ip | The Elastic IP address (if allocated) |
| security_group_id | The ID of the security group |
| availability_zone | The availability zone of the bastion host |
| ssh_connection_string | SSH connection string for convenience |

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Notes

- The bastion host uses Ubuntu 22.04 LTS (Jammy Jellyfish)
- User data script runs on first boot to install required tools
- The AMI is automatically updated to the latest version on each apply
- Consider using AWS Systems Manager Session Manager as an alternative to SSH for enhanced security
