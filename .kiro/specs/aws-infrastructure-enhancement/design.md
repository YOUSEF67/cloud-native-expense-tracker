# Design Document

## Overview

This design document outlines the architecture and implementation approach for enhancing the existing cloud-native expense tracking application. The enhancement transforms the project into a production-ready, multi-environment system with:

- **Modular Terraform Infrastructure**: Reusable modules for VPC, EKS, RDS, ElastiCache, and supporting services
- **Python Application**: Flask-based REST API with Redis caching and Prometheus metrics
- **GitHub Actions CI/CD**: Cloud-native pipeline with OIDC authentication
- **Observability Stack**: Prometheus, Grafana, and CloudWatch Logs integration
- **Multi-Environment Support**: Dev, staging, and production configurations
- **Security & Compliance**: Encryption, IAM least privilege, and audit logging
- **Cost Optimization**: Auto-scaling, spot instances, and budget monitoring

The design maintains API compatibility with the existing Node.js application while adding enterprise-grade features for scalability, reliability, and observability.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub Actions                              │
│  (CI/CD Pipeline with OIDC → AWS IAM Role)                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS Account                                  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    VPC (10.0.0.0/16)                        │    │
│  │                                                              │    │
│  │  ┌──────────────────┐  ┌──────────────────┐               │    │
│  │  │  Public Subnets  │  │ Private Subnets  │               │    │
│  │  │                  │  │                  │               │    │
│  │  │  ┌────────────┐  │  │  ┌────────────┐ │               │    │
│  │  │  │    ALB     │  │  │  │ EKS Nodes  │ │               │    │
│  │  │  │ (Ingress)  │  │  │  │            │ │               │    │
│  │  │  └─────┬──────┘  │  │  └─────┬──────┘ │               │    │
│  │  │        │         │  │        │        │               │    │
│  │  │  ┌──────────┐    │  │  ┌─────┴──────┐ │               │    │
│  │  │  │ Bastion  │    │  │  │   Python   │ │               │    │
│  │  │  │   Host   │    │  │  │    App     │ │               │    │
│  │  │  └──────────┘    │  │  │   Pods     │ │               │    │
│  │  │                  │  │  └────────────┘ │               │    │
│  │  └──────────────────┘  └──────────────────┘               │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │              DB Subnets (Private)                     │  │    │
│  │  │                                                        │  │    │
│  │  │  ┌──────────────┐      ┌──────────────┐             │  │    │
│  │  │  │     RDS      │      │ ElastiCache  │             │  │    │
│  │  │  │   (MySQL)    │      │   (Redis)    │             │  │    │
│  │  │  │   Multi-AZ   │      │   Multi-AZ   │             │  │    │
│  │  │  └──────────────┘      └──────────────┘             │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │         Monitoring Namespace (EKS)                    │  │    │
│  │  │                                                        │  │    │
│  │  │  ┌──────────────┐      ┌──────────────┐             │  │    │
│  │  │  │  Prometheus  │      │   Grafana    │             │  │    │
│  │  │  │              │──────▶              │             │  │    │
│  │  │  └──────────────┘      └──────────────┘             │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                  Supporting Services                        │    │
│  │                                                              │    │
│  │  • ECR (Container Registry)                                 │    │
│  │  • CloudWatch Logs (Centralized Logging)                    │    │
│  │  • S3 (Terraform State, Backups)                            │    │
│  │  • DynamoDB (Terraform State Locking)                       │    │
│  │  • KMS (Encryption Keys)                                    │    │
│  │  • Route53 (DNS)                                            │    │
│  │  • ACM (SSL Certificates)                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Network Architecture

**VPC Design:**
- CIDR: 10.0.0.0/16
- 3 Availability Zones for high availability
- Subnet allocation:
  - Public Subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24): ALB, NAT Gateway, Bastion
  - Private Subnets (10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24): EKS worker nodes
  - DB Subnets (10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24): RDS, ElastiCache

**Traffic Flow:**
1. External traffic → Route53 → ALB (public subnet)
2. ALB → Kubernetes Ingress → Application Pods (private subnet)
3. Application Pods → RDS/ElastiCache (DB subnet)
4. Application Pods → Internet (via NAT Gateway in public subnet)


### Security Architecture

**Defense in Depth:**

1. **Network Security:**
   - Security groups with least privilege rules
   - Private subnets for application and data layers
   - VPC Flow Logs for traffic analysis
   - Network ACLs for subnet-level filtering

2. **Identity & Access Management:**
   - IAM roles for EKS node groups (no long-lived credentials)
   - OIDC provider for GitHub Actions authentication
   - Service accounts with IRSA (IAM Roles for Service Accounts)
   - Least privilege policies for all roles

3. **Data Protection:**
   - Encryption at rest: RDS (KMS), ElastiCache, EBS volumes
   - Encryption in transit: TLS for ALB, RDS, Redis
   - Secrets management: Kubernetes Secrets, AWS Secrets Manager
   - Automated backups with encryption

4. **Audit & Compliance:**
   - CloudTrail for API audit logging
   - VPC Flow Logs for network monitoring
   - CloudWatch Logs for application logs
   - Prometheus metrics for security events

## Components and Interfaces

### 1. Terraform Infrastructure Modules

#### Module Structure
```
terraform/
├── bootstrap/                    # S3 + DynamoDB for state
│   ├── main.tf                   # S3 bucket with versioning, encryption, lifecycle
│   ├── variables.tf
│   └── outputs.tf
├── modules/
│   ├── vpc/                      # VPC, subnets, gateways
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── security-groups/          # All security groups
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/                      # EKS cluster + node groups
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── rds/                      # RDS MySQL instance
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── elasticache/              # Redis cluster
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── bastion/                  # Bastion host
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecr/                      # Container registry
│   │   ├── main.tf
│   │   └── outputs.tf
│   └── oidc/                     # GitHub Actions OIDC
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── prod/
│       ├── main.tf
│       ├── terraform.tfvars
│       └── backend.tf
└── README.md
```


#### VPC Module Interface

**Inputs:**
- `vpc_cidr`: VPC CIDR block (default: "10.0.0.0/16")
- `availability_zones`: List of AZs (default: 3)
- `environment`: Environment name (dev/staging/prod)
- `project_name`: Project identifier
- `enable_nat_gateway`: Boolean for NAT Gateway
- `enable_vpn_gateway`: Boolean for VPN Gateway

**Outputs:**
- `vpc_id`: VPC identifier
- `public_subnet_ids`: List of public subnet IDs
- `private_subnet_ids`: List of private subnet IDs
- `database_subnet_ids`: List of database subnet IDs
- `nat_gateway_ips`: NAT Gateway public IPs

#### EKS Module Interface

