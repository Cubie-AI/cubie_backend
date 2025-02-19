// agent fee increases 0.5% per agent

import { Keypair, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Agent } from "../db/models.js";
import { getQuote, getSwapTransaction, JupiterQuoteResponse } from "../solana/jupiter.js";
import { burn, getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { CUBIE_AGENT_FEE, CUBIE_DAO_PRIVATE_KEY, CUBIE_MINT } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { solanaConnection } from "../solana/connection.js";

// Return the agent fee as lamports
export async function getAgentFee(){
  const count = await Agent.count();
  return Math.floor((CUBIE_AGENT_FEE * Math.pow(1.005, count)) * LAMPORTS_PER_SOL);
}

function normalizeAmount(amount: number, decimals = 9) {
  return Math.floor(amount * Math.pow(10, decimals))/Math.pow(10, decimals);
}

async function makeSwap(mint: string, amount: number): Promise<[JupiterQuoteResponse, Uint8Array]> {
const quote = await getQuote({
    inputMint: NATIVE_MINT.toBase58(),
    outputMint: mint,
    amount: amount,
    slippageBps: 250,
  });

  const swap = await getSwapTransaction({
    quote,
    userPublicKey: CUBIE_DAO_PRIVATE_KEY.publicKey.toBase58(),
  });

  const versionedTransaction = VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction, 'base64'));
  versionedTransaction.sign([CUBIE_DAO_PRIVATE_KEY])
  return [quote, versionedTransaction.serialize()];  
}

async function swapExecutor(amount: number) {
  let count = 0;
  let transactionLanded = false;
  let quote;
  while (!transactionLanded && count < 5) {
    try {
      const [jupiterQuote, swap] = await makeSwap(CUBIE_MINT, amount);
      quote = jupiterQuote;
      const signature = await solanaConnection.sendRawTransaction(swap, {
        maxRetries: 5,
      });
      await solanaConnection.confirmTransaction(signature);
      transactionLanded = true;
    } catch (error) {
      logger.error(error);
    }
    count++;
  }

  let outputAmount = 0;
  if (transactionLanded && quote) {
    outputAmount = parseFloat(quote.outAmount);
  }
  return [transactionLanded, outputAmount];
}

export async function makeDaoTransaction(solanaAmount: number) {
  // 50% of the amount goes to $CUBIE
  const cubieAllocation = normalizeAmount(solanaAmount * 0.5, 9);

  // 30% of the amount goes to $MAIAR
  const maiarAllocation = normalizeAmount(solanaAmount * 0.3, 9);  

  const [cubieSucceeded, cubieOutput] = await swapExecutor(cubieAllocation);
  const [maiarSucceeded, maiarOutput] = await swapExecutor(maiarAllocation);

  logger.info(`Cubie swap: ${cubieSucceeded}, output: ${cubieOutput}`);
  logger.info(`Maiar swap: ${maiarSucceeded}, output: ${maiarOutput}`);

  // tokens have 6 decimals
  if (cubieSucceeded) {
    const cubieBurnAmount = normalizeAmount(Number(cubieOutput), 6);
    const daoAssociatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(CUBIE_MINT), new PublicKey(CUBIE_DAO_PRIVATE_KEY.publicKey));

    logger.info(`Dao associated token address: ${daoAssociatedTokenAddress.toBase58()}`);

    const burnTransaction = await burn(solanaConnection,
       CUBIE_DAO_PRIVATE_KEY,
       daoAssociatedTokenAddress,
       new PublicKey(CUBIE_MINT),
       CUBIE_DAO_PRIVATE_KEY,
       cubieBurnAmount,
    )

    const status = await solanaConnection.getSignatureStatus(burnTransaction);

    if (status.value?.err) {
      logger.error(`Burn failed: ${status.value.err}`);
    }

    // handle retry eventually
  }

  // TODO: use raydium.liquidity.addLiquidity to handle this.
  // Get the following information:
  //export interface AddLiquidityParams<T = TxVersion.LEGACY> {
//   poolInfo: ApiV3PoolInfoStandardItem;
//   amountInA: TokenAmount;
//   amountInB: TokenAmount;
//   otherAmountMin: TokenAmount;
//   fixedSide: LiquiditySide;
//   config?: {
//     bypassAssociatedCheck?: boolean;
//     checkCreateATAOwner?: boolean;
//   };
//   txVersion?: T;
//   computeBudgetConfig?: ComputeBudgetConfig;
//   txTipConfig?: TxTipConfig;
//   feePayer?: PublicKey;
// }
  // 1 transaction to LP $CUBIE x SOL
}