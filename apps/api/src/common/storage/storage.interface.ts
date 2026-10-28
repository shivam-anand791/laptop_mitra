export interface StorageFileMeta {
  size: number;
  mimeType: string;
  updatedAt?: Date;
}

export interface SignedUploadResult {
  uploadUrl: string;
  key: string;
}

export interface IStorageService {
  /**
   * Generates a pre-signed URL allowing a client to upload directly to storage.
   */
  createSignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSec?: number,
  ): Promise<SignedUploadResult>;

  /**
   * Retrieves metadata (size, mimeType) for a stored object without reading whole content.
   */
  headObject(key: string): Promise<StorageFileMeta | null>;

  /**
   * Reads a byte range from a stored object (for partial media inspection / byte scanning).
   */
  readRange(key: string, start: number, end: number): Promise<Buffer>;

  /**
   * Generates a time-limited signed URL for authorized media download/playback.
   */
  signedDownload(key: string, expiresInSec?: number): Promise<string>;

  /**
   * Permanently deletes an object from storage.
   */
  delete(key: string): Promise<void>;

  /**
   * Direct buffer upload (used for server-generated QR codes and test assets).
   */
  uploadBuffer?(key: string, buffer: Buffer, mimeType: string): Promise<string>;

  /**
   * Optional helper to get absolute path when running on local storage.
   */
  getLocalFilePath?(key: string): string;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
