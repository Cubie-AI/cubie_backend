import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { exit } from "process";
import { IDL, PumpFun } from "./pf/pumpfun.js";
import { solanaConnection } from "../src/solana/connection.js";
import { AMM } from "./pf/amm.js";
import BN from "bn.js";

// Update with an actual rpc and not devnet cause the program id's are different

async function makeV0Transaction(
  instructions: TransactionInstruction[],
  owner: Keypair
) {
  const latestBlockhash = await solanaConnection.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    instructions: instructions,
    payerKey: owner.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([owner]);

  return transaction;
}

export async function buy(
  provider: AnchorProvider,
  owner: Keypair,
  mintAddress: string,
  tokenAmount: number
) {
  // Setup pumpfun program with anchor
  const program = new Program(IDL as PumpFun, provider);

  // This is the CA
  const mint = new PublicKey(mintAddress);

  // This is the pumpfun bonding curve account which holds the (tokens, sol) balances
  const bondingCurveAccount = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    program.programId // this is the program id of the pumpfun program (6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P)
  )[0];
  console.log(`Bonding Curve Account: ${bondingCurveAccount}`);

  // construct amm for bonding curve account
  const amm = await AMM.fromBondingCurveAccount(bondingCurveAccount);

  // This is the associated token account for the bonding curve
  const associatedBondingCurveAccount = getAssociatedTokenAddressSync(
    mint,
    bondingCurveAccount,
    true
  );
  console.log(
    `Associated Bonding Curve Account: ${associatedBondingCurveAccount}`
  );

  // This is the pumpfun global account
  // 4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf
  const globalAccount = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    program.programId
  )[0];

  console.log(`Global Account: ${globalAccount.toBase58()}`);
  // im too lazy to implement how to get this dynamically but you would fetch the data from the pumpfun global account and then parse it.
  // However, it doesnt change so you can hardcode it
  //https://solscan.io/account/4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf#anchorData
  const pumpfunFeeAccount = new PublicKey(
    "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"
  );

  // Array to hold our instructions
  const instructions = [];

  // You need to calculate these values from the actual bonding curve account data.
  // There is a lot more math that needs to be done but this will work on a fresh CA with no buys
  // Where 0.75 SOL should get you more than 20,000,000 tokens but the sol value here is
  // the maximum amount you want to spend for the output amount of tokens
  const solAmount = amm?.getBuyPrice(BigInt(tokenAmount * 10 ** 6));

  // This is the token account for the [owner, mint] pair (ATA)
  // if it doesnt exist, you need to create it
  // Every time you buy tokens you need to create a new ATA and pay the rent (0.002 SOL)
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint,
    owner.publicKey
  );

  try {
    const associatedTokenAccountInfo = await solanaConnection.getAccountInfo(
      associatedTokenAccount
    );

    // If the associated token account does not exist, create it
    if (!associatedTokenAccountInfo) {
      // First parameter is the fee payer (in regular cases, it should be the owner)
      instructions.push(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          associatedTokenAccount,
          provider.wallet.publicKey,
          mint
        )
      );
    }
  } catch (error) {
    console.error(error);
    exit(1);
  }
  if (!solAmount) return;

  const token_amount = new BN(tokenAmount).mul(new BN(Math.pow(10, 6)));
  const sol_amount = new BN(Number(solAmount)).mul(new BN(LAMPORTS_PER_SOL));
  // Build a transaction to buy tokens
  const buyInstruction = await program.methods
    .buy(token_amount, sol_amount)
    .accounts({
      feeRecipient: pumpfunFeeAccount,
      associatedUser: associatedTokenAccount,
      user: provider.wallet.publicKey,
      mint: mint,
      associatedBondingCurve: associatedBondingCurveAccount,
    })
    .instruction();

  // Append it to the earlier transaction since we might need to create the ATA
  instructions.push(buyInstruction);

  // Build the final transaction
  const transaction = await makeV0Transaction(instructions, owner);

  const signature = await solanaConnection.sendTransaction(transaction, {
    skipPreflight: true,
    maxRetries: 5,
  });
  console.log(`Transaction Signature: ${signature}`);
  console.log(`View on solscan: https://solscan.io/tx/${signature}`);
}