**Inputs:**
- `cluster_name`: EKS cluster name
- `cluster_version`: Kubernetes version (default: "1.28")
- `vpc_id`: VPC ID from VPC module
- `private_subnet_ids`: Subnets for worker nodes
- `node_instance_types`: List of instance types
- `node_desired_size`: Desired number of nodes
- `node_min_size`: Minimum nodes
- `node_max_size`: Maximum nodes
- `enable_spot_instances`: Boolean for spot instances
- `spot_instance_percentage`: Percentage of spot instances
- `endpoint_private_access`: Enable private API endpoint (default: true)
- `endpoint_public_access`: Enable public API endpoint (default: true for dev, false for prod)
- `public_access_cidrs`: Allowed CIDRs for public access (default: ["0.0.0.0/0"])
- `environment`: Environment name

**Outputs:**
- `cluster_id`: EKS cluster ID
- `cluster_endpoint`: API server endpoint
- `cluster_security_group_id`: Cluster security group
- `node_security_group_id`: Node security group
- `oidc_provider_arn`: OIDC provider ARN for IRSA

#### RDS Module Interface

**Inputs:**
- `identifier`: RDS instance identifier
- `engine_version`: MySQL version (default: "8.0")
- `instance_class`: Instance type (e.g., db.t3.micro)
- `allocated_storage`: Storage in GB
- `max_allocated_storage`: Max storage for autoscaling
- `database_name`: Initial database name
- `master_username`: Admin username
- `vpc_id`: VPC ID
- `subnet_ids`: Database subnet IDs
- `allowed_security_groups`: SGs allowed to connect
- `multi_az`: Boolean for multi-AZ deployment
- `backup_retention_period`: Days to retain backups
- `parameter_group_name`: Custom parameter group name
- `parameter_group_family`: Parameter group family (e.g., "mysql8.0")
- `parameters`: Map of custom parameters (e.g., max_connections, slow_query_log)
- `environment`: Environment name

**Outputs:**
- `endpoint`: RDS endpoint address
- `port`: Database port
- `database_name`: Database name
- `security_group_id`: RDS security group ID
- `parameter_group_id`: Parameter group ID

#### ElastiCache Module Interface

**Inputs:**
- `cluster_id`: Redis cluster identifier
- `engine_version`: Redis version (default: "7.0")
- `node_type`: Instance type (e.g., cache.t3.micro)
- `num_cache_nodes`: Number of nodes
- `parameter_group_family`: Redis parameter group
- `vpc_id`: VPC ID
- `subnet_ids`: Cache subnet IDs
- `allowed_security_groups`: SGs allowed to connect
- `automatic_failover_enabled`: Boolean for multi-AZ
- `transit_encryption_enabled`: Enable TLS encryption (default: true)
- `at_rest_encryption_enabled`: Enable encryption at rest (default: true)
- `auth_token`: Redis AUTH token for authentication (optional)
- `environment`: Environment name

**Outputs:**
- `endpoint`: Redis endpoint address
- `port`: Redis port (6379)
- `security_group_id`: Redis security group ID
- `auth_token`: Redis AUTH token (sensitive)


### 2. Python Application

#### Application Structure
```
app/
├── main.py                       # FastAPI application entry
├── config.py                     # Configuration management
├── models.py                     # Database models (SQLAlchemy)
├── database.py                   # Database connection
├── cache.py                      # Redis cache layer
├── metrics.py                    # Prometheus metrics
├── routers/
│   └── transactions.py           # Transaction endpoints
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Multi-stage build
└── tests/
    ├── test_transactions.py
    └── test_cache.py
```

#### Technology Stack
- **Framework**: FastAPI (async support, automatic OpenAPI docs)
- **Database ORM**: SQLAlchemy with PyMySQL driver
- **Caching**: redis-py with connection pooling
- **Metrics**: prometheus_client
- **Logging**: structlog for structured JSON logs
- **Testing**: pytest with pytest-asyncio

#### API Endpoints

**Health Check:**
```
GET /health
Response: {"status": "healthy", "timestamp": "2024-11-17T10:00:00Z"}
```

**Get All Transactions:**
```
GET /transaction
Response: {
  "result": [
    {"id": 1, "amount": 100, "description": "Groceries"},
    {"id": 2, "amount": 50, "description": "Gas"}
  ]
}
Cache: 300s TTL (prod), 60s (dev)
```

**Add Transaction:**
```
POST /transaction
Body: {"amount": 100, "description": "Groceries"}
Response: {"message": "added transaction successfully"}
Cache: Invalidate all transactions cache
```

**Delete All Transactions:**
```
DELETE /transaction
Response: {"message": "delete function execution finished."}
Cache: Invalidate all transactions cache
```

**Delete Transaction by ID:**
```
DELETE /transaction/id
Body: {"id": 1}
Response: {"message": "transaction with id 1 seemingly deleted"}
Cache: Invalidate all transactions cache
```

**Get Transaction by ID:**
```
GET /transaction/id
Body: {"id": 1}
Response: {"id": 1, "amount": 100, "desc": "Groceries"}
Cache: Individual transaction cache with 300s TTL
```

**Metrics Endpoint:**
```
GET /metrics
Response: Prometheus exposition format
Metrics:
  - http_requests_total (counter)
  - http_request_duration_seconds (histogram)
  - cache_hits_total (counter)
  - cache_misses_total (counter)
  - db_query_duration_seconds (histogram)
  - transactions_total (gauge)
  - transactions_amount_total (gauge)
```


#### Caching Strategy

**Cache Keys:**
- `transactions:all` - All transactions list
- `transaction:{id}` - Individual transaction

**Cache Invalidation:**
- POST /transaction → Invalidate `transactions:all`
- DELETE /transaction → Invalidate `transactions:all`
- DELETE /transaction/id → Invalidate `transactions:all` and `transaction:{id}`

**Cache Fallback:**
```python
def get_all_transactions():
    try:
        # Try cache first
        cached = redis_client.get("transactions:all")
        if cached:
            metrics.cache_hits.inc()
            return json.loads(cached)
    except RedisError as e:
        logger.warning("Redis unavailable", error=str(e))
    
    # Cache miss or Redis down - query database
    metrics.cache_misses.inc()
    transactions = db.query(Transaction).all()
    
    # Try to cache result
    try:
        redis_client.setex(
            "transactions:all",
            ttl_seconds,
            json.dumps(transactions)
        )
    except RedisError:
        pass  # Continue without caching
    
    return transactions
```

### 3. GitHub Actions CI/CD Pipeline

#### Workflow Structure
```
.github/
└── workflows/
    ├── ci.yml                    # PR validation
    ├── cd-dev.yml                # Deploy to dev
    ├── cd-staging.yml            # Deploy to staging
    └── cd-prod.yml               # Deploy to prod (manual)
```

#### CI Workflow (Pull Requests)

**Triggers:** Pull request to main branch

**Jobs:**
1. **Lint & Format**
   - Run black, flake8, mypy
   - Check code formatting

2. **Unit Tests**
   - Run pytest with coverage
   - Minimum 80% coverage required

3. **Build Docker Image**
   - Build multi-stage Dockerfile
   - No push (validation only)

4. **Security Scan**
   - Trivy container scan
   - Dependency vulnerability check

