import { describe, it, expect } from 'vitest';
import { signAccessToken, signRefreshToken, verifyJWT, verifyRefreshToken } from '../lib/jwt';

describe('JWT Utility', () => {
  it('should successfully sign and verify an access token', async () => {
    const payload = {
      userId: 'test-user-uuid',
      email: 'test@example.com',
      name: 'Test User',
      githubId: '12345678',
    };

    const token = await signAccessToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const verified = await verifyJWT(token);
    expect(verified).toBeDefined();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.name).toBe(payload.name);
    expect(verified?.githubId).toBe(payload.githubId);
  });

  it('should successfully sign and verify a refresh token', async () => {
    const userId = 'test-user-uuid';
    const token = await signRefreshToken(userId);
    expect(token).toBeDefined();
    
    const verified = await verifyRefreshToken(token);
    expect(verified).toBeDefined();
    expect(verified?.userId).toBe(userId);
  });

  it('should return null for an invalid JWT', async () => {
    const verified = await verifyJWT('invalid-token');
    expect(verified).toBeNull();
  });
});
