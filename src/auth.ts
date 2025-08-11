import { db } from '@/drizzle';
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export const auth = betterAuth({
  // add discord, twitch, and google providers
  // via plugin page /docs/authentication/<name>
  // socialProviders: {
  //   discord: {
  //     clientId: process.env.DISCORD_CLIENT_ID as string,
  //     clientSecret: process.env.DISCORD_CLIENT_SECRET as string
  //   }
  // },

  // keep this on for now to allow testing
  emailAndPassword: {
    enabled: true
  },

  database: drizzleAdapter(db, {
    provider: 'pg'
  }),

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
    }
  },

  user: {
    // add fields here to user later
    additionalFields: {
      // itemName: { type: string, input: boolean }
    }
  },

  plugins: [jwt()]
});

export type Session = typeof auth.$Infer.Session;
