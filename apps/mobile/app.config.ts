declare const process: { env: Record<string, string | undefined> };

export function resolveMobileSecurityConfig(
  baseConfig: Record<string, any>,
  env: Record<string, string | undefined> = process.env,
): Record<string, any> {
  const buildProfile = (env.EAS_BUILD_PROFILE || '').toLowerCase();
  const appEnv = (env.APP_ENV || '').toLowerCase();
  const nodeEnv = (env.NODE_ENV || '').toLowerCase();

  const isDevelopmentBuild =
    buildProfile === 'development' ||
    (nodeEnv === 'development' && buildProfile !== 'production' && buildProfile !== 'preview' && appEnv !== 'production');

  const allowCleartextInDevOnly = isDevelopmentBuild;

  return {
    ...baseConfig,
    ios: {
      ...(baseConfig.ios || {}),
      infoPlist: {
        ...((baseConfig.ios && baseConfig.ios.infoPlist) || {}),
        NSAppTransportSecurity: {
          ...((baseConfig.ios &&
            baseConfig.ios.infoPlist &&
            baseConfig.ios.infoPlist.NSAppTransportSecurity) ||
            {}),
          NSAllowsArbitraryLoads: allowCleartextInDevOnly,
        },
      },
    },
    android: {
      ...(baseConfig.android || {}),
      usesCleartextTraffic: allowCleartextInDevOnly,
    },
  };
}

export default ({ config }: { config: Record<string, any> }) =>
  resolveMobileSecurityConfig(config);

