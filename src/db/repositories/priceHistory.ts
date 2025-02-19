import { PriceHistory } from "../models.js";

export async function getLastSignature(agentId: number) {
  const lastSignature = await PriceHistory.findOne({
    where: { agentId },
    order: [["blockTime", "DESC"]],
  });
  return lastSignature?.signature || "";
}

export async function getPriceHistory(agentId: number, limit: number) {
  return await PriceHistory.findAll({
    where: { agentId },
    order: [["blockTime", "DESC"]],
    limit,
  });
}
