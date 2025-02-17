import { NATIVE_MINT } from "@solana/spl-token";
import { logger } from "../utils/logger.js";

export interface JupiterPrice {
  data: Record<string, { price: number }>;
}
export async function getPrice(mint: string | string[]) {
  let price: JupiterPrice["data"] = {};
  try {
    let ids = Array.isArray(mint) ? mint.join(",") : mint;
    const urlParams = new URLSearchParams({
      ids: ids,
      vsToken: NATIVE_MINT.toBase58(),
    });
    const response = await fetch(`https://api.jup.ag/price/v2?${urlParams}`);
    const data = (await response.json()) as JupiterPrice;
    return data.data;
  } catch (error) {
    console.log(error);
  }

  logger.info(`Price for ${mint} is ${price}`);
  return price;
}

export async function getSolanaUsdPrice() {
  try {
    const urlParams = new URLSearchParams({
      ids: NATIVE_MINT.toBase58(),
      vsToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    });
    const response = await fetch(`https://api.jup.ag/price/v2?${urlParams}`);
    const data = (await response.json()) as JupiterPrice;
    return data.data[NATIVE_MINT.toBase58()].price;
  } catch (error) {
    console.log(error);
  }
}
