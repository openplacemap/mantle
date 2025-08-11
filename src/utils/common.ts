import type { PixelColor } from '@/drizzle';

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

// constants
export const CHUNK_SIZE = 10;
