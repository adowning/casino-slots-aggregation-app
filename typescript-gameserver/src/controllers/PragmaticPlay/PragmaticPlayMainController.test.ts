import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testClient } from 'hono/testing';
import { appInstance } from '../../../index'; // Corrected path to main Hono app
import fs from 'fs'; // Import fs after it has been mocked

// Mock the fs module
vi.mock('fs', async () => {
  // This structure assumes `import fs from 'fs'` is used, which imports the default export.
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      // If other fs functions are used by the code under test (even indirectly via path module),
      // they might need to be mocked here too. e.g., statSync: vi.fn()
    },
    __esModule: true, // Important for proper ES module mocking
    // If the code under test also used named exports like `import { existsSync } from 'fs'`,
    // you would add them here too:
    // existsSync: vi.fn(),
    // readFileSync: vi.fn(),
  };
});

const client = testClient(appInstance);

describe('PragmaticPlayMainController Tests', () => {

  beforeEach(() => {
    // Reset mocks before each test
    (fs.existsSync as vi.Mock).mockReset();
    (fs.readFileSync as vi.Mock).mockReset();
  });

  describe('dynamic_asset (GET /api/pragmaticplay/main/assets/:assetName)', () => {
    it('Test Case 1: Successfully fetch wurfl.js', async () => {
      (fs.existsSync as vi.Mock).mockReturnValue(true);
      const mockContent = '// wurfl.js content';
      (fs.readFileSync as vi.Mock).mockReturnValue(mockContent);

      const res = await client.api.pragmaticplay.main.assets[':assetName'].$get({
        param: { assetName: 'wurfl.js' },
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe(mockContent);
      expect(res.headers.get('Content-Type')).toBe('application/javascript; charset=utf-8');
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('wurfl.js'));
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('wurfl.js'));
    });

    it('Test Case 2: Successfully fetch pragmatic-pusher.js', async () => {
      (fs.existsSync as vi.Mock).mockReturnValue(true);
      const mockContent = '// pragmatic-pusher.js content';
      (fs.readFileSync as vi.Mock).mockReturnValue(mockContent);

      const res = await client.api.pragmaticplay.main.assets[':assetName'].$get({
        param: { assetName: 'pragmatic-pusher.js' },
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe(mockContent);
      expect(res.headers.get('Content-Type')).toBe('application/javascript; charset=utf-8');
    });

    it('Test Case 3: Asset file does not exist on disk (wurfl.js)', async () => {
      (fs.existsSync as vi.Mock).mockReturnValue(false);

      const res = await client.api.pragmaticplay.main.assets[':assetName'].$get({
        param: { assetName: 'wurfl.js' },
      });
      expect(res.status).toBe(404); // c.notFound()
    });

    it('Test Case 4: Attempt to fetch a disallowed asset (e.g., minilobby.json)', async () => {
      // The route has a regex `{.+\\.js$}` so non .js files won't match the route itself.
      // Hono's default behavior for non-matching routes is 404.
      // If the regex was not there, then the controller's internal `allowedAssets` check would be hit.
      const res = await client.api.pragmaticplay.main.assets[':assetName'].$get({
        param: { assetName: 'minilobby.json' },
      });
      // This will be 404 because `minilobby.json` does not match `.+\\.js$`
      expect(res.status).toBe(404);

      // To test the internal "allowedAssets" logic for a .js file not in the list:
      const resDisallowedJs = await client.api.pragmaticplay.main.assets[':assetName'].$get({
        param: { assetName: 'someother.js' },
      });
      expect(resDisallowedJs.status).toBe(404); // Should be 404 from c.notFound()
    });

    it('Test Case 5: Filesystem read error', async () => {
      (fs.existsSync as vi.Mock).mockReturnValue(true);
      (fs.readFileSync as vi.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const res = await client.api.pragmaticplay.main.assets[':assetName'].$get({
        param: { assetName: 'wurfl.js' },
      });

      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Internal Server Error');
    });
  });

  describe('error_handle (via GET /api/pragmaticplay/main/error_test/:type)', () => {
    it('Test Case 1: incorrect_game_event_request type', async () => {
      const res = await client.api.pragmaticplay.main.error_test[':type'].$get({
        param: { type: 'incorrect_game_event_request' },
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ status: 400, error: 'incorrect_game_event_request' });
    });

    it('Test Case 2: Other error type', async () => {
      const res = await client.api.pragmaticplay.main.error_test[':type'].$get({
        param: { type: 'some_other_error' },
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ status: 400, error: 'some_other_error' });
    });

    it('Test Case 3: Other error type with message', async () => {
      const res = await client.api.pragmaticplay.main.error_test[':type'].$get({
        param: { type: 'another_error' },
        query: { message: 'CustomDescription' },
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ status: 400, error: 'CustomDescription' });
    });
  });
});
