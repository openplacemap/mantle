import { user } from '#schema/auth';
import { generateSnowflake } from '@/utils/snowflake';
import { pgTable, index, integer, bigint, smallint, pgEnum } from 'drizzle-orm/pg-core';

export const batchTypeEnum = pgEnum('batch_type', ['region', 'pixels', 'mixed']);

export const colorEnum = pgEnum('color_hex', [
  '#000000', // black
  '#3c3c3c', // dark_gray
  '#787878', // gray
  '#aaaaaa', // light_gray
  '#d2d2d2', // white
  '#ffffff', // deep_red
  '#600018', // red
  '#a50e1e', // light_red
  '#ed1c24', // dark_orange
  '#fa8072', // orange
  '#e45c1a', // gold
  '#ff7f27', // yellow
  '#f6aa09', // light_yellow
  '#f9dd3b', // dark_green
  '#fffabc', // green
  '#9c8431', // light_green
  '#c5ad31', // dark_teal
  '#e8d45f', // teal
  '#4a6b3a', // light_teal
  '#5a944a', // cyan
  '#84c573', // dark_blue
  '#0eb968', // blue
  '#13e67b', // indigo
  '#87ff5e', // light_indigo
  '#0c816e', // dark_purple
  '#10aea6', // purple
  '#13e1be', // light_purple
  '#0f799f', // dark_pink
  '#60f7f2', // pink
  '#bbfaf2', // light_pink
  '#28509e', // dark_brown
  '#4093e4', // brown
  '#7dc7ff', // beige
  '#4d31b8', // medium_gray
  '#6b50f6', // dark_red
  '#99b1fb', // dark_goldenrod
  '#4a4284', // goldenrod
  '#7a71c4', // light_goldenrod
  '#b5aef1', // dark_olive
  '#780c99', // olive
  '#aa38b9', // light_olive
  '#e09ff9', // dark_cyan
  '#cb007a', // light_cyan
  '#ec1f80', // light_blue
  '#f38da9', // dark_indigo
  '#9b5249', // dark_slate_blue
  '#d18078', // slate_blue
  '#fab6a4', // light_slate_blue
  '#684634', // dark_peach
  '#95682a', // peach
  '#dba463', // light_peach
  '#7b6352', // light_brown
  '#9c846b', // dark_tan
  '#d6b594', // tan
  '#d18051', // light_tan
  '#f8b277', // dark_beige
  '#ffc5a5', // light_beige
  '#6d643f', // dark_stone
  '#948c6b', // stone
  '#cdc59e', // light_stone
  '#333941', // dark_slate
  '#6d758d', // slate
  '#b3b9d1', // light_slate
  'transparent' // blank
]);

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
    tile: integer().notNull(),
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
