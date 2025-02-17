import { Router } from "express";
import { Comment } from "../db/models.js";
import { addComment } from "../db/repositories/comment.js";
import { checkAuth } from "../middleware/auth.js";
import { InternalValidationError } from "../utils/errors.js";

const router = Router();

router.post("/", checkAuth, async (req, res, next) => {
  const { agentId, content, replyTo } = req.body;

  if (typeof agentId !== "number" || typeof content !== "string") {
    return next(new InternalValidationError("Invalid comment data"));
  }

  if (replyTo) {
    if (typeof replyTo !== "number") {
      return next(new InternalValidationError("Invalid replyTo data"));
    }
    const replyExists = await Comment.findOne({
      where: {
        id: replyTo,
        agentId,
      },
    });
    if (!replyExists) {
      return next(new InternalValidationError("Invalid replyTo data"));
    }
  }

  const comment = await addComment({
    agentId,
    content,
    replyTo,
    address: req.address,
  });

  res.status(200).json(comment.toJSON());
});

export default router;
