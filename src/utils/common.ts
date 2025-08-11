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

export function getIndexFromHex(hex: PixelColor): number | null {
  const index = COLOR_ARRAY.indexOf(hex);
  return index !== -1 ? index : null;
}

export function colorEnumToRGBA(colorIndex: number | null): RGBA {
  if (colorIndex === null) {
    return [0, 0, 0, 0];
  }

  const hex = colorEnum.enumValues[colorIndex] ?? 'transparent';
  if (hex === 'transparent') return [0, 0, 0, 0];

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return [r, g, b, 255];
}
