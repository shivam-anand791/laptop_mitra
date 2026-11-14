const memoryStore = new Map<string, string>();

export const getItemAsync = jest.fn(async (key: string): Promise<string | null> => {
  return memoryStore.get(key) ?? null;
});

export const setItemAsync = jest.fn(async (key: string, value: string): Promise<void> => {
  memoryStore.set(key, value);
});

export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  memoryStore.delete(key);
});

export const isAvailableAsync = jest.fn(async (): Promise<boolean> => true);

export const __memoryStore = memoryStore;

