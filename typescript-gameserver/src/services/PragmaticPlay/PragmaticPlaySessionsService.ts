import { GameKernel } from '../../lib/GameKernel';
import { PrismaClient, GameslistGame } from '@prisma/client'; // Assuming GameslistGame model is used

// Configuration placeholders - these should be loaded from a config file or env variables
const PRAGMATICPLAY_API_BASE_URL = 'https://api.pragmaticplay.com'; // Example
const PRAGMATICPLAY_DEMO_URL = 'https://demogamesfree.pragmaticplay.net'; // Example
const PRAGMATICPLAY_SECURE_TOKEN = 'YOUR_SECURE_TOKEN'; // Example
const PRAGMATICPLAY_SECURE_LOGIN = 'YOUR_SECURE_LOGIN'; // Example

export class PragmaticPlaySessionsService {
  private gameKernel: GameKernel;
  private prisma: PrismaClient;
  // private sessionsHandler: SessionsHandlerService; // To be added later

  constructor(gameKernel: GameKernel, prisma: PrismaClient) {
    this.gameKernel = gameKernel;
    this.prisma = prisma;
  }

  private _in_between(startStr: string, endStr: string, inputStr: string): string | null {
    const startPos = inputStr.indexOf(startStr);
    if (startPos === -1) {
      return null;
    }
    const inputAfterStart = inputStr.substring(startPos + startStr.length);
    const endPos = inputAfterStart.indexOf(endStr);
    if (endPos === -1) {
      return null;
    }
    return inputAfterStart.substring(0, endPos);
  }

  private _remove_back_slashes(str: string): string {
    return str.replace(/\\/g, '');
  }

  async pragmaticplay_gameid_transformer(game_id: string, direction: 'explode' | 'concat'): Promise<string | false> {
    console.log(`pragmaticplay_gameid_transformer called with game_id: ${game_id}, direction: ${direction}`);
    if (direction === 'explode') {
      try {
        // Note: The original PHP code uses 'gid_extra' which implies it might be looking for a specific PragmaticPlay internal ID
        // stored on the GameslistGame model. For now, we'll assume 'game_id' is the 'gid' from GameslistGame.
        // If 'gid_extra' is meant to be the source, the query should be on that field.
        const game = await this.prisma.gameslistGame.findUnique({
          where: { gid: game_id }, // Assuming game_id corresponds to GameslistGame.gid
        });

        if (game && game.gid_extra) { // Check if gid_extra exists and use it as per original intent
            // The original logic for 'explode' used 'demolink' to extract a symbol.
            // If 'gid_extra' is the direct symbol, we might not need demolink parsing here.
            // Let's assume gid_extra is the target symbol for now.
            // If 'demolink' parsing is still needed, get_game_symbol logic should be used.
            // The original PHP code: `$game_id_builder = $this->_in_between('gameSymbol=', '\u0026', $game->demolink);`
            // This implies the `game_id` passed in is NOT the game symbol, but the `gid` of our system.
            // And the method extracts the provider's internal game_symbol from our `demolink`.
            // Let's use get_game_symbol for consistency if that's the case.

            const gameSymbol = await this.get_game_symbol(game_id); // game_id here is our GID
            if (gameSymbol) {
                return gameSymbol;
            } else {
                console.warn(`Could not extract game symbol from demolink for GID: ${game_id}`);
                return false;
            }
        } else if (game) {
            console.warn(`Game found for GID: ${game_id}, but 'gid_extra' (or parsable demolink) is missing or not used as primary logic path.`);
            // Fallback or different logic might be needed if gid_extra is the primary source
            // For now, let's try to use get_game_symbol as a general approach if gid_extra isn't the direct answer
            const gameSymbol = await this.get_game_symbol(game_id);
            if (gameSymbol) return gameSymbol;
            return false;
        } else {
          console.error(`Game not found for GID: ${game_id} during 'explode' transformation.`);
          return false;
        }
      } catch (error) {
        console.error(`Error in pragmaticplay_gameid_transformer ('explode') for GID ${game_id}:`, error);
        return false;
      }
    } else if (direction === 'concat') {
      // This implies game_id is already the provider's internal game symbol
      return `softswiss/${game_id}`;
    }
    console.warn(`Unsupported direction for pragmaticplay_gameid_transformer: ${direction}`);
    return false;
  }

  async get_game_symbol(gid: string): Promise<string | false> {
    console.log(`get_game_symbol called for GID: ${gid}`);
    try {
      const game = await this.prisma.gameslistGame.findUnique({
        where: { gid: gid },
        // Select only necessary fields if 'demolink' is large or not always present
        // select: { demolink: true } // Example if other fields are not needed
      });

      if (game && typeof (game as any).demolink === 'string') { // Assuming demolink is on the model, might not be in schema yet
        const demolink = (game as any).demolink as string;
        const url = new URL(demolink.startsWith('http') ? demolink : `http://dummybase.com${demolink}`); // Ensure URL can parse it
        const gameSymbol = url.searchParams.get('gameSymbol');

        if (gameSymbol) {
          return this._remove_back_slashes(gameSymbol);
        } else {
          console.warn(`'gameSymbol' not found in demolink query parameters for GID: ${gid}. Demolink: ${demolink}`);
          // Try the _in_between method as a fallback, similar to original PHP
          const symbolFromInBetween = this._in_between('gameSymbol=', '&', demolink); // u0026 is '&'
          if(symbolFromInBetween) {
            return this._remove_back_slashes(symbolFromInBetween);
          }
          console.warn(`Still could not find gameSymbol using _in_between for GID: ${gid}`);
          return false;
        }
      } else if (game) {
        console.warn(`Game found for GID: ${gid}, but 'demolink' field is missing or not a string.`);
        return false;
      }
      else {
        console.error(`Game not found for GID: ${gid} when trying to get game symbol.`);
        return false;
      }
    } catch (error) {
      console.error(`Error in get_game_symbol for GID ${gid}:`, error);
      return false;
    }
  }

