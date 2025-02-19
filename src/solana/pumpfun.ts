import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { CUBIE_AGENT_FEE, PUMPFUN_PROGRAM } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { solanaConnection } from "./connection.js";

interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
}

export async function createTokenMetadata(
  name: string,
  ticker: string,
  description: string,
  imageBuffer: Buffer,
  mime: string,
  x_handle?: string,
  telegram?: string
) {
  // Define token metadata
  const formData = new FormData();
  console.log(imageBuffer);
  console.log(mime);
  formData.append("file", new Blob([imageBuffer], { type: mime })); // Image file
  formData.append("name", name);
  formData.append("symbol", ticker);
  formData.append("description", description);

  if (x_handle) {
    formData.append("twitter", `https://x.com/${x_handle}`);
  }

  if (telegram) {
    formData.append("telegram", `https://t.me/${telegram}`);
  }

  formData.append("website", "https://cubie.fun/"),
    formData.append("showName", "true");

  // Create IPFS metadata storage
  const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: formData,
  });
  const metadataResponseJSON = (await metadataResponse.json()) as {
    metadata: { name: string; symbol: string; image: string };
    metadataUri: string;
  };
  console.log(metadataResponseJSON);
  return {
    name: metadataResponseJSON.metadata.name,
    symbol: metadataResponseJSON.metadata.symbol,
    imageUri: metadataResponseJSON.metadata.image,
    uri: metadataResponseJSON.metadataUri,
  };
}
export async function getCreateAndBuyTransaction(
  owner: string,
  tokenMetadata: TokenMetadata,
  mint: Keypair,
  solAmount: number,
  feeAccount: PublicKey
) {
  // Get the create transaction
  console.log(mint.publicKey.toBase58());
  const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicKey: owner,
      action: "create",
      tokenMetadata,
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
    console.log("Transaction data: ", data);
    const versionedTransaction = VersionedTransaction.deserialize(
      new Uint8Array(data)
    );
    const addressLookupTable = await Promise.all(
      versionedTransaction.message.addressTableLookups.map(async (lookup) => {
        return new AddressLookupTableAccount({
          key: lookup.accountKey,
          state: AddressLookupTableAccount.deserialize(
            await solanaConnection
              .getAccountInfo(lookup.accountKey)
              .then((res) => res?.data || new Uint8Array())
          ),
        });
      })
    );
    const message = TransactionMessage.decompile(versionedTransaction.message, {
      addressLookupTableAccounts: addressLookupTable,
    });

    const ownerPublicKey = new PublicKey(owner);
    message.instructions.push(
      SystemProgram.transfer({
        fromPubkey: ownerPublicKey,
        toPubkey: feeAccount,
        lamports: CUBIE_AGENT_FEE * LAMPORTS_PER_SOL,
      })
    );
    return new VersionedTransaction(message.compileToV0Message());
  } else {
    console.log(response.statusText); // log error
  }
}

export async function getTokenTransactions(mint: string) {
  const mintPublicKey = new PublicKey(mint);
  const bondingCurve = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mintPublicKey.toBuffer()],
    new PublicKey(PUMPFUN_PROGRAM)
  );

  const assiociatedBondingCurve = await getAssociatedTokenAddress(
    mintPublicKey,
    bondingCurve[0],
    true
  );
  logger.info(
    `Associated bonding curve: ${assiociatedBondingCurve.toBase58()}\n Bonding curve: ${bondingCurve[0].toBase58()}`
  );
  const transactions = await solanaConnection.getSignaturesForAddress(
    bondingCurve[0],
    {
      limit: 5,
      before:
        "31Ln1KbemjcDxfe2njVXiQXm1hckQ3cFFLfNeJbSz1WWtzSEG7Gvrn9mchG1BGBAYioatXJ4Fqhmn429J5dR9MoE",
    },
    "confirmed"
  );

  const successfulTransactions = transactions
    .filter((tx) => tx.err === null)
    .map((tx) => tx.signature);

  console.log(successfulTransactions.length);
  const parsedData = await solanaConnection.getParsedTransactions(
    successfulTransactions,
    {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    }
  );

  // const marketData = [];
  // parsedData.forEach((tx) => {
  //   if (!tx || !tx.blockTime) {
  //     return null;
  //   }
  //   const date = new Date(tx?.blockTime);
  //   const bondingCurveSolBalanceBefore = tx.meta?.preBalances;
  //   const bondingCurveTokenBalanceBefore = tx.meta?.preTokenBalances?.filter(
  //     (accounts) => accounts.owner === bondingCurve[0].toBase58()
  //   )[0];
  //   const bondingCurveTokenBalanceAfter = tx.meta?.postTokenBalances?.filter(
  //     (accounts) => accounts.owner === bondingCurve[0].toBase58()
  //   )[0];

  //   if (
  //     !bondingCurveTokenBalanceBefore ||
  //     !bondingCurveTokenBalanceAfter ||
  //     !bondingCurveTokenBalanceBefore.uiTokenAmount ||
  //     !bondingCurveTokenBalanceAfter.uiTokenAmount ||
  //     !bondingCurveTokenBalanceBefore.uiTokenAmount.uiAmount ||
  //     !bondingCurveTokenBalanceAfter.uiTokenAmount.uiAmount
  //   ) {
  //     return null;
  //   }

  //   let type = "buy";
  //   if (
  //     bondingCurveBalanceAfter.uiTokenAmount.uiAmount >
  //     bondingCurveBalanceBefore.uiTokenAmount.uiAmount
  //   ) {
  //     type = "sell";
  //   }
  // });
  return transactions;
}
