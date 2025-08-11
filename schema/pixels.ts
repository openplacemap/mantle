import { user } from '#schema/auth';
import { generateSnowflake } from '@/utils/snowflake';
import { pgTable, index, integer, bigint, smallint, pgEnum } from 'drizzle-orm/pg-core';

export const batchTypeEnum = pgEnum('batch_type', ['region', 'pixels', 'mixed']);
export const colorEnum = pgEnum('color', ['white', 'black', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'blank']);

export const batches = pgTable(
  'batches',
  {
    id: bigint({ mode: 'bigint' })
      .primaryKey()
      .$defaultFn(() => /* @__PURE__ */ generateSnowflake()),

    userId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => user.id),

    type: batchTypeEnum().notNull(),
    tile: smallint().notNull(),
    color: colorEnum().notNull(),

    // region-based fields
    x1: smallint(),
    y1: smallint(),
    x2: smallint(),
    y2: smallint(),

    // individual pixels
    pixels: integer().array()
  },
  table => [
    index('batch_tile_version_idx').on(table.tile),
    index('batch_user_tile_type_idx').on(table.userId, table.tile, table.type),
    index('batch_spatial_version_idx').on(table.tile, table.x1, table.y1, table.x2, table.y2)
  ]
);
