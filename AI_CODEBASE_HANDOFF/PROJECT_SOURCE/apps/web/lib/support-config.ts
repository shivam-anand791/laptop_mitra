import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface SupportConfig {
  returnWindowDays: number;
  standardWarrantyDays: number;
  reopenWindowDays: number;
  autoCloseDays: number;
  supportHoursText: string;
  firstResponseSlaHours: number;
  categories: Array<{
    id: string;
    slug?: string;
    label: string;
    issues?: Array<{ id: string; label: string }>;
  }>;
}

export function useSupportConfig() {
  return useQuery({
    queryKey: ['support-config'],
    queryFn: () => api.getSupportConfig() as Promise<SupportConfig>,
    staleTime: 30 * 60 * 1000,
  });
}
