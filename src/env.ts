// biome-ignore-all lint/style/noNonNullAssertion: ensure all ENV in this file exist

export const APP_PORT = process.env.APP_PORT ?? 3000;

export const DATABASE_URL = process.env.DATABASE_URL!;