#### CD Workflow (Deployments)

**Triggers:**
- Push to main → Deploy to dev (automatic)
- Tag v*-staging → Deploy to staging (automatic)
- Tag v*-prod → Deploy to prod (manual approval)

**Jobs:**
1. **Authenticate with AWS**
   ```yaml
   - name: Configure AWS credentials
     uses: aws-actions/configure-aws-credentials@v4
     with:
       role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsRole
       aws-region: ${{ secrets.AWS_REGION }}
   ```

2. **Build & Push Image**
   - Build Docker image with commit SHA tag
   - Push to Amazon ECR
   - Tag as latest for environment

3. **Update Kubernetes**
   - Update kubeconfig for EKS
   - Helm upgrade with new image tag
   - Wait for rollout completion

4. **Smoke Tests**
   - Health check endpoint
   - Basic API functionality test

5. **Notify**
   - Slack notification with deployment status


### 4. Kubernetes Deployment

#### Helm Chart Structure
```
helm/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-staging.yaml
├── values-prod.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── hpa.yaml
    ├── servicemonitor.yaml
    └── NOTES.txt
```

#### Deployment Configuration

**Deployment Spec:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: expense-backend
  namespace: expense
spec:
  replicas: 2  # Overridden by HPA
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: expense-backend
  template:
    metadata:
      labels:
        app: expense-backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: backend
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: expense-config
              key: db_host
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: expense-secrets
              key: db_user
        - name: DB_PWD
          valueFrom:
            secretKeyRef:
              name: expense-secrets
              key: db_password
        - name: DB_DATABASE
          value: transactions
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: expense-config
              key: redis_host
        - name: REDIS_PORT
          value: "6379"
        - name: CACHE_TTL
          valueFrom:
            configMapKeyRef:
              name: expense-config
              key: cache_ttl
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

**HPA Configuration:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: expense-backend-hpa
  namespace: expense
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: expense-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```


**Ingress Configuration:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: expense-backend-ingress
  namespace: expense
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: {{ .Values.ingress.certificateArn }}
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /health
spec:
  rules:
  - host: {{ .Values.ingress.host }}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: expense-backend
            port:
              number: 8080
```

### 5. Monitoring Stack

#### Prometheus Configuration

**Deployment Method:** Helm chart (kube-prometheus-stack)

**Key Components:**
- Prometheus Operator
- Prometheus Server
- Alertmanager
- Node Exporter (DaemonSet)
- Kube State Metrics

**ServiceMonitor for Application:**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: expense-backend-metrics
  namespace: expense
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: expense-backend
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

**Custom Recording Rules:**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: expense-backend-rules
  namespace: expense
spec:
  groups:
  - name: expense_backend
    interval: 30s
    rules:
    - record: expense:cache_hit_ratio
      expr: |
        sum(rate(cache_hits_total[5m])) /
        (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
    
    - record: expense:api_request_duration_p95
      expr: |
        histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
        )
```

**Alert Rules:**
```yaml
- name: expense_backend_alerts
  rules:
  - alert: HighResponseTime
    expr: expense:api_request_duration_p95 > 0.2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High API response time"
      description: "P95 response time is {{ $value }}s"
  
  - alert: LowCacheHitRatio
    expr: expense:cache_hit_ratio < 0.5
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Low cache hit ratio"
      description: "Cache hit ratio is {{ $value }}"
  
  - alert: PodCrashLooping
    expr: rate(kube_pod_container_status_restarts_total{namespace="expense"}[15m]) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Pod is crash looping"
```


#### Grafana Configuration

**Deployment Method:** Included in kube-prometheus-stack

**Data Sources:**
- Prometheus (automatic)
- CloudWatch (for AWS metrics)

**Dashboard Categories:**

1. **Cluster Overview Dashboard**
   - Node CPU/Memory utilization
   - Pod count and status
   - Network I/O
   - Persistent volume usage

2. **Application Dashboard**
   - Request rate (requests/sec)
   - Response time percentiles (p50, p95, p99)
   - Error rate
   - Cache hit/miss ratio
   - Database query duration
   - Active connections

3. **Business Metrics Dashboard**
   - Total transactions count
   - Transaction amount trends
   - Transactions per hour/day
   - API endpoint usage breakdown

4. **Infrastructure Dashboard**
   - RDS metrics (connections, CPU, storage)
   - ElastiCache metrics (CPU, memory, evictions)
   - ALB metrics (request count, target response time)
   - EKS node metrics

5. **Cost Dashboard**
   - AWS cost by service (CloudWatch metrics)
   - Cost trends over time
   - Budget vs actual spending

### 6. Logging Stack

#### Fluent Bit Configuration

**Deployment:** DaemonSet on all nodes

**Configuration:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name                cloudwatch_logs
        Match               kube.*
        region              us-east-1
        log_group_name      /aws/eks/expense-cluster
        log_stream_prefix   ${ENVIRONMENT}-
        auto_create_group   true
```

**Log Retention by Environment:**
- Dev: 7 days
- Staging: 30 days
- Production: 90 days

## Data Models

### Database Schema

**Transaction Table:**
```sql
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**SQLAlchemy Model:**
```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Integer, nullable=False)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "description": self.description
        }
```


### Configuration Management

**Environment Variables (ConfigMap):**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: expense-config
  namespace: expense
data:
  db_host: "expense-db.xxxxx.us-east-1.rds.amazonaws.com"
  redis_host: "expense-redis.xxxxx.cache.amazonaws.com"
  cache_ttl: "300"  # 300s for prod, 60s for dev
  log_level: "INFO"
  environment: "production"
```

**Secrets (Kubernetes Secret):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: expense-secrets
  namespace: expense
type: Opaque
stringData:
  db_user: "expense"
  db_password: "ExpenseApp@1"  # Should use AWS Secrets Manager in production
```

## Error Handling

### Application Error Handling

**Database Connection Errors:**
```python
from sqlalchemy.exc import OperationalError
import time

def get_db_connection(max_retries=3):
    for attempt in range(max_retries):
        try:
            engine.connect()
            return engine
        except OperationalError as e:
            logger.error("Database connection failed", 
                        attempt=attempt, error=str(e))
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
```

**Redis Connection Errors:**
```python
from redis.exceptions import RedisError

def cache_get(key):
    try:
        return redis_client.get(key)
    except RedisError as e:
        logger.warning("Redis unavailable, falling back to database",
                      error=str(e))
        metrics.redis_errors.inc()
        return None  # Fallback to database
```

**API Error Responses:**
```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception",
                exc_type=type(exc).__name__,
                exc_message=str(exc),
                path=request.url.path)
    
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "error": str(exc) if app.debug else "An error occurred"
        }
    )
