import { Comment } from "../db/models.js";
import { getAgentById } from "../db/repositories.js";
import { getHistoricalPrices, HistoricPrice } from "../solana/birdeye.js";
import { getBucketedData } from "../solana/dexscreener.js";
import { getTokenMarketData } from "../solana/token.js";

export async function getAgentResponse(id: number, expanded = false) {
  const agent = await getAgentById(id);

  if (!agent) {
    return null;
  }

  const marketData = await getTokenMarketData(agent.mint);

  const response = {
    id: agent.id,
    name: agent.name,
    mint: agent.mint,
    ticker: agent.ticker,
    owner: agent.owner,
    photo: agent.image_url,
    bio: agent.bio,
    twitter: agent.tw_handle,
    telegram: agent.telegram,
    volume: {},
    history: [] as HistoricPrice[],
    comments: [] as Comment[],
    ...(marketData[agent.mint] || {}),
  };

  if (expanded) {
    response.history = await getHistoricalPrices(agent.mint);
    response.comments = agent.comments.map((comment) => comment.toJSON());
    response.volume = (await getBucketedData([agent.mint]))[agent.mint];
  }

  return response;
}
