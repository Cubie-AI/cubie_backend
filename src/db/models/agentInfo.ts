import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";
import { Agent } from "./agent.js";

export type AgentInfoType =
  | "knowledge"
  | "style"
  | "twitter_style"
  | "telegram_style";
export class AgentInfo extends Model {
  declare id: number;
  declare agentId: number;
  declare type: AgentInfoType;
  declare data: string;
}

AgentInfo.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    agentId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Agent,
        key: "id",
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    data: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: "agent_info",
  }
);
