import { resolveMobileSecurityConfig } from '../../app.config';
import appJson from '../../app.json';

describe('Mobile network transport security config (app.config.ts)', () => {
  it('defaults app.json cleartext settings to disabled', () => {
    expect(appJson.expo.android.usesCleartextTraffic).toBe(false);
    expect(appJson.expo.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(false);
  });

  it('disables cleartext traffic in production and preview builds while enabling only for development', () => {
    const prodConfig = resolveMobileSecurityConfig(appJson.expo, {
      EAS_BUILD_PROFILE: 'production',
      NODE_ENV: 'production',
    });
    expect(prodConfig.android.usesCleartextTraffic).toBe(false);
    expect(prodConfig.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(false);

    const previewConfig = resolveMobileSecurityConfig(appJson.expo, {
      EAS_BUILD_PROFILE: 'preview',
    });
    expect(previewConfig.android.usesCleartextTraffic).toBe(false);
    expect(previewConfig.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(false);

    const devConfig = resolveMobileSecurityConfig(appJson.expo, {
      EAS_BUILD_PROFILE: 'development',
    });
    expect(devConfig.android.usesCleartextTraffic).toBe(true);
    expect(devConfig.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads).toBe(true);
  });
});

