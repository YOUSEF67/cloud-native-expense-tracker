# Bastion Module Outputs

output "instance_id" {
  description = "The ID of the bastion EC2 instance"
  value       = aws_instance.bastion.id
}

output "instance_arn" {
  description = "The ARN of the bastion EC2 instance"
  value       = aws_instance.bastion.arn
}

output "public_ip" {
  description = "The public IP address of the bastion host"
  value       = var.allocate_elastic_ip ? aws_eip.bastion[0].public_ip : aws_instance.bastion.public_ip
}

output "private_ip" {
  description = "The private IP address of the bastion host"
  value       = aws_instance.bastion.private_ip
}

output "elastic_ip" {
  description = "The Elastic IP address (if allocated)"
  value       = var.allocate_elastic_ip ? aws_eip.bastion[0].public_ip : null
}

output "elastic_ip_allocation_id" {
  description = "The allocation ID of the Elastic IP (if allocated)"
  value       = var.allocate_elastic_ip ? aws_eip.bastion[0].id : null
}

output "security_group_id" {
  description = "The ID of the security group attached to the bastion host"
  value       = var.security_group_id
}

output "availability_zone" {
  description = "The availability zone where the bastion host is deployed"
  value       = aws_instance.bastion.availability_zone
}

output "subnet_id" {
  description = "The subnet ID where the bastion host is deployed"
  value       = aws_instance.bastion.subnet_id
}

output "ami_id" {
  description = "The AMI ID used for the bastion host"
  value       = aws_instance.bastion.ami
}

output "instance_type" {
  description = "The instance type of the bastion host"
  value       = aws_instance.bastion.instance_type
}

output "key_name" {
  description = "The SSH key pair name used for the bastion host"
  value       = aws_instance.bastion.key_name
}

output "instance_state" {
  description = "The state of the bastion instance"
  value       = aws_instance.bastion.instance_state
}

output "ssh_connection_string" {
  description = "SSH connection string for the bastion host"
  value       = "ssh -i /path/to/${aws_instance.bastion.key_name}.pem ubuntu@${var.allocate_elastic_ip ? aws_eip.bastion[0].public_ip : aws_instance.bastion.public_ip}"
}
