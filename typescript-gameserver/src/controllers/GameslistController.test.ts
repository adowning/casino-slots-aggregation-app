import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appInstance } from '../../index'; // Import the main Hono app instance
import { testClient } from 'hono/testing';
import { PrismaClient, GameslistGame, GameslistProvider } from '@prisma/client';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    gameslistGame: {
      findUnique: vi.fn(),
    },
    // Mock other models and methods as needed for other tests
  };
  return { PrismaClient: vi.fn(() => mockPrismaClient) };
});

// Get an instance of the mocked PrismaClient to use in tests
const prismaMock = new PrismaClient() as unknown as {
  gameslistGame: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const client = testClient(appInstance);

describe('GameslistController Tests (GET /api/games/:gid)', () => {
  let mockProvider: GameslistProvider;
  let mockGame: GameslistGame;

  beforeEach(() => {
    // Reset mocks before each test
    prismaMock.gameslistGame.findUnique.mockReset();

    // Setup default mock data
    mockProvider = {
      id: 1,
      pid: 'testprovider',
      name: 'Test Provider',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGame = {
      id: 1,
      gid: 'testgame001',
      slug: 'test-game-001',
      name: 'Test Game One',
      providerId: mockProvider.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('Test Case 1: Should return game info if found by gid', async () => {
    prismaMock.gameslistGame.findUnique.mockImplementation(async (args) => {
      if (args?.where?.gid === 'testgame001') {
        return { ...mockGame, provider: mockProvider };
      }
      return null;
    });

    const res = await client.api.games[':gid'].$get({ param: { gid: 'testgame001' } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.game_info.gid).toBe(mockGame.gid);
    expect(body.data.provider_info.pid).toBe(mockProvider.pid);
  });

  it('Test Case 2: Should return game info if found by slug (when gid lookup fails)', async () => {
    prismaMock.gameslistGame.findUnique.mockImplementation(async (args) => {
      if (args?.where?.gid === 'test-game-as-slug') { // First attempt by gid
        return null;
      }
      if (args?.where?.slug === 'test-game-as-slug') { // Second attempt by slug
        return { ...mockGame, slug: 'test-game-as-slug', provider: mockProvider };
      }
      return null;
    });

    const res = await client.api.games[':gid'].$get({ param: { gid: 'test-game-as-slug' } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.game_info.slug).toBe('test-game-as-slug');
    expect(body.data.provider_info.pid).toBe(mockProvider.pid);
  });

  it('Test Case 3: Should return 400 error if game not found by gid or slug', async () => {
    prismaMock.gameslistGame.findUnique.mockResolvedValue(null); // Fails for both gid and slug

    const res = await client.api.games[':gid'].$get({ param: { gid: 'nonexistent001' } });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(400);
    expect(body.status).toBe('error');
    expect(body.message).toBe('Game with that gid not found.');
  });

  it('Test Case 4a: Should return 400 error for invalid gid (too short)', async () => {
    const res = await client.api.games[':gid'].$get({ param: { gid: 'g' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Invalid gid parameter');
  });

  it('Test Case 4b: Should return 400 error for invalid gid (too long)', async () => {
    const longGid = 'g'.repeat(256);
    const res = await client.api.games[':gid'].$get({ param: { gid: longGid } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Invalid gid parameter');
  });

  it('Test Case 5: Should return 500 error if Prisma throws an error', async () => {
    prismaMock.gameslistGame.findUnique.mockRejectedValue(new Error('Database connection error'));

    const res = await client.api.games[':gid'].$get({ param: { gid: 'anygid001' } });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe(500);
    expect(body.status).toBe('error');
    expect(body.message).toBe('Internal server error');
  });
});
