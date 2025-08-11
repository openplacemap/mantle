import * as pixels from '#schema/pixels';
import { drizzle } from 'drizzle-orm/node-postgres';

import { DATABASE_URL } from '@/env';
import type { InferSelectModel } from 'drizzle-orm';

export const db = drizzle({
  schema: pixels,
  casing: 'snake_case',
  connection: DATABASE_URL
});

export type DB = typeof db;

export type Batch = InferSelectModel<typeof pixels.batches>;

export type BatchType = (typeof pixels.batchTypeEnum.enumValues)[number];

export type PixelColor = (typeof pixels.colorEnum.enumValues)[number];

export * as pixels from '#schema/pixels';
