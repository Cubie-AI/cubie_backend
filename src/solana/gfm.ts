import { PublicKey } from "@solana/web3.js";
import { makeAgentLaunchTransaction } from "../helpers/transaction.js";
import { CUBIE_AGENT_FEE, GFM_ENDPOINT } from "../utils/constants.js";

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

export async function launchGFM(
  gfmParams: MakeGFMParams,
  feeAccount: PublicKey,
  agentFee: number = CUBIE_AGENT_FEE
) {
  const request = await fetch(GFM_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(makeGFMRequest(gfmParams)),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const response = (await request.json()) as GFMResponse;
  console.log(response);

  if (!response.success) {
    return;
  }

  console.log("Success", response.data);

  const transaction = await makeAgentLaunchTransaction(
    Buffer.from(response.data.rawTransaction),
    gfmParams.walletAddress,
    feeAccount,
    agentFee
  );

  console.dir(transaction, { depth: null });
  // return the response.data.rawTransaction to the user and sign it with the wallet
  return transaction;
}
