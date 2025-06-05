import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const app = new Hono();

// Configuration - should be moved to environment variables
const OPERATOR_SECRET = 'your_operator_secret'; // Replace with actual secret
const OPERATOR_KEY = 'your_operator_key';     // Replace with actual key
const ACTIVE = true; // Assuming the service is active

// --- Helper Functions ---
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

// --- Route Implementations ---

// PING action
app.post('/ping', async (c) => {
  if (!ACTIVE) {
    return c.json({ status: 'error', message: 'Service inactive' }, 503);
  }

  const { salt_sign } = await c.req.json();

  if (!salt_sign) {
    console.log('Ping: salt_sign missing');
    return c.json({ status: 'error', message: 'salt_sign is required' }, 400);
  }

  const hash = md5(OPERATOR_SECRET + salt_sign);
  console.log(`Ping: salt_sign=${salt_sign}, hash=${hash}`);

  return c.json({
    data: {
      status: 'success',
      hash: hash,
      salt_sign: salt_sign,
    },
    error: null,
    timestamp: Math.floor(Date.now() / 1000),
  });
});

// BALANCE action
app.post('/balance', async (c) => {
  if (!ACTIVE) {
    return c.json({ status: 'error', message: 'Service inactive' }, 503);
  }

  const { player_operator_id, currency } = await c.req.json();
  console.log(`Balance request: player_operator_id=${player_operator_id}, currency=${currency}`);

  if (!player_operator_id || !currency) {
    console.log('Balance: Missing player_operator_id or currency');
    return c.json({ status: 'error', message: 'player_operator_id and currency are required' }, 400);
  }

  try {
    // Placeholder: Find user by player_operator_id.
    // In a real scenario, player_operator_id would likely be a unique field on the User model.
    // For now, we'll try to find a user and use their ID as a stand-in for balance.
    const user = await prisma.user.findUnique({
      where: { email: player_operator_id }, // Assuming player_operator_id is an email for now
    });

    if (!user) {
      console.log(`Balance: User not found for player_operator_id=${player_operator_id}`);
      // Consistent with PHP version, return 0 balance if user not found or error
      return c.json({
        data: {
          balance: "0.00", // Return as string like PHP
          currency: currency,
          player_operator_id: player_operator_id,
        },
        error: { code: 1004, message: "Player not found" }, // Mirroring PHP error structure
        timestamp: Math.floor(Date.now() / 1000),
      });
    }

    // Placeholder for balance: using user's ID as balance for now.
    // In a real application, you would have a 'balance' field on the User model.
    const balance = user.id; // This is a placeholder!

    console.log(`Balance: User ${player_operator_id} found, balance=${balance}`);
    return c.json({
      data: {
        balance: balance.toFixed(2), // Format as string with 2 decimal places
        currency: currency,
        player_operator_id: player_operator_id,
      },
      error: null,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    console.error('Balance: Error fetching balance', error);
    return c.json({
      data: {
        balance: "0.00",
        currency: currency,
        player_operator_id: player_operator_id,
      },
      error: { code: 1000, message: "Unknown error" }, // Generic error
      timestamp: Math.floor(Date.now() / 1000),
    }, 500);
  }
});

// GAME action
app.post('/game', async (c) => {
  if (!ACTIVE) {
    return c.json({ status: 'error', message: 'Service inactive' }, 503);
  }

  const body = await c.req.json();
  const {
    player_operator_id,
    bet,
    win,
    currency,
    game_id, // Renamed from 'game' to avoid conflict with Hono's 'game' route variable if it were part of path
    sign,
    salt_sign,
    session_id, // Added, assuming it's part of the request like in PHP
    // transaction_id, // Added, assuming it's part of the request
  } = body;

  console.log('Game request:', body);

  // Parameter validation
  if (!player_operator_id || bet === undefined || win === undefined || !currency || !game_id || !sign || !salt_sign || !session_id) {
    console.log('Game: Missing required parameters');
    return c.json({
        data: null,
        error: { code: 1003, message: "Invalid parameters" },
        timestamp: Math.floor(Date.now() / 1000),
    }, 400);
  }

  // Verify sign
  const expectedSign = md5(`${OPERATOR_KEY}${player_operator_id}${bet}${win}${currency}${game_id}${salt_sign}`);
  if (sign !== expectedSign) {
    console.log(`Game: Invalid sign. Expected: ${expectedSign}, Got: ${sign}`);
    return c.json({
        data: null,
        error: { code: 1001, message: "Invalid signature" },
        timestamp: Math.floor(Date.now() / 1000),
    }, 400); // 400 or 401 for auth errors
  }
  console.log('Game: Signature verified');

  try {
    // Find user (assuming player_operator_id is an email for placeholder User model)
    const user = await prisma.user.findUnique({
      where: { email: player_operator_id },
    });

    if (!user) {
      console.log(`Game: User not found for player_operator_id=${player_operator_id}`);
      return c.json({
        data: null,
        error: { code: 1004, message: "Player not found" },
        timestamp: Math.floor(Date.now() / 1000),
      });
    }

    // Placeholder for balance update:
    // For now, we're not actually changing the 'id' field.
    // We'll just simulate the transaction and return what the new balance would be.
    // In a real app, you'd have a 'balance' field (e.g., Decimal type).
    let currentBalance = user.id; // Using ID as placeholder balance
    const betAmount = parseFloat(bet);
    const winAmount = parseFloat(win);

    // Simulate balance update
    const newBalance = currentBalance - betAmount + winAmount;

    // In a real scenario, you would update the user's balance in the database:
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { balance: newBalance }, // Assuming a 'balance' field
    // });
    // For now, we log the intention.
    console.log(`Game: Simulating balance update for user ${user.id}. Current: ${currentBalance}, Bet: ${betAmount}, Win: ${winAmount}, New: ${newBalance}`);


    // Logging the transaction (mimicking save_log)
    console.log(`Game transaction: user_id=${user.id}, player_operator_id=${player_operator_id}, bet=${betAmount}, win=${winAmount}, currency=${currency}, game_id=${game_id}, new_balance=${newBalance}, session_id=${session_id}`);

    return c.json({
      data: {
        balance: newBalance.toFixed(2),
        currency: currency,
        player_operator_id: player_operator_id,
        // transaction_id: transaction_id, // Echo back if needed
      },
      error: null,
      timestamp: Math.floor(Date.now() / 1000),
    });

  } catch (error) {
    console.error('Game: Error processing game transaction', error);
    return c.json({
        data: null,
        error: { code: 1000, message: "Unknown error during game processing" },
        timestamp: Math.floor(Date.now() / 1000),
    }, 500);
  }
});

export default app;
