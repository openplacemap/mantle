import { colorToEnumNumber } from '@/utils/common';
import { getLatestStateForTile } from '@/utils/pixel';

export async function reconstructGrid(tile: number): Promise<string[]> {
  const result = await getLatestStateForTile(tile);
  const gridEntries: string[] = [];

  for (const batch of result.rows) {
    const colorEnum = colorToEnumNumber(batch.color);

    if (batch.type === 'region') {
      const { y1, y2, x1, x2 } = batch;
      if (y1 !== null && y2 !== null && x1 !== null && x2 !== null) {
        for (let y = y1; y <= y2; y++) {
          for (let x = x1; x <= x2; x++) {
            gridEntries.push(`${x},${y},${colorEnum}`);
          }
        }
      }
    } else if ((batch.type === 'pixels' || batch.type === 'mixed') && batch.pixels) {
      const pixels = batch.pixels;
      const pixelsLength = pixels.length;

      for (let i = 0; i < pixelsLength; i++) {
        const encoded = pixels[i];
        const y = Math.floor(encoded / 1000);
        const x = encoded % 1000;
        gridEntries.push(`${x},${y},${colorEnum}`);
      }
    }
  }

  return gridEntries;
}
