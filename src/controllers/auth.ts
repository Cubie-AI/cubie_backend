import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { NextFunction, Request, Response, Router } from "express";
import nacl from "tweetnacl";
import { Nonce } from "../db/models.js";
import { makeJwt } from "../middleware/auth.js";
import {
  InternalAuthenticationError,
  InternalValidationError,
} from "../utils/errors.js";
import { logger } from "../utils/logger.js";
const router = Router();

router.get("/nonce", async (req: Request, res: Response) => {
  const { address } = req.query;
  const nonce = Math.random().toString(36).substring(2, 15);
  logger.info(`Generated nonce ${nonce} for address ${address}`);
  await Nonce.create({ nonce, owner: address, used: false });
  res.status(200).json({ nonce });
});

router.post(
  "/sign",
  async (req: Request, res: Response, next: NextFunction) => {
    const { signature, address, nonce } = req.body;

    if (!signature || !address || !nonce) {
      return next(new InternalValidationError("Missing parameters"));
    }

    const checkNonce = await Nonce.findOne({
      where: {
        nonce,
        owner: address,
        used: false,
      },
    });

    if (!checkNonce) {
      return next(new InternalAuthenticationError("Invalid nonce"));
    }

    checkNonce.used = true;
    await checkNonce.save();

    const verify = nacl.sign.detached.verify(
      new TextEncoder().encode(nonce),
      bs58.decode(signature),
      new PublicKey(address).toBytes()
    );

    if (!verify) {
      return next(new InternalAuthenticationError("Invalid signature"));
    }
    logger.info(`Address ${address} signed nonce ${nonce}`);
    const token = await makeJwt(address, nonce);
    res.status(200).json({ token });
  }
);

export default router;
