import type { ApiClient } from '@/lib/api/auth';

export interface WatermarkedResponse<T> {
  data: T;
  _omen: {
    exportedBy: string;
    exportDate: string;
    intendedUse: string;
    watermark: string;
    terms: string;
  };
}

// Safeguard: every API response is watermarked with client identity
export function addWatermark<T>(data: T, client: ApiClient): WatermarkedResponse<T> {
  const timestamp = Date.now();
  return {
    data,
    _omen: {
      exportedBy: client.clientName,
      exportDate: new Date(timestamp).toISOString(),
      intendedUse: client.useCase,
      watermark: `OMEN-${client.apiKey.slice(0, 8)}-${timestamp}`,
      terms: 'Data from OMEN Ledger. Use restricted to declared use case.',
    },
  };
}
