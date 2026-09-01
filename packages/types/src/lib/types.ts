// Shared DTOs and types used across the API

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}
