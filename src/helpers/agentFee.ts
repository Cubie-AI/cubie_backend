// agent fee increases 0.5% per agent

import { Agent } from "../db/models.js";

export async function getAgentFee(){
  const count = await Agent.count();
  return 0.1 * Math.pow(1.005, count);
}