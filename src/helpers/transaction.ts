import {
  AddressLookupTableAccount,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { solanaConnection } from "../solana/connection.js";

export async function makeAgentLaunchTransaction(
  data: Buffer,
  owner: string,
  feeAccount: PublicKey,
  agentFee: number
) {
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
      lamports: agentFee,
    })
  );
  return new VersionedTransaction(message.compileToV0Message());
}
