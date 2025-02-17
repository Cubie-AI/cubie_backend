import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";

import agentRouter from "./controllers/agent.js";
import authRouter from "./controllers/auth.js";
import { InternalRequestError } from "./utils/errors.js";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(import.meta.dirname + "/../public"));

app.use("/api/auth", authRouter);
app.use("/api/agent", agentRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  let status = 500;
  let message = "Internal Server Error";
  if (err instanceof InternalRequestError) {
    status = err.status;
    message = err.message;
  }

  res.status(status).json({ error: message });
});

app.listen(8080, () => {
  console.log("Server is running");
});
