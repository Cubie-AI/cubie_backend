import { getAgentById } from "../db/repositories.js";
import { HistoricPrice } from "../solana/birdeye.js";
import { getBucketedData } from "../solana/dexscreener.js";
import { getTokenMarketData } from "../solana/token.js";

export async function getAgentResponse(id: number) {
  const agent = await getAgentById(id);

  if (!agent) {
    return null;
  }

  const marketData = await getTokenMarketData(agent.mint);
  const volume = await getBucketedData([agent.mint]);

  return {
    id: agent.id,
    name: agent.name,
    mint: agent.mint,
    ticker: agent.ticker,
    owner: agent.owner,
    photo: agent.image_url,
    bio: agent.bio,
    twitter: agent.tw_handle,
    telegram: agent.telegram,
    history: [] as HistoricPrice[],
    ...(marketData[agent.mint] || {}),
    volume: volume[agent.mint],
    knowledge: (agent.agentInfo || [])
      .filter((data) => data.type === "knowledge")
      .map((data) => data.data),
  };
}
