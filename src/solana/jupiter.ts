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

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: number | null;
  priceImpactPct: string;
  routePlan: {
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }[];
  contextSlot: number;
  timeTaken: number;
}

export async function getQuote(params: JupiterQuote) {
  const urlParams = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount.toString(),
    slippageBps: params.slippageBps.toString(),
  });
  const quoteResponse = await (
    await fetch("https://api.jup.ag/swap/v1/quote?" + urlParams.toString())
  ).json();
  return quoteResponse as JupiterQuoteResponse;
}

interface JupiterSwapTransaction {
  quote: JupiterQuoteResponse;
  userPublicKey: string;
}

interface JupiterSwapResponse {
  error: string;
  swapTransaction: string;
}

export async function getSwapTransaction(params: JupiterSwapTransaction) {
  const swapResponse = await (
    await fetch("https://api.jup.ag/swap/v1/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse: params.quote,
        userPublicKey: params.userPublicKey,

        // ADDITIONAL PARAMETERS TO OPTIMIZE FOR TRANSACTION LANDING
        dynamicComputeUnitLimit: true,
        dynamicSlippage: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 1000000,
            priorityLevel: "veryHigh",
          },
        },
      }),
    })
  ).json();

  console.log(swapResponse);
  return swapResponse as JupiterSwapResponse;
}
