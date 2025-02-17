import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/constants.js";
import { InternalAuthenticationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export async function checkAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  logger.info("Checking auth");
  const header = req.headers.authorization;
  if (!header) {
    return next(new InternalAuthenticationError("No token provided"));
  }
  try {
    const token = header.split(" ")[1];
    logger.info(`Token is ${token}`);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      address: string;
      nonce: string;
    };

    req.address = decoded.address;

    next();
  } catch (e) {
    return next(
      new InternalAuthenticationError("Unknown authentication error")
    );
  }
}

export async function makeJwt(address: string, nonce: string) {
  return jwt.sign({ address, nonce }, JWT_SECRET, { expiresIn: "30d" });
}