  async fresh_game_session(
    game_symbol: string,
    method: 'redirect' | 'realmoney_session' | 'token_only' | 'demo_method',
    // Additional parameters that might be needed based on original PHP
    playerId?: string,
    currency?: string,
    token?: string,
    // ... other potential params like language, lobbyUrl etc.
  ): Promise<any> {
    console.log(`fresh_game_session called for game_symbol: ${game_symbol}, method: ${method}`);
    // Config needed:
    // PRAGMATICPLAY_API_BASE_URL (e.g., 'https://api.pragmaticplay.net/ReelKingdom/')
    // PRAGMATICPLAY_DEMO_URL (e.g., 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do')
    // PRAGMATICPLAY_SECURE_TOKEN (e.g., from config('pragmaticplay.secure_token'))
    // PRAGMATICPLAY_SECURE_LOGIN (e.g., from config('pragmaticplay.secure_login'))
    // PRAGMATICPLAY_EXTRA_PARAMS (e.g., from config('pragmaticplay.extra_params_realmoney_method'))
    // PRAGMATICPLAY_EXTRA_PARAMS_DEMO (e.g., from config('pragmaticplay.extra_params_demo_method'))

    // This method originally makes cURL requests to Pragmatic Play's API.
    // These need to be converted to use `fetch`.

    // Example of original cURL structure for 'demo_method':
    // URL: `${PRAGMATICPLAY_DEMO_URL}?gameSymbol=${game_symbol}&providerid=1170&stylename=simple_lobby_desktop&language=en&currency=${currency}`
    // No specific headers mentioned for demo, but usually includes User-Agent.

    // Example for 'realmoney_session' (more complex):
    // URL: `${PRAGMATICPLAY_API_BASE_URL}/authenticate/init`
    // POST Data: { secureLogin: PRAGMATICPLAY_SECURE_LOGIN, token: external_player_token, language: 'en', ... }
    // Then another call to `/game/url` with the sessionToken from init.

    // Headers typically included:
    // 'Content-Type: application/x-www-form-urlencoded' or 'application/json'
    // 'User-Agent: CasinoDog (Wainwright Erweiterungen)' (or a generic one)

    // The response from Pragmatic Play is usually JSON, e.g.:
    // { "gameURL": "...", "sessionToken": "...", ... } or error messages.

    // TODO: Implement using `fetch` for each method type ('redirect', 'realmoney_session', etc.)
    // Each will have different URLs, request bodies, and response parsing.

    console.warn('fresh_game_session not implemented. External API calls needed.');
    return { error: 'fresh_game_session not implemented', method, game_symbol };
  }

  async create_session(internal_token: string): Promise<any> {
    console.log(`create_session called for internal_token: ${internal_token}`);
    // This method orchestrates several steps:
    // 1. Get internal session data:
    //    `const session = await this.gameKernel.get_internal_session(internal_token);`
    //    Needs: player_id, game_id, currency, ip_address, operator_id, method ('demo' or 'real')
    //    (Dependency: GameKernel, SessionsHandlerService)

    // 2. Transform game_id to game_symbol (if necessary, based on PragmaticPlay's requirements):
    //    `const game_symbol = await this.get_game_symbol(session.data.game_id);`
    //    (Dependency: this.get_game_symbol, Prisma)
    //    Or, if the GID from session.data.game_id is already the symbol, use it directly.

    // 3. Call `fresh_game_session` based on the method:
    //    If demo: `const pragmatic_response = await this.fresh_game_session(game_symbol, 'demo_method', ..., session.data.currency, ...);`
    //    If real: `const pragmatic_response = await this.fresh_game_session(game_symbol, 'realmoney_session', session.data.player_id, session.data.currency, external_player_token, ...);`
    //    (Dependency: this.fresh_game_session)
    //    Note: `external_player_token` might be `session.data.player_id` or another token.

    // 4. Handle Pragmatic Play's response:
    //    If error from Pragmatic, log and return error.
    //    If success, extract `gameURL`, `sessionToken`, etc.

    // 5. Update internal session with Pragmatic Play session details:
    //    `await this.sessionsHandler.sessionUpdate(internal_token, { pragmatic_session_data: pragmatic_response });`
    //    (Dependency: SessionsHandlerService - future)
    //    Or directly if GameKernel provides such a method for generic session updates.
    //    `await this.gameKernel.update_session(internal_token, 'pragmatic_session_data', pragmatic_response);`


    // 6. (Potentially) Modify game details (original code calls `GameKernel::modify_game`):
    //    `await this.gameKernel.modify_game(internal_token, game_content_from_pragmatic_response);`
    //    This seems unusual here unless `game_content` is something specific to store.

    // 7. Return the game URL or relevant data:
    //    Typically, `pragmatic_response.gameURL`.

    console.warn('create_session not implemented. Orchestrates multiple calls.');
    return { error: 'create_session not implemented', token: internal_token };
  }
}
