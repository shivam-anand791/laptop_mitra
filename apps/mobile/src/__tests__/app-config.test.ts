import { resolveMobileSecurityConfig } from '../../app.config';
import appJson from '../../app.json';

describe('Mobile network transport security config (app.config.ts)', () => {
  it('defaults app.json cleartext settings to disabled', () => {
    expect(Boolean((appJson.expo.android as any)?.usesCleartextTraffic)).toBe(false);
    expect(appJson.expo.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(false);
  });

  it('disables cleartext traffic in production and preview builds while enabling only for development via expo-build-properties', () => {
    const prodConfig = resolveMobileSecurityConfig(appJson.expo, {
      EAS_BUILD_PROFILE: 'production',
      NODE_ENV: 'production',
    });
    const prodBuildProperties = prodConfig.plugins.find(
      (p: any) => Array.isArray(p) && p[0] === 'expo-build-properties',
    );
    expect(prodBuildProperties?.[1]?.android?.usesCleartextTraffic).toBe(false);
    expect(prodConfig.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(false);

    const previewConfig = resolveMobileSecurityConfig(appJson.expo, {
      EAS_BUILD_PROFILE: 'preview',
    });
    const previewBuildProperties = previewConfig.plugins.find(
      (p: any) => Array.isArray(p) && p[0] === 'expo-build-properties',
    );
    expect(previewBuildProperties?.[1]?.android?.usesCleartextTraffic).toBe(false);
    expect(previewConfig.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(false);

    const devConfig = resolveMobileSecurityConfig(appJson.expo, {
      EAS_BUILD_PROFILE: 'development',
    });
    const devBuildProperties = devConfig.plugins.find(
      (p: any) => Array.isArray(p) && p[0] === 'expo-build-properties',
    );
    expect(devBuildProperties?.[1]?.android?.usesCleartextTraffic).toBe(true);
    expect(devConfig.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(true);
  });
});
