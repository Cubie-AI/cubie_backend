import { PublicKey } from "@solana/web3.js";
import { solanaConnection } from "../src/solana/connection.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CUBIE_MINT } from "../src/utils/constants.js";


const address = new PublicKey("7cbczzhHT6MZ7L8tCHmWwyeBrphCXCupsJAyE23ycuSx");

const associatedAddress = getAssociatedTokenAddressSync(new PublicKey(CUBIE_MINT), address)

const tokenBalance = await solanaConnection.getTokenAccountBalance(associatedAddress);

const solanaBalance = await solanaConnection.getAccountInfo(address);

console.dir(solanaBalance, { depth: null });
console.dir(tokenBalance, { depth: null });