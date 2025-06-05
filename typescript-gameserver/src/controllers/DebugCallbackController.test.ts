import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './DebugCallbackController'; // Assuming app is the Hono instance exported
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(), // Also mock update for the game action
    },
    // Mock other models and methods as needed
  };
  return { PrismaClient: vi.fn(() => mockPrismaClient) };
});

// Get an instance of the mocked PrismaClient to use in tests
const prismaMock = new PrismaClient() as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

// Hardcoded config values from DebugCallbackController.ts for testing
const OPERATOR_SECRET = 'your_operator_secret';
const OPERATOR_KEY = 'your_operator_key';

// Helper for MD5 (copied from controller for test usage if needed, or import if exported)
import crypto from 'crypto';
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

describe('DebugCallbackController Unit Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
  });

  describe('POST /ping', () => {
    it('should return a valid hash for ping action', async () => {
      const salt_sign = 'test_salt';
      const request = new Request('http://localhost/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salt_sign }),
      });

      const response = await app.request(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      const expectedHash = md5(OPERATOR_SECRET + salt_sign);

      expect(body.data.status).toBe('success');
      expect(body.data.hash).toBe(expectedHash);
      expect(body.data.salt_sign).toBe(salt_sign);
      expect(body.error).toBeNull();
    });

    it('should return error if salt_sign is missing for ping', async () => {
      const request = new Request('http://localhost/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing salt_sign
      });

      const response = await app.request(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.status).toBe('error');
      expect(body.message).toBe('salt_sign is required');
    });
  });

  describe('POST /balance', () => {
    it('should return user balance if user is found', async () => {
      const player_operator_id = 'user@example.com';
      const currency = 'USD';
      const mockUser = { id: 123, email: player_operator_id, name: 'Test User' };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const request = new Request('http://localhost/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_operator_id, currency }),
      });

      const response = await app.request(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.balance).toBe(mockUser.id.toFixed(2)); // Using ID as balance
      expect(body.data.currency).toBe(currency);
      expect(body.data.player_operator_id).toBe(player_operator_id);
      expect(body.error).toBeNull();
    });

    it('should return 0 balance and error if user not found', async () => {
      const player_operator_id = 'unknown@example.com';
      const currency = 'USD';
      prismaMock.user.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_operator_id, currency }),
      });

      const response = await app.request(request);
      expect(response.status).toBe(200); // Controller returns 200 with error object in body

      const body = await response.json();
      expect(body.data.balance).toBe("0.00");
      expect(body.error.code).toBe(1004);
      expect(body.error.message).toBe("Player not found");
    });

     it('should return error if player_operator_id or currency is missing for balance', async () => {
      const request = new Request('http://localhost/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: 'USD' }), // Missing player_operator_id
      });

      const response = await app.request(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.status).toBe('error'); // This is how the controller handles it
      expect(body.message).toBe('player_operator_id and currency are required');
    });
  });

  describe('POST /game', () => {
    const defaultGameParams = {
      player_operator_id: 'user@example.com',
      bet: '10.00',
      win: '5.00',
      currency: 'USD',
      game_id: 'game123',
      salt_sign: 'game_salt',
      session_id: 'session789',
    };

    it('should process game transaction and return updated balance if signature is valid and user exists', async () => {
      const mockUser = { id: 100, email: defaultGameParams.player_operator_id, name: 'Test User' }; // Initial balance (ID) is 100
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      // Mock update if we were actually persisting, but we are just calculating
      // prismaMock.user.update.mockResolvedValue({ ...mockUser, balance: newBalance });

      const sign = md5(`${OPERATOR_KEY}${defaultGameParams.player_operator_id}${defaultGameParams.bet}${defaultGameParams.win}${defaultGameParams.currency}${defaultGameParams.game_id}${defaultGameParams.salt_sign}`);
      const requestBody = { ...defaultGameParams, sign };

      const request = new Request('http://localhost/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await app.request(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      const expectedBalance = (mockUser.id - parseFloat(defaultGameParams.bet) + parseFloat(defaultGameParams.win)).toFixed(2);
      expect(body.data.balance).toBe(expectedBalance);
      expect(body.data.currency).toBe(defaultGameParams.currency);
      expect(body.data.player_operator_id).toBe(defaultGameParams.player_operator_id);
      expect(body.error).toBeNull();
    });

    it('should return error if signature is invalid for game', async () => {
      const requestBody = { ...defaultGameParams, sign: 'invalid_signature' };

      const request = new Request('http://localhost/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await app.request(request);
      expect(response.status).toBe(400); // Or 401, controller uses 400

      const body = await response.json();
      expect(body.error.code).toBe(1001);
      expect(body.error.message).toBe("Invalid signature");
    });

    it('should return error if user not found for game', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const sign = md5(`${OPERATOR_KEY}${defaultGameParams.player_operator_id}${defaultGameParams.bet}${defaultGameParams.win}${defaultGameParams.currency}${defaultGameParams.game_id}${defaultGameParams.salt_sign}`);
      const requestBody = { ...defaultGameParams, sign };

      const request = new Request('http://localhost/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await app.request(request);
      // Status might be 200 if error is in body, or specific error code
      // Based on current controller, it will be a non-200 status with error object
      const body = await response.json();
      expect(body.error.code).toBe(1004);
      expect(body.error.message).toBe("Player not found");
    });

    it('should return error if required parameters are missing for game', async () => {
        const { bet, ...incompleteParams } = defaultGameParams; // Remove 'bet' for example
         const sign = md5(`${OPERATOR_KEY}${incompleteParams.player_operator_id}undefined${incompleteParams.win}${incompleteParams.currency}${incompleteParams.game_id}${incompleteParams.salt_sign}`); // 'undefined' where bet was
        const requestBody = { ...incompleteParams, sign };


      const request = new Request('http://localhost/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody), // Missing 'bet'
      });

      const response = await app.request(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe(1003);
      expect(body.error.message).toBe("Invalid parameters");
    });
  });
});
