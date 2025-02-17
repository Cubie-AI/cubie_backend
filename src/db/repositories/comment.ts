import { Comment } from "../models/comment.js";

interface AddComment {
  agentId: number;
  address: string;
  content: string;
  replyTo: number | null;
}

export async function addComment(params: AddComment) {
  return await Comment.create({
    ...params,
  });
}

export async function getComments(agentId: number) {
  return await Comment.findAll({
    where: {
      agentId,
    },
  });
}
