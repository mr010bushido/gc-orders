export interface ImageStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  createSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
