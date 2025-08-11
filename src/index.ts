import { Hono } from 'hono';
import { APP_PORT } from '@/env';
import type { ColoredPixels } from '@/utils/common';

import { auth } from '@/auth';
import { cors } from 'hono/cors';
import { isValidSnowflake } from '@/utils/snowflake';
import { insertOptimalBatches, getAllBatchesForTile } from '@/utils/pixel';

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

app.post('/pixels', async c => {
  const user = c.get('user');
  if (!user) return c.body(null, 401);

  const userId = isValidSnowflake(user.id) ? BigInt(user.id) : null;
  if (!userId) return c.json({ error: 'invalid snowflake' }, 400);

  // use zod validator later
  const pixels = await c.req.json<ColoredPixels>();

  try {
    // 'color' is the default color if the body does not contain any colors
    await insertOptimalBatches({ userId, pixels, color: 'black' });
    return c.body(null, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'failed to insert batches' }, 500);
  }
});

app.get('/tiles/:tile/batches', async c => {
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

app.get('/', c => {
  return c.text('hello openplace!');
});

export default {
  port: APP_PORT,
  fetch: app.fetch
};
