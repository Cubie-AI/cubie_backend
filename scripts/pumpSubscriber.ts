import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { solanaConnection } from "../src/solana/connection.js";
import { PUMPFUN_PROGRAM } from "../src/utils/constants.js";
// @ts-ignore
const pfProgramId = new PublicKey(PUMPFUN_PROGRAM);

// const testMint = new PublicKey("5rHjqLvPWbJQTcGusUJ69sfAaDN8RVzRBR5usX1415cv");
// // Create provider for agent and add to plugin config
// const owner = Keypair.fromSecretKey(
//   bs58.decode(process.env.AGENT_PRIVATE_KEY || "")
// );
// const provider = new AnchorProvider(solanaConnection, new Wallet(owner));

// buy(provider, owner, testMint.toBase58(), 1_000_000);

// const provider = new AnchorProvider(
//   solanaConnection,
//   new Wallet(Keypair.generate())
// );

// const program = new Program(IDL as PumpFun, provider);

const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const CREATE_DISCRIMINTAOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);

async function parsePumpTransaction(signature: string) {
  const time = Date.now();

  const transaction = await solanaConnection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  const transactionTime = transaction?.blockTime;
  // console.dir(transaction, { depth: null });

  // transaction?.meta?.preTokenBalances; => structured objects {accountIndex: number;
  // mint: string;
  // owner?: string;
  // programId?: string;
  // uiTokenAmount: TokenAmount;}
  // transaction?.meta?.preBalances = Array<numbers> ==> index corresponds to the account in transaction.message.accountKeys (PublickKey[])

  const pumpfunIndex =
    transaction?.transaction.message.staticAccountKeys.findIndex((account) =>
      account.equals(pfProgramId)
    );

  // console.log(`pumpfun index: ${pumpfunIndex}`);
  const compiledInsturctions =
    transaction?.transaction.message.compiledInstructions.filter(
      (ins) => ins.programIdIndex === pumpfunIndex
    );
  // console.dir(compiledInsturctions, { depth: null });
  compiledInsturctions?.forEach((compiledInstruction) => {
    const buffer = Buffer.from(compiledInstruction.data);

    const discrim = buffer.readBigUInt64LE(0);
    const tokenAmount = buffer.readBigUInt64LE(8);
    const solAmount = buffer.readBigUInt64LE(16);

    const baseData = {
      type:
        discrim.toString() === SELL_DISCRIMINATOR.readBigUint64LE().toString()
          ? "sell"
          : "buy",
      signature,
      tokenAmount: Number(tokenAmount) / Math.pow(10, 6),
      solAmount: Number(solAmount) / LAMPORTS_PER_SOL,
    };

    console.dir(baseData, { depth: null });
  });
}
solanaConnection.onLogs(
  pfProgramId,
  (data) => !data.err && parsePumpTransaction(data.signature)
);
