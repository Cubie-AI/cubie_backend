import { PublicKey } from "@solana/web3.js";
import { logger } from "../utils/logger.js";
import { solanaConnection } from "./connection.js";
import { getPrice, getSolanaUsdPrice } from "./jupiter.js";

function calculateMarketCap(price: number, supply: number, solUsd: number) {
  return Number((price * supply * solUsd).toFixed(2));
}

export async function getSolanaPrice() {
  const solUsd = await getSolanaUsdPrice();
  return solUsd || 0;
}
export async function getTokenMarketData(mint: string | string[]) {
  let result: Record<string, { price: number; marketCapValue: number }> = {};

  const prices = await getPrice(mint);
  const solUsd = await getSolanaPrice();
  if (Array.isArray(mint)) {
    for (let i = 0; i < mint.length; i++) {
      if (prices[mint[i]]) {
        const supply = await solanaConnection.getTokenSupply(
          new PublicKey(mint[i])
        );
        result[mint[i]] = {
          price: prices[mint[i]].price,
          marketCapValue: calculateMarketCap(
            prices[mint[i]].price,
            supply?.value?.uiAmount || 0,
            solUsd
          ),
        };
      } else {
        result[mint[i]] = { price: 0, marketCapValue: 0 };
      }
    }
  } else {
    const supply = await solanaConnection.getTokenSupply(new PublicKey(mint));
    result[mint] = {
      price: prices[mint]?.price || 0,
      marketCapValue: calculateMarketCap(
        prices[mint]?.price || 0,
        supply?.value?.uiAmount || 0,
        solUsd
      ),
    };
  }

  Object.entries(result).forEach(([key, value]) => {
    logger.info(`Price for ${key} is ${value.price}`);
    logger.info(`Market cap value for ${key} is ${value.marketCapValue}`);
  });
  return result;
}
