import { Op } from "sequelize";
import { BasicTokenInfo, getJupiterTokenList } from "../../solana/jupiter.js";
import { logger } from "../../utils/logger.js";
import { Token } from "../models.js";

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export async function saveToken(token: BasicTokenInfo) {
  return (await saveTokens(token))[0];
}

export async function saveTokens(tokens: BasicTokenInfo[] | BasicTokenInfo) {
  const finalTokenList = [];
  if (tokens) {
    const bulkTokens = (Array.isArray(tokens) ? tokens : [tokens]).map(
      (data) => ({
        address: data.address,
        name: data.name,
        symbol: data.symbol.startsWith("$") ? data.symbol : `$${data.symbol}`,
        decimals: data.decimals,
        logoURI: data.logoURI,
        tags: data.tags.join(","),
        mintedAt: data.minted_at ? new Date(data.minted_at) : new Date(),
        freezeAuthority: data.freeze_authority,
        mintAuthority: data.mint_authority,
        dailyVolume: data.daily_volume || 0,
      })
    );
    for (let i = 0; i < bulkTokens.length; i += 50) {
      const end = Math.min(i + 50, bulkTokens.length);
      const createdTokens = await Token.bulkCreate(bulkTokens.slice(i, end), {
        ignoreDuplicates: true,
      });
      finalTokenList.push(...createdTokens);
    }
  }
  return finalTokenList;
}

let lastRefresh: number | null = null;
function shouldRefreshTokenList() {
  if (!lastRefresh || Date.now() - lastRefresh > 60 * 60 * 1000) {
    lastRefresh = Date.now();
    return true;
  }
  return false;
}

export async function syncTokensTimer() {
  loadTokens();
  setInterval(loadTokens, 55 * 60 * 1000);
}

export async function loadTokens() {
  try {
    if (!shouldRefreshTokenList()) {
      logger.info("Token list is up to date. Delaying next refresh");
    }
    logger.info("Refreshing token list");
    const loadedTokens = await getJupiterTokenList();
    await saveTokens(loadedTokens);

    logger.info("Token list refreshed");
  } catch (error) {
    console.error(error);
  }
}

export async function getTokensByAddressOrTicker(tickerOrCa: string) {
  try {
    const symbol = `^\\$${tickerOrCa.replace("$", "")}$`;
    logger.info(`Getting token details for ${symbol}`);

    return await Token.findAll({
      where: {
        [Op.or]: [{ symbol: { [Op.regexp]: symbol } }, { address: tickerOrCa }],
      },
    });
  } catch (error) {
    logger.error(error);
    throw new DatabaseError("Unable to get token details");
  }
}
