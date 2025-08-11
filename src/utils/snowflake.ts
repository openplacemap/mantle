let sequence = 1;

const EPOCH = Date.UTC(1970, 0, 1).valueOf();
const DEFAULT_SHARD_ID = 1;

export const parseSnowflake = (snowflake: string) => ({
  binary: toBinary(snowflake),
  timestamp: extractBits(snowflake, 1, 41),
  shard_id: extractBits(snowflake, 42, 10),
  sequence: extractBits(snowflake, 52)
});

export const extractBits = (snowflake: string, start: number, length?: number) =>
  parseInt(length ? toBinary(snowflake).substring(start, start + length) : toBinary(snowflake).substring(start), 2);

export function generateSnowflake({
  timestamp = Date.now(),
  shardId = DEFAULT_SHARD_ID
}: {
  timestamp?: Date | number;
  shardId?: number;
} = {}) {
  if (timestamp instanceof Date) timestamp = timestamp.valueOf();
  else timestamp = new Date(timestamp).valueOf();

  let result = (BigInt(timestamp) - BigInt(EPOCH)) << BigInt(22);
  result = result | (BigInt(shardId % 1024) << BigInt(12));
  result = result | BigInt(sequence++ % 4096);

  return result;
}

export function isValidSnowflake(snowflake: string): boolean {
  if (!/^[\d]{19}$/.test(snowflake)) {
    return false;
  }
  try {
    parseSnowflake(snowflake);
    return true;
  } catch {
    return false;
  }
}

export function toBinary(snowflake: string): string {
  const cached64BitZeros = '0000000000000000000000000000000000000000000000000000000000000000';
  const binValue = BigInt(snowflake).toString(2);
  return binValue.length < 64 ? cached64BitZeros.substring(0, 64 - binValue.length) + binValue : binValue;
}
