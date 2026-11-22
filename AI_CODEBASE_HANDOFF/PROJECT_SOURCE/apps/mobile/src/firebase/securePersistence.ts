import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1400;

interface StoredValueIndex {
  generation: string;
  chunks: number;
}

function indexKey(key: string): string {
  return `${key}:index`;
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${key}:${generation}:${index}`;
}

async function readIndex(key: string): Promise<StoredValueIndex | null> {
  const raw = await SecureStore.getItemAsync(indexKey(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredValueIndex;
    return typeof parsed.generation === 'string' && Number.isInteger(parsed.chunks) && parsed.chunks >= 0
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** Firebase Auth persistence backed by the platform keychain/keystore. */
export const securePersistenceStorage = {
  async getItem(key: string): Promise<string | null> {
    const index = await readIndex(key);
    if (!index) return null;
    const chunks = await Promise.all(
      Array.from({ length: index.chunks }, (_, i) =>
        SecureStore.getItemAsync(chunkKey(key, index.generation, i)),
      ),
    );
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = await readIndex(key);
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pieces = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [];
    await Promise.all(pieces.map((piece, i) =>
      SecureStore.setItemAsync(chunkKey(key, generation, i), piece),
    ));
    await SecureStore.setItemAsync(indexKey(key), JSON.stringify({ generation, chunks: pieces.length }));
    if (previous) {
      await Promise.all(Array.from({ length: previous.chunks }, (_, i) =>
        SecureStore.deleteItemAsync(chunkKey(key, previous.generation, i)),
      ));
    }
  },

  async removeItem(key: string): Promise<void> {
    const index = await readIndex(key);
    await SecureStore.deleteItemAsync(indexKey(key));
    if (index) {
      await Promise.all(Array.from({ length: index.chunks }, (_, i) =>
        SecureStore.deleteItemAsync(chunkKey(key, index.generation, i)),
      ));
    }
  },
};
