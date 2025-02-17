import { logger } from "../utils/logger.js";

export async function getBucketedData(mint: string[]) {
  const response = await fetch(
    `https://api.dexscreener.com/tokens/v1/solana/${mint[0]}`
  );
  const data = (await response.json()) as {
    baseToken: {
      address: string;
    };
    txns: {
      m5: { buys: number; sells: number };
      h1: { buy: number; sell: number };
      h6: { buy: number; sell: number };
      h24: { buy: number; sell: number };
    };
    volume: {
      m5: number;
      h1: number;
      h6: number;
      h24: number;
    };
  }[];

  logger.info(`Bucketed data for ${mint} is ${JSON.stringify(data)}`);
  const result: { [k in string]: unknown } = {};
  data.forEach((info) => {
    result[info.baseToken.address] = {
      m5: {
        buys: info.txns.m5.buys,
        sells: info.txns.m5.sells,
        volume: info.volume.m5,
      },
      h1: {
        buys: info.txns.h1.buy,
        sells: info.txns.h1.sell,
        volume: info.volume.h1,
      },
      h6: {
        buys: info.txns.h6.buy,
        sells: info.txns.h6.sell,
        volume: info.volume.h6,
      },
      h24: {
        buys: info.txns.h24.buy,
        sells: info.txns.h24.sell,
        volume: info.volume.h24,
      },
    };
  });

  return result;
}
