import { PublicKey } from "@solana/web3.js";
import { BIRDEYE_API_KEY } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { solanaConnection } from "./connection.js";

async function fetchWithRetry(url: string, options: RequestInit) {
  let retries = 5;
  let response;
  while (retries > 0) {
    try {
      response = await fetch(url, options);
      if (response.ok) break;
    } catch (error) {
      logger.error(`Error fetching ${url}: ${error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    retries--;
  }

  return response;
}

export interface HistoricPrice {
  price: number;
  time: number;
}

export async function getHistoricalPrices(
  mint: string,
  time_from?: number,
  time_to?: number
) {
  const current = Date.now();
  if (!time_from) {
    time_from = Math.floor(current / 1000) - 3600 * 24;
  }
  if (!time_to) {
    time_to = Math.floor(current / 1000);
  }

  logger.info(
    `Fetching historical prices for ${mint} from ${time_from} to ${time_to}`
  );

  const response = await fetchWithRetry(
    `https://public-api.birdeye.so/defi/history_price?address=${mint}&address_type=token&type=1m&time_from=${time_from}&time_to=${time_to}`,
    {
      headers: {
        "x-api-key": BIRDEYE_API_KEY,
        "x-chain": "solana",
      },
    }
  );

  let result: HistoricPrice[] = [];
  if (response) {
    const data = (await response.json()) as {
      data: {
        items: {
          value: number;
          unixTime: number;
        }[];
      };
      success: boolean;
    };

    if (data.success) {
      const totalSupply = await solanaConnection.getTokenSupply(
        new PublicKey(mint)
      );
      const supply = totalSupply?.value?.uiAmount || 0;
      result = data.data.items.map((item) => ({
        price: item.value * supply,
        time: item.unixTime,
      }));
    }
  }

  return result;
}
