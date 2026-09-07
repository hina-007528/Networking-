'use client';

import { AuthProvider } from '@/lib/auth';
import { AnalyticsBeacon } from './analytics-beacon';
import { CityProvider } from './city-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CityProvider>
        <AnalyticsBeacon />
        {children}
      </CityProvider>
    </AuthProvider>
  );
}
