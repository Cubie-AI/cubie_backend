import { io } from "../app.js";
import { getAgentResponse } from "./agent.js";

export async function notifyAgentCreation(agentId: number) {
  const agent = await getAgentResponse(agentId);
  if (!agent) {
    return;
  }

  io.emit("agent_created", agent);
}
