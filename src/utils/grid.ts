import { colorToEnumNumber } from '@/utils/common';
import { getAllBatchesForTile } from '@/utils/pixel';

export async function reconstructGrid(tile: number): Promise<Map<string, number>> {
  const batches = await getAllBatchesForTile(tile);
  const grid = new Map<string, number>();

  for (const batch of batches) {
    const colorEnum = colorToEnumNumber(batch.color);

    if (batch.type === 'region') {
      if (batch.y1 !== null && batch.y2 !== null && batch.x1 !== null && batch.x2 !== null) {
        for (let y = batch.y1; y <= batch.y2; y++) {
          for (let x = batch.x1; x <= batch.x2; x++) {
            grid.set(`${x},${y}`, colorEnum);
          }
        }
      }
    } else if (batch.type === 'pixels' || batch.type === 'mixed') {
      if (batch.pixels) {
        for (const encoded of batch.pixels) {
          const y = Math.floor(encoded / 1000);
          const x = encoded % 1000;
          grid.set(`${x},${y}`, colorEnum);
        }
      }
    }
  }

  return grid;
}
