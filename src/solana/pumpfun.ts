import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { CUBIE_AGENT_FEE } from "../utils/constants.js";
import { solanaConnection } from "./connection.js";
export async function getCreateAndBuyTransaction(
  agentId: number,
  owner: string,
  name: string,
  ticker: string,
  description: string,
  imageBuffer: Buffer,
  mime: string,
  x_handle: string,
  telegram: string,
  mint: Keypair,
  solAmount: number,
  feeAccount: PublicKey
) {
  // Define token metadata
  const formData = new FormData();
  console.log(imageBuffer);
  console.log(mime);
  formData.append("file", new Blob([imageBuffer], { type: mime })), // Image file
    formData.append("name", name);
  formData.append("symbol", ticker);
  formData.append("description", description);

  if (x_handle) {
    formData.append("twitter", `https://x.com/${x_handle}`);
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

  console.log(metadataResponseJSON);
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
