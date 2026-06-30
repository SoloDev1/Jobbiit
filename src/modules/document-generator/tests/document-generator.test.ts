import { describe, it, expect } from 'vitest';
import { hashData } from '../utils/cache';

describe('Document Generator Caching Hashing', () => {
  it('should generate deterministic sha256 hashes for caching payloads', () => {
    const payloadA = { type: 'cv', userId: 'user-123', value: 'hello' };
    const payloadB = { type: 'cv', userId: 'user-123', value: 'hello' };
    const payloadC = { type: 'cv', userId: 'user-456', value: 'hello' };

    const hashA = hashData(payloadA);
    const hashB = hashData(payloadB);
    const hashC = hashData(payloadC);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
    expect(hashA).toHaveLength(64); // SHA-256 hex string length
  });
});
