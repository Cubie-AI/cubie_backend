import { Router } from "express";
import {
  getAgentById,
  getAgentByIdAndOwner,
  getAgents,
} from "../db/repositories.js";
import { InternalValidationError } from "../utils/errors.js";

import { Keypair } from "@solana/web3.js";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import multer from "multer";
import { Agent, AgentInfo } from "../db/models.js";
import { checkAuth } from "../middleware/auth.js";
import { getCreateAndBuyTransaction } from "../solana/pumpfun.js";
import { feeListener } from "../solana/transactionListener.js";
import { logger } from "../utils/logger.js";

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, import.meta.dirname + "/../../public/images");
  },
  filename: function (_req, file, cb) {
    const ext = file.originalname.split(".").pop();
    cb(null, randomBytes(16).toString("hex") + "." + ext);
  },
});

const upload = multer({
  storage: storage,
});

const router = Router();

router.get("/", async (req, res, next) => {
  const { order = "", filter = "" } = req.query;

  if (typeof order !== "string" || typeof filter !== "string") {
    return next(new InternalValidationError("Invalid query parameters"));
  }
  const agents = await getAgents(filter, order);

  const response = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    mint: agent.mint,
    owner: agent.owner,
    imageUrl: agent.image_url,
    bio: agent.bio,
    twitter: agent.tw_handle,
    telegram: agent.telegram,
  }));

  res.status(200).json(response);
});

router.get("/:id", async (req, res, next) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return next(new InternalValidationError("Invalid agent ID"));
  }

  const agent = await getAgentById(id);

  if (!agent) {
    return next(new InternalValidationError("Agent not found"));
  }

  const response = {
    id: agent.id,
    name: agent.name,
    mint: agent.mint,
    owner: agent.owner,
    imageUrl: agent.image_url,
    bio: agent.bio,
    twitter: agent.tw_handle,
    telegram: agent.telegram,
  };

  res.status(200).json(response);
});

router.post("/launch", upload.single("image"), async (req, res, next) => {
  const {
    name,
    ticker,
    bio,
    twitterConfig,
    telegramConfig,
    owner,
    knowledge = [],
    people = [],
    style = [],
    twitterStyle = [],
    telegramStyle = [],
    devBuy = 0,
  } = req.body;

  logger.info(
    `Launching agent ${name} with fields: ${ticker}, ${bio}, ${owner}, ${knowledge}, ${people}, ${style}, ${twitterStyle}, ${telegramStyle}, ${devBuy}, ${twitterConfig}, ${telegramConfig}`
  );
  if (!name || !ticker || !bio) {
    return next(new InternalValidationError("Missing required fields"));
  }
  let agentBio = `${bio}\nLaunched by $CUBIE (https://cubie.fun)`;

  if (!devBuy || isNaN(devBuy)) {
    return next(new InternalValidationError("Invalid dev buy"));
  }

  if (!req.file) {
    return next(new InternalValidationError("Image is required"));
  }

  if (!twitterConfig && !telegramConfig) {
    return next(
      new InternalValidationError("Enable at least one social media platform")
    );
  }

  let twitterConfigParsed = { username: "", password: "", email: "" };
  if (twitterConfig) {
    try {
      twitterConfigParsed = JSON.parse(twitterConfig);
    } catch (e) {
      return next(new InternalValidationError("Invalid Twitter configuration"));
    }
  }
  if (
    twitterConfigParsed &&
    !twitterConfigParsed.username &&
    !twitterConfigParsed.password &&
    !twitterConfigParsed.email
  ) {
    return next(new InternalValidationError("Invalid Twitter configuration"));
  }
  let telegramConfigParsed;
  if (telegramConfig) {
    try {
      telegramConfigParsed = JSON.parse(telegramConfig);
    } catch (e) {
      return next(
        new InternalValidationError("Invalid Telegram configuration")
      );
    }
  }

  if (
    telegramConfigParsed &&
    !telegramConfigParsed.username &&
    !telegramConfigParsed.botToken
  ) {
    return next(new InternalValidationError("Invalid Telegram configuration"));
  }
  const fileUrl = "/images/" + req.file.filename;

  const agentInfo: AgentInfo[] = [];
  people.forEach((data: string) => {
    agentInfo.push(AgentInfo.build({ type: "people", data }));
  });
  knowledge.forEach((data: string) => {
    agentInfo.push(AgentInfo.build({ type: "knowledge", data }));
  });
  style.forEach((data: string) => {
    agentInfo.push(AgentInfo.build({ type: "style", data }));
  });
  twitterStyle.forEach((data: string) => {
    agentInfo.push(AgentInfo.build({ type: "twitter_style", data }));
  });
  telegramStyle.forEach((data: string) => {
    agentInfo.push(AgentInfo.build({ type: "telegram_style", data }));
  });

  const mint = Keypair.generate();
  const userFeeAccount = Keypair.generate();

  const agentData = {
    name,
    ticker,
    bio: agentBio,
    owner,
    mint: mint.publicKey.toBase58(),
    image_url: fileUrl,
    status: "pending",
    feeAccountPublicKey: userFeeAccount.publicKey.toBase58(),
    feeAccountPrivateKey: userFeeAccount.secretKey.toString(),
  } as Agent;

  if (twitterConfigParsed) {
    logger.info(JSON.stringify(twitterConfigParsed));
    agentData.tw_handle = twitterConfigParsed.username;
    agentData.tw_email = twitterConfigParsed.email;
    agentData.tw_password = twitterConfigParsed.password;
  }

  if (telegramConfigParsed) {
    logger.info("Setting telegram data: ", telegramConfigParsed);
    agentData.telegram = telegramConfigParsed.username;
    agentData.telegram_bot_token = telegramConfigParsed.botToken;
  }

  logger.info("Creating agent with data: ", agentData);
  const agent = Agent.build({ ...agentData });

  logger.info("Saving agent");
  await agent.save();
  logger.info("Agent saved");

  const fileBuffer = readFileSync(req.file.path);
  const transaction = await getCreateAndBuyTransaction(
    agent.id,
    owner,
    name,
    ticker,
    agentBio,
    fileBuffer,
    req.file.mimetype,
    twitterConfigParsed?.username || "",
    telegramConfigParsed?.username || "",
    mint,
    devBuy,
    userFeeAccount.publicKey
  );

  if (!transaction) {
    return next(new InternalValidationError("Failed to create agent"));
  }
  transaction?.sign([mint]);
  // For now we assume it is a fixed sol amount to launch an agent
  feeListener.listen(userFeeAccount.publicKey.toBase58(), agent.id);
  res.status(200).json({
    mint: mint.publicKey.toBase58(),
    transaction: Buffer.from(transaction.serialize()).toString("base64"),
  });
});

router.put("/:id", checkAuth, async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  const agent = await getAgentByIdAndOwner(id, req.address);

  if (!agent) {
    return next(new InternalValidationError("Agent not found"));
  }

  await Agent.update(data, {
    where: { id },
  });

  res.status(200).json({ status: agent.status });
});

export default router;
