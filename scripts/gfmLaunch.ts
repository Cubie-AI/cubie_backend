import {
  AddressLookupTableAccount,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { solanaConnection } from "../src/solana/connection.js";

const gfmProgram = new PublicKey(
  "GFMioXjhuDWMEBtuaoaDPJFPEnL2yDHCWKoVPhj1MeA7"
);

interface GFMRequest {
  raise: {
    claimWindowInHours: number;
    target: number;
  };
  kycConfig: { type: "none" };
  walletAddress: string;
  amountIn: number; // ui amount of solana to launch with
  priorFee: number; // decimal priority fee
  token: {
    base64: string; // base64 encoded buffer of image
    description: string; // token description
    discord: string; // discord link
    name: string; // token name
    symbol: string; // token symbol
    telegram: string; // telegram link
    twitter: string; // twitter link
    website: string; // website link
  };
  tokenomics: {
    decimals: number; // token decimals
    supply: number; // token supply
    curveConstant: number; // bonding curve constant
    curveExponent: number; // bonding curve exponent
  };
}
const endpoint =
  "https://www.gofundmeme.io/gofundmeme/v1/api/interface/pool/bonding-curve/create/request";

interface MakeGFMParams {
  image: Buffer;
  walletAddress: string;
  name: string;
  symbol: string;
  description?: string;
  amountIn: number;
  priorFee: number;
  discord?: string;
  telegram?: string;
  twitter?: string;
  website?: string;
}
function makeGFMRequest(params: MakeGFMParams): GFMRequest {
  const {
    image,
    walletAddress,
    description,
    name,
    symbol,
    amountIn,
    priorFee,
    discord,
    telegram,
    twitter,
    website,
  } = params;

  if (
    !name ||
    !image ||
    !walletAddress ||
    !symbol ||
    !amountIn ||
    isNaN(amountIn)
  ) {
    throw new Error("Invalid params");
  }

  const _priorFee = priorFee || 0.01;
  return {
    raise: {
      claimWindowInHours: 2,
      target: 0,
    },
    kycConfig: { type: "none" },
    walletAddress,
    amountIn,
    priorFee: _priorFee,
    token: {
      base64: image.toString("base64"),
      description: description || "",
      discord: discord || "",
      name,
      symbol,
      telegram: telegram || "",
      twitter: twitter || "",
      website: website || "",
    },
    tokenomics: {
      decimals: 9,
      supply: 1000000000,
      curveConstant: 1,
      curveExponent: 1,
    },
  };
}

type GFMSuccessResponse = {
  mintAddress: string;
  requestId: string;
  rawTransaction: Buffer;
};

type GFMErrorResponse = {
  title: string;
  description: string;
};
type GFMResponse =
  | {
      success: true;
      data: GFMSuccessResponse;
    }
  | {
      success: false;
      data: GFMErrorResponse;
    };

async function makeCubieTransaction(
  data: Buffer,
  owner: string,
  feeAccount: PublicKey,
  agentFee: number
) {
  const versionedTransaction = VersionedTransaction.deserialize(
    new Uint8Array(data)
  );
  const addressLookupTable = await Promise.all(
    versionedTransaction.message.addressTableLookups.map(async (lookup) => {
      return new AddressLookupTableAccount({
        key: lookup.accountKey,
        state: AddressLookupTableAccount.deserialize(
          await solanaConnection
            .getAccountInfo(lookup.accountKey)
            .then((res) => res?.data || new Uint8Array())
        ),
      });
    })
  );
  const message = TransactionMessage.decompile(versionedTransaction.message, {
    addressLookupTableAccounts: addressLookupTable,
  });

  const ownerPublicKey = new PublicKey(owner);
  message.instructions.push(
    SystemProgram.transfer({
      fromPubkey: ownerPublicKey,
      toPubkey: feeAccount,
      lamports: agentFee,
    })
  );
  return new VersionedTransaction(message.compileToV0Message());
}

async function launch() {
  const image = readFileSync(import.meta.dirname + "/test.png");

  const params = {
    image,
    walletAddress: Keypair.generate().publicKey.toBase58(),
    name: "Cubie",
    symbol: "CubieGFM",
    description: "Testing launching on gfm for cubie.fun",
    amountIn: 0.15,
    priorFee: 0.01,
    telegram: "https://t.me/cubie_portal",
    twitter: "https://x.com/cubieai",
    website: "https://cubie.fun",
  };

  const request = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify(makeGFMRequest(params)),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const response = (await request.json()) as GFMResponse;
  console.log(response);

  if (!response.success) {
    throw new Error(response.data.description);
  }

  console.log("Success", response.data);

  const transaction = await makeCubieTransaction(
    Buffer.from(response.data.rawTransaction),
    params.walletAddress,
    Keypair.generate().publicKey,
    100
  );

  console.dir(transaction, { depth: null });
  // return the response.data.rawTransaction to the user and sign it with the wallet
  return transaction;
}

launch();
