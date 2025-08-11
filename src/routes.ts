import { Hono } from 'hono';
import { APP_PORT } from '@/env';
import type { PixelColor } from './drizzle';
import type { ColoredPixels } from '@/utils/common';

import { auth } from '@/auth';
import { cors } from 'hono/cors';
import { reconstructGrid } from '@/utils/grid';
import { isValidSnowflake } from '@/utils/snowflake';

import {
  getRegionsInArea,
  insertOptimalBatches,
  getAllBatchesForTile,
  getRecentActivity,
  getUserRecentActivity,
  getChangesSinceVersion,
  getBatchesSinceTime,
  createOptimalBatches
} from '@/utils/pixel';

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(
  cors({
    origin: '*', // replace with our origin later
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true
  })
);

app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  c.set('user', session.user);
  c.set('session', session.session);
  return next();
});

app.notFound(c => {
  return c.text('not found :(', 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.text('something went wrong :(', 500);
});

app.on(['POST', 'GET'], '/auth/*', c => {
  return auth.handler(c.req.raw);
});

app.get('/session', c => {
  const session = c.get('session');
  const user = c.get('user');

  if (!user) return c.body(null, 401);
  return c.json({ session, user });
});

app.get('/session/activity', async c => {
  const user = c.get('user');
  if (!user) return c.body(null, 401);

  const userId = isValidSnowflake(user.id) ? BigInt(user.id) : null;
  if (!userId) return c.json({ error: 'invalid snowflake' }, 400);

  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam) : 100;

  // migrate to zod
  if (Number.isNaN(limit) || limit < 1 || limit > 1000) {
    return c.json({ error: 'limit must be between 1 and 1000' }, 400);
  }

  try {
    const activity = await getUserRecentActivity(userId, limit);
    return c.json(activity);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to fetch self activity' }, 500);
  }
});

app.post('/pixels', async c => {
  const user = c.get('user');
  if (!user) return c.body(null, 401);

  const userId = isValidSnowflake(user.id) ? BigInt(user.id) : null;
  if (!userId) return c.json({ error: 'invalid snowflake' }, 400);

  // migrate to zod
  const body = await c.req.json<{
    pixels: ColoredPixels;
    defaultColor: PixelColor;
  }>();

  try {
    await insertOptimalBatches({
      userId,
      pixels: body.pixels,
      color: body.defaultColor
    });

    return c.body(null, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to insert batches' }, 500);
  }
});

app.get('/tiles/:tile', async c => {
  // migrate to zod
  const tile = parseInt(c.req.param('tile'));
  if (Number.isNaN(tile)) return c.json({ error: 'invalid tile number' }, 400);

  try {
    const grid = await reconstructGrid(tile);
    if (grid.size === 0) return c.body(null, 404);

    const gridEntries: string[] = [];
    for (const [coords, colorEnum] of grid.entries()) {
      gridEntries.push(`${coords},${colorEnum}`);
    }

    return c.text(gridEntries.join(' '));
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to export grid' }, 500);
  }
});

app.get('/tiles/:tile/batches', async c => {
  // migrate to zod
  const tile = parseInt(c.req.param('tile'));
  if (Number.isNaN(tile)) return c.json({ error: 'invalid tile number' }, 400);

  try {
    const batches = await getAllBatchesForTile(tile);
    if (batches.length === 0) {
      return c.json({ error: 'empty tile' }, 400);
    }

    return c.json(batches);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to fetch batches' }, 500);
  }
});

app.get('/tiles/:tile/changes', async c => {
  // migrate to zod
  const tile = parseInt(c.req.param('tile'));
  const sinceVersionParam = c.req.query('since');

  if (Number.isNaN(tile)) return c.json({ error: 'invalid tile number' }, 400);
  if (!sinceVersionParam) return c.json({ error: 'since version required' }, 400);

  const sinceVersion = parseInt(sinceVersionParam);
  if (Number.isNaN(sinceVersion)) return c.json({ error: 'invalid since version' }, 400);

  try {
    const changes = await getChangesSinceVersion(tile, sinceVersion);
    if (changes.length === 0) {
      return c.json({ error: 'no changes found' }, 400);
    }

    return c.json(changes);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to fetch changes' }, 500);
  }
});

app.get('/tiles/:tile/regions', async c => {
  const tile = parseInt(c.req.param('tile'));
  const x1 = parseInt(c.req.query('x1') || '');
  const y1 = parseInt(c.req.query('y1') || '');
  const x2 = parseInt(c.req.query('x2') || '');
  const y2 = parseInt(c.req.query('y2') || '');

  // migrate to zod
  if (Number.isNaN(tile)) return c.json({ error: 'invalid tile number' }, 400);
  if (Number.isNaN(x1) || Number.isNaN(y1) || Number.isNaN(x2) || Number.isNaN(y2)) {
    return c.json({ error: 'invalid coordinates - x1, y1, x2, y2 required' }, 400);
  }

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  try {
    const regions = await getRegionsInArea(tile, minX, minY, maxX, maxY);
    if (regions.length === 0) {
      return c.json({ error: 'no regions found' }, 400);
    }

    return c.json(regions);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to fetch regions' }, 500);
  }
});

app.get('/activity/recent', async c => {
  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam) : 100;

  // migrate to zod
  if (Number.isNaN(limit) || limit < 1 || limit > 1000) {
    return c.json({ error: 'limit must be between 1 and 1000' }, 400);
  }

  try {
    const activity = await getRecentActivity(limit);
    if (activity.length === 0) {
      return c.json({ error: 'no activity found' }, 400);
    }

    return c.json(activity);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to fetch recent activity' }, 500);
  }
});

