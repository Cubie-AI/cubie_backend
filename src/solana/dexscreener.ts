import { logger } from "../utils/logger.js";

interface BuySellCount {
  buys: number;
  sells: number;
}
type TimedKeys = "m5" | "h1" | "h6" | "h24";
interface TimedMarkedData {
  baseToken: {
    address: string;
  };
  txns: Record<TimedKeys, BuySellCount>;
  volume: Record<TimedKeys, number>;
}

function buildObject(key: string, info: TimedMarkedData) {
  return {
    [key]: {
      m5: {
        buys: info.txns.m5.buys,
        sells: info.txns.m5.sells,
        volume: info.volume.m5,
      },
      h1: {
        buys: info.txns.h1.buys,
        sells: info.txns.h1.sells,
        volume: info.volume.h1,
      },
      h6: {
        buys: info.txns.h6.buys,
        sells: info.txns.h6.sells,
        volume: info.volume.h6,
      },
      h24: {
        buys: info.txns.h24.buys,
        sells: info.txns.h24.sells,
        volume: info.volume.h24,
      },
    },
  };
}
export async function getBucketedData(mint: string[] | string) {
  const ids = Array.isArray(mint) ? mint.join(",") : mint;

  const response = await fetch(
    `https://api.dexscreener.com/tokens/v1/solana/${ids}`
  );
  const data = (await response.json()) as TimedMarkedData[];

  logger.info(`Retrieved dexscreener data for ${mint}`);

  const result: Record<string, TimedMarkedData> = Array.isArray(mint)
    ? data.reduce(
        (acc, info, index) => ({
          ...acc,
          ...buildObject(mint[index], info),
        }),
        {}
      )
    : buildObject(mint, data[0]);

  return result;
}
