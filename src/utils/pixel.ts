import type { Batch, PixelColor } from '@/drizzle';
import { CHUNK_SIZE, type ColoredPixels, type Batches } from '@/utils/common';

import { sql } from 'drizzle-orm';
import { pixels, db } from '@/drizzle';
import { generateSnowflake } from '@/utils/snowflake';
import { eq, and, lte, gte, gt, desc } from 'drizzle-orm';
import { getBounds, isRectangular, isCompleteRectangle } from '@/utils/common';

export type RegionBatch<B> = Omit<B, 'type' | 'pixels'> & {
  type: 'region';
  pixels: null;
};

export type PixelBatch<B> = Omit<B, 'type' | 'x1' | 'y1' | 'x2' | 'y2'> & {
  type: 'pixels';
  x1: null;
  y1: null;
  x2: null;
  y2: null;
};

export type MixedBatch<B> = Omit<B, 'type'> & {
  type: 'mixed';
};

export type BatchRequest = Omit<Batch, 'id' | 'version'>;

export type BatchResult = RegionBatch<BatchRequest> | PixelBatch<BatchRequest> | MixedBatch<BatchRequest>;

export const createRegionBatch = (data: Omit<RegionBatch<BatchRequest>, 'type' | 'pixels'>) => ({
  ...data,
  type: 'region' as const,
  pixels: null
});

export const createPixelBatch = (data: Omit<PixelBatch<BatchRequest>, 'type' | 'x1' | 'y1' | 'x2' | 'y2'>) => ({
  ...data,
  type: 'pixels' as const,
  x1: null,
  y1: null,
  x2: null,
  y2: null
});

export const createMixedBatch = (data: Omit<MixedBatch<BatchRequest>, 'type'>) => ({
  ...data,
  type: 'mixed' as const
});

export async function getAllBatchesForTile(tile: number) {
  return await db.select().from(pixels.batches).where(eq(pixels.batches.tile, tile)).orderBy(pixels.batches.id);
}

export async function getRecentActivity(limit: number = 100) {
  return await db.select().from(pixels.batches).orderBy(desc(pixels.batches.id)).limit(limit);
}

export async function getUserRecentActivity(userId: bigint, limit: number = 50) {
  return await db.select().from(pixels.batches).where(eq(pixels.batches.userId, userId)).orderBy(desc(pixels.batches.id)).limit(limit);
}

export async function getChangesSinceVersion(tile: number, sinceVersion: bigint) {
  return await db
    .select()
    .from(pixels.batches)
    .where(and(eq(pixels.batches.tile, tile), gt(pixels.batches.id, sinceVersion)))
    .orderBy(pixels.batches.id);
}

/* safe: uses drizzle-orm to injection */
export async function getLatestStateForTile(tile: number) {
  const query = sql`
    WITH latest_batches AS (
      SELECT DISTINCT ON (tile, type, x1, y1, x2, y2, pixels) 
        id, "user_id", type, tile, color, x1, y1, x2, y2, pixels
      FROM batches 
      WHERE tile = ${tile}
      ORDER BY tile, type, x1, y1, x2, y2, pixels, id DESC
    )
    SELECT * FROM latest_batches
    ORDER BY id DESC
  `;

  return await db.execute(query);
}

export async function getBatchesSinceTime(timestamp: Date, tile?: number) {
  const snowflakeAtTime = generateSnowflake({ timestamp });

  const conditions = [gt(pixels.batches.id, snowflakeAtTime)];
  if (tile !== undefined) {
    conditions.push(eq(pixels.batches.tile, tile));
  }

  return await db
    .select()
    .from(pixels.batches)
    .where(and(...conditions))
    .orderBy(pixels.batches.id);
}

export async function getRegionsInArea(tile: number, x1: number, y1: number, x2: number, y2: number) {
  return await db
    .select()
    .from(pixels.batches)
    .where(
      and(
        eq(pixels.batches.tile, tile),
        eq(pixels.batches.type, 'region'),
        lte(pixels.batches.x1, x2),
        gte(pixels.batches.x2, x1),
        lte(pixels.batches.y1, y2),
        gte(pixels.batches.y2, y1)
      )
    );
}

export async function insertOptimalBatches(data: { userId: bigint; pixels: ColoredPixels; color?: PixelColor }) {
  const batchesToInsert = createOptimalBatches(data);

  return await db.transaction(async tx => {
    const totalChunks = Math.ceil(batchesToInsert.length / CHUNK_SIZE);

    for (let i = 0; i < batchesToInsert.length; i += CHUNK_SIZE) {
      const chunk = batchesToInsert.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(batch => tx.insert(pixels.batches).values(batch)));
    }

    return {
      chunks: totalChunks,
      batchCount: batchesToInsert.length
    };
  });
}

export function createOptimalBatches(data: { userId: bigint; pixels: ColoredPixels; color?: PixelColor }) {
  const batches: BatchResult[] = [];

  const pixelsByTileAndColor = data.pixels.reduce((acc, pixel) => {
    const pixelColor = pixel.color || data.color;
    if (!pixelColor) throw new Error('Color must be specified either per pixel or as default');

    const key = `${pixel.tile}-${pixelColor}`;
    if (!acc[key]) {
      acc[key] = {
        tile: pixel.tile,
        color: pixelColor,
        pixels: []
      };
    }

    acc[key].pixels.push(pixel);
    return acc;
  }, {} as Batches);

  for (const group of Object.values(pixelsByTileAndColor)) {
    const { tile, color, pixels: tilePixels } = group;

    if (tilePixels.length >= 4 && isRectangular(tilePixels)) {
      const bounds = getBounds(tilePixels);

      if (isCompleteRectangle(tilePixels, bounds)) {
        batches.push(
          createRegionBatch({
            userId: data.userId,
            tile,
            color,
            ...bounds
          })
        );
      } else {
        const encodedPixels = tilePixels.map(p => p.y * 1000 + p.x);
        batches.push(
          createMixedBatch({
            userId: data.userId,
            tile,
            color,
            ...bounds,
            pixels: encodedPixels
          })
        );
      }
    } else {
      const encodedPixels = tilePixels.map(p => p.y * 1000 + p.x);
      batches.push(
        createPixelBatch({
          userId: data.userId,
          tile,
          color,
          pixels: encodedPixels
        })
      );
    }
  }

  return batches;
}
