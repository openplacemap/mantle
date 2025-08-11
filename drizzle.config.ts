import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  schema: './schema',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
