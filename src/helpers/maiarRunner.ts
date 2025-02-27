import fetch from "node-fetch";
import { MAIAR_RUNNER_SERVICE } from "../utils/constants.js";
import { logger } from "../utils/logger.js";

export async function startAgentRunner(agentId: number) {
  logger.info(
    `Starting agent runner for agent ${agentId} @ ${MAIAR_RUNNER_SERVICE}`
  );
  try {
    
  // ping the runner service to start the agent
  const callBackend = await fetch(MAIAR_RUNNER_SERVICE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
  } catch (e) {
    let message = 'The agent runner service is not available';
    if (e instanceof Error) {
      message = e.message;
    }

    logger.error(`Failed to activate agent ${agentId} with error ${message}`);
  }
 
}
