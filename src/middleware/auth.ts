import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Nonce } from "../db/models/nonce.js";
import { JWT_SECRET } from "../utils/constants.js";
import { InternalAuthenticationError } from "../utils/errors.js";

export async function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header) {
    return next(new InternalAuthenticationError("No token provided"));
  }
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      address: string;
      nonce: string;
    };

    const checkNonce = await Nonce.findOne({
      where: {
        nonce: decoded.nonce,
        owner: decoded.address,
        used: false,
      },
    });

    if (!checkNonce) {
      return next(new InternalAuthenticationError("Invalid token"));
    }
    req.address = decoded.address;

    next();
  } catch (e) {
    return next(
      new InternalAuthenticationError("Unknown authentication error")
    );
  }
}

export async function makeJwt(address: string, nonce: string) {
  const token = jwt.sign({ address, nonce }, JWT_SECRET, { expiresIn: "30d" });
  return token;
}
