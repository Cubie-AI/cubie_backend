import { Op } from "sequelize";
import { Agent, AgentInfo } from "../models.js";

export async function getAgents(filter?: string, order?: string) {
  let orderParam;
  if (!order || order === "marketCap") {
    orderParam = ["createdAt"];
  } else if (order === "created") {
    orderParam = ["createdAt"];
  }

  let agents = [];
  if (filter) {
    agents = await Agent.findAll({
      where: {
        [Op.or]: {
          name: {
            [Op.like]: `%${filter}%`,
          },
          mint: {
            [Op.like]: `%${filter}%`,
          },
        },
        status: "active",
      },
      order: orderParam,
      include: [AgentInfo],
    });
  } else {
    agents = await Agent.findAll({
      where: {
        status: "active",
      },
      order: orderParam,
      include: [AgentInfo],
    });
  }
  return agents;
}

export async function getAgentById(id: number) {
  const agent = await Agent.findOne({
    where: {
      id,
      status: "active",
    },
    include: [AgentInfo],
  });

  return agent;
}

export async function getAgentByIdAndOwner(id: number, owner: string) {
  const agent = await Agent.findOne({
    where: {
      id,
      owner,
      status: "active",
    },
    include: [AgentInfo],
  });

  return agent;
}
