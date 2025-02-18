import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL, SOLANA_WSS_URL } from "../utils/constants.js";

export const solanaConnection = new Connection(SOLANA_RPC_URL, {
  wsEndpoint: SOLANA_WSS_URL,
  commitment: "confirmed",
});
