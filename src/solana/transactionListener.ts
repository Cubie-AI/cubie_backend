import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Agent } from "../db/models.js";
import { startAgentRunner } from "../helpers/maiarRunner.js";
import { notifyAgentCreation } from "../helpers/socket.js";
import { CUBIE_AGENT_FEE } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { solanaConnection } from "./connection.js";
import { startFeeTransfer } from "./transferSubscriber.js";

class FeeAccountSubscription {
  subscriptionId: number;
  feeAccount: string;
  constructor(subscriptionId: number, feeAccount: string) {
    this.subscriptionId = subscriptionId;
    this.feeAccount = feeAccount;
  }
}

export async function pollFeeAccount(feeAccount: PublicKey, agentFee: number) {
  logger.info(`Polling fee account ${feeAccount.toBase58()} for target balance: ${agentFee}`);
  const recievedDeposit = async () => {
    // like a small potential fork risk here
    const account = await solanaConnection.getParsedAccountInfo(feeAccount, {
      commitment: "confirmed",
    });
    return account.value?.lamports;
  };

  // Subtract some margin to cover transfer fees etc
  let balance = (await recievedDeposit()) || 0;
  logger.info(`Fee account ${feeAccount.toBase58()} has balance: ${balance}`);
  if (balance >= agentFee - (0.01 * LAMPORTS_PER_SOL)) {
    logger.info(`Fee account ${feeAccount.toBase58()} has enough balance`);

    // Get the agent if it is still pending
    const agentInfo = await Agent.findOne({
      where: { feeAccountPublicKey: feeAccount.toBase58(), status: "pending" },
    });
    if (!agentInfo) {
      logger.error(
        `Agent with fee account ${feeAccount.toBase58()} not found in DB`
      );
      return;
    }
    const agentId = agentInfo.id;
    Agent.update({ status: "active" }, { where: { id: agentId } });
    notifyAgentCreation(agentId);
    startFeeTransfer(agentId);
    startAgentRunner(agentId);
  } else {
    setTimeout(pollFeeAccount, 1000, feeAccount, agentFee);
  }
}
