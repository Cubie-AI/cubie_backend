import { PublicKey } from "@solana/web3.js";
import { NextFunction, Request, Response, Router } from "express";
import nacl from "tweetnacl";
import { Nonce } from "../db/models/nonce.js";
import { makeJwt } from "../middleware/auth.js";
import { InternalAuthenticationError } from "../utils/errors.js";

const router = Router();

router.get("/nonce", async (req: Request, res: Response) => {
  const { address } = req.query;
  const nonce = Math.random().toString(36).substring(2, 15);
  await Nonce.create({ nonce, owner: address, used: false });
  res.status(200).json({ nonce });
});

router.post(
  "/sign",
  async (req: Request, res: Response, next: NextFunction) => {
    const { signature, address, nonce } = req.body;

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

    const bytes = new Uint8Array(Buffer.from(nonce, "utf-8"));
    const verify = nacl.sign.detached.verify(
      bytes,
      new Uint8Array(Buffer.from(signature, "base64")),
      new PublicKey(address).toBytes()
    );

    if (!verify) {
      return next(new InternalAuthenticationError("Invalid signature"));
    }

    res.status(200).json({ token: makeJwt(address, nonce) });
  }
);
