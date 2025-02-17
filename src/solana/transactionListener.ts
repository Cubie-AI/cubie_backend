import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Op } from "sequelize";
import { Agent } from "../db/models.js";
import { CUBIE_AGENT_FEE, MAIAR_RUNNER_SERVICE } from "../utils/constants.js";
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

  listen(feeAccount: string, agentId: number) {
    logger.info(
      `Attempting to start wallet listener on address: ${feeAccount}`
    );

    if (this.agentListeners[feeAccount]) {
      logger.info(`Already listening to wallet: ${feeAccount}`);
    } else {
      const subscriptionId = this.connection.onAccountChange(
        new PublicKey(feeAccount),
        async (account) => {
          const newBalance = account.lamports;
          if (newBalance >= (CUBIE_AGENT_FEE - 0.01) * LAMPORTS_PER_SOL) {
            Agent.update({ status: "active" }, { where: { id: agentId } });

            // start to transfer the fees from the listener to the main account
            startFeeTransfer(agentId);

            // ping the runner service to start the agent
            const callBackend = await fetch(MAIAR_RUNNER_SERVICE, {
              method: "POST",
              body: JSON.stringify({
                agentId,
              }),
            });
            if (callBackend.status === 200) {
              logger.info(`Agent ${agentId} is now active`);
            } else {
              logger.error(
                `Failed to activate agent ${agentId} with status ${callBackend.status}`
              );
            }
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
