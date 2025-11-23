# Operations Runbook

This runbook provides procedures for day-to-day operations and troubleshooting.

## Monitoring

### Accessing Grafana
1. Port-forward the Grafana service:
   ```bash
   kubectl port-forward svc/prometheus-stack-grafana 3000:80 -n monitoring
   ```
2. Open `http://localhost:3000` in your browser.
3. Login with default credentials (admin/admin).

### Key Metrics to Watch
- **API Latency**: P95 response time should be < 200ms.
- **Error Rate**: Should be < 1%.
- **CPU/Memory**: Pods should not exceed 80% utilization.

## Scaling

### Manual Scaling
To manually scale the application pods:
```bash
kubectl scale deployment expense-tracker --replicas=5
```

### Auto-scaling
The HPA is configured to scale based on CPU utilization.
- Min Replicas: 2
- Max Replicas: 10
- Target CPU: 70%

## Backup and Restore

### Database
RDS automated backups are enabled with a 7-day retention period (prod).
To restore:
1. Go to AWS Console > RDS > Backups.
2. Select the latest snapshot.
3. Click "Restore".

## Troubleshooting

### Pods Pending
Check for resource constraints or node availability.
```bash
kubectl describe pod <pod-name>
```

### Database Connection Errors
Check the `DB_HOST` environment variable and Security Group rules.
```bash
kubectl logs <pod-name>
```

### High Latency
Check Redis cache hit ratio in Grafana. If low, investigate cache eviction policies or TTL settings.
