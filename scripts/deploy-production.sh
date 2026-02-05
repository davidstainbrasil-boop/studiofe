#!/bin/bash

# Production Deployment Script
# Complete deployment of Avatar System to production environment

set -euo pipefail

# Configuration
ENVIRONMENT="production"
REGION=${AWS_REGION:-"us-east-1"}
PROJECT_NAME="avatar-system-prod"
DOMAIN=${DOMAIN:-"avatar-platform.com"}

echo "🚀 Deploying Avatar System to Production..."
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN"

# Phase 1: Infrastructure Deployment
echo "📡 Phase 1: Deploying Infrastructure..."

# Deploy VPC and networking
aws cloudformation deploy \
  --template-file infrastructure/vpc.yaml \
  --stack-name "$PROJECT_NAME-vpc" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

# Deploy storage and databases
aws cloudformation deploy \
  --template-file infrastructure/storage.yaml \
  --stack-name "$PROJECT_NAME-storage" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM

# Deploy compute resources
aws cloudformation deploy \
  --template-file infrastructure/compute.yaml \
  --stack-name "$PROJECT_NAME-compute" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
    InstanceType="c6g.2xlarge" \
    DesiredCapacity=3 \
    MaxCapacity=10 \
  --capabilities CAPABILITY_IAM

# Deploy UE5 render farm
aws cloudformation deploy \
  --template-file infrastructure/ue5-render-farm.yaml \
  --stack-name "$PROJECT_NAME-ue5-farm" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
    MinInstances=2 \
    MaxInstances=20 \
    InstanceType="g5.4xlarge" \
  --capabilities CAPABILITY_IAM

# Phase 2: Application Deployment
echo "🎮 Phase 2: Deploying Applications..."

# Build and deploy Next.js application
cd estudio_ia_videos
echo "Building Next.js application..."
npm ci --legacy-peer-deps
npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
npx vercel --prod --confirm

# Deploy worker services
echo "Deploying worker services..."
docker build -t avatar-render-worker:latest .
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker tag avatar-render-worker:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/avatar-render-worker:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/avatar-render-worker:latest

# Update ECS service
aws ecs update-service \
  --cluster "$PROJECT_NAME-cluster" \
  --service avatar-render-service \
  --force-new-deployment

cd ..

# Phase 3: AI Services Deployment
echo "🤖 Phase 3: Deploying AI Services..."

# Deploy neural enhancement service
aws cloudformation deploy \
  --template-file infrastructure/ai-services.yaml \
  --stack-name "$PROJECT_NAME-ai-services" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
    GpuInstanceType="p4d.24xlarge" \
  --capabilities CAPABILITY_IAM

# Deploy GAN models to SageMaker
python scripts/deploy-gan-models.py --environment $ENVIRONMENT --region $REGION

# Phase 4: Blockchain Setup
echo "⛓️ Phase 4: Deploying Blockchain Services..."

# Deploy smart contracts
echo "Deploying smart contracts..."
cd contracts

# Deploy to Polygon (production)
npx hardhat run scripts/deploy-polygon-mainnet.ts --network polygon

# Deploy to Ethereum (production)  
npx hardhat run scripts/deploy-ethereum-mainnet.ts --network ethereum

# Deploy to Arbitrum (production)
npx hardhat run scripts/deploy-arbitrum-mainnet.ts --network arbitrum

cd ..

# Phase 5: DNS and SSL Configuration
echo "🌐 Phase 5: Configuring DNS and SSL..."

# Configure Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones --query "HostedZones[?Name==\`$DOMAIN.\`].Id" --output text) \
  --change-batch file://infrastructure/dns-records.json

# Wait for DNS propagation
echo "Waiting for DNS propagation..."
sleep 60

# Request SSL certificates
aws acm request-certificate \
  --domain-name $DOMAIN \
  --subject-alternative-names "*.$DOMAIN" \
  --validation-method DNS

# Phase 6: Monitoring and Observability
echo "📊 Phase 6: Setting up Monitoring..."

# Deploy CloudWatch dashboards
aws cloudformation deploy \
  --template-file infrastructure/monitoring.yaml \
  --stack-name "$PROJECT_NAME-monitoring" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM

# Set up alerts
aws cloudformation deploy \
  --template-file infrastructure/alerts.yaml \
  --stack-name "$PROJECT_NAME-alerts" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
    AlertEmail="alerts@$DOMAIN" \
  --capabilities CAPABILITY_IAM

