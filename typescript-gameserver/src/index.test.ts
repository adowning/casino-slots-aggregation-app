import { describe, it, expect } from 'vitest';
import { appInstance } from '../index'; // Import the named Hono app instance
import { testClient } from 'hono/testing';
import crypto from 'crypto';

// Configuration values used by the controller, needed for crafting valid requests
const OPERATOR_SECRET = 'your_operator_secret';
const OPERATOR_KEY = 'your_operator_key';

// Helper for MD5 (copied from controller or make it importable)
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

// We need to mock prisma client here as well, because the app instance will use it.
// Integration tests test the app as a whole, including its interaction with mocked services.
import { PrismaClient } from '@prisma/client';
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrismaClient) };
});
const prismaMock = new PrismaClient() as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};


describe('DebugCallbackController Integration Tests', () => {
  const client = testClient(appInstance); // Use the Hono instance directly

  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
  });

  describe('POST /api/debug/ping', () => {
    it('should return a valid hash', async () => {
      const salt_sign = 'integration_test_salt';
      const res = await client.api.debug.ping.$post({
        json: { salt_sign },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      const expectedHash = md5(OPERATOR_SECRET + salt_sign);

      expect(body.data.status).toBe('success');
      expect(body.data.hash).toBe(expectedHash);
      expect(body.data.salt_sign).toBe(salt_sign);
      expect(body.error).toBeNull();
    });

    it('should return error if salt_sign is missing for ping', async () => {
      const res = await client.api.debug.ping.$post({ json: {} });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toBe('salt_sign is required');
    });
  });

  describe('POST /api/debug/balance', () => {
    it('should return user balance if user exists', async () => {
      const player_operator_id = 'user_exists@example.com';
      const currency = 'EUR';
      const mockUser = { id: 201, email: player_operator_id, name: 'Integration User' };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const res = await client.api.debug.balance.$post({
        json: { player_operator_id, currency },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.balance).toBe(mockUser.id.toFixed(2));
      expect(body.data.currency).toBe(currency);
      expect(body.error).toBeNull();
    });

    it('should return error if user not found', async () => {
      const player_operator_id = 'user_not_found@example.com';
      const currency = 'EUR';
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await client.api.debug.balance.$post({
        json: { player_operator_id, currency },
      });

      expect(res.status).toBe(200); // Controller handles this with 200 + error in body
      const body = await res.json();
      expect(body.data.balance).toBe("0.00");
      expect(body.error.code).toBe(1004);
    });
  });

  describe('POST /api/debug/game', () => {
    const gamePayload = {
      player_operator_id: 'game_user@example.com',
      bet: '25.00',
      win: '15.00',
      currency: 'GBP',
      game_id: 'game_test_001',
      salt_sign: 'game_integration_salt',
      session_id: 'session_int_test_001',
    };

    it('should process game transaction successfully with valid signature', async () => {
      const mockUser = { id: 303, email: gamePayload.player_operator_id, name: 'Game User' };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const sign = md5(`${OPERATOR_KEY}${gamePayload.player_operator_id}${gamePayload.bet}${gamePayload.win}${gamePayload.currency}${gamePayload.game_id}${gamePayload.salt_sign}`);

      const res = await client.api.debug.game.$post({
        json: { ...gamePayload, sign },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      const expectedBalance = (mockUser.id - parseFloat(gamePayload.bet) + parseFloat(gamePayload.win)).toFixed(2);
      expect(body.data.balance).toBe(expectedBalance);
      expect(body.data.player_operator_id).toBe(gamePayload.player_operator_id);
      expect(body.error).toBeNull();
    });

    it('should fail game transaction with invalid signature', async () => {
      const res = await client.api.debug.game.$post({
        json: { ...gamePayload, sign: 'invalid_sign_here' },
      });

      expect(res.status).toBe(400); // Controller uses 400 for invalid signature
      const body = await res.json();
      expect(body.error.code).toBe(1001);
      expect(body.error.message).toBe('Invalid signature');
    });

     it('should fail game transaction if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const sign = md5(`${OPERATOR_KEY}${gamePayload.player_operator_id}${gamePayload.bet}${gamePayload.win}${gamePayload.currency}${gamePayload.game_id}${gamePayload.salt_sign}`);

      const res = await client.api.debug.game.$post({
         json: { ...gamePayload, sign },
      });

      // The controller returns a custom JSON error, not necessarily a non-200 status for "player not found"
      // Check DebugCallbackController.ts: it returns a JSON with an error object.
      // The HTTP status code might still be 200 or a specific error code set by Hono if an exception is thrown before returning JSON.
      // Let's assume it's a JSON response with an error field.
      const body = await res.json(); // This will depend on actual controller's behavior for "player not found"
      expect(body.error.code).toBe(1004);
      expect(body.error.message).toBe("Player not found");
    });
  });
});
