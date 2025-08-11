import { getLatestStateForTile } from '@/utils/pixel';
import { getIndexFromHex, zz, CANVAS_SIZE } from '@/utils/common';

/**
 * opcode 0 (region): [0, colorIndex, x1, y1, x2, y2]
 * opcode 1 (pixels): [1, colorIndex, count, ...encodedPixels]
 * encodedPixels use (y * CANVAS_SIZE + x)
 */
export async function reconstructGrid(tile: number): Promise<ArrayBuffer> {
  const commands: number[] = [];
  const result = await getLatestStateForTile(tile);

  for (const batch of result.rows) {
    const colorIndex = getIndexFromHex(batch.color);

    if (batch.type === 'region') {
      const { y1, y2, x1, x2 } = batch;
      if (y1 !== null && y2 !== null && x1 !== null && x2 !== null) {
        commands.push(0, colorIndex, x1, y1, x2, y2);
      }
    } else if ((batch.type === 'pixels' || batch.type === 'mixed') && batch.pixels) {
      const pixels = batch.pixels;
      commands.push(1, colorIndex, pixels.length, ...pixels);
    }
  }

  const data = new Uint32Array(commands);
  return data.buffer;
}

export async function reconstructGridPacked(tile: number): Promise<Uint8Array<ArrayBuffer>> {
  const commands: number[] = [];
  const result = await getLatestStateForTile(tile);

  for (const batch of result.rows) {
    const colorIndex = getIndexFromHex(batch.color);

    if (batch.type === 'region') {
      const { y1, y2, x1, x2 } = batch;
      if (y1 !== null && y2 !== null && x1 !== null && x2 !== null) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        commands.push(2, colorIndex, x1, y1, zz(dx), zz(dy));
      }

      continue;
    }

    // biome-ignore-start lint/style/noNonNullAssertion: performance
    if ((batch.type === 'pixels' || batch.type === 'mixed') && batch.pixels?.length) {
      const idxArr = batch.pixels as number[];
      const count = idxArr.length;

      // opcode 3
      commands.push(3, colorIndex, count);

      const firstX = idxArr[0]! % CANVAS_SIZE;
      const firstY = Math.floor(idxArr[0]! / CANVAS_SIZE);

      // opcode index
      commands.push(firstX, firstY);

      let prevX = firstX;
      let prevY = firstY;

      for (let i = 1; i < count; i++) {
        const x = idxArr[i]! % CANVAS_SIZE;
        const y = Math.floor(idxArr[i]! / CANVAS_SIZE);

        // opcode delta
        commands.push(zz(x - prevX), zz(y - prevY));
        prevX = x;
        prevY = y;
      }
    }
    // biome-ignore-end lint/style/noNonNullAssertion: performance
  }

  const data = new Uint32Array(commands);
  return Bun.gzipSync(data.buffer);
}
