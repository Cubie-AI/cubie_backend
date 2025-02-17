import { Router } from "express";
import { checkAuth } from "../middleware/auth.js";
import { getQuote, getSwapTransaction } from "../solana/jupiter.js";
import { InternalValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.use(checkAuth);

router.get("/quote", async (req, res, next) => {
  const { inputMint, outputMint, amount, slippageBps = 50 } = req.query;

  console.log(inputMint, outputMint, amount, slippageBps);
  if (!outputMint || !inputMint || !amount) {
    return next(new InternalValidationError("Invalid query parameters"));
  }

  const quote = await getQuote({
    inputMint: inputMint.toString(),
    outputMint: outputMint.toString(),
    amount: parseFloat(amount.toString()),
    slippageBps: parseInt(slippageBps.toString(), 10),
  });
  logger.info(JSON.stringify(quote));

  res.status(200).json(quote);
});

router.post("/transaction", async (req, res, next) => {
  const { quote } = req.body;
  const address = req.address;

  console.log(quote, address);
  const swap = await getSwapTransaction({
    quote,
    userPublicKey: address,
  });

  if (!swap || swap.error) {
    return next(
      new InternalValidationError(swap?.error || "Creating swap failed.")
    );
  }
  res.status(200).json(swap);
});

export default router;
