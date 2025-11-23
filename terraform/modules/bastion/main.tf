# Bastion Module - Main Configuration
# Creates a bastion host EC2 instance for secure access to private resources

# Data source to get the latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# User data script to install required tools
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e
    
    # Update package list
    apt-get update
    
    # Install AWS CLI v2
    apt-get install -y unzip curl
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip
    
    # Install kubectl
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    rm kubectl
    
    # Install MySQL client
    apt-get install -y mysql-client
    
    # Install additional useful tools
    apt-get install -y jq vim htop
    
    # Clean up
    apt-get clean
    
    echo "Bastion host setup complete" > /var/log/bastion-setup.log
  EOF
}

# Bastion EC2 Instance
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = var.key_name
  subnet_id     = var.subnet_id

  vpc_security_group_ids = [var.security_group_id]

  # Enable detailed monitoring
  monitoring = var.enable_detailed_monitoring

  # User data to install tools
  user_data = local.user_data

  # Root volume configuration
  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.root_volume_size
    encrypted             = var.root_volume_encrypted
    delete_on_termination = true

    tags = merge(
      var.tags,
      {
        Name = "${var.project_name}-${var.environment}-bastion-root-volume"
      }
    )
  }

  # IAM instance profile for AWS access
  iam_instance_profile = var.iam_instance_profile

  # Enable termination protection for production
  disable_api_termination = var.enable_termination_protection

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-bastion"
      Environment = var.environment
      Component   = "bastion"
      ManagedBy   = "Terraform"
    }
  )

  lifecycle {
    ignore_changes = [
      ami,
      user_data
    ]
  }
}

# Elastic IP for bastion (optional)
resource "aws_eip" "bastion" {
  count = var.allocate_elastic_ip ? 1 : 0

  instance = aws_instance.bastion.id
  domain   = "vpc"

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-bastion-eip"
      Environment = var.environment
      Component   = "bastion"
      ManagedBy   = "Terraform"
    }
  )

  depends_on = [aws_instance.bastion]
}
