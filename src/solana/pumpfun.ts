import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import fs from "fs";
import { CUBIE_AGENT_FEE } from "../utils/constants.js";
import { solanaConnection } from "./connection.js";
export async function getCreateAndBuyTransaction(
  agentId: number,
  owner: string,
  name: string,
  ticker: string,
  description: string,
  filename: string,
  x_handle: string,
  telegram: string,
  mint: Keypair,
  solAmount: number,
  feeAccount: PublicKey
) {
  // Define token metadata
  const formData = new FormData();
  formData.append(
    "file",
    await fs.openAsBlob(import.meta.dirname + "../../public/images/" + filename)
  ), // Image file
    formData.append("name", name);
  formData.append("symbol", ticker);
  formData.append("description", description);

  if (x_handle) {
    formData.append("twitter", x_handle);
  }

  if (telegram) {
    formData.append("telegram", telegram);
  }

  formData.append("website", "https://cubie.fun/"),
    formData.append("showName", "true");

  // Create IPFS metadata storage
  const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: formData,
  });
  const metadataResponseJSON = (await metadataResponse.json()) as {
    metadata: { name: string; symbol: string };
    metadataUri: string;
  };

  // Get the create transaction
  const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicKey: owner,
      action: "create",
      tokenMetadata: {
        name: metadataResponseJSON.metadata.name,
        symbol: metadataResponseJSON.metadata.symbol,
        uri: metadataResponseJSON.metadataUri,
      },
      mint: mint.publicKey.toBase58(),
      denominatedInSol: "true",
      amount: solAmount,
      slippage: 10,
      priorityFee: 0.0005,
      pool: "pump",
    }),
  });
  if (response.status === 200) {
    // successfully generated transaction
    const data = await response.arrayBuffer();
    const transactionBase = Transaction.from(new Uint8Array(data));

    const ownerPublicKey = new PublicKey(owner);
    transactionBase.add(
      SystemProgram.transfer({
        fromPubkey: ownerPublicKey,
        toPubkey: feeAccount,
        lamports: CUBIE_AGENT_FEE * LAMPORTS_PER_SOL,
      })
    );

    const blockhash = await solanaConnection.getLatestBlockhash();

    const message = new TransactionMessage({
      payerKey: ownerPublicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: transactionBase.instructions,
    }).compileToV0Message();

    return new VersionedTransaction(message).serialize();
  } else {
    console.log(response.statusText); // log error
  }
}
