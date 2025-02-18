import { PublicKey } from "@solana/web3.js";
import { solanaConnection } from "../src/solana/connection.js";
import { logger } from "../src/utils/logger.js";

solanaConnection.onAccountChange(
  new PublicKey("9SAoGxPtitvd5wRRGE5eyoTmQUZhVhaPX9ATTyEKt5XY"),
  (account) => {
    console.dir(account, { depth: null });
  }
);

logger.info("Subscribed to account changes");
