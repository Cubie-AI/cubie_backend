import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "../utils/constants.js";

export const solanaConnection = new Connection(SOLANA_RPC_URL);
