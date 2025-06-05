import crypto from 'crypto'; // For random_uuid
import { PrismaClient } from '@prisma/client'; // For stubs that will use Prisma

// It's good practice to instantiate PrismaClient once and share/inject it
// For now, a global instance or instance per Kernel can be considered.
// Let's assume it might be injected or instantiated in the constructor later.
// const prisma = new PrismaClient();

export class GameKernel {
  private prisma: PrismaClient;

  constructor() {
    // In a real application, PrismaClient might be injected
    // or a shared instance would be used.
    this.prisma = new PrismaClient();
    console.log('GameKernel initialized.');
  }

  // Standalone Methods

  normalized_array(data: any, code: number = 200, message?: string): Record<string, any> {
    const response: Record<string, any> = {
      status_code: code,
      data: data,
    };
    if (message) {
      response.message = message;
    }
    return response;
  }

  random_uuid(): string {
    return crypto.randomUUID();
  }

  in_between(a: string, b: string, data: string): string | false {
    const startPos = data.indexOf(a);
    if (startPos === -1) {
      return false;
    }
    const dataAfterA = data.substring(startPos + a.length);
    const endPos = dataAfterA.indexOf(b);
    if (endPos === -1) {
      return false;
    }
    return dataAfterA.substring(0, endPos);
  }

  build_response_query(query: Record<string, any>): string {
    const params = new URLSearchParams();
    for (const key in query) {
      if (Object.prototype.hasOwnProperty.call(query, key) && query[key] !== undefined && query[key] !== null) {
        params.append(key, String(query[key]));
      }
    }
    return params.toString();
  }

  build_query(query: Record<string, any>): string {
    // Alias for build_response_query as per original, or could have different logic if needed
    return this.build_response_query(query);
  }

  parse_query(queryString: string): Record<string, any> {
    const params = new URLSearchParams(queryString);
    const result: Record<string, any> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  to_array(data: any): any {
    if (data && typeof data.toArray === 'function') {
      return data.toArray();
    }
    return data;
  }

  get_host(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch (error) {
      console.error('Invalid URL for get_host:', url, error);
      return ''; // Or throw error, depending on desired behavior
    }
  }

  // Methods with Stubs / Partial Implementation

  // Depends on Wainwright\CasinoDog\CasinoDog (potentially for request context or IP forwarding headers)
  getIp(request: any /* Hono's Context['req'] or raw Request */): string {
    console.log('GameKernel.getIp called with request:', request);
    // TODO: Implement robust IP extraction, considering X-Forwarded-For etc.
    // For Hono, c.req.raw.headers.get('X-Forwarded-For') or similar from c.env if behind proxy
    if (request && typeof request.raw?.headers?.get === 'function') {
        return request.raw.headers.get('cf-connecting-ip') || request.raw.headers.get('x-forwarded-for') || '127.0.0.1';
    }
    return '127.0.0.1'; // Placeholder
  }

  normalized_json(data: any, statusCode: number = 200, message?: string): Response {
    const body = this.normalized_array(data, statusCode, message);
    // We rename status_code to code for the final JSON response to match original
    const responsePayload: Record<string, any> = { data: body.data };
    if (body.message) responsePayload.message = body.message;
    responsePayload.code = body.status_code; // Match expected 'code' field

    return new Response(JSON.stringify(responsePayload), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    });
  }

  // Depends on SessionsHandler.sessionUpdate (custom session logic)
  async update_session(token_internal: string, key: string, value: any): Promise<Record<string, any>> {
    console.log(`GameKernel.update_session called with token: ${token_internal}, key: ${key}, value:`, value);
    // TODO: Implement using converted SessionsHandler service (e.g., using Redis or a DB store)
    return this.normalized_array({ warning: 'update_session not fully implemented' }, 501);
  }

  // Depends on SessionsHandler.sessionData
  async get_internal_session(id: string, select_data?: string): Promise<Record<string, any>> {
    console.log(`GameKernel.get_internal_session called with id: ${id}, select_data: ${select_data}`);
    // TODO: Implement using converted SessionsHandler service
    return this.normalized_array({ warning: 'get_internal_session not fully implemented' }, 501);
  }

  // Depends on SessionsHandler.sessionFailed
  async fail_internal_session(token: string): Promise<Record<string, any>> {
    console.log(`GameKernel.fail_internal_session called with token: ${token}`);
    // TODO: Implement using converted SessionsHandler service
    return this.normalized_array({ warning: 'fail_internal_session not fully implemented' }, 501);
  }

  // Depends on OperatorsController.operatorCallbacks (external API calls or specific operator logic)
  async get_balance(internal_token: string, type?: string): Promise<number> {
    console.log(`GameKernel.get_balance called with internal_token: ${internal_token}, type: ${type}`);
    // TODO: Implement by calling appropriate operator callback logic
    // This would involve looking up session, user, operator, and then dispatching.
    // For now, returns a placeholder. The original returns float.
    return 0.00;
  }

