import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Agent } from "../db/models.js";
import { CUBIE_FEE_ACCOUNT } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { solanaConnection } from "./connection.js";

async function makeTransaction(
  instructions: TransactionInstruction[],
  payer: Keypair
) {
  const latestBlockhash = await solanaConnection.getLatestBlockhash();
  const transactionMessage = new TransactionMessage({
    instructions: instructions,
    payerKey: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([payer]);
  return transaction;
}

export async function makeV0Transaction(
  instructions: TransactionInstruction[],
  payer: Keypair,
  maxFee = 0.003 //max fee in SOL
) {
  try {
    const simulatedTransaction = await makeTransaction(instructions, payer);

    const simulate = await solanaConnection.simulateTransaction(
      simulatedTransaction,
      {
        commitment: "confirmed",
      }
    );

    const simulatedUnits = simulate.value.unitsConsumed || 500;
    const units = simulatedUnits < 500 ? 500 : Math.ceil(simulatedUnits * 2);
    const maxUserFee = Math.floor(
      (maxFee * LAMPORTS_PER_SOL * 1_000_000) / units
    );

    logger.info(`Units: ${units}, Lamports per unit: ${maxUserFee}`);

    instructions.unshift(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: maxUserFee,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({
        units: units,
      })
    );
    const transaction = await makeTransaction(instructions, payer);

    const signature = await solanaConnection.sendTransaction(transaction, {
      maxRetries: 5,
      skipPreflight: true,
    });

    console.log("Signature: ", signature);
    return signature;
  } catch (error) {
    logger.error(error);
  }
}

export async function startFeeTransfer(agentId: number) {
  logger.info(`Starting fee transfer for agent: ${agentId}`);
  const agent = await Agent.findOne({
    where: {
      id: agentId,
    },
  });
  if (!agent) {
    logger.error(`Agent not found for id: ${agentId}`);
    return;
  }
  const feeAccount = Keypair.fromSecretKey(
    Buffer.from(agent.feeAccountPrivateKey, "base64")
  );
  const accout = await solanaConnection.getParsedAccountInfo(
    feeAccount.publicKey
  );
  const balance = accout.value?.lamports || 0;

  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    logger.error(
      `Insufficient balance for fee account: ${feeAccount.publicKey.toBase58()}`
    );
    return;
  }
  transferFeeSubscriber.handleSubmit({
    feeAccount: feeAccount,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: feeAccount.publicKey,
        toPubkey: CUBIE_FEE_ACCOUNT,
        lamports: balance - 0.01 * LAMPORTS_PER_SOL,
      }),
    ],
  });
}

interface FeeAccountSubscriber {
  feeAccount: Keypair;
  instructions: TransactionInstruction[];
}

class TransferFeeSubscriber {
  subscriptions: Record<string, number> = {};

  async handleSubmit(params: FeeAccountSubscriber) {
    logger.info(
      `Starting submit transaction for ${params.feeAccount.publicKey}`
    );
    const signature = await makeV0Transaction(
      params.instructions,
      params.feeAccount
    );

    if (!signature) {
      logger.error("Failed to submit transaction");
      return;
    }

    const subscribe = solanaConnection.onSignature(
      signature,
      (result) => {
        solanaConnection.removeSignatureListener(this.subscriptions[signature]);
        if (result.err) {
          logger.error(
            `Failed to confirm transaction: ${result.err} for ${signature} and ${params.feeAccount.publicKey}`
          );
          this.handleSubmit(params);
          return;
        }
      },
      "confirmed"
    );

    this.subscriptions[signature] = subscribe;
  }
}

export const transferFeeSubscriber = new TransferFeeSubscriber();
