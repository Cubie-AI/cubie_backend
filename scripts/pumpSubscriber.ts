import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { PUMPFUN_PROGRAM } from "../src/utils/constants.js";
import { solanaConnection } from "../src/solana/connection.js";
import { struct } from "@solana/buffer-layout";
// @ts-ignore
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import bs58 from "bs58";
import { buy } from "./pumpfun.js";
const pfProgramId = new PublicKey(PUMPFUN_PROGRAM);

const testMint = new PublicKey("5rHjqLvPWbJQTcGusUJ69sfAaDN8RVzRBR5usX1415cv");
// Create provider for agent and add to plugin config
const owner = Keypair.fromSecretKey(
  bs58.decode(process.env.AGENT_PRIVATE_KEY || "")
);
const provider = new AnchorProvider(solanaConnection, new Wallet(owner));

buy(provider, owner, testMint.toBase58(), 1_000_000);