  // Depends on OperatorsController.operatorCallbacks
  async process_game(internal_token: string, betAmount: number, winAmount: number, game_data: any, type?: string): Promise<number> {
    console.log(`GameKernel.process_game called for token: ${internal_token}, bet: ${betAmount}, win: ${winAmount}, type: ${type}`, game_data);
    // TODO: Implement by calling appropriate operator callback logic for game transaction
    // This would involve looking up session, user, operator, and then dispatching.
    // Returns the new balance as a float.
    return 0.00;
  }

  // Depends on SessionsHandler.sessionExpired
  async expire_internal_session(token: string): Promise<Record<string, any>> {
    console.log(`GameKernel.expire_internal_session called with token: ${token}`);
    // TODO: Implement using converted SessionsHandler service
    return this.normalized_array({ warning: 'expire_internal_session not fully implemented' }, 501);
  }

  // Depends on SessionsHandler.sessionFindPreviousActive
  async find_previous_active_session(token: string): Promise<Record<string, any>> {
    console.log(`GameKernel.find_previous_active_session called with token: ${token}`);
    // TODO: Implement using converted SessionsHandler service
    // The original returns a model or null. We'll return normalized array for now.
    return this.normalized_array({ warning: 'find_previous_active_session not fully implemented' }, 501);
  }

  // Depends on Gameslist::short_list() via Prisma
  async get_gameslist(): Promise<any> {
    console.log('GameKernel.get_gameslist called');
    // TODO: Implement using Prisma to fetch from GameslistGame and GameslistProvider
    // Example: return await this.prisma.gameslistGame.findMany({ include: { provider: true } });
    return this.normalized_array({ warning: 'get_gameslist not fully implemented' }, 501);
  }

  // Depends on Wainwright\CasinoDog\Controllers\ProxyController
  async proxy_json_softswiss(url: string): Promise<any> {
    console.log(`GameKernel.proxy_json_softswiss called with url: ${url}`);
    // TODO: Implement actual proxying logic (e.g., using fetch)
    // TODO: Convert ProxyController logic
    return this.normalized_array({ warning: 'proxy_json_softswiss not fully implemented' }, 501);
  }

  // Depends on Wainwright\CasinoDog\Controllers\ProxyController
  async proxy_game_session_static(url: string): Promise<any> {
    console.log(`GameKernel.proxy_game_session_static called with url: ${url}`);
    // TODO: Implement actual proxying logic
    // TODO: Convert ProxyController logic
    return this.normalized_array({ warning: 'proxy_game_session_static not fully implemented' }, 501);
  }

  // Depends on Crypt::encryptString (Laravel's encryption, needs equivalent)
  async encrypt_string(text: string): Promise<string> {
    console.log(`GameKernel.encrypt_string called for text: ${text}`);
    // TODO: Implement using a robust encryption library (e.g., crypto.subtle or a library like 'jose')
    // This needs to be compatible with Laravel's Crypt if data is shared/migrated.
    // For now, returns a placeholder.
    return `encrypted_${text}`;
  }

  // Depends on Crypt::decryptString
  async decrypt_string(encryptedText: string): Promise<string> {
    console.log(`GameKernel.decrypt_string called for encryptedText: ${encryptedText}`);
    // TODO: Implement using a robust decryption library, compatible with encrypt_string
    if (encryptedText.startsWith('encrypted_')) {
      return encryptedText.substring('encrypted_'.length);
    }
    return `decryption_failed_for_${encryptedText}`;
  }

  // Uses FreeSpins model via Prisma. Depends on get_internal_session.
  async check_freespin_state(internal_token: string): Promise<Record<string, any> | null> {
    console.log(`GameKernel.check_freespin_state called for internal_token: ${internal_token}`);
    // const session = await this.get_internal_session(internal_token, 'player_id,game_id,operator_key,active');
    // if (!session || session.data.active === false) return null;
    // const { player_id, game_id, operator_key } = session.data;
    // const freespins = await this.prisma.freeSpins.findFirst({ where: { player_id, game_id, operator_key, active: true }});
    // return freespins ? this.normalized_array(freespins) : null;
    console.warn('check_freespin_state not fully implemented due to get_internal_session dependency');
    return null; // Placeholder
  }

  // Uses FreeSpins model via Prisma.
  async freespin_state_completed(frb: any /* Prisma.FreeSpinsGetPayload */): Promise<Record<string, any> | null> {
    console.log('GameKernel.freespin_state_completed called with frb:', frb);
    // if (!frb || !frb.id) return null;
    // const updated_freespin = await this.prisma.freeSpins.update({
    //   where: { id: frb.id },
    //   data: { active: false, remaining_spins: 0 },
    // });
    // return this.normalized_array(updated_freespin);
    console.warn('freespin_state_completed not fully implemented');
    return null; // Placeholder
  }
}
