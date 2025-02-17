import { MAIAR_RUNNER_SERVICE } from "../utils/constants.js";
import { logger } from "../utils/logger.js";

export async function startAgentRunner(agentId: number) {
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
