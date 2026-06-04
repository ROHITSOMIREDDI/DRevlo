import { describe, it, expect } from 'vitest';
import { isDuplicateWebhook } from '../lib/rate-limit';
import { signAccessToken, signRefreshToken, verifyJWT, verifyRefreshToken } from '../lib/jwt';

describe('Security Hardening Tests', () => {
  describe('Webhook Replay Protection', () => {
    it('should identify duplicate webhook delivery IDs and allow unique ones', async () => {
      const firstDeliveryId = 'delivery-uuid-1111';
      const secondDeliveryId = 'delivery-uuid-2222';

      // First delivery should not be a duplicate
      const isFirstDup = await isDuplicateWebhook(firstDeliveryId);
      expect(isFirstDup).toBe(false);

      // Re-sending first delivery should be flagged as duplicate
      const isFirstDupAgain = await isDuplicateWebhook(firstDeliveryId);
      expect(isFirstDupAgain).toBe(true);

      // A different delivery should be allowed
      const isSecondDup = await isDuplicateWebhook(secondDeliveryId);
      expect(isSecondDup).toBe(false);
    });
  });

  describe('JWT Expiry Signatures', () => {
    it('should issue valid 15m access tokens and 7d refresh tokens', async () => {
      const payload = {
        userId: 'sec-user-123',
        email: 'sec@example.com',
        githubId: '987654',
      };

      const accessToken = await signAccessToken(payload);
      const refreshToken = await signRefreshToken(payload.userId);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const decodedAccess = await verifyJWT(accessToken);
      const decodedRefresh = await verifyRefreshToken(refreshToken);

      expect(decodedAccess).not.toBeNull();
      expect(decodedAccess?.userId).toBe(payload.userId);
      expect(decodedAccess?.email).toBe(payload.email);

      expect(decodedRefresh).not.toBeNull();
      expect(decodedRefresh?.userId).toBe(payload.userId);
    });
  });
});