```

### Infrastructure Error Handling

**Terraform State Locking:**
- DynamoDB table prevents concurrent modifications
- Lock timeout: 10 minutes
- Automatic lock release on completion

**EKS Pod Failures:**
- Liveness probe restarts unhealthy pods
- Readiness probe removes pods from service
- PodDisruptionBudget ensures minimum availability

**RDS Failover:**
- Multi-AZ automatic failover (1-2 minutes)
- Application retry logic handles temporary unavailability
- Connection pool maintains healthy connections

**ElastiCache Failover:**
- Automatic failover to replica (30-60 seconds)
- Application gracefully degrades to database-only mode


## Testing Strategy

### Unit Tests

**Coverage Target:** 80% minimum

**Test Categories:**

1. **API Endpoint Tests:**
```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()

def test_get_transactions():
    response = client.get("/transaction")
    assert response.status_code == 200
    assert "result" in response.json()

def test_add_transaction():
    response = client.post("/transaction", 
                          json={"amount": 100, "description": "Test"})
    assert response.status_code == 200
    assert "message" in response.json()
```

2. **Cache Layer Tests:**
```python
from unittest.mock import Mock, patch
import cache

def test_cache_hit():
    with patch('cache.redis_client') as mock_redis:
        mock_redis.get.return_value = '{"data": "cached"}'
        result = cache.get_cached_data("key")
        assert result == {"data": "cached"}
        mock_redis.get.assert_called_once()

def test_cache_miss_fallback():
    with patch('cache.redis_client') as mock_redis:
        mock_redis.get.side_effect = RedisError("Connection failed")
        result = cache.get_cached_data("key")
        assert result is None  # Graceful degradation
```

3. **Database Tests:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Transaction, Base

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_create_transaction(test_db):
    transaction = Transaction(amount=100, description="Test")
    test_db.add(transaction)
    test_db.commit()
    
    result = test_db.query(Transaction).first()
    assert result.amount == 100
    assert result.description == "Test"
```

### Integration Tests

**Test Environment:** Staging environment

**Test Scenarios:**

1. **End-to-End API Flow:**
```python
def test_transaction_lifecycle():
    # Create transaction
    response = client.post("/transaction",
                          json={"amount": 100, "description": "E2E Test"})
    assert response.status_code == 200
    
    # Verify it appears in list
    response = client.get("/transaction")
    transactions = response.json()["result"]
    assert any(t["description"] == "E2E Test" for t in transactions)
    
    # Delete all transactions
    response = client.delete("/transaction")
    assert response.status_code == 200
    
    # Verify empty list
    response = client.get("/transaction")
    assert len(response.json()["result"]) == 0
```

2. **Cache Behavior Tests:**
```python
def test_cache_invalidation():
    # First request - cache miss
    response1 = client.get("/transaction")
    
    # Second request - cache hit (should be faster)
    response2 = client.get("/transaction")
    
    # Add new transaction - invalidates cache
    client.post("/transaction", json={"amount": 50, "description": "New"})
    
    # Next request - cache miss again
    response3 = client.get("/transaction")
    assert len(response3.json()["result"]) > len(response1.json()["result"])
```

### Load Tests

**Tool:** Locust or k6

**Test Scenarios:**

1. **Baseline Load:**
   - 100 concurrent users
   - 10 requests/second per user
   - Duration: 10 minutes
   - Target: p95 < 200ms

2. **Spike Test:**
   - Ramp from 10 to 500 users in 1 minute
   - Hold for 5 minutes
   - Verify auto-scaling triggers

3. **Endurance Test:**
   - 200 concurrent users
   - Duration: 2 hours
   - Monitor for memory leaks

**Example k6 Script:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
  },
};

