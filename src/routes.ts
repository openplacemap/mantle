import '@/utils/globals';

import { Hono } from 'hono';
import { APP_PORT } from '@/env';
import type { PixelColor } from '@/drizzle';
import { type ColoredPixels, CANVAS_SIZE } from '@/utils/common';

import sharp from 'sharp';
import { auth } from '@/auth';
import { cors } from 'hono/cors';
import { compress } from '@hono/bun-compress';
import { isValidSnowflake } from '@/utils/snowflake';
import { colorEnumToRGBA, toTileId, writePixel } from '@/utils/common';
import { reconstructGrid, reconstructGridPacked } from '@/utils/grid';

import {
  getRegionsInArea,
  insertOptimalBatches,
  getAllBatchesForTile,
  getRecentActivity,
  getUserRecentActivity,
  getChangesSinceTime,
  getBatchesSinceTime,
  createOptimalBatches
} from '@/utils/pixel';

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(compress({ encoding: 'gzip' }));

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
    defaultColor?: PixelColor;
  }>();

  try {
    await insertOptimalBatches({
      userId,
      pixels: body.pixels,
      color: body?.defaultColor
    });

    return c.body(null, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to insert batches' }, 500);
  }
});

app.get('/tiles/:x/:y', async c => {
  // migrate to zod
  const x = parseInt(c.req.param('x'));
  const y = parseInt(c.req.param('y'));

  const id = toTileId(x, y);

  try {
    const grid = await reconstructGridPacked(id);
    return c.body(grid);
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
  // migrate all to zod
  const tile = parseInt(c.req.param('tile'));
  const timestampParam = c.req.query('timestamp');

  if (!timestampParam) return c.json({ error: 'timestamp required' }, 400);

  const timestampNum = parseInt(timestampParam);
  if (Number.isNaN(timestampNum)) {
    return c.json({ error: 'invalid timestamp format' }, 400);
  }

  const timestamp = new Date(timestampNum);
  if (Number.isNaN(timestamp.getTime())) {
    return c.json({ error: 'invalid timestamp format' }, 400);
  }

  try {
    const changes = await getChangesSinceTime(timestamp, tile);
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

app.get('/tiles/:x/:y/render', async c => {
  // migrate to zod
  const x = parseInt(c.req.param('x'));
  const y = parseInt(c.req.param('y'));

  const id = toTileId(x, y);
  try {
    const cmdBuffer = await reconstructGrid(id);
    const u32 = new Uint32Array(cmdBuffer);
    if (u32.length === 0) return c.body(null, 404);

    const buffer = Buffer.allocUnsafe(CANVAS_SIZE * CANVAS_SIZE * 4);
    buffer.fill(0);

    let i = 0;
    // biome-ignore-start lint/style/noNonNullAssertion: performance
    while (i < u32.length) {
      const opcode = u32[i++];

      if (opcode === 0) {
        const colorIndex = u32[i++];

        const x1 = u32[i++]!,
          y1 = u32[i++]!,
          x2 = u32[i++]!,
          y2 = u32[i++]!;

        const rgba = colorEnumToRGBA(colorIndex);
        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(CANVAS_SIZE - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(CANVAS_SIZE - 1, Math.max(y1, y2));

        for (let yy = minY; yy <= maxY; yy++) {
          let idx = (yy * CANVAS_SIZE + minX) * 4;
          for (let xx = minX; xx <= maxX; xx++) {
            buffer[idx] = rgba[0];
            buffer[idx + 1] = rgba[1];
            buffer[idx + 2] = rgba[2];
            buffer[idx + 3] = rgba[3];
            idx += 4;
          }
        }
      } else if (opcode === 1) {
        const colorIndex = u32[i++];
        const count = u32[i++]!;
        const rgba = colorEnumToRGBA(colorIndex);

        for (let k = 0; k < count; k++) {
          const encoded = u32[i++]!;

          const py = Math.floor(encoded / CANVAS_SIZE);
          const px = encoded % CANVAS_SIZE;

          writePixel(buffer, px, py, rgba);
        }
      } else {
        throw new Error(`unknown opcode ${opcode} at index ${i - 1}`);
      }
    }
    // biome-ignore-end lint/style/noNonNullAssertion: performance

    const pngBuffer = await sharp(buffer, {
      raw: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4 }
    })
      .png()
      .toBuffer();

    c.header('Content-Type', 'image/png');
    c.header('Content-Length', pngBuffer.length.toString());
    return c.body(pngBuffer);
  } catch (err) {
    console.error(err);
    return c.json({ error: 'failed to generate PNG' }, 500);
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
  const timestampNum = parseInt(timestampParam);
  if (Number.isNaN(timestampNum)) {
    return c.json({ error: 'invalid timestamp format' }, 400);
  }

  const timestamp = new Date(timestampNum);
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
    defaultColor?: PixelColor;
  }>();
  try {
    const batches = createOptimalBatches({
      userId: 0n,
      pixels: body.pixels,
      color: body?.defaultColor
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