app.get('/users/:userId/activity', async c => {
  const userIdParam = c.req.param('userId');
  const limitParam = c.req.query('limit');

  if (!isValidSnowflake(userIdParam)) {
    return c.json({ error: 'invalid user id' }, 400);
  }

  const userId = BigInt(userIdParam);
  const limit = limitParam ? parseInt(limitParam) : 100;

  // migrate to zod
  if (Number.isNaN(limit) || limit < 1 || limit > 500) {
    return c.json({ error: 'limit must be between 1 and 500' }, 400);
  }

  try {
    const activity = await getUserRecentActivity(userId, limit);
    if (activity.length === 0) {
      return c.json({ error: 'no activity found' }, 400);
    }

    return c.json(activity);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to fetch user activity' }, 500);
  }
});

app.get('/batches/since', async c => {
  const timestampParam = c.req.query('timestamp');
  const tileParam = c.req.query('tile');

  if (!timestampParam) return c.json({ error: 'timestamp required' }, 400);

  // migrate to zod
  const timestamp = new Date(timestampParam);
  if (Number.isNaN(timestamp.getTime())) {
    return c.json({ error: 'invalid timestamp format' }, 400);
  }

  let tile: number | undefined;
  if (tileParam) {
    tile = parseInt(tileParam);
    if (Number.isNaN(tile)) return c.json({ error: 'invalid tile number' }, 400);
  }

  try {
    const batches = await getBatchesSinceTime(timestamp, tile);
    if (batches.length === 0) {
      return c.json({ error: 'no batches found' }, 400);
    }

    return c.json(batches);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to fetch batches' }, 500);
  }
});

app.post('/pixels/debug', async c => {
  const user = c.get('user');
  if (!user) return c.body(null, 401);

  // migrate to zod
  const body = await c.req.json<{
    pixels: ColoredPixels;
    defaultColor: PixelColor;
  }>();
  try {
    BigInt.prototype.toJSON = function () {
      return this.toString();
    };

    const batches = createOptimalBatches({
      userId: 0n,
      pixels: body.pixels,
      color: body.defaultColor
    });

    return c.json({ batchCount: batches.length, batches: batches });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to create batches' }, 500);
  }
});

app.get('/', c => {
  return c.text('hello openplace visitor!');
});

export default {
  port: APP_PORT,
  fetch: app.fetch
};
