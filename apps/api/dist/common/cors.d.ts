export interface CorsOptionsConfig {
    configuredOrigins: string[];
    isProduction: boolean;
}
export declare function parseCorsOrigins(raw?: string): string[];
export declare function isAllowedOrigin(origin: string | undefined, config: CorsOptionsConfig): boolean;
export declare function createCorsOriginCallback(config: CorsOptionsConfig): (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
