import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { validator } from 'hono/validator';

const prisma = new PrismaClient();
const app = new Hono();

// Placeholder for auth middleware
// app.use('*', async (c, next) => {
//   // Implement auth:api equivalent here
//   // e.g., check c.req.header('Authorization')
//   // if (!authorized) return c.json({ status: 'error', message: 'Unauthorized' }, 401);
//   await next();
// });

app.get(
  '/:gid',
  validator('param', (value, c) => {
    const gid = value['gid'];
    if (typeof gid === 'string' && gid.length >= 2 && gid.length <= 255) {
      return { gid: gid }; // Return validated data
    }
    return c.json({ code: 400, status: 'error', message: 'Invalid gid parameter. Must be a string between 2 and 255 characters.' }, 400);
  }),
  async (c) => {
    const { gid } = c.req.valid('param');

    try {
      let game = await prisma.gameslistGame.findUnique({
        where: { gid: gid },
        include: { provider: true },
      });

      if (!game) {
        game = await prisma.gameslistGame.findUnique({
          where: { slug: gid },
          include: { provider: true },
        });
      }

      if (!game) {
        return c.json({ code: 400, status: 'error', message: 'Game with that gid not found.' }, 400);
      }

      return c.json({
        code: 200,
        status: 'success',
        data: {
          game_info: game,
          provider_info: game.provider,
        },
      });
    } catch (error) {
      console.error('Error fetching game by gid:', error);
      return c.json({ code: 500, status: 'error', message: 'Internal server error' }, 500);
    }
  }
);

export default app;
