import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Op } from "sequelize";
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
  agentId: number;
  constructor(subscriptionId: number, feeAccount: string, agentId: number) {
    this.subscriptionId = subscriptionId;
    this.feeAccount = feeAccount;
    this.agentId = agentId;
  }
}

async function feeAccountHandler(feeAccount: PublicKey, agentId: number) {
  logger.info(
    `Checking balance for fee account: ${feeAccount.toBase58()} and agentId: ${agentId}`
  );
  const balance = await solanaConnection.getBalance(feeAccount);

  const target = (CUBIE_AGENT_FEE - 0.01) * LAMPORTS_PER_SOL;
  logger.info(
    `Balance for fee account: ${feeAccount.toBase58()} is ${balance} with target: ${target}`
  );
  if (balance >= target) {
    Agent.update({ status: "active" }, { where: { id: agentId } });
    notifyAgentCreation(agentId);
    startFeeTransfer(agentId);
    startAgentRunner(agentId);
  }
}

const BATCH_SIZE = 10;
class FeeAccountListener {
  connection: Connection;
  agentListeners: Record<string, FeeAccountSubscription> = {};
  constructor(connection: Connection, agents: Agent[]) {
    this.connection = connection;

    const pendingAgents = agents.filter((agent) => agent.status === "pending");
    logger.info(`Starting wallet listener for ${agents.length} wallets`);

    let delay = 0;
    for (let i = 0; i < pendingAgents.length; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, agents.length);
      const batch = pendingAgents.slice(i, batchEnd);
      setTimeout(
        () =>
          batch.forEach((agent) =>
            this.listen(agent.feeAccountPublicKey, agent.id)
          ),
        delay
      );
      delay += 1000;
    }
  }

  async listen(feeAccount: string, agentId: number) {
    logger.info(
      `Attempting to start wallet listener on address: ${feeAccount}`
    );
    const feeAccountPublicKey = new PublicKey(feeAccount);
    await feeAccountHandler(feeAccountPublicKey, agentId);

    if (this.agentListeners[feeAccount]) {
      logger.info(`Already listening to wallet: ${feeAccount}`);
    } else {
      const subscriptionId = this.connection.onAccountChange(
        new PublicKey(feeAccount),
        async (account) => {
          logger.info("Account changed: ", JSON.stringify(account, null, 2));
          if (account.lamports >= CUBIE_AGENT_FEE * LAMPORTS_PER_SOL) {
            await feeAccountHandler(feeAccountPublicKey, agentId);
            this.connection.removeAccountChangeListener(subscriptionId);
          }
        },
        {
          commitment: "confirmed",
          encoding: "jsonParsed",
        }
      );

      this.agentListeners[feeAccount] = new FeeAccountSubscription(
        subscriptionId,
        feeAccount,
        agentId
      );
      logger.info(
        `Listening to wallet: ${feeAccount} with subscription ID: ${subscriptionId}`
      );
    }
  }
}
export const feeListener = new FeeAccountListener(
  solanaConnection,
  await Agent.findAll({
    where: {
      createdAt: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })
);
