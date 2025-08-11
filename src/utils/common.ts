import { colorEnum } from '#schema/pixels';
import type { PixelColor } from '@/drizzle';

export const CHUNK_SIZE = 10;
export const CANVAS_SIZE = 1000;
export const COLOR_ARRAY = colorEnum.enumValues;

export type RGBA = [number, number, number, number];

export type Pixels = Array<{
  x: number;
  y: number;
}>;

export type ColoredPixels = Array<{
  x: number;
  y: number;
  tile: number;
  color?: PixelColor;
}>;

export type Bounds = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Batches = Record<
  string,
  {
    tile: number;
    color: PixelColor;
    pixels: ColoredPixels;
  }
>;

export function getBounds(pixels: Pixels) {
  return {
    x1: Math.min(...pixels.map(p => p.x)),
    y1: Math.min(...pixels.map(p => p.y)),
    x2: Math.max(...pixels.map(p => p.x)),
    y2: Math.max(...pixels.map(p => p.y))
  };
}

export function isRectangular(pixels: Pixels): boolean {
  const minX = Math.min(...pixels.map(p => p.x));
  const maxX = Math.max(...pixels.map(p => p.x));
  const minY = Math.min(...pixels.map(p => p.y));
  const maxY = Math.max(...pixels.map(p => p.y));

  const expectedPixels = (maxX - minX + 1) * (maxY - minY + 1);
  return pixels.length === expectedPixels;
}

export function isCompleteRectangle(pixels: Pixels, bounds: Bounds): boolean {
  const expectedPixels = (bounds.x2 - bounds.x1 + 1) * (bounds.y2 - bounds.y1 + 1);
  return pixels.length === expectedPixels;
}

export function colorEnumToRGBA(colorIndex?: number): RGBA {
  if (!colorIndex) {
    return [0, 0, 0, 0];
  }

  const hex = colorEnum.enumValues[colorIndex] ?? 'transparent';
  if (hex === 'transparent') return [0, 0, 0, 0];

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return [r, g, b, 255];
}

export function writePixel(buffer: Buffer<ArrayBuffer>, px: number, py: number, rgba: RGBA) {
  if (px < 0 || py < 0 || px >= CANVAS_SIZE || py >= CANVAS_SIZE) return;
  const idx = (py * CANVAS_SIZE + px) * 4;

  buffer[idx] = rgba[0];
  buffer[idx + 1] = rgba[1];
  buffer[idx + 2] = rgba[2];
  buffer[idx + 3] = rgba[3];
}

export const zz = (n: number) => (n << 1) ^ (n >> 31);

export const toTileId = (x: number, y: number) => y * 4096 + x;

export const getIndexFromHex = (hex: PixelColor) => COLOR_ARRAY.indexOf(hex) ?? COLOR_ARRAY.indexOf('transparent');
