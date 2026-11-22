import { ApiClientError, LaptopMitraApiClient, isAuthGuard401 } from '@laptopmitra/api-client';

describe('LaptopMitraApiClient auth 401 & rental route guards', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('recognizes only FirebaseAuthGuard 401 error codes as session expiry', () => {
    expect(isAuthGuard401(401, { code: 'TOKEN_EXPIRED' })).toBe(true);
    expect(isAuthGuard401(401, { code: 'TOKEN_INVALID' })).toBe(true);
    expect(isAuthGuard401(401, { code: 'TOKEN_WRONG_PROJECT' })).toBe(true);
    expect(isAuthGuard401(401, { code: 'PAYMENT_GATEWAY_ERROR' })).toBe(false);
    expect(isAuthGuard401(401, { message: 'Payment gateway authentication failed' })).toBe(false);
    expect(isAuthGuard401(502, { code: 'TOKEN_EXPIRED' })).toBe(false);
  });

  it('does not refresh token or call onUnauthorized on non-auth-guard 401 or 502 responses', async () => {
    const refreshToken = jest.fn().mockResolvedValue('fresh-tok');
    const onUnauthorized = jest.fn();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ statusCode: 401, message: 'Payment gateway authentication failed' }),
    } as any);

    const client = new LaptopMitraApiClient({
      baseUrl: 'https://api.example.test',
      getToken: async () => 'stale-tok',
      refreshToken,
      onUnauthorized,
    });

    await expect(client.createRazorpayOrder('ord-1')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 401,
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(refreshToken).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('refreshes token at most once on auth-guard 401 and calls onUnauthorized only if retry still fails', async () => {
    const refreshToken = jest.fn().mockResolvedValue('fresh-tok');
    const onUnauthorized = jest.fn();
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ code: 'TOKEN_EXPIRED', message: 'Expired' }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'rzp_1' }),
      } as any);

    const client = new LaptopMitraApiClient({
      baseUrl: 'https://api.example.test',
      getToken: async () => 'old-tok',
      refreshToken,
      onUnauthorized,
    });

    await expect(client.createRazorpayOrder('ord-1')).resolves.toEqual({ id: 'rzp_1' });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).not.toHaveBeenCalled();

    // Now simulate persistent TOKEN_INVALID after retry -> calls onUnauthorized once
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ code: 'TOKEN_INVALID', message: 'Invalid' }),
    } as any);

    await expect(client.createRazorpayOrder('ord-2')).rejects.toBeInstanceOf(ApiClientError);
    expect(refreshToken).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('posts requestRentalTermination to /payments/rental/:subscriptionId/termination-request', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'TERMINATION_REQUESTED' }),
    } as any);

    const client = new LaptopMitraApiClient({ baseUrl: 'https://api.example.test' });
    await client.requestRentalTermination('sub_99', 'Moving abroad');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.test/payments/rental/sub_99/termination-request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Moving abroad' }),
      }),
    );
  });
});
