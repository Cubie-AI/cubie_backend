import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { CUBIE_AGENT_FEE } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { solanaConnection } from "./connection.js";

class FeeAccountSubscription {
  subscriptionId: number;
  feeAccount: string;
  constructor(subscriptionId: number, feeAccount: string) {
    this.subscriptionId = subscriptionId;
    this.feeAccount = feeAccount;
  }
}

export async function pollFeeAccount(feeAccount: PublicKey) {
  logger.info("Polling fee account");
  const recievedDeposit = async () => {
    const account = await solanaConnection.getParsedAccountInfo(feeAccount);
    return account.value?.lamports;
  };
  let balance = (await recievedDeposit()) || 0;

  if (balance >= (CUBIE_AGENT_FEE - 0.03) * LAMPORTS_PER_SOL) {
    logger.info(`Fee account ${feeAccount.toBase58()} has enough balance`);
    // Agent.update({ status: "active" }, { where: { id: agentId } });
    // notifyAgentCreation(agentId);
    // startFeeTransfer(agentId);
    // startAgentRunner(agentId);
  } else {
    setTimeout(pollFeeAccount, 5000, feeAccount);
  }
}
