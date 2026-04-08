export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services?: Record<string, {
    status: string;
    latency?: number;
  }>;
}

export interface HealthHistoryResponse {
  entries: HealthCheckResponse[];
}
