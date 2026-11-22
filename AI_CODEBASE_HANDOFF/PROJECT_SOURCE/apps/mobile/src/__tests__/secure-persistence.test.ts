import * as SecureStore from 'expo-secure-store';
import { securePersistenceStorage } from '../firebase/securePersistence';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

describe('SecureStore Persistence (Token Chunking & Recovery)', () => {
  const store = (SecureStore as any).__store as Map<string, string>;

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('stores and retrieves normal sized items under chunk threshold', async () => {
    const key = 'test-token-small';
    const value = 'small-auth-token-12345';

    await securePersistenceStorage.setItem(key, value);
    const retrieved = await securePersistenceStorage.getItem(key);

    expect(retrieved).toBe(value);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it('safely chunks, stores, and reassembles oversized tokens (5000+ bytes) across the 2048-byte limit', async () => {
    const key = 'firebase-oversized-jwt-token';
    // Generate a 5500 byte realistic pseudo-JWT string
    const sampleToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.' + 'A'.repeat(5500) + '.signature';

    expect(sampleToken.length).toBeGreaterThan(5000);

    await securePersistenceStorage.setItem(key, sampleToken);

    // Verify all chunks written to SecureStore are <= 1400 bytes (far below Android 2048-byte limit)
    const setCalls = (SecureStore.setItemAsync as jest.Mock).mock.calls;
    for (const [chunkKey, chunkVal] of setCalls) {
      if (typeof chunkVal === 'string' && !chunkKey.endsWith(':index')) {
        expect(chunkVal.length).toBeLessThanOrEqual(1400);
      }
    }

    // Verify reassembly returns the exact 5000+ byte token
    const retrieved = await securePersistenceStorage.getItem(key);
    expect(retrieved).toBe(sampleToken);
  });

  it('handles corrupted index JSON gracefully by returning null', async () => {
    const key = 'corrupt-index-token';
    // Manually write broken JSON to the index key
    store.set(`${key}:index`, '{corrupt-json-not-valid');

    const result = await securePersistenceStorage.getItem(key);
    expect(result).toBeNull();
  });

  it('handles missing or deleted chunk gracefully by returning null', async () => {
    const key = 'missing-chunk-token';
    const sampleToken = 'B'.repeat(3200); // 3 chunks

    await securePersistenceStorage.setItem(key, sampleToken);

    // Delete one of the chunk keys
    const indexRaw = store.get(`${key}:index`);
    expect(indexRaw).toBeDefined();
    const index = JSON.parse(indexRaw!);
    const chunkToDelete = `${key}:${index.generation}:1`;
    store.delete(chunkToDelete);

    // Reading should safely return null rather than returning incomplete/corrupt data
    const result = await securePersistenceStorage.getItem(key);
    expect(result).toBeNull();
  });

  it('cleans up index and all chunks when removeItem is called', async () => {
    const key = 'cleanup-token';
    const sampleToken = 'C'.repeat(3000);

    await securePersistenceStorage.setItem(key, sampleToken);
    expect(store.size).toBeGreaterThan(1);

    await securePersistenceStorage.removeItem(key);

    const retrieved = await securePersistenceStorage.getItem(key);
    expect(retrieved).toBeNull();
    // Index key must be gone
    expect(store.get(`${key}:index`)).toBeUndefined();
  });
});

