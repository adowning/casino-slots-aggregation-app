import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

const MAX_PER_PAGE = 1000;
const DEFAULT_PER_PAGE = 50;
const OVERRIDE_MAX_PER_PAGE = 2500; // If 'override_limit' is present

// Placeholder for auth middleware
// app.use('*', async (c, next) => {
//   // Implement auth:api equivalent here
//   // For example, check a token from c.req.header('Authorization')
//   // If not authorized: return c.json({ status: 'error', message: 'Unauthorized' }, 401);
//   await next();
// });

app.get('/list', async (c) => {
  // TODO: Add auth:api equivalent middleware here or at router level

  let perPage = parseInt(c.req.query('per_page') || DEFAULT_PER_PAGE.toString());
  const page = parseInt(c.req.query('page') || '1');
  const overrideLimit = c.req.query('override_limit') === 'true'; // Example, adjust as needed

  if (isNaN(page) || page < 1) {
    return c.json({ code: 400, status: 'error', message: 'Invalid page number' }, 400);
  }

  if (isNaN(perPage) || perPage <= 0) {
    perPage = DEFAULT_PER_PAGE;
  }

  const currentMaxPerPage = overrideLimit ? OVERRIDE_MAX_PER_PAGE : MAX_PER_PAGE;
  if (perPage > currentMaxPerPage) {
    perPage = currentMaxPerPage;
  }

  try {
    const totalLogs = await prisma.dataLog.count();
    if (totalLogs === 0) {
      return c.json({ code: 400, status: 'error', message: 'No logs found' }, 400);
    }

    const lastPage = Math.ceil(totalLogs / perPage);
    if (page > lastPage && totalLogs > 0) { // Allow page 1 if totalLogs is 0 was handled above
        return c.json({ code: 400, status: 'error', message: `Page ${page} is out of range. Last page is ${lastPage}.` }, 400);
    }

    const logs = await prisma.dataLog.findMany({
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return c.json({
      code: 200,
      status: 'success',
      page_item_count: logs.length,
      current_page: page,
      data: logs,
      total: totalLogs,
      per_page: perPage,
      last_page: lastPage,
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    return c.json({ code: 500, status: 'error', message: 'Internal server error' }, 500);
  }
});

export default app;
