import { Op } from "sequelize";
import { Agent } from "../models.js";

export async function getAgents(filter: string, order: string) {
  let orderParam;
  if (!order || order === "marketCap") {
    orderParam = ["marketCap", "DESC"];
  } else if (order === "created") {
    orderParam = ["createdAt", "DESC"];
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
    });
  } else {
    agents = await Agent.findAll({
      where: {
        status: "active",
      },
      order: orderParam,
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
  });

  return agent;
}
