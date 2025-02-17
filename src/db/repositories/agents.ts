import { Agent, AgentInfo } from "../models.js";
import { Comment } from "../models/comment.js";

const ASSOCIATIONS = [
  {
    model: AgentInfo,
    as: "info",
  },
  {
    model: Comment,
    as: "comments",
  },
];

export async function getAgents() {
  return await Agent.findAll({
    where: {
      status: "active",
    },
    order: ["createdAt"],
    include: ASSOCIATIONS,
  });
}

export async function getAgentById(id: number) {
  const agent = await Agent.findOne({
    where: {
      id,
      status: "active",
    },
    include: ASSOCIATIONS,
  });

  console.log(agent?.toJSON());
  return agent;
}

export async function getAgentByIdAndOwner(id: number, owner: string) {
  const agent = await Agent.findOne({
    where: {
      id,
      owner,
      status: "active",
    },
    include: [ASSOCIATIONS[0]],
  });

  return agent;
}
