import type { PixelColor } from '@/drizzle';

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

export function colorToEnumNumber(color: PixelColor): number {
  const colorMap: Record<PixelColor, number> = {
    white: 0,
    black: 1,
    red: 2,
    orange: 3,
    yellow: 4,
    green: 5,
    blue: 6,
    purple: 7,
    pink: 8,
    blank: 9
  };

  return colorMap[color] ?? 9;
}

function getColorFromEnum(colorEnum: number | null): PixelColor {
  if (colorEnum === null) return 'blank';

  const enumToColor: Record<number, PixelColor> = {
    0: 'white',
    1: 'black',
    2: 'red',
    3: 'orange',
    4: 'yellow',
    5: 'green',
    6: 'blue',
    7: 'purple',
    8: 'pink',
    9: 'blank'
  };

  return enumToColor[colorEnum] || 'blank';
}

export function colorEnumToRGBA(colorEnum: number | null): RGBA {
  const color = getColorFromEnum(colorEnum);

  const colorMap: Record<PixelColor, RGBA> = {
    white: [255, 255, 255, 255],
    black: [0, 0, 0, 255],
    red: [255, 0, 0, 255],
    orange: [255, 165, 0, 255],
    yellow: [255, 255, 0, 255],
    green: [0, 128, 0, 255],
    blue: [0, 0, 255, 255],
    purple: [128, 0, 128, 255],
    pink: [255, 192, 203, 255],
    blank: [0, 0, 0, 0]
  };

  return colorMap[color];
}

// constants
export const CHUNK_SIZE = 10;
export const CANVAS_SIZE = 1000;
