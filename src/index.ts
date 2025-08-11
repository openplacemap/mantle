import { Hono } from 'hono';

import { auth } from '@/auth';
import { cors } from 'hono/cors';

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(
  '/api/auth/*',
  cors({
    origin: '*', // replace with our origin later
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
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

app.on(['POST', 'GET'], '/api/auth/*', c => {
  return auth.handler(c.req.raw);
});

app.get('/api/session', c => {
  const session = c.get('session');
  const user = c.get('user');

  if (!user) return c.body(null, 401);
  return c.json({ session, user });
});

app.get('/api', c => {
  return c.text('hello openplace!');
});

export default app;
