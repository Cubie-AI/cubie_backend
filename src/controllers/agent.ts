import { Router } from "express";
import {
  getAgentById,
  getAgentByIdAndOwner,
  getAgents,
} from "../db/repositories.js";
import { InternalValidationError } from "../utils/errors.js";

import { Keypair } from "@solana/web3.js";
import { randomBytes } from "crypto";
import multer from "multer";
import { Agent, AgentInfo } from "../db/models.js";
import { checkAuth } from "../middleware/auth.js";
import { getCreateAndBuyTransaction } from "../solana/pumpfun.js";
import { feeListener } from "../solana/transactionListener.js";

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, import.meta.dirname + "/../../public/images");
  },
  filename: function (_req, file, cb) {
    cb(null, randomBytes(16).toString("hex"));
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

  if (!name || !ticker || !bio) {
    return next(new InternalValidationError("Missing required fields"));
  }

  if (!devBuy || isNaN(devBuy)) {
    return next(new InternalValidationError("Invalid dev buy"));
  }

  if (!req.file) {
    return next(new InternalValidationError("Image is required"));
  }

  if (!twitterConfig && !telegramConfig) {
    return next(
      new InternalValidationError("Missing social media configuration")
    );
  }

  if (
    twitterConfig &&
    (!twitterConfig.email || !twitterConfig.password || !twitterConfig.username)
  ) {
    return next(new InternalValidationError("Missing Twitter credentials"));
  }

  if (telegramConfig && !telegramConfig.botToken) {
    return next(new InternalValidationError("Missing Telegram bot token"));
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

  const agent = Agent.build({
    name,
    ticker,
    bio,
    owner,
    mint: mint.publicKey.toBase58(),
    image_url: fileUrl,
    status: "pending",
    telegram: telegramConfig ? telegramConfig.username : "",
    agentInfo: agentInfo,
    tw_password: twitterConfig ? twitterConfig.password : "",
    tw_email: twitterConfig ? twitterConfig.email : "",
    tw_handle: twitterConfig ? twitterConfig.username : "",
    telegram_bot_token: telegramConfig ? telegramConfig.botToken : "",
    feeAccountPublicKey: userFeeAccount.publicKey.toBase58(),
    feeAccountPrivateKey: userFeeAccount.secretKey.toString(),
  });

  await agent.save();
  const transaction = getCreateAndBuyTransaction(
    agent.id,
    owner,
    name,
    ticker,
    bio,
    req.file.filename,
    twitterConfig.username,
    telegramConfig.username,
    mint,
    devBuy,
    userFeeAccount.publicKey
  );

  // For now we assume it is a fixed sol amount to launch an agent
  feeListener.listen(userFeeAccount.publicKey.toBase58(), agent.id);
  res.status(200).json({ mint: mint.publicKey.toBase58(), transaction });
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
