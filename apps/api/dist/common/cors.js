"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCorsOrigins = parseCorsOrigins;
exports.isAllowedOrigin = isAllowedOrigin;
exports.createCorsOriginCallback = createCorsOriginCallback;
function parseCorsOrigins(raw) {
    if (!raw || typeof raw !== 'string') {
        return [];
    }
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}
function isAllowedOrigin(origin, config) {
    if (!origin) {
        return true;
    }
    if (config.configuredOrigins.includes(origin)) {
        return true;
    }
    if (!config.isProduction) {
        const isLocalDev = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
        if (isLocalDev) {
            return true;
        }
    }
    return false;
}
function createCorsOriginCallback(config) {
    return (origin, callback) => {
        const allowed = isAllowedOrigin(origin, config);
        callback(null, allowed);
    };
}
//# sourceMappingURL=cors.js.map