# Phase 7: Security Configuration
echo "🔐 Phase 7: Configuring Security..."

# Deploy WAF rules
aws wafv2 create-web-acl \
  --name "$PROJECT_NAME-waf" \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://infrastructure/waf-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName="$PROJECT_NAME-waf"

# Configure security groups
aws ec2 authorize-security-group-ingress \
  --group-id $(aws ec2 describe-security-groups --filters Name=group-name,Values="$PROJECT_NAME-app-sg" --query "SecurityGroups[0].GroupId" --output text) \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Phase 8: Performance Optimization
echo "⚡ Phase 8: Optimizing Performance..."

# Configure CloudFront distribution
aws cloudformation deploy \
  --template-file infrastructure/cloudfront.yaml \
  --stack-name "$PROJECT_NAME-cloudfront" \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    DomainName=$DOMAIN \
  --capabilities CAPABILITY_IAM

# Configure caching strategies
aws cloudfront update-cache-policy \
  --cache-policy-id $(aws cloudfront list-cache-policies --query "CachePolicyList.Items[?Comment=='$PROJECT_NAME-api-cache'].Id" --output text) \
  --cache-policy-config file://infrastructure/cache-policy.json

# Phase 9: Data Migration
echo "💾 Phase 9: Data Migration..."

# Run database migrations
cd estudio_ia_videos
DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id "$PROJECT_NAME-db-url" --query "SecretString" --output text) \
npx prisma migrate deploy

# Seed initial data
npx prisma db seed

cd ..

# Phase 10: Final Verification
echo "✅ Phase 10: Final Verification..."

# Health checks
echo "Performing health checks..."
curl -f "https://$DOMAIN/api/health" || exit 1

# Load testing
echo "Running load tests..."
cd tests
python3 load-test.py --target "https://$DOMAIN" --users 100 --duration 300
cd ..

# Security scan
echo "Running security scan..."
python3 security-scan.py --target "https://$DOMAIN"

# Performance audit
echo "Running performance audit..."
lighthouse "https://$DOMAIN" --chrome-flags="--headless" --output=json --output-path=./lighthouse-report.json

echo "🎉 Deployment Complete!"
echo "🌐 Production URL: https://$DOMAIN"
echo "📊 Monitoring: https://console.aws.amazon.com/cloudwatch/home"
echo "🔗 API Documentation: https://$DOMAIN/docs"
echo "⛓️ Blockchain Explorer: https://polygonscan.com/address/$(cat contracts/deployments/polygon-mainnet.json | jq -r '.AvatarNFT')"

# Generate deployment report
cat > deployment-report.json << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "region": "$REGION",
    "domain": "$DOMAIN",
    "version": "$(git rev-parse HEAD)"
  },
  "infrastructure": {
    "vpc": "https://console.aws.amazon.com/vpc/home?region=$REGION#vpcs:filter=$(aws cloudformation describe-stacks --stack-name "$PROJECT_NAME-vpc" --query "Stacks[0].Outputs[?OutputKey=='VpcId'].OutputValue" --output text)",
    "compute": "https://console.aws.amazon.com/ec2/home?region=$REGION#Instances:tag:Project=$PROJECT_NAME",
    "renderFarm": "https://console.aws.amazon.com/ec2/home?region=$REGION#Instances:tag:Component=UE5RenderFarm",
    "storage": "https://console.aws.amazon.com/s3/buckets/$PROJECT_NAME-storage-$ENVIRONMENT"
  },
  "services": {
    "application": "https://$DOMAIN",
    "api": "https://$DOMAIN/api",
    "marketplace": "https://$DOMAIN/marketplace",
    "documentation": "https://$DOMAIN/docs"
  },
  "blockchain": {
    "polygon": "$(cat contracts/deployments/polygon-mainnet.json)",
    "ethereum": "$(cat contracts/deployments/ethereum-mainnet.json)",
    "arbitrum": "$(cat contracts/deployments/arbitrum-mainnet.json)"
  },
  "monitoring": {
    "cloudwatch": "https://console.aws.amazon.com/cloudwatch/home?region=$REGION",
    "logs": "https://console.aws.amazon.com/cloudwatch/home?region=$REGION#logStream:group=$PROJECT_NAME-$ENVIRONMENT"
  }
}
EOF

echo "📄 Deployment report saved to deployment-report.json"