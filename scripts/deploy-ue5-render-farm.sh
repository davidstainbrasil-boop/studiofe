#!/bin/bash

# AWS UE5 Render Farm Deployment Script
# Production-ready Unreal Engine 5 rendering infrastructure

set -euo pipefail

# Configuration
REGION=${AWS_REGION:-"us-east-1"}
PROJECT_NAME="avatar-render-farm"
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Instance types optimized for UE5 rendering
RENDER_INSTANCE_TYPES=("g5.4xlarge" "g5.8xlarge" "g5.16xlarge" "g4dn.xlarge" "g4dn.2xlarge")
WORKER_INSTANCE_TYPE=${WORKER_INSTANCE_TYPE:-"g5.4xlarge"}

# Storage configuration
EFS_SIZE=${EFS_SIZE:-"100"}  # GB
EBS_SIZE=${EBS_SIZE:-"500"}  # GB for UE5 project storage

echo "🚀 Deploying UE5 Render Farm Infrastructure..."
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo "Worker Instance: $WORKER_INSTANCE_TYPE"

# Create VPC and networking
echo "📡 Creating VPC and networking..."
aws cloudformation deploy \
  --template-file infrastructure/vpc.yaml \
  --stack-name "$PROJECT_NAME-vpc" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM

# Create EFS for shared UE5 project files
echo "📁 Creating EFS for UE5 assets..."
aws cloudformation deploy \
  --template-file infrastructure/efs.yaml \
  --stack-name "$PROJECT_NAME-storage" \
  --parameter-overrides \
    VpcId=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-vpc" --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' --output text) \
    SubnetIds=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-vpc" --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnetIds`].OutputValue' --output text) \
    FileSystemSize=$EFS_SIZE \
  --capabilities CAPABILITY_IAM

# Create EC2 instances for UE5 rendering
echo "🎮 Creating UE5 render instances..."
aws cloudformation deploy \
  --template-file infrastructure/ue5-render-nodes.yaml \
  --stack-name "$PROJECT_NAME-render-nodes" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
    InstanceType=$WORKER_INSTANCE_TYPE \
    VpcId=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-vpc" --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' --output text) \
    SubnetIds=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-vpc" --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnetIds`].OutputValue' --output text) \
    EfsId=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-storage" --query 'Stacks[0].Outputs[?OutputKey==`FileSystemId`].OutputValue' --output text) \
  --capabilities CAPABILITY_IAM

# Create Application Load Balancer and Auto Scaling
echo "⚖️ Setting up load balancer and auto scaling..."
aws cloudformation deploy \
  --template-file infrastructure/load-balancer.yaml \
  --stack-name "$PROJECT_NAME-alb" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
    VpcId=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-vpc" --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' --output text) \
    SubnetIds=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-vpc" --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnetIds`].OutputValue' --output text) \
  --capabilities CAPABILITY_IAM

# Deploy CloudWatch monitoring
echo "📊 Setting up CloudWatch monitoring..."
aws cloudformation deploy \
  --template-file infrastructure/monitoring.yaml \
  --stack-name "$PROJECT_NAME-monitoring" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM

# Wait for stack creation
echo "⏳ Waiting for infrastructure to be ready..."
aws cloudformation wait stack-create-complete --stack-name "$PROJECT_NAME-render-nodes"
aws cloudformation wait stack-create-complete --stack-name "$PROJECT_NAME-alb"

# Get outputs
LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-alb" --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNSName`].OutputValue' --output text)
RENDER_NODE_IAM_ROLE=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-render-nodes" --query 'Stacks[0].Outputs[?OutputKey==`RenderNodeInstanceRole`].OutputValue' --output text)

echo "✅ UE5 Render Farm Infrastructure Ready!"
echo "Load Balancer DNS: $LOAD_BALANCER_DNS"
echo "Render Node IAM Role: $RENDER_NODE_IAM_ROLE"

# Store configuration for application deployment
cat > /tmp/render-farm-config.json << EOF
{
  "loadBalancerDns": "$LOAD_BALANCER_DNS",
  "renderNodeRole": "$RENDER_NODE_IAM_ROLE",
  "region": "$REGION",
  "environment": "$ENVIRONMENT"
}
EOF

echo "💾 Configuration saved to /tmp/render-farm-config.json"
echo "🎯 Next step: Deploy UE5 render nodes with MetaHuman integration"