export default function () {
  let response = http.get('https://api.example.com/transaction');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```


### Security Testing

**Container Scanning:**
- Trivy scan in CI pipeline
- Fail build on HIGH/CRITICAL vulnerabilities

**Dependency Scanning:**
- Safety check for Python dependencies
- GitHub Dependabot alerts

**Infrastructure Scanning:**
- Checkov for Terraform security
- tfsec for additional checks

## Deployment Strategy

### Initial Deployment Sequence

**Phase 1: Bootstrap (One-time)**
```bash
# 1. Create S3 bucket and DynamoDB table for Terraform state
cd terraform/bootstrap
terraform init
terraform apply

# 2. Configure backend for all modules
# Update backend.tf in each environment
```

**Phase 2: Core Infrastructure**
```bash
# 3. Deploy VPC and networking
cd terraform/environments/dev
terraform init
terraform apply -target=module.vpc

# 4. Deploy security groups
terraform apply -target=module.security_groups

# 5. Deploy bastion host
terraform apply -target=module.bastion
```

**Phase 3: Data Layer**
```bash
# 6. Deploy RDS
terraform apply -target=module.rds

# 7. Deploy ElastiCache
terraform apply -target=module.elasticache

# 8. Initialize database schema
ssh -i key.pem ubuntu@<bastion-ip>
mysql -h <rds-endpoint> -u root -p < schema.sql
```

**Phase 4: Compute Layer**
```bash
# 9. Deploy EKS cluster
terraform apply -target=module.eks

# 10. Configure kubectl
aws eks update-kubeconfig --name expense-cluster-dev --region us-east-1

# 11. Deploy ALB Ingress Controller
kubectl apply -f alb-ingress-controller.yaml
```

**Phase 5: Application & Monitoring**
```bash
# 12. Deploy monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

# 13. Deploy application
helm upgrade --install expense-backend ./helm \
  -n expense --create-namespace \
  -f helm/values-dev.yaml

# 14. Deploy logging
kubectl apply -f fluent-bit/
```

**Phase 6: CI/CD Setup**
```bash
# 15. Configure GitHub OIDC
terraform apply -target=module.oidc

# 16. Add GitHub Secrets
# AWS_ACCOUNT_ID
# AWS_REGION
# EKS_CLUSTER_NAME

# 17. Test CI/CD pipeline
git push origin main
```

### Rolling Updates

**Application Updates:**
```bash
# Update image tag in values.yaml
helm upgrade expense-backend ./helm \
  -n expense \
  -f helm/values-prod.yaml \
  --set image.tag=v1.2.3 \
  --wait \
  --timeout 5m
```

**Rollback Strategy:**
```bash
# Automatic rollback on failed health checks
# Manual rollback if needed
helm rollback expense-backend -n expense
```

### Blue-Green Deployment (Optional)

For zero-downtime production deployments:

1. Deploy new version with different label (green)
2. Run smoke tests against green deployment
3. Update service selector to point to green
4. Monitor for issues
5. Delete blue deployment after validation


## Environment-Specific Configurations

### Development Environment

**Purpose:** Rapid development and testing

**Configuration:**
```hcl
# terraform/environments/dev/terraform.tfvars
environment = "dev"
project_name = "expense"
aws_region = "us-east-1"

# VPC
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# EKS
eks_cluster_version = "1.28"
eks_node_instance_types = ["t3.medium"]
eks_node_desired_size = 2
eks_node_min_size = 1
eks_node_max_size = 4
eks_enable_spot_instances = true
eks_spot_percentage = 80

# RDS
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20
rds_multi_az = false
rds_backup_retention = 1

# ElastiCache
redis_node_type = "cache.t3.micro"
redis_num_nodes = 1
redis_automatic_failover = false

# Bastion
bastion_instance_type = "t3.small"

# Application
cache_ttl_seconds = 60
log_retention_days = 7
```

**Cost Estimate:** ~$150-200/month

### Staging Environment

**Purpose:** Pre-production testing and validation

**Configuration:**
```hcl
# terraform/environments/staging/terraform.tfvars
environment = "staging"
project_name = "expense"
aws_region = "us-east-1"

# VPC
vpc_cidr = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# EKS
eks_cluster_version = "1.28"
eks_node_instance_types = ["t3.medium", "t3.large"]
eks_node_desired_size = 3
eks_node_min_size = 2
eks_node_max_size = 6
eks_enable_spot_instances = true
eks_spot_percentage = 50

# RDS
rds_instance_class = "db.t3.small"
rds_allocated_storage = 50
rds_multi_az = true
rds_backup_retention = 7

# ElastiCache
redis_node_type = "cache.t3.small"
redis_num_nodes = 2
redis_automatic_failover = true

# Bastion
bastion_instance_type = "t3.small"

# Application
cache_ttl_seconds = 180
log_retention_days = 30
```

**Cost Estimate:** ~$300-400/month

### Production Environment

**Purpose:** Live production workloads

**Configuration:**
```hcl
# terraform/environments/prod/terraform.tfvars
environment = "prod"
project_name = "expense"
aws_region = "us-east-1"

# VPC
vpc_cidr = "10.2.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# EKS
eks_cluster_version = "1.28"
eks_node_instance_types = ["t3.large", "t3.xlarge"]
eks_node_desired_size = 4
eks_node_min_size = 3
eks_node_max_size = 10
eks_enable_spot_instances = false
eks_spot_percentage = 0

# RDS
rds_instance_class = "db.t3.small"
rds_allocated_storage = 100
rds_max_allocated_storage = 500
rds_multi_az = true
rds_backup_retention = 30

# ElastiCache
redis_node_type = "cache.t3.medium"
redis_num_nodes = 3
redis_automatic_failover = true

# Bastion
bastion_instance_type = "t3.medium"

# Application
cache_ttl_seconds = 300
log_retention_days = 90

# Budget
monthly_budget_usd = 500
budget_alert_emails = ["devops@example.com"]
```

**Cost Estimate:** ~$500-700/month

## Performance Optimization

### Application Level

**Database Connection Pooling:**
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    database_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600    # Recycle connections after 1 hour
)
```

**Redis Connection Pooling:**
```python
import redis

redis_pool = redis.ConnectionPool(
    host=redis_host,
    port=6379,
    max_connections=50,
    decode_responses=True
)
redis_client = redis.Redis(connection_pool=redis_pool)
```

**Async Request Handling:**
```python
from fastapi import FastAPI
import asyncio

app = FastAPI()

@app.get("/transaction")
async def get_transactions():
    # Non-blocking I/O operations
    cached = await async_redis_get("transactions:all")
    if cached:
        return cached
    
    transactions = await async_db_query()
    await async_redis_set("transactions:all", transactions)
    return transactions
```

### Infrastructure Level

**EKS Node Optimization:**
- Use compute-optimized instances for CPU-intensive workloads
- Enable cluster autoscaler for dynamic scaling
- Use topology spread constraints for even distribution

**RDS Optimization:**
- Enable Performance Insights
- Use read replicas for read-heavy workloads
- Optimize queries with proper indexing

**ElastiCache Optimization:**
- Use cluster mode for horizontal scaling
- Enable automatic failover
- Monitor eviction rates

**ALB Optimization:**
- Enable connection draining
- Configure appropriate idle timeout
- Use target group health checks


## Security Considerations

### Network Security

**Security Group Rules:**

1. **ALB Security Group:**
   - Inbound: 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0
   - Outbound: 8080 to EKS node security group

2. **EKS Node Security Group:**
   - Inbound: 8080 from ALB security group
   - Inbound: 443 from EKS control plane
   - Inbound: All traffic from same security group (node-to-node)
   - Outbound: 3306 to RDS security group
   - Outbound: 6379 to ElastiCache security group
   - Outbound: 443 to 0.0.0.0/0 (for ECR, S3, etc.)

3. **RDS Security Group:**
   - Inbound: 3306 from EKS node security group
   - Inbound: 3306 from bastion security group
   - Outbound: None required

4. **ElastiCache Security Group:**
   - Inbound: 6379 from EKS node security group
   - Outbound: None required

5. **Bastion Security Group:**
   - Inbound: 22 from specific IP ranges (office, VPN)
   - Outbound: 22, 3306, 443 to VPC CIDR

### IAM Security

**EKS Node Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/eks/*"
    }
  ]
}
```

**GitHub Actions Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:*:*:repository/expense-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "arn:aws:eks:*:*:cluster/expense-*"
    }
  ]
}
```

**Trust Policy for GitHub OIDC:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
```

### Data Encryption

**At Rest:**
- RDS: AWS KMS encryption with customer-managed key
- ElastiCache: Encryption enabled with AWS-managed key
- EBS: Default encryption enabled
- S3: Server-side encryption (SSE-S3 or SSE-KMS)

**In Transit:**
- ALB: TLS 1.2+ with ACM certificate
- RDS: SSL/TLS connections enforced
- ElastiCache: TLS encryption enabled
- Internal: Service mesh (optional) for pod-to-pod encryption

### Secrets Management

**Approach 1: Kubernetes Secrets (Basic):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: expense-secrets
type: Opaque
stringData:
  db_password: "ExpenseApp@1"
```

**Approach 2: AWS Secrets Manager (Recommended):**
```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
db_credentials = get_secret('expense/db/credentials')
db_password = db_credentials['password']
```

**Approach 3: External Secrets Operator (Advanced):**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: expense-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: expense-secrets
  data:
  - secretKey: db_password
    remoteRef:
      key: expense/db/credentials
      property: password
```

## Disaster Recovery

### Backup Strategy

**RDS Backups:**
- Automated daily backups
- Retention: 7 days (dev), 30 days (prod)
- Manual snapshots before major changes
- Cross-region backup replication (prod only)

**Application State:**
- Stateless application design
- No local storage dependencies
- Configuration in Git (GitOps)

**Infrastructure as Code:**
- Terraform state in S3 with versioning
- Git repository as source of truth
- Ability to recreate entire infrastructure

### Recovery Procedures

**RDS Failure:**
1. Multi-AZ automatic failover (1-2 minutes)
2. If complete failure, restore from snapshot
3. Update DNS/endpoint if needed
4. Verify application connectivity

**EKS Cluster Failure:**
1. Deploy new cluster using Terraform
2. Restore application using Helm charts
3. Update DNS to point to new ALB
4. Restore data from RDS (still available)

**Complete Region Failure:**
1. Deploy infrastructure in alternate region
2. Restore RDS from cross-region snapshot
3. Deploy application
4. Update Route53 to failover region

**Recovery Time Objectives (RTO):**
- Application pod failure: < 1 minute (automatic)
- RDS failover: < 2 minutes (automatic)
- EKS cluster rebuild: < 30 minutes (manual)
- Complete region failover: < 2 hours (manual)

**Recovery Point Objectives (RPO):**
- RDS: < 5 minutes (point-in-time recovery)
- Application: 0 (stateless)

## Migration Path

### From Existing Node.js Application

**Phase 1: Parallel Deployment**
1. Deploy Python application alongside Node.js
2. Use different namespace or cluster
3. Test thoroughly in isolation

**Phase 2: Traffic Splitting**
1. Configure ALB to split traffic (90% Node.js, 10% Python)
2. Monitor metrics and errors
3. Gradually increase Python traffic

**Phase 3: Full Cutover**
1. Route 100% traffic to Python application
2. Monitor for 24-48 hours
3. Decommission Node.js application

**Phase 4: Cleanup**
1. Remove old Node.js deployments
2. Update documentation
3. Archive old code

### Rollback Plan

If issues are discovered:
1. Revert ALB traffic routing to Node.js
2. Investigate and fix Python application
3. Retry migration when ready

## Monitoring and Alerting

### Key Metrics to Monitor

**Application Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Cache hit ratio
- Database query duration
- Active connections

**Infrastructure Metrics:**
- CPU utilization (nodes, pods)
- Memory utilization
- Network I/O
- Disk I/O
- Pod restart count

**Business Metrics:**
- Total transactions
- Transaction amount trends
- API endpoint usage
- User activity patterns

### Alert Configuration

**Critical Alerts (PagerDuty):**
- Application down (all pods unhealthy)
- Database connection failures
- High error rate (> 5% for 5 minutes)
- RDS storage > 90%

**Warning Alerts (Slack):**
- High response time (p95 > 200ms for 5 minutes)
- Low cache hit ratio (< 50% for 10 minutes)
- Pod restarts (> 3 in 15 minutes)
- High CPU/memory (> 80% for 10 minutes)

**Info Alerts (Email):**
- Deployment completed
- Scaling events
- Budget threshold reached
- Certificate expiration (30 days)

## Documentation Deliverables

### Technical Documentation

1. **README.md** - Project overview and quick start
2. **ARCHITECTURE.md** - Detailed architecture diagrams
3. **DEPLOYMENT.md** - Step-by-step deployment guide
4. **OPERATIONS.md** - Day-2 operations runbook
5. **TROUBLESHOOTING.md** - Common issues and solutions
6. **API.md** - API endpoint documentation
7. **COST.md** - Cost breakdown and optimization tips

### Runbooks

1. **Deployment Runbook** - Standard deployment procedure
2. **Rollback Runbook** - Emergency rollback steps
3. **Scaling Runbook** - Manual scaling procedures
4. **Incident Response** - On-call procedures
5. **Backup and Restore** - Data recovery procedures

### Diagrams

1. **Network Architecture** - VPC, subnets, routing
2. **Application Flow** - Request path through system
3. **CI/CD Pipeline** - Build and deployment flow
4. **Monitoring Architecture** - Metrics and logging flow
5. **Security Architecture** - Security controls and boundaries

This comprehensive design provides a production-ready, scalable, and maintainable cloud-native application infrastructure with enterprise-grade features for observability, security, and operational excellence.


## Design Improvements and Best Practices

### Terraform Infrastructure Enhancements

#### 1. S3 Backend Security and Lifecycle

**Bootstrap Module Enhancements:**
```hcl
# terraform/bootstrap/main.tf
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state-${var.aws_account_id}"
  
  tags = {
    Name        = "Terraform State Bucket"
    Environment = "shared"
    ManagedBy   = "Terraform"
  }
}

# Enable versioning for state file history
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption with KMS
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
  
  tags = {
    Name = "terraform-state-key"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
  }
}

# Lifecycle policy to transition old versions to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  rule {
    id     = "archive-old-versions"
    status = "Enabled"
    
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
    
    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

#### 2. EKS Private Endpoint Configuration

**Production Security Enhancement:**
```hcl
# terraform/modules/eks/main.tf
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.cluster_version
  
  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = var.endpoint_private_access
    endpoint_public_access  = var.endpoint_public_access
    public_access_cidrs     = var.public_access_cidrs
    security_group_ids      = [aws_security_group.cluster.id]
  }
  
  # For production: endpoint_public_access = false
  # Access only via bastion or VPN
}

# Environment-specific configuration
# Dev: Public access enabled for CI/CD
# Prod: Private only, bastion/VPN required
```

#### 3. RDS Custom Parameter Groups

**MySQL Optimization:**
```hcl
# terraform/modules/rds/main.tf
resource "aws_db_parameter_group" "mysql" {
  name   = "${var.identifier}-params"
  family = var.parameter_group_family
  
  # Connection settings
  parameter {
    name  = "max_connections"
    value = var.environment == "prod" ? "200" : "100"
  }
  
  # Query logging for debugging
  parameter {
    name  = "slow_query_log"
    value = "1"
  }
  
  parameter {
    name  = "long_query_time"
    value = "2"
  }
  
  # Character set
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }
  
  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }
  
  # InnoDB settings
  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"  # 75% of instance memory
  }
  
  tags = {
    Name        = "${var.identifier}-parameter-group"
    Environment = var.environment
  }
}

resource "aws_db_instance" "main" {
  identifier             = var.identifier
  engine                 = "mysql"
  engine_version         = var.engine_version
  instance_class         = var.instance_class
  parameter_group_name   = aws_db_parameter_group.mysql.name
  # ... other configuration
}
```

#### 4. Redis TLS Encryption

**Security Enhancement:**
```hcl
# terraform/modules/elasticache/main.tf
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = var.cluster_id
  replication_group_description = "Redis cluster for ${var.environment}"
  engine                     = "redis"
  engine_version             = var.engine_version
  node_type                  = var.node_type
  number_cache_clusters      = var.num_cache_nodes
  port                       = 6379
  
  # Enable encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = var.environment == "prod" ? true : false
  auth_token                 = var.auth_token
  
  # Multi-AZ for production
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.automatic_failover_enabled
  
  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
  
  tags = {
    Name        = var.cluster_id
    Environment = var.environment
  }
}
```

#### 5. NAT Gateway Cost Optimization

**Flexible NAT Configuration:**
```hcl
# terraform/modules/vpc/main.tf
locals {
  # Calculate number of NAT gateways based on environment
  nat_gateway_count = var.single_nat_gateway ? 1 : (
    var.one_nat_gateway_per_az ? length(var.availability_zones) : 1
  )
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? local.nat_gateway_count : 0
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = {
    Name        = "${var.project_name}-nat-${count.index + 1}"
    Environment = var.environment
  }
}

# Dev: 1 NAT Gateway (~$32/month)
# Prod: 3 NAT Gateways (~$96/month) for HA
```

### Python Application Enhancements

#### 1. Pydantic V2 Models for Validation

**Type-Safe Request/Response Models:**
```python
# app/schemas.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class TransactionBase(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount (must be positive)")
    description: str = Field(..., min_length=1, max_length=255, description="Transaction description")

class TransactionCreate(TransactionBase):
    """Schema for creating a transaction"""
    pass

class TransactionResponse(TransactionBase):
    """Schema for transaction response"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class TransactionList(BaseModel):
    """Schema for list of transactions"""
    result: list[TransactionResponse]

class HealthResponse(BaseModel):
    """Schema for health check"""
    status: str
    timestamp: datetime
    database: str = "connected"
    redis: str = "connected"

# Usage in endpoints
@app.post("/transaction", response_model=dict)
async def create_transaction(transaction: TransactionCreate):
    # Automatic validation
    result = await add_transaction(transaction.amount, transaction.description)
    return {"message": "added transaction successfully"}

@app.get("/transaction", response_model=TransactionList)
async def get_transactions():
    transactions = await get_all_transactions()
    return TransactionList(result=transactions)
```

#### 2. Request Logging Middleware

**Production-Grade Logging:**
```python
# app/middleware.py
import time
import uuid
from fastapi import Request
import structlog

logger = structlog.get_logger()

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    # Generate correlation ID
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    
    # Bind correlation ID to logger context
    structlog.contextvars.bind_contextvars(
        correlation_id=correlation_id,
        path=request.url.path,
        method=request.method,
    )
    
    start_time = time.time()
    
    # Log request
    logger.info("request_started",
                client_ip=request.client.host,
                user_agent=request.headers.get("user-agent"))
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    logger.info("request_completed",
                status_code=response.status_code,
                duration_ms=round(duration * 1000, 2))
    
    # Add correlation ID to response headers
    response.headers["X-Correlation-ID"] = correlation_id
    
    return response
```

#### 3. Alembic Database Migrations

**Schema Version Control:**
```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.models import Base

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

# Generate migration
# alembic revision --autogenerate -m "Add created_at and updated_at"

# Apply migration
# alembic upgrade head
```

**Migration Example:**
```python
# alembic/versions/001_add_timestamps.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('transactions',
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.add_column('transactions',
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), 
                  onupdate=sa.func.now(), nullable=False))
    op.create_index('idx_created_at', 'transactions', ['created_at'])

def downgrade():
    op.drop_index('idx_created_at', 'transactions')
    op.drop_column('transactions', 'updated_at')
    op.drop_column('transactions', 'created_at')
```

#### 4. Async Database and Redis

**High-Performance Async I/O:**
```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Async engine
engine = create_async_engine(
    f"mysql+aiomysql://{DB_USER}:{DB_PWD}@{DB_HOST}/{DB_DATABASE}",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# app/cache.py
import aioredis
from typing import Optional

redis_client: Optional[aioredis.Redis] = None

async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = await aioredis.from_url(
            f"redis://{REDIS_HOST}:{REDIS_PORT}",
            encoding="utf-8",
            decode_responses=True,
            max_connections=50
        )
    return redis_client

# app/routers/transactions.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/transaction")
async def get_transactions(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    # Try cache first
    cached = await redis.get("transactions:all")
    if cached:
        return {"result": json.loads(cached)}
    
    # Query database asynchronously
    result = await db.execute(select(Transaction))
    transactions = result.scalars().all()
    
    # Cache result
    await redis.setex(
        "transactions:all",
        CACHE_TTL,
        json.dumps([t.to_dict() for t in transactions])
    )
    
    return {"result": [t.to_dict() for t in transactions]}
```

#### 5. Redis-Based Rate Limiting

**API Protection:**
```python
# app/rate_limit.py
from fastapi import HTTPException, Request
from aioredis import Redis
import time

class RateLimiter:
    def __init__(self, redis: Redis, requests: int = 100, window: int = 60):
        self.redis = redis
        self.requests = requests
        self.window = window
    
    async def check_rate_limit(self, key: str) -> bool:
        current = int(time.time())
        window_start = current - self.window
        
        # Remove old entries
        await self.redis.zremrangebyscore(key, 0, window_start)
        
        # Count requests in current window
        request_count = await self.redis.zcard(key)
        
        if request_count >= self.requests:
            return False
        
        # Add current request
        await self.redis.zadd(key, {str(current): current})
        await self.redis.expire(key, self.window)
        
        return True

# Middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    redis = await get_redis()
    limiter = RateLimiter(redis, requests=100, window=60)
    
    # Use IP address as key
    client_ip = request.client.host
    key = f"rate_limit:{client_ip}"
    
    if not await limiter.check_rate_limit(key):
        raise HTTPException(status_code=429, detail="Too many requests")
    
    response = await call_next(request)
    return response
```



### CI/CD Pipeline Enhancements

#### 1. Terraform CI/CD Workflow

**Infrastructure as Code Pipeline:**
```yaml
# .github/workflows/terraform-ci.yml
name: Terraform CI

on:
  pull_request:
    paths:
      - 'terraform/**'
  push:
    branches:
      - main
    paths:
      - 'terraform/**'

jobs:
  terraform-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0
      
      - name: Terraform Format Check
        run: terraform fmt -check -recursive terraform/
      
      - name: Terraform Init
        run: |
          cd terraform/environments/dev
          terraform init -backend=false
      
      - name: Terraform Validate
        run: |
          cd terraform/environments/dev
          terraform validate
      
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          working_directory: terraform/
      
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: terraform/
          framework: terraform

  terraform-plan:
    runs-on: ubuntu-latest
    needs: terraform-validate
    if: github.event_name == 'pull_request'
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.TERRAFORM_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Plan
        id: plan
        run: |
          cd terraform/environments/dev
          terraform init
          terraform plan -out=tfplan
      
      - name: Comment PR with Plan
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan 📖
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            })

  terraform-apply:
    runs-on: ubuntu-latest
    needs: terraform-validate
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: dev
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.TERRAFORM_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Apply
        run: |
          cd terraform/environments/dev
          terraform init
          terraform apply -auto-approve
```

#### 2. Container Image Signing with Cosign

**Supply Chain Security:**
```yaml
# .github/workflows/cd-dev.yml (enhanced)
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build Docker Image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/expense-backend:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/expense-backend:$IMAGE_TAG \
                     $ECR_REGISTRY/expense-backend:latest
      
      - name: Run Trivy Vulnerability Scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.login-ecr.outputs.registry }}/expense-backend:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      
      - name: Upload Trivy Results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: Generate SBOM
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.login-ecr.outputs.registry }}/expense-backend:${{ github.sha }}
          format: 'cyclonedx'
          output: 'sbom.json'
      
      - name: Push Image to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker push $ECR_REGISTRY/expense-backend:$IMAGE_TAG
          docker push $ECR_REGISTRY/expense-backend:latest
      
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
      
      - name: Sign Container Image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cosign sign --yes \
            $ECR_REGISTRY/expense-backend:$IMAGE_TAG
      
      - name: Upload SBOM as Artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
```

#### 3. Parallel Matrix Builds

**Speed Optimization:**
```yaml
# .github/workflows/ci.yml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
        test-suite: ['unit', 'integration']
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      
      - name: Install Dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run ${{ matrix.test-suite }} Tests
        run: |
          pytest tests/${{ matrix.test-suite }} \
            --cov=app \
            --cov-report=xml \
            --cov-report=term
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.xml
          flags: ${{ matrix.test-suite }}
```

### Kubernetes Deployment Enhancements

#### 1. PodDisruptionBudget

**High Availability During Updates:**
```yaml
# helm/templates/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "backend.fullname" . }}-pdb
  namespace: {{ .Values.namespace }}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: expense-backend
      component: backend
      project: expense
```

#### 2. Pod Anti-Affinity

**Spread Across Nodes and AZs:**
```yaml
# helm/templates/deployment.yaml (enhanced)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: expense-backend
  namespace: expense
spec:
  replicas: {{ .Values.deployment.replicas }}
  template:
    spec:
      # Spread pods across nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - expense-backend
              topologyKey: kubernetes.io/hostname
          # Spread across availability zones
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - expense-backend
              topologyKey: topology.kubernetes.io/zone
      
      # Topology spread constraints (Kubernetes 1.19+)
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: expense-backend
      
      containers:
      - name: backend
        # ... container spec
```

#### 3. Secrets Management Best Practices

**Separate Sensitive Data:**
```yaml
# helm/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: expense-config
  namespace: expense
data:
  # Non-sensitive configuration
  db_host: {{ .Values.database.host | quote }}
  redis_host: {{ .Values.redis.host | quote }}
  redis_port: "6379"
  cache_ttl: {{ .Values.cache.ttl | quote }}
  log_level: {{ .Values.logging.level | quote }}
  environment: {{ .Values.environment | quote }}

---
# helm/templates/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: expense-secrets
  namespace: expense
type: Opaque
stringData:
  # Sensitive data only
  db_user: {{ .Values.database.username | quote }}
  db_password: {{ .Values.database.password | quote }}
  {{- if .Values.redis.authToken }}
  redis_auth_token: {{ .Values.redis.authToken | quote }}
  {{- end }}
```

#### 4. Fluent Bit Log Shipping

**Centralized Logging:**
```yaml
# k8s/logging/fluent-bit-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.1
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
```

### Observability Enhancements

#### 1. Comprehensive Grafana Dashboards

**Dashboard Definitions:**

**API Performance Dashboard:**
```json
{
  "dashboard": {
    "title": "Expense API Performance",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "sum(rate(http_requests_total[5m])) by (endpoint)"
        }]
      },
      {
        "title": "Response Time Percentiles",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p99"
          }
        ]
      },
      {
        "title": "Cache Hit Ratio",
        "targets": [{
          "expr": "sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
        }]
      }
    ]
  }
}
```

#### 2. Alert Severity Levels

**Tiered Alerting:**
```yaml
# prometheus-rules/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: expense-alerts
  namespace: monitoring
spec:
  groups:
  - name: critical_alerts
    rules:
    - alert: ApplicationDown
      expr: up{job="expense-backend"} == 0
      for: 1m
      labels:
        severity: critical
        pagerduty: "yes"
      annotations:
        summary: "Application is down"
        description: "No healthy pods for expense-backend"
    
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m])) /
        sum(rate(http_requests_total[5m])) > 0.05
      for: 5m
      labels:
        severity: critical
        pagerduty: "yes"
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }}"
  
  - name: warning_alerts
    rules:
    - alert: HighResponseTime
      expr: |
        histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
        ) > 0.2
      for: 10m
      labels:
        severity: warning
        slack: "yes"
      annotations:
        summary: "High API response time"
        description: "P95 latency is {{ $value }}s"
    
    - alert: LowCacheHitRatio
      expr: |
        sum(rate(cache_hits_total[10m])) /
        (sum(rate(cache_hits_total[10m])) + sum(rate(cache_misses_total[10m]))) < 0.5
      for: 15m
      labels:
        severity: warning
        slack: "yes"
      annotations:
        summary: "Low cache hit ratio"
        description: "Cache hit ratio is {{ $value | humanizePercentage }}"
```

#### 3. Distributed Tracing (Optional)

**AWS X-Ray Integration:**
```python
# app/tracing.py
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware

# Configure X-Ray
xray_recorder.configure(
    service='expense-backend',
    sampling=True,
    context_missing='LOG_ERROR'
)

# Add to FastAPI
from fastapi import FastAPI
from aws_xray_sdk.ext.fastapi.middleware import XRayMiddleware

app = FastAPI()
app.add_middleware(XRayMiddleware, recorder=xray_recorder)

# Trace database queries
@xray_recorder.capture('get_transactions')
async def get_all_transactions():
    # Database query
    pass

# Trace Redis operations
@xray_recorder.capture('cache_get')
async def get_from_cache(key: str):
    # Redis get
    pass
```

### Additional Infrastructure Components

#### 1. CloudFront CDN

**Global Content Delivery:**
```hcl
# terraform/modules/cloudfront/main.tf
resource "aws_cloudfront_distribution" "api" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for ${var.environment} API"
  price_class         = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
  
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "X-Correlation-ID"]
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0  # No caching for API
    max_ttl                = 0
    compress               = true
  }
  
  # Enable WAF
  web_acl_id = aws_wafv2_web_acl.api.arn
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  tags = {
    Environment = var.environment
  }
}
```

#### 2. AWS WAF

**API Protection:**
```hcl
# terraform/modules/waf/main.tf
resource "aws_wafv2_web_acl" "api" {
  name  = "${var.project_name}-${var.environment}-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # Rate limiting rule
  rule {
    name     = "rate-limit"
    priority = 1
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "aws-managed-core-rules"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedCoreRules"
      sampled_requests_enabled   = true
    }
  }
  
  # SQL Injection protection
  rule {
    name     = "sql-injection-protection"
    priority = 3
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjectionProtection"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WAFMetrics"
    sampled_requests_enabled   = true
  }
  
  tags = {
    Environment = var.environment
  }
}
```

#### 3. AWS Budget Alarms

**Cost Control:**
```hcl
# terraform/modules/budget/main.tf
resource "aws_budgets_budget" "monthly" {
  name              = "${var.project_name}-${var.environment}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_usd
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"
  
  cost_filter {
    name = "TagKeyValue"
    values = [
      "user:Environment$${var.environment}",
      "user:Project$${var.project_name}"
    ]
  }
  
  # Alert at 80%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }
  
  # Alert at 100%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }
  
  # Forecast alert at 100%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }
}
```

This enhanced design incorporates all the improvements you suggested, making it a truly enterprise-grade, production-ready solution with best practices for security, observability, cost optimization, and operational excellence.
