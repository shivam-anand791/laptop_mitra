export interface CorsOptionsConfig {
  configuredOrigins: string[];
  isProduction: boolean;
}

export function parseCorsOrigins(raw?: string): string[] {
  if (!raw || typeof raw !== 'string') {
    return [];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isAllowedOrigin(
  origin: string | undefined,
  config: CorsOptionsConfig,
): boolean {
  // 1. Allow requests without an Origin header (mobile apps, server-to-server, curl)
  if (!origin) {
    return true;
  }

  // 2. Allow explicitly configured origins
  if (config.configuredOrigins.includes(origin)) {
    return true;
  }

  // 3. In non-production only, allow local and emulator development origins
  if (!config.isProduction) {
    const isLocalDev = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)(:\d+)?$/.test(
      origin,
    );
    if (isLocalDev) {
      return true;
    }
  }

  // 4. Reject all other unknown/unauthorized origins
  return false;
}

export function createCorsOriginCallback(config: CorsOptionsConfig) {
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowed = isAllowedOrigin(origin, config);
    // callback(null, allowed) sends CORS headers only if allowed is true; no error thrown
    callback(null, allowed);
  };
